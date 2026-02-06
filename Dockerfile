# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules (if needed)
RUN apk add --no-cache libc6-compat

# Copy only package files for better caching
COPY package*.json ./

# Install ALL dependencies (needed for build)
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ================================
# Stage 2: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build application
RUN npm run build && \
    # Remove dev dependencies from node_modules
    npm prune --production --legacy-peer-deps

# ================================
# Stage 3: Production Runner
# ================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user first (before copying files)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy only production node_modules from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package.json (needed for runtime)
COPY --chown=nestjs:nodejs package*.json ./

# Copy entrypoint script
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Make entrypoint executable
RUN chmod +x ./docker-entrypoint.sh

# Set NODE_ENV
ENV NODE_ENV=production

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with entrypoint script
CMD ["./docker-entrypoint.sh"]
