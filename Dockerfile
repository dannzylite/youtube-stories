FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./
EXPOSE 3001
CMD ["node", "--max-old-space-size=4096", "index.js"]
