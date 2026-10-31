FROM oven/bun:1.4.4 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client/package.json ./apps/client/package.json
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/server build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=58001
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/drizzle ./drizzle
USER node
EXPOSE 58001
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:58001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
