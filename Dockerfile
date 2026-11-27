# --- build stage -----------------------------------------------------------
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html tailwind.config.js postcss.config.js ./
COPY src ./src
COPY public ./public
COPY server ./server
COPY scripts ./scripts
RUN npm run build

# --- runtime stage ---------------------------------------------------------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/src/data/seed-complaints.json ./server/src/data/seed-complaints.json

RUN mkdir -p /app/server/data /app/server/uploads \
  && chown -R node:node /app/server
USER node

EXPOSE 8787
VOLUME ["/app/server/data", "/app/server/uploads"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
