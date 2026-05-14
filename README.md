# 🔌 Loadshedding Tracker

A full-stack web application for tracking load shedding schedules, managing outages, and providing real-time notifications to users during power outages.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

---

## 🎯 Overview

The Loadshedding Tracker application helps users stay informed about scheduled power outages in their area. It provides real-time updates, historical data, and a premium subscription service for advanced features.

---

## ✨ Features

### User Features
- 📍 **Area-based Tracking** - Select your area and get schedule updates
- 📊 **Dashboard** - View current outages and upcoming schedules
- 🔔 **Notifications** - Real-time alerts for outages in your area
- ⭐ **Favorites** - Save multiple areas for quick access
- 📈 **Premium** - Advanced features like detailed analytics and priority support

### Admin Features
- 👥 **User Management** - Manage users and their subscriptions
- 📍 **Area Management** - Add/edit/delete load shedding areas
- 📅 **Schedule Management** - Upload and manage outage schedules
- 📊 **Analytics** - View application statistics and user activity
- 🔧 **System Configuration** - Manage application settings

### Technical Features
- 🔐 **JWT Authentication** - Secure user authentication
- 🛡️ **Rate Limiting** - API protection against abuse
- 💾 **MongoDB** - Scalable database backend
- 🌐 **CORS** - Cross-origin request handling
- 📱 **PWA** - Progressive Web App support
- ✅ **Responsive Design** - Works on all devices

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library
- **Zustand** - State management
- **React Router** - Navigation
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin handling

---

## 📁 Project Structure

```
loadshedding-tracker/
├── backend/                      # Express.js server
│   ├── controllers/              # Route handlers
│   ├── models/                   # Mongoose schemas
│   ├── routes/                   # API routes
│   ├── middleware/               # Custom middleware
│   ├── services/                 # Business logic
│   ├── utils/                    # Helper functions
│   ├── scripts/                  # Utility scripts
│   ├── server.js                 # Express app entry
│   └── package.json              # Dependencies
│
├── Frontend/                     # React Vite application
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   ├── pages/                # Page components
│   │   ├── services/             # API services
│   │   ├── store/                # Zustand stores
│   │   ├── lib/                  # Utilities
│   │   ├── App.tsx               # Main app
│   │   └── main.tsx              # Entry point
│   ├── public/                   # Static assets
│   ├── package.json              # Dependencies
│   └── vite.config.ts            # Vite config
│
├── DEPLOYMENT_GUIDE.md           # Render deployment guide
├── HYBRID_DEPLOYMENT.md          # Vercel + Render guide
├── QUICK_DEPLOY.md               # Quick deployment checklist
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ or Bun
- MongoDB (local or Atlas)
- Git
- npm or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rehman22222/loadshediing.git
   cd loadshediing
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../Frontend
   npm install
   ```

### Environment Setup

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loadshedding
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000
```

---

## 🏃 Running Locally

### Start Backend
```bash
cd backend
npm run dev      # Development with nodemon
# or
npm start        # Production
```

Backend runs at: `http://localhost:5000`

### Start Frontend
```bash
cd Frontend
npm run dev      # Vite dev server
```

Frontend runs at: `http://localhost:8081`

The frontend is configured to proxy API requests to the backend.

---

## 📦 Deployment

### Option 1: Vercel (Frontend) + Render (Backend) - RECOMMENDED

See [HYBRID_DEPLOYMENT.md](./HYBRID_DEPLOYMENT.md) for step-by-step instructions.

**URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-api.onrender.com`
- Database: MongoDB Atlas

### Option 2: All on Render

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete setup.

### Quick Deployment Checklist

See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for a rapid deployment checklist.

---

## 📚 API Documentation

### Authentication
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login user
POST /api/auth/refresh      - Refresh JWT token
```

### Areas
```
GET /api/areas              - Get all areas
GET /api/areas/:id          - Get specific area
POST /api/areas             - Create area (Admin)
PUT /api/areas/:id          - Update area (Admin)
DELETE /api/areas/:id       - Delete area (Admin)
```

### Outages
```
GET /api/outages            - Get current outages
GET /api/outages/:areaId    - Get outages for area
POST /api/outages           - Create outage (Admin)
PUT /api/outages/:id        - Update outage (Admin)
DELETE /api/outages/:id     - Delete outage (Admin)
```

### User Profile
```
GET /api/users/profile      - Get current user
PUT /api/users/profile      - Update profile
GET /api/users/favorites    - Get favorite areas
POST /api/users/favorites   - Add favorite
DELETE /api/users/favorites/:areaId - Remove favorite
```

### Premium/Subscriptions
```
GET /api/subscriptions      - Get user subscriptions
POST /api/subscriptions     - Create subscription
DELETE /api/subscriptions   - Cancel subscription
```

### Admin
```
GET /api/admin/users        - Get all users (Admin)
GET /api/admin/stats        - Get system stats (Admin)
POST /api/admin/users       - Create admin user (Admin)
```

---

## 🐛 Troubleshooting

### Backend won't connect to MongoDB
- Verify MongoDB is running
- Check connection string in `.env`
- Verify MongoDB credentials

### Frontend shows "Cannot connect to API"
- Check backend is running on `http://localhost:5000`
- Verify `VITE_API_URL` in `.env.local`
- Check CORS settings

### Port already in use
```bash
# Linux/Mac
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: description"

# Push to remote
git push origin feature/your-feature

# Create pull request on GitHub
```

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Rehman**
- GitHub: [@rehman22222](https://github.com/rehman22222)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 💡 Support

For issues or questions:
1. Check existing [Issues](https://github.com/rehman22222/loadshediing/issues)
2. Create a new issue with detailed description
3. Contact through GitHub

---

**Last Updated:** May 2026
