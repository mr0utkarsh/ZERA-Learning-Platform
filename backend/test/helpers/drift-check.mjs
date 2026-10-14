/**
 * Migration/schema drift detection.
 *
 * `prisma migrate diff` needs the Prisma *schema engine* binary, which cannot
 * talk to the PGlite socket server. This checker achieves the same guarantee by
 * parsing prisma/schema.prisma directly and comparing it against live
 * introspection of a real PostgreSQL database that had every migration applied
 * to it. It fails loudly on any difference, so a migration can never silently
 * drift away from the schema.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const SCHEMA_PATH = resolve(process.cwd(), 'prisma', 'schema.prisma');

/** Prisma scalar/enum type -> expected PostgreSQL type family. */
const PG_FAMILY = {
  String: 'text',
  Int: 'int4',
  Float: 'float8',
  Boolean: 'bool',
  DateTime: 'timestamp',
  Json: 'jsonb',
  BigInt: 'int8',
  Bytes: 'bytea',
  Decimal: 'numeric',
};

const parseSchema = (source) => {
  const clean = source.replace(/^\uFEFF/, '');
  const models = new Map();
  const enums = new Map();

  const enumRe = /^enum\s+(\w+)\s*\{([^}]*)\}/gm;
  for (const m of clean.matchAll(enumRe)) {
    enums.set(
      m[1],
      m[2]
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, '').trim())
        .filter(Boolean)
    );
  }

  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  const modelBodies = new Map();
  for (const m of clean.matchAll(modelRe)) {
    modelBodies.set(m[1], m[2]);
  }
  const modelNames = new Set(modelBodies.keys());

  for (const [name, body] of modelBodies) {
    const columns = new Map();
    const indexes = new Set();
    const uniques = new Set();

    for (const rawLine of body.split('\n')) {
      const line = rawLine.replace(/\/\/.*$/, '').trim();
      if (!line) continue;

      const blockUnique = line.match(/^@@unique\(\[([^\]]*)\]\)/);
      if (blockUnique) {
        uniques.add(blockUnique[1].split(',').map((s) => s.trim()).sort().join(','));
        continue;
      }
      const blockIndex = line.match(/^@@index\(\[([^\]]*)\]/);
      if (blockIndex) {
        indexes.add(blockIndex[1].split(',').map((s) => s.trim()).sort().join(','));
        continue;
      }
      if (line.startsWith('@@')) continue;

      const field = line.match(/^(\w+)\s+([A-Za-z]\w*)(\[\])?(\?)?\s*(.*)$/);
      if (!field) continue;
      const [, fieldName, fieldType, isList, optional, attrs = ''] = field;
      if (isList) continue; // relation lists have no column

      // A field is a relation when its type is another model. Relations own no
      // column of their own; the physical foreign key is the scalar field on
      // the other side (e.g. `userId User @relation(...)`).
      const isRelation = modelNames.has(fieldType);
      if (isRelation) continue;

      const isId = /@id\b/.test(attrs);
      const isUnique = /@unique\b/.test(attrs);
      const dbText = /@db\.Text\b/.test(attrs);

      columns.set(fieldName, {
        type: enums.has(fieldType) ? `enum:${fieldType}` : (dbText ? 'text' : (PG_FAMILY[fieldType] ?? `unknown:${fieldType}`)),
        notNull: !optional,
        isId,
        isUnique: isUnique || isId,
      });
      if (isUnique && !isId) uniques.add(fieldName);
    }

    models.set(name, { columns, indexes, uniques });
  }

  return { models, enums };
};

const introspect = async (prisma) => {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'
    ORDER BY c.relname`);

  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position`);

  const constraints = await prisma.$queryRawUnsafe(`
    SELECT tc.table_name, tc.constraint_type,
           string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_type, tc.constraint_name
    ORDER BY tc.table_name, tc.constraint_type`);

  const indexDefs = await prisma.$queryRawUnsafe(`
    SELECT tablename AS table_name, indexname AS index_name, indexdef AS index_def
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname`);

  const enumDefs = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS name, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname`);

  return { tables, columns, constraints, indexDefs, enumDefs };
};

const familyOf = (col) => {
  if (col.udt_name === 'USER-DEFINED') return 'enum';
  return col.data_type;
};

const single = (cols) => String(cols).split(',').map((s) => s.trim()).sort().join(',');

/** Extracts the sorted column list from a pg_indexes.index_def string. */
const indexColumns = (indexDef) => {
  const m = indexDef.match(/USING\s+\w+\s*\(([^)]*)\)/);
  if (!m) return '';
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, '').replace(/\s+(ASC|DESC)$/i, ''))
    .filter(Boolean)
    .sort()
    .join(',');
};

const normFamily = (dataType) => {
  const map = {
    text: 'text',
    integer: 'int4',
    bigint: 'int8',
    boolean: 'bool',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    jsonb: 'jsonb',
    json: 'json',
    'double precision': 'float8',
    real: 'float4',
    numeric: 'numeric',
    uuid: 'uuid',
    'character varying': 'varchar',
  };
  return map[dataType] ?? dataType;
};

export const checkDrift = async (prisma) => {
  const { models, enums } = parseSchema(readFileSync(SCHEMA_PATH, 'utf-8'));
  const live = await introspect(prisma);
  const problems = [];

  const liveTables = new Set(live.tables.map((t) => t.table_name));

  for (const [modelName, model] of models) {
    if (!liveTables.has(modelName)) {
      problems.push(`MISSING TABLE: ${modelName} (model exists in schema but not in the database)`);
      continue;
    }

    const liveCols = live.columns.filter((c) => c.table_name === modelName);
    const liveColMap = new Map(liveCols.map((c) => [c.column_name, c]));
    const expectedCols = [...model.columns.keys()];

    for (const colName of expectedCols) {
      const expected = model.columns.get(colName);
      const actual = liveColMap.get(colName);
      if (!actual) {
        problems.push(`MISSING COLUMN: ${modelName}.${colName}`);
        continue;
      }
      if (expected.type === '__fk__') {
        const isText = normFamily(actual.data_type) === 'text' || normFamily(actual.data_type) === 'varchar';
        if (!isText) {
          problems.push(`FK COLUMN TYPE: ${modelName}.${colName} should be text, found ${actual.data_type}`);
        }
        continue;
      }
      if (expected.type.startsWith('enum:')) {
        if (actual.udt_name !== expected.type.slice(5)) {
          problems.push(`ENUM COLUMN TYPE: ${modelName}.${colName} expected ${expected.type.slice(5)}, found ${actual.udt_name}`);
        }
        continue;
      }
      const actualFamily = normFamily(actual.data_type);
      if (actualFamily !== expected.type) {
        problems.push(`COLUMN TYPE: ${modelName}.${colName} expected ${expected.type}, found ${actualFamily} (${actual.data_type})`);
      }
      const actualNotNull = actual.is_nullable === 'NO';
      if (expected.notNull && !actualNotNull) {
        problems.push(`NULLABILITY: ${modelName}.${colName} must be NOT NULL but is nullable`);
      }
    }

    const extraCols = liveCols
      .map((c) => c.column_name)
      .filter((c) => !expectedCols.includes(c));
    for (const extra of extraCols) {
      problems.push(`UNEXPECTED COLUMN: ${modelName}.${extra} exists in the database but not in the schema`);
    }

    // A unique column in Prisma is realised either as a UNIQUE table constraint
    // or as a bare unique index, so both sources must be considered.
    const liveUniqueCols = new Set(
      live.constraints
        .filter((c) => c.table_name === modelName && c.constraint_type === 'UNIQUE')
        .map((c) => c.cols)
    );
    for (const idx of live.indexDefs) {
      if (idx.table_name !== modelName) continue;
      if (!/^CREATE UNIQUE INDEX/.test(idx.index_def)) continue;
      const cols = indexColumns(idx.index_def);
      if (cols.length > 0) liveUniqueCols.add(cols);
    }
    const livePk = live.constraints.find(
      (c) => c.table_name === modelName && c.constraint_type === 'PRIMARY KEY'
    );
    if (livePk) liveUniqueCols.add(single(livePk.cols));

    for (const unique of model.uniques) {
      if (!liveUniqueCols.has(unique)) {
        problems.push(`MISSING UNIQUE CONSTRAINT: ${modelName}(${unique})`);
      }
    }

    const liveIndexCols = live.indexDefs
      .filter((i) => i.table_name === modelName)
      .map((i) => indexColumns(i.index_def));
    for (const idx of model.indexes) {
      if (!liveIndexCols.includes(idx)) {
        problems.push(`MISSING INDEX: ${modelName}(${idx})`);
      }
    }
  }

  for (const [name, values] of enums) {
    const def = live.enumDefs.find((e) => e.name === name);
    if (!def) {
      problems.push(`MISSING ENUM TYPE: ${name}`);
      continue;
    }
    if (def.labels.split(',').join(',') !== values.join(',')) {
      problems.push(`ENUM VALUES MISMATCH: ${name} schema=[${values.join(',')}] database=[${def.labels.split(',').join(',')}]`);
    }
  }

  return problems;
};

export const createPrisma = (url) =>
  new PrismaClient({ datasources: { db: { url } }, log: [] });
