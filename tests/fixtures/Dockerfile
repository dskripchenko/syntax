# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci && \
    npm run build
ENV PORT=8080 NODE_ENV="production"
EXPOSE ${PORT}
CMD ["node", "dist/server.js"]
