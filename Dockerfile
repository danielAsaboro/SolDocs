FROM node:20-slim AS build
WORKDIR /app

# Install dependencies
COPY src/package.json src/package-lock.json* ./
RUN npm ci --production=false

# Copy source and build
COPY src/ ./
RUN npx tsc

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-slim
WORKDIR /app

# Run as non-root user
RUN groupadd -r soldocs && useradd -r -g soldocs soldocs

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/seed-idls ./seed-idls

# Create data directory owned by app user
RUN mkdir -p /app/data && chown -R soldocs:soldocs /app

USER soldocs

ENV NODE_ENV=production
ENV API_PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
