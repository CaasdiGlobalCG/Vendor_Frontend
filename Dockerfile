# ---- Build Stage ----
FROM node:20-alpine AS build

# Accept build arguments for environment variables
ARG VITE_VENDOR_URL
ARG VITE_CLIENT_URL
ARG VITE_SALES_URL

# Set them as environment variables so Vite can access them during build
ENV VITE_VENDOR_URL=${VITE_VENDOR_URL}
ENV VITE_CLIENT_URL=${VITE_CLIENT_URL}
ENV VITE_SALES_URL=${VITE_SALES_URL}

# Install system libraries required by Node modules (esp. Vite, Rollup)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies
RUN npm ci --legacy-peer-deps --silent

# Copy patch files before source, so postinstall can access them
COPY patches ./patches

# Now copy rest of your app
COPY . .

# Apply patches inside the container (motion-utils, core-js, etc.)
RUN npm run postinstall

# Optional: safety cleanup before build
RUN rm -rf node_modules/.vite node_modules/.cache dist

# Build the production bundle
RUN NODE_OPTIONS="--max-old-space-size=8192" npm run build

# ---- Serve Stage ----
FROM nginx:stable-alpine

# Copy build output to Nginx's default directory
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Optional: ensure proper permissions (useful in CI/CD)
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

