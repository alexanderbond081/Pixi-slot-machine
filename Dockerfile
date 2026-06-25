# --- Step 1: Build the game bundle ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json webpack.config.js ./
RUN npm ci

COPY src/ ./src/

RUN npm run build

# --- Step 2: Serve static files with Nginx ---
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
