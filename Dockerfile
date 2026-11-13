# Pencil Down — one container: Next.js standalone server + bundled content.
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml app/
RUN cd app && pnpm install --frozen-lockfile
COPY content content
COPY app app
RUN cd app && pnpm build

FROM node:24-alpine
WORKDIR /srv
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PENCIL_DATA_DIR=/data \
    PENCIL_CONTENT_DIR=/srv/content
COPY --from=build /repo/app/.next/standalone ./
COPY --from=build /repo/app/.next/static ./.next/static
COPY --from=build /repo/app/public ./public
COPY --from=build /repo/content ./content
EXPOSE 3000
CMD ["node", "server.js"]
