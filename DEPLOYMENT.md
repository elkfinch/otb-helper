# 🚀 OTB Helper Deployment Guide

## Quick Deploy to Railway (Recommended)

### Step 1: Prepare Your Repository
1. Make sure all your changes are committed to Git
2. Push to GitHub (create a repo if you haven't already)

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `otb-helper` repository
5. Railway will automatically detect it's a Python app and deploy it

### Step 3: Configure Environment (Optional)
- Railway will automatically set up the environment
- No additional configuration needed for basic deployment

### Step 4: Access Your App
- Railway will provide you with a URL like `https://your-app-name.railway.app`
- Share this URL with your friends!

## Alternative: Deploy to Render

### Step 1: Prepare Repository
- Same as Railway - push to GitHub

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Use these settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3

## Alternative: Deploy to Vercel

### Step 1: Create vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app/main.py"
    }
  ]
}
```

### Step 2: Deploy
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts

## Cost Comparison

| Platform | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| Railway | ✅ $5 credit/month | $5+/month | Python apps |
| Render | ✅ 750 hours/month | $7+/month | Full-stack apps |
| Vercel | ✅ Unlimited | $20+/month | Static + API |
| Heroku | ❌ No free tier | $5+/month | Traditional apps |

## Troubleshooting

### Common Issues:
1. **Port binding**: Make sure your app uses `$PORT` environment variable
2. **Dependencies**: Ensure `requirements.txt` is up to date
3. **Static files**: Check that static file paths are correct

### Debug Commands:
```bash
# Test locally with production settings
PORT=8000 uvicorn app.main:app --host 0.0.0.0 --port 8000

# Check if all dependencies install
pip install -r requirements.txt
```

## Security Notes
- Your app will be publicly accessible
- Consider adding rate limiting for production use
- Monitor usage to avoid unexpected costs
