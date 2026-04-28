# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/backend

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app/backend

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/backend/dist ./dist

EXPOSE 3001

CMD ["npm", "run", "start"]
