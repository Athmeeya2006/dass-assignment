# Felicity Event Management System - Deployment Guide

## Deployment Architecture

```
┌─────────────────────┐
│  Frontend (Vercel)  │
│ https://felicity... │
└──────────┬──────────┘
           │
        HTTPS/CORS
           │
┌──────────▼──────────────┐
│  Backend (Render)       │
│ https://api-felicity... │
└──────────┬──────────────┘
           │
        MongoDB Wire
           │
┌──────────▼──────────────────┐
│  Database (MongoDB Atlas)   │
│ mongodb+srv://user:pass@... │
└─────────────────────────────┘
```

---

## Phase 1: Database Setup (MongoDB Atlas)

### 1. Create Cluster
1. Navigate to https://www.mongodb.com/cloud/atlas
2. Sign up / Log in
3. Click "Create" -> "Create Deployment"
4. Choose "M0" (Free tier)
5. Select region (Asia recommended for India)
6. Name cluster: `felicity-cluster`
7. Click "Create"

### 2. Create Database User
1. In cluster settings -> "Database Access"
2. Click "Add New Database User"
3. Create user:
   - **Username**: `felicity_admin`
   - **Password**: Generate strong password (save it!)
   - **Built-in Roles**: `readWriteAnyDatabase`
4. Click "Create User"

### 3. Setup IP Whitelist
1. Click "Network Access"
2. Click "Add IP Address"
3. Choose "Allow access from anywhere" (0.0.0.0/0)
   - Allows Render + Vercel access
   - For production, whitelist specific IPs
4. Click "Confirm"

### 4. Get Connection String
1. Click "Connect"
2. Select "Drivers"
3. Copy connection string
4. Replace `<password>` with your user password
5. Example:
   ```
   mongodb+srv://felicity_admin:PASSWORD@felicity-cluster.abc123.mongodb.net/felicity?retryWrites=true&w=majority
   ```

---

## Phase 2: Backend Deployment (Render)

### 1. Prepare Repository
```bash
# From backend directory
git init
git add .
git commit -m "Initial commit"
# Push to GitHub (create repo first)
```

### 2. Create Render Service
1. Navigate to https://render.com
2. Sign up (GitHub recommended for easy integration)
3. Click "New +" -> "Web Service"
4. Connect GitHub repository (select backend folder)
5. Configure:
   - **Name**: `felicity-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free or Paid

### 3. Set Environment Variables
In Render dashboard:
1. Click on your service
2. Go to "Environment"
3. Add all variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb+srv://felicity_admin:PASSWORD@felicity-cluster.abc123.mongodb.net/felicity
   JWT_SECRET=your_generated_secret_here
   JWT_EXPIRY=7d
   BCRYPT_ROUNDS=12
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FRONTEND_URL=https://felicity-event.vercel.app
   ADMIN_EMAIL=admin@felicity.com
   ADMIN_PASSWORD=Admin@123
   NODE_ENV=production
   ```

### 4. Deploy
- Click "Create Web Service"
- Render auto-deploys on git push
- Check deployment logs for errors
- Get backend URL: `https://felicity-backend.onrender.com`

### 5. Seed Admin
```bash
# SSH into Render or run via GitHub Actions
# Connect to MongoDB Atlas and run seed script
# Or manually create admin user via API
```

---

## Phase 3: Frontend Deployment (Vercel)

### 1. Prepare Repository
```bash
# Frontend only in Git
cd frontend
git init
git add .
git commit -m "Initial commit"
# Push to GitHub (new repo or subdirectory)
```

### 2. Create Vercel Project
1. Navigate to https://vercel.com
2. Sign up (GitHub recommended)
3. Click "Import Project"
4. Select GitHub frontend repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (or select frontend folder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. Set Environment Variables
In Vercel project settings:
1. Go to "Settings" -> "Environment Variables"
2. Add:
   ```
   VITE_API_URL=https://felicity-backend.onrender.com/api
   ```

### 4. Deploy
- Click "Deploy"
- Vercel auto-redeploys on git push
- Get frontend URL: `https://felicity-event.vercel.app`

---

## Phase 4: Post-Deployment Configuration

### 1. Update Backend CORS
In Render dashboard, update environment:
```
FRONTEND_URL=https://felicity-event.vercel.app
```
Redeploy backend.

### 2. Test Connectivity
```bash
# Test backend health
curl https://felicity-backend.onrender.com/api/health

# Should return:
# {"status":"Server is running"}
```

### 3. Create Admin Account
```bash
# Option 1: Via API (after backend deployment)
curl -X POST https://felicity-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@felicity.com","password":"Admin@123"}'

# Option 2: Seed script
# SSH into Render and run: node seed/adminSeed.js
```

### 4. Test Full Flow
1. Navigate to frontend URL
2. Sign up as participant
3. Login
4. Verify dashboard loads
5. Test event browsing
6. Test organizer creation (from another admin session)

---

## Phase 5: Email Configuration

### Gmail SMTP Setup
1. Create Gmail account (or use existing)
2. Enable 2-Factor Authentication
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and "Windows Computer" (or app-specific)
5. Generate 16-character password
6. Use this in `SMTP_PASS` environment variable

### Alternative: SendGrid
1. Sign up at https://sendgrid.com
2. Get API key
3. Update environment:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_USER=apikey
   SMTP_PASS=your_sendgrid_api_key
   ```

---

## Production Checklist

- [ ] Verify MongoDB connection string in Render
- [ ] Verify CORS allows Vercel frontend
- [ ] Verify JWT_SECRET is strong (32+ chars)
- [ ] Verify SMTP credentials working
- [ ] Test admin login locally before production
- [ ] Configure MongoDB backup (Atlas auto-backup)
- [ ] Enable MongoDB IP access logs
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Test QR scanner on production domain (SSL required)
- [ ] Verify Socket.io WebSocket connections work
- [ ] Test email delivery end-to-end
- [ ] Test file uploads (payment proofs)
- [ ] Test CSV exports
- [ ] Test calendar integration (Google/Outlook)
- [ ] Load test with concurrent users (if needed)

---

## Monitoring & Maintenance

### Health Checks
```bash
# Backend health
curl https://felicity-backend.onrender.com/api/health

# Database connection
# Check Render logs for connection errors

# Frontend health
# Check Vercel build logs
```

### Logs
- **Backend**: Render dashboard -> Logs
- **Frontend**: Vercel dashboard -> Deployments -> Logs
- **Database**: MongoDB Atlas -> Collections -> Monitoring

### Scaling
- **Backend**: Render -> Upgrade plan for paid tier
- **Database**: MongoDB Atlas -> Cluster tier upgrade
- **Frontend**: Vercel auto-scales (serverless)

---

## Rollback Procedure

### Backend (Render)
1. Go to "Deployments" tab
2. Click previous successful deployment
3. Click "Redeploy"

### Frontend (Vercel)
1. Go to "Deployments" tab
2. Click previous successful deployment
3. Click "Redeploy"

### Database (MongoDB)
- Automated backups available in Atlas
- Request restore via support if needed

---

## Custom Domain Setup

### Backend (Render)
1. Render dashboard -> Custom Domain
2. Use CNAME from Render
3. Point DNS to Render
4. Example: `api.felicityevents.com`

### Frontend (Vercel)
1. Vercel dashboard -> Settings -> Domains
2. Add custom domain
3. Verify DNS records
4. Example: `felicityevents.com`

---

## Troubleshooting Deployment

### Backend Won't Deploy
- Check Node version in build logs
- Verify package.json scripts
- Check for missing environment variables
- View full logs: Render -> Logs

### Frontend Build Fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors
- Verify VITE config

### Database Connection Error
- Verify connection string
- Check IP whitelist in MongoDB Atlas
- Verify user credentials
- Test locally with same connection string

### Functions Return 504 Timeout
- Increase timeout on Render (max 600s for paid)
- Optimize long-running queries
- Add indices to frequently queried fields
- Check for infinite loops in code

### CORS Error in Frontend
- Verify FRONTEND_URL in backend environment
- Check browser console for exact error
- Verify backend Accept-Origin header
- Add frontend URL to CORS whitelist

---

## Performance Optimization

### Backend
- Enable gzip compression
- Add response caching headers
- Use MongoDB indices
- Implement request rate limiting

### Frontend
- Enable Vercel edge caching
- Minify assets (Vite handles this)
- Lazy load pages with React.lazy
- Optimize images

### Database
- Create compound indices for queries
- Monitor slow query logs
- Archive old data
- Use connection pooling

---

## Security Hardening

### Before Going Live
- [ ] Generate strong JWT secret: `openssl rand -base64 32`
- [ ] Use unique admin password
- [ ] Enable MongoDB encryption at rest
- [ ] Set up MongoDB IP restrictions (production-only)
- [ ] Enable HTTPS everywhere (auto on Vercel/Render)
- [ ] Setup rate limiting on Render
- [ ] Add input validation on frontend
- [ ] Use environment-specific configs

### Ongoing
- [ ] Monitor access logs
- [ ] Set up intrusion alerts
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Rotate API keys quarterly

---

## Cost Estimation (Monthly)

| Service | Free | Paid |
|---------|------|------|
| MongoDB Atlas | $0 M0 cluster (512MB) | $57+ M2 |
| Render | $7+ (free tier has idle times) | $7-100+ |
| Vercel | $0 (Pro for team) | $20+ |
| Gmail SMTP | Free (1000/day) | SendGrid $20+ |
| **Total** | **~$7/month** | **$50-200+** |

---

## Deployment Checklist Summary

```
DATABASE
[✓] MongoDB Atlas cluster created & configured
[✓] Connection string obtained
[✓] IP whitelist configured

BACKEND
[✓] GitHub repo created with backend code
[✓] Render service created
[✓] Environment variables set
[✓] Backend deployed and running
[✓] Admin seeded

FRONTEND
[✓] Frontend code in GitHub repo
[✓] Vercel project created
[✓] Environment variables set
[✓] Frontend deployed

INTEGRATION
[✓] CORS configured
[✓] Frontend communicates with backend
[✓] Email working
[✓] QR scanner working on HTTPS
[✓] Socket.io WebSocket connected

TESTING
[✓] Signup workflow tested
[✓] Login workflow tested
[✓] Event creation tested
[✓] Registration workflow tested
[✓] File upload tested
[✓] Email receipt verified
[✓] Calendar integration verified
```

---

## LiveLinks (After Deployment)

- **Frontend**: https://felicity-event.vercel.app
- **Backend API**: https://felicity-backend.onrender.com/api
- **Health Check**: https://felicity-backend.onrender.com/api/health
- **Admin Login**: https://felicity-event.vercel.app/login
  - Email: `admin@felicity.com`
  - Password: `Admin@123`

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **Express.js Docs**: https://expressjs.com
- **React Docs**: https://react.dev

---

## Deployment Complete!

Your Felicity Event Management System is now **live and accessible to users worldwide**!
