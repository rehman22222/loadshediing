# Hybrid Deployment: Vercel (Frontend) + Render (Backend) + MongoDB Atlas

## 🎯 Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Vite + React)            │
│  Vercel                             │
│  your-app.vercel.app                │
└────────────────┬────────────────────┘
                 │
            HTTPS API
                 │
┌────────────────▼────────────────────┐
│  Backend (Express.js)               │
│  Render Web Service                 │
│  your-api.onrender.com              │
└────────────────┬────────────────────┘
                 │
        MongoDB Connection
                 │
┌────────────────▼────────────────────┐
│  MongoDB (Existing)                 │
│  MongoDB Atlas                      │
│  cluster.mongodb.net                │
└─────────────────────────────────────┘
```

---

## 📝 Step 1: Backend Deployment (Render)

### 1.1 Update Backend Environment Variables

Update `backend/.env` or create for production:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/loadshedding
JWT_SECRET=your-secure-jwt-secret-key
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### 1.2 Deploy Backend on Render

1. Go to https://render.com
2. Sign in with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your GitHub repo
5. Configure:
   - **Name**: `loadshedding-api`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
6. **Add Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret
   ALLOWED_ORIGINS=https://your-app.vercel.app
   NODE_ENV=production
   ```
7. Click **Deploy**
8. ⏳ Wait 3-5 minutes
9. 📋 **Copy your backend URL**: `https://loadshedding-api.onrender.com`

---

## 🚀 Step 2: Frontend Deployment (Vercel)

### 2.1 Update Frontend Environment Variables

Create `Frontend/.env.production` (if not exists):
```env
VITE_API_URL=https://loadshedding-api.onrender.com
```

Your [axios.ts](../../Frontend/src/lib/axios.ts) already supports this correctly:
```typescript
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : normalizeBaseUrl(import.meta.env.VITE_API_URL || '/api');
```

### 2.2 Deploy Frontend on Vercel

#### Option A: Using Vercel CLI (Fastest)
```bash
cd Frontend
npm install -g vercel
vercel --prod
```

#### Option B: Using Vercel Dashboard (GUI)
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Select your repo
5. Configure:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Root Directory**: `Frontend`
6. **Add Environment Variable**:
   ```
   VITE_API_URL=https://loadshedding-api.onrender.com
   ```
7. Click **Deploy**
8. ⏳ Wait 2-3 minutes
9. 📋 **Get your frontend URL**: `https://your-app.vercel.app`

---

## ✅ Verification Checklist

After deployment:

- [ ] Backend deployed on Render
  - [ ] Test: `https://loadshedding-api.onrender.com/api/outages` (or any endpoint)
  - [ ] Should return JSON (even if 401)
  
- [ ] Frontend deployed on Vercel
  - [ ] Visit: `https://your-app.vercel.app`
  - [ ] Opens without errors
  
- [ ] API Communication
  - [ ] Login works
  - [ ] Data loads from backend
  - [ ] No CORS errors in browser console

---

## 🔧 Troubleshooting

### **Frontend shows "Cannot connect to API"**
1. Check `VITE_API_URL` in Vercel environment variables
2. Verify backend URL is correct and reachable
3. Rebuild on Vercel (Settings → Deployments → Redeploy)

### **CORS Errors in Console**
1. Update `ALLOWED_ORIGINS` in backend `.env` on Render
2. Include `https://your-app.vercel.app` (with https://)
3. Restart backend service on Render

### **Backend won't start on Render**
1. Check MongoDB connection string is valid
2. View logs in Render dashboard (Logs tab)
3. Verify all env vars are set correctly

### **Cold starts on Render (first request slow)**
- Free tier sleeps after 15 min of inactivity
- Upgrade to paid tier ($7/month) to eliminate sleep
- Or use keep-alive service like UptimeRobot

---

## 🔄 Updating Your Code

After deployment, to update:

1. **Backend changes**:
   ```bash
   git push origin main
   ```
   - Render auto-redeploys on push

2. **Frontend changes**:
   ```bash
   git push origin main
   ```
   - Vercel auto-redeploys on push

---

## 💡 Pro Tips

1. **Keep `.env.production` files in repo** (they only have non-sensitive URLs):
   - ✅ `VITE_API_URL=https://...`
   - ✅ `ALLOWED_ORIGINS=https://...`
   - ❌ Never commit actual secrets (use platform env vars instead)

2. **Use Vercel CLI for faster deployments**:
   ```bash
   vercel --prod
   ```

3. **Monitor backend logs**:
   - Render Dashboard → Select service → Logs tab

4. **Keep MongoDB connection string secure**:
   - Store only in Render environment variables
   - Never commit to git

---

## 📱 Testing Endpoints

Test your deployment:

```bash
# Test backend is running
curl https://loadshedding-api.onrender.com/api/health

# Test frontend loads
curl https://your-app.vercel.app
```

---

## 💰 Cost

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel Frontend | ✅ FREE | Free |
| Render Backend (free) | FREE (sleeps) | Free |
| Render Backend (paid) | - | $7/month |
| MongoDB Atlas (existing) | - | Existing |
| **Total** | **$0** | **$0-7/month** |

---

## 🎉 Done!

Your project is now deployed:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://loadshedding-api.onrender.com`
- Database: Your existing MongoDB

