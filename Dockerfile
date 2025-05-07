FROM node:20-slim

# Install OpenSSL and other dependencies required for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl curl postgresql-client dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and prisma directory first
COPY package*.json ./
COPY prisma ./prisma/

# Remove the postinstall script temporarily if it exists
RUN if grep -q "postinstall" package.json; then \
    sed -i 's/"postinstall": ".*",/"_postinstall": "prisma generate --schema=.\/prisma\/schema.prisma",/g' package.json; \
    fi

# Install dependencies without running postinstall script
RUN npm ci

# Generate Prisma client explicitly
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy the rest of your application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Create a more advanced start script that handles database connection retries
RUN echo '#!/bin/sh\n\
\n\
# Wait for database to be ready\n\
wait_for_db() {\n\
  echo "Waiting for database to be ready..."\n\
  max_retries=30\n\
  counter=0\n\
  until npx prisma db ping --schema=./prisma/schema.prisma > /dev/null 2>&1; do\n\
    sleep 1\n\
    counter=$((counter+1))\n\
    if [ $counter -ge $max_retries ]; then\n\
      echo "Error: Timed out waiting for database"\n\
      exit 1\n\
    fi\n\
    echo "Waiting for database... ($counter/$max_retries)"\n\
  done\n\
  echo "Database is ready!"\n\
}\n\
\n\
# Run database migrations\n\
run_migrations() {\n\
  echo "Running database migrations..."\n\
  npx prisma migrate deploy --schema=./prisma/schema.prisma\n\
  echo "Migrations completed!"\n\
}\n\
\n\
# Main execution\n\
if [ "$SKIP_DB_WAIT" != "true" ]; then\n\
  wait_for_db\n\
fi\n\
\n\
if [ "$SKIP_MIGRATIONS" != "true" ]; then\n\
  run_migrations\n\
fi\n\
\n\
echo "Starting application..."\n\
exec npm start\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 5000

# Use dumb-init as an init system to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run our custom start script 
CMD ["/app/start.sh"]