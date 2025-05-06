# Use Node.js slim image as the base
# This is a lightweight version of Node.js with essential tools
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# This speeds up builds when dependencies don't change
COPY package*.json ./

# Copy Prisma schema files specifically
# This is crucial since your Prisma client generation needs these files
COPY prisma ./prisma/

# Install all dependencies including dev dependencies
# The --include=dev flag ensures development dependencies are installed
# We need these for building the TypeScript project
RUN npm ci --include=dev

# Generate Prisma client explicitly pointing to the schema file location
# This is the critical fix for your deployment issue
RUN npx prisma generate --schema=./prisma/schema.prisma

# Now copy the rest of your application code
# This happens after npm install to leverage Docker's layer caching
COPY . .

# Build the TypeScript application
# This runs your build script from package.json
RUN npm run build

# Expose the port your app will run on
# This should match the PORT in your fly.toml and your Express app
EXPOSE 5000

# Command to run your application
# This executes your start script from package.json
CMD ["npm", "start"]