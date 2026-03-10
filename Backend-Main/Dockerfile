FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/
COPY migrations/ ./migrations/

EXPOSE 5001

CMD ["node", "src/server.js"]
