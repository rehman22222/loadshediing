# Quick Deployment Checklist

## Before You Start
- [ ] GitHub repo with all code pushed
- [ ] MongoDB connection string ready
- [ ] Vercel account created
- [ ] Render account created

## Backend (Render) - 5 minutes

- [ ] Create Render account at https://render.com
- [ ] Click "New +" → "Web Service"
- [ ] Select GitHub repo
- [ ] Set Root Directory to `backend`
- [ ] Add environment variables:
  - MONGODB_URI: `mongodb+srv://...`
  - JWT_SECRET: `your-secret`
  - ALLOWED_ORIGINS: `https://your-app.vercel.app`
  - NODE_ENV: `production`
- [ ] Deploy
- [ ] Copy backend URL: `https://loadshedding-api.onrender.com`

## Frontend (Vercel) - 5 minutes

- [ ] Go to https://vercel.com
- [ ] Sign in with GitHub
- [ ] Click "Add New" → "Project"
- [ ] Select repo and configure:
  - Root Directory: `Frontend`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Add environment variable:
  - VITE_API_URL: `https://loadshedding-api.onrender.com`
- [ ] Deploy
- [ ] Get frontend URL: `https://your-app.vercel.app`

## Test Everything

- [ ] Open https://your-app.vercel.app
- [ ] Login works
- [ ] Data loads
- [ ] No CORS errors in console
- [ ] API calls succeed

## Done! 🎉

