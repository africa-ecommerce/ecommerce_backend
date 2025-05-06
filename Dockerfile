FROM node:20-slim

# Install OpenSSL - required for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Copy Prisma files - needed for both client generation and migrations
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy the rest of your application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Create a script to run db push and start the app
# RUN echo '#!/bin/sh\nnpx prisma db push --schema=./prisma/schema.prisma --force-reset\nnpm start' > /app/start.sh && chmod +x /app/start.shoo
RUN npx prisma db push --schema=./prisma/schema.prisma --force-reset
RUN npx prisma migrate deploy --schema=./prisma/schema.prisma

EXPOSE 5000

# Use our custom start script
CMD ["/app/start.sh"]