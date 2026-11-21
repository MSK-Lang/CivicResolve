# ==============================================================================
# CivicResolve - Production Multi-Stage Dockerfile for Google Cloud Run
# Builds both Frontend (Vite + React) and Backend (Fastify + TypeScript)
# Serves the complete application as a single self-contained container
# ==============================================================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and package manifests for efficient layer caching
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy full source tree
COPY . .

# Build all packages in topological order
RUN npm run build:shared
RUN npm run build:client
RUN npm run build:server

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV CLIENT_DIST_PATH=/app/packages/client/dist

# Copy root and package manifests for production install
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled artifacts from builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Non-root user security for production
USER node

# Expose standard Cloud Run port
EXPOSE 8080

# Launch Fastify server
CMD ["node", "packages/server/dist/index.js"]
