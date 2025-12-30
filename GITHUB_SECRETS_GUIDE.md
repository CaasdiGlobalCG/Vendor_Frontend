# GitHub Secrets Setup Guide

## Required Secrets for Vendor Frontend

Your GitHub Actions workflow needs these secrets to be configured in your repository:

### Production Secrets:
- `VITE_CLIENT_PROD_URL` - Production client dashboard URL
- `VITE_SALES_PROD_URL` - Production sales/B2B dashboard URL

### Staging Secrets:
- `VITE_CLIENT_STAGING_URL` - Staging client dashboard URL
- `VITE_SALES_STAGING_URL` - Staging sales/B2B dashboard URL

### Other Required Secrets:
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `EKS_CLUSTER_NAME` - Your EKS cluster name

## How to Check if Secrets are Set

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Check if all the required secrets are listed

## How to Add/Update Secrets

1. In the same **Actions secrets** page
2. Click **New repository secret** (or edit existing ones)
3. Add the secret name exactly as listed above
4. Add the corresponding value
5. Click **Add secret**

## Example Values (for reference):

**Production:**
```
VITE_CLIENT_PROD_URL=https://client.yourdomain.com
VITE_SALES_PROD_URL=https://sales.yourdomain.com
```

**Staging:**
```
VITE_CLIENT_STAGING_URL=https://staging-client.yourdomain.com
VITE_SALES_STAGING_URL=https://staging-sales.yourdomain.com
```

## Testing Locally

Before pushing to GitHub, test the build locally:

### On Windows (PowerShell):
```powershell
.\test-build.ps1
```

### On Linux/Mac:
```bash
chmod +x test-build.sh
./test-build.sh
```

This will build the Docker image with test environment variables and verify everything works.

## Verifying the Fix

After setting the secrets and updating the Dockerfile:

1. **Commit and push your changes:**
   ```bash
   git add Dockerfile .github/workflows/frontend-ci.yml
   git commit -m "fix: Configure Dockerfile to accept build args for env variables"
   git push origin staging-branch
   ```

2. **Check the GitHub Actions workflow:**
   - Go to **Actions** tab in your repository
   - Watch the workflow run
   - Check the "Verify build args" step to confirm secrets are being passed

3. **After deployment, verify in browser:**
   - Open your deployed app
   - Open browser console (F12)
   - You should see the logs showing correct URL values

## Troubleshooting

If secrets are still empty:

1. **Double-check secret names** - They must match exactly (case-sensitive)
2. **Check branch protection** - Secrets might be restricted to certain branches
3. **Verify secret values** - Make sure they don't have extra spaces or quotes
4. **Re-run the workflow** - Sometimes GitHub Actions needs a fresh run after adding secrets
