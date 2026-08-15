# Railway deploys this API with Docker so Railpack does not have to
# guess a start command in a Vite + Express monorepo.
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/server run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/server/dist/index.cjs ./server/dist/index.cjs

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/dist/index.cjs"]
