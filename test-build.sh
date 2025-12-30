#!/bin/bash

# Test script to verify Docker build with environment variables locally
# Usage: ./test-build.sh

echo "=== Testing Docker Build with Environment Variables ==="
echo ""

# Test values (replace with your actual URLs for testing)
TEST_CLIENT_URL="http://localhost:3000"
TEST_SALES_URL="http://localhost:3001"

echo "Building Docker image with test environment variables..."
echo "VITE_CLIENT_URL: $TEST_CLIENT_URL"
echo "VITE_SALES_URL: $TEST_SALES_URL"
echo ""

docker build \
  --build-arg VITE_CLIENT_URL="$TEST_CLIENT_URL" \
  --build-arg VITE_SALES_URL="$TEST_SALES_URL" \
  -t vendor-frontend-test:latest \
  .

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build successful!"
  echo ""
  echo "To run the container:"
  echo "docker run -p 8080:80 vendor-frontend-test:latest"
  echo ""
  echo "Then open http://localhost:8080 and check browser console for config values"
else
  echo ""
  echo "❌ Build failed!"
  exit 1
fi
