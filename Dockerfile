FROM node:20-slim AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app

# Run as non-root user
RUN groupadd -r soldocs && useradd -r -g soldocs soldocs

# Copy Next.js standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Create data directory owned by app user
RUN mkdir -p /app/data && chown -R soldocs:soldocs /app

USER soldocs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
