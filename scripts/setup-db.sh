#!/bin/bash

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply migrations
echo "Applying database migrations..."
npx prisma migrate deploy

echo "Database setup complete!" 