# Test script to verify Docker build with environment variables locally (Windows)
# Usage: .\test-build.ps1

Write-Host "=== Testing Docker Build with Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

# Test values (replace with your actual URLs for testing)
$TEST_CLIENT_URL = "http://localhost:3000"
$TEST_SALES_URL = "http://localhost:3001"

Write-Host "Building Docker image with test environment variables..." -ForegroundColor Yellow
Write-Host "VITE_CLIENT_URL: $TEST_CLIENT_URL"
Write-Host "VITE_SALES_URL: $TEST_SALES_URL"
Write-Host ""

docker build `
  --build-arg VITE_CLIENT_URL="$TEST_CLIENT_URL" `
  --build-arg VITE_SALES_URL="$TEST_SALES_URL" `
  -t vendor-frontend-test:latest `
  .

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ Build successful!" -ForegroundColor Green
  Write-Host ""
  Write-Host "To run the container:"
  Write-Host "docker run -p 8080:80 vendor-frontend-test:latest" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Then open http://localhost:8080 and check browser console for config values"
} else {
  Write-Host ""
  Write-Host "❌ Build failed!" -ForegroundColor Red
  exit 1
}
