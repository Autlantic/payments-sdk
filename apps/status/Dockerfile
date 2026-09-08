FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/status ./apps/status
RUN corepack enable && pnpm install --frozen-lockfile --filter @autlantic/status...
WORKDIR /app
ENV PORT=4180
EXPOSE 4180
CMD ["pnpm", "--filter", "@autlantic/status", "start"]
