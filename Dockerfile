# Debian slim (glibc) so Prisma engines load. The slim image ships no
# OpenSSL, so Prisma's generate/runtime detection falls back to the
# openssl-1.1.x engine, which then crashes with "libssl.so.1.1: No such
# file or directory". Installing openssl (3.x) lets Prisma generate and
# load the debian-openssl-3.0.x engine.
FROM node:20-slim

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests AND the Prisma schema first. The backend's
# "postinstall" script runs `prisma generate`, which fails with
# "Could not find Prisma Schema" unless prisma/schema.prisma is present.
COPY backend/package*.json ./
COPY backend/prisma/ ./prisma/

# Install dependencies (runs `prisma generate` via postinstall)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Regenerate the client against the final copied schema
RUN npm run prisma:generate

EXPOSE 5000

CMD ["npm", "start"]