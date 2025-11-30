# Build stage: install deps and build client
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY package.json ./package.json
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

# Install dependencies
RUN npm install --prefix server && npm install --prefix client

# Copy source
COPY server ./server
COPY client ./client

# Build client
RUN npm run build --prefix client

# Runtime stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy server code and built client
COPY --from=builder /app/server /app/server
COPY --from=builder /app/client/dist /app/client/dist
COPY --from=builder /app/package.json /app/package.json

# Install production deps for server
RUN npm install --production --prefix server

ENV PORT=4000
ENV CLIENT_DIST=/app/client/dist

EXPOSE 4000

CMD ["npm", "run", "start", "--prefix", "server"]
