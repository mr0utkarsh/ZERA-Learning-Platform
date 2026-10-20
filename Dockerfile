# Debian slim (glibc + OpenSSL 3) instead of Alpine: Prisma 5.22's query
# engine requires libssl, which the Alpine image does not provide, causing
# "Error loading shared library libssl.so.1.1" and a boot-time crash.
FROM node:20-slim

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