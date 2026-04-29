# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/frontend

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy the build output from the builder stage to nginx
# Vite builds to the 'dist' directory by default
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy a custom nginx configuration if needed (optional, for SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
