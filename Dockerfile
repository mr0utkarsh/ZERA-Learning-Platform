FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./

# Generate Prisma client
RUN npm run prisma:generate

EXPOSE 5000

CMD ["npm", "start"]