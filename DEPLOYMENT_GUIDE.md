# Deployment Guide: Loadshedding Tracker

## Project Overview
- **Frontend**: Vite + React (TypeScript)
- **Backend**: Express.js + Node.js
- **Database**: MongoDB
- **Current Stack**: NOT Flask (you have Node.js backend)

---

## ❌ Why NOT Vercel Alone?

Vercel is optimized for **static frontend + serverless functions**. Your project needs:
- Long-running processes (MongoDB connections, rate limiting)
- Persistent connections
- No 12-second timeout limitations

**Vercel Free Limitations:**
- ⚠️ 12-second function timeout
- ⚠️ Connection pooling issues with MongoDB
- ⚠️ Not designed for full Express.js apps

---

## 🎯 Recommended Deployment Strategy

### **Option 1: Render (BEST FOR YOU - 100% FREE)**
```
┌─────────────────────────────────────┐
│  Frontend (Vite + React)            │
│  Render Static Site                 │
│  your-app.onrender.com              │
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
│  MongoDB (Free 512MB)               │
│  MongoDB Atlas                      │
│  cluster.mongodb.net                │
└─────────────────────────────────────┘
```

**Advantages:**
- ✅ Completely FREE
- ✅ No serverless limitations
- ✅ Full Node.js support
- ✅ Better cold start performance than Vercel
- ✅ Easy database integration

---

### **Option 2: Vercel + Render (Frontend on Vercel)**
```
Frontend: Vercel (your-app.vercel.app)
Backend: Render (your-api.onrender.com)
Database: MongoDB Atlas
```

**Pros:** Vercel's CDN for frontend
**Cons:** Extra setup complexity

---

## 🚀 Step-by-Step: Deploy on Render (Recommended)

### **Step 1: Prepare Backend for Production**

#### 1.1 Update Environment Variables
Create `.env.production` in backend folder:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/loadshedding
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=https://your-app.onrender.com
```

#### 1.2 Verify server.js Configuration
- ✅ Uses `process.env.PORT` (done)
- ✅ Uses `process.env.MONGODB_URI` (check connection string)
- ✅ Sets proper CORS headers (done)

### **Step 2: Prepare Frontend for Production**

#### 2.1 Create Environment Files
Create `Frontend/.env.production`:
```env
VITE_API_URL=https://your-api.onrender.com
```

#### 2.2 Update axios.ts (Already Good!)
Your axios.ts already handles this correctly:
```typescript
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : normalizeBaseUrl(import.meta.env.VITE_API_URL || '/api');
```

### **Step 3: MongoDB Atlas Setup (FREE)**

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up with Google/GitHub
3. Create a free cluster (512MB)
4. Get connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/loadshedding
   ```
5. Add your IP address to whitelist (or 0.0.0.0 for anywhere)

### **Step 4: Deploy Backend on Render**

1. Push code to GitHub (all branches)
2. Go to: https://render.com
3. Sign up with GitHub
4. Click **"New +"** → **"Web Service"**
5. Connect GitHub repo
6. Fill in:
   - **Name**: `loadshedding-api`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
7. **Add Environment Variables** (click "Add Secret File"):
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret
   ALLOWED_ORIGINS=https://loadshedding-tracker.onrender.com
   NODE_ENV=production
   ```
8. Click **Deploy**
9. Wait 3-5 minutes, get your API URL: `https://loadshedding-api.onrender.com`

### **Step 5: Deploy Frontend on Render**

1. In Render dashboard, click **"New +"** → **"Static Site"**
2. Connect GitHub repo
3. Fill in:
   - **Name**: `loadshedding-tracker`
   - **Build Command**: `cd Frontend && npm install && npm run build`
   - **Publish Directory**: `Frontend/dist`
4. Click **Deploy**
5. Get your frontend URL: `https://loadshedding-tracker.onrender.com`

### **Step 6: Connect Frontend to Backend**

1. In Render dashboard, go to frontend site settings
2. Add **Environment Variable**:
   ```
   VITE_API_URL=https://loadshedding-api.onrender.com
   ```
3. Redeploy frontend (Render will rebuild automatically)

---

## 📋 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] Backend `.env.production` created with MongoDB URI
- [ ] Frontend `.env.production` created
- [ ] Render account created
- [ ] Backend deployed on Render → copy API URL
- [ ] Frontend deployed on Render with API URL
- [ ] Test frontend-backend communication
- [ ] Verify all API endpoints work
- [ ] Check logs for errors

---

## 🔧 Troubleshooting

### **Frontend shows 404 errors**
- Check `VITE_API_URL` environment variable
- Ensure backend API URL is correct in `.env.production`
- Redeploy frontend after changing env vars

### **Backend won't start**
- Check MongoDB connection string
- Verify all environment variables are set
- View logs in Render dashboard

### **CORS errors**
- Update `ALLOWED_ORIGINS` in backend `.env`
- Include frontend URL with https://
- Restart backend

### **Cold starts (first request slow)**
- Normal on free tier (Render sleeps after 15 min inactivity)
- Upgrade to paid tier to avoid sleep mode

---

## 💰 Cost Breakdown (Monthly)

| Service | Free Tier | Paid Option |
|---------|-----------|------------|
| Render Backend | FREE | $7/month (no sleep) |
| Render Frontend | FREE | - |
| MongoDB Atlas | 512MB FREE | $9/month (2GB) |
| **Total** | **$0** | **$16/month** |

---

## 📚 Quick Links

- [Render Deployment Docs](https://render.com/docs)
- [MongoDB Atlas Guide](https://www.mongodb.com/docs/atlas/getting-started/)
- [Vite Deployment](https://vitejs.dev/guide/ssr.html)
- [Express Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

