FROM node:20-alpine

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