# Use Node.js 20 Alpine for a smaller footprint
FROM node:20-alpine

# Install FFmpeg using apk
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Expose the Vite preview port
EXPOSE 3000

# Start the preview server on all interfaces binding to 0.0.0.0 and port 3000
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
