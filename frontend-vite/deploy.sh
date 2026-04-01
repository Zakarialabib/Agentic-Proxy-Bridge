#!/bin/bash

# Exit on any error
set -e

echo "Starting Vite Frontend Deployment..."

# Build the Docker image
echo "Building Docker image for frontend-vite..."
docker build -t proxy-bridge-frontend:latest .

# Stop and remove any existing container
echo "Stopping existing frontend container if running..."
docker stop proxy-bridge-frontend-container || true
docker rm proxy-bridge-frontend-container || true

# Run the new container
echo "Running new frontend container on port 8080..."
docker run -d \
  --name proxy-bridge-frontend-container \
  -p 8080:80 \
  --add-host=host.docker.internal:host-gateway \
  proxy-bridge-frontend:latest

echo "Deployment complete! Frontend is available at http://localhost:8080"
