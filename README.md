# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 14+ installed
- Python 3.8+ installed
- ngrok installed ([download here](https://ngrok.com/download))
- Git installed

---

## Step 1: Clone and Setup Backend (2 minutes)

```bash
# Clone your repository
git clone <your-repo-url>
cd RAG-PDF-APP

# Install backend dependencies
cd server
npm install

# Install Python dependencies
pip install torch transformers sentence-transformers langchain faiss-cpu pypdf langchain-text-splitters

# Or use the startup script
# Windows: double-click start-backend.bat
# Mac/Linux: chmod +x start-backend.sh && ./start-backend.sh
```

## Step 2: Start Backend Server (30 seconds)

```bash
# In server directory
node index.js
```

You should see:
```
✅ Server running on http://localhost:3000
```

**Keep this terminal open!**

---

## Step 3: Start ngrok Tunnel (30 seconds)

Open a **new terminal**:

```bash
ngrok http 3000
```

You'll see:
```
Forwarding  https://abcd-1234-5678.ngrok-free.app -> http://localhost:3000
```

**Copy the https:// URL** and keep this terminal open!

---

## Step 4: Configure Frontend (1 minute)

Edit `client/config.js`:

```javascript
// Replace with YOUR ngrok URL from Step 3
window.API_BASE_URL = 'https://abcd-1234-5678.ngrok-free.app';
```

---

## Step 5: Deploy to Vercel (1 minute)

### Option A: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Settings:
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: `client`
5. Click "Deploy"

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Set output directory: client
# - Leave build command empty
```

---

## Step 6: Test It! (30 seconds)

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Click "Upload PDF"
3. Select a PDF file
4. Click "Analyze PDF"
5. See the magic happen! ✨

---

## 🎉 You're Done!

Your app is now live:
- ✅ Frontend on Vercel (fast, global CDN)
- ✅ Backend on your machine (with ML models)
- ✅ Connected via ngrok tunnel

---

## 📝 What's Running Where?

```
┌─────────────────────────────┐
│ https://your-app.vercel.app │  ← Your users visit here
│ (Frontend)                  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ https://xyz.ngrok-free.app  │  ← ngrok tunnel
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ http://localhost:3000       │  ← Your computer (Backend + ML)
└─────────────────────────────┘
```

---

## 🔄 Daily Usage

### Every Time You Start Working:

1. **Start Backend:**
   ```bash
   cd server
   node index.js
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **If ngrok URL changed:**
   - Copy new ngrok URL
   - Update `client/config.js`
   - Commit and push:
     ```bash
     git add client/config.js
     git commit -m "Update ngrok URL"
     git push
     ```
   - Vercel auto-deploys in ~30 seconds

---

## 🛠️ Troubleshooting

### "Cannot connect to server"
- ✅ Check backend is running: `http://localhost:3000/api/health`
- ✅ Check ngrok is running
- ✅ Verify ngrok URL in `config.js`

### "CORS error"
- ✅ Add your Vercel URL to `server/index.js`:
  ```javascript
  const allowedOrigins = [
    'https://your-vercel-app.vercel.app',
  ];
  ```
- ✅ Restart backend

### "Python error"
- ✅ Verify Python installed: `python --version`
- ✅ Install dependencies: `pip install torch transformers sentence-transformers langchain faiss-cpu pypdf`

---

## 💡 Pro Tips

### 1. Get Static ngrok URL
Free ngrok URLs change on restart. Get a static one:

1. Sign up at [ngrok.com](https://ngrok.com) (free)
2. Get your static domain
3. Use: `ngrok http 3000 --domain=your-static-domain.ngrok-free.app`

### 2. Auto-Start Backend with PM2
Never worry about keeping terminal open:

```bash
npm install -g pm2
cd server
pm2 start index.js --name pdf-backend
pm2 startup  # Auto-start on system boot
pm2 save
```

View logs:
```bash
pm2 logs pdf-backend
```

### 3. Use Environment Variables
Don't hardcode URLs! In `client/config.js`:

```javascript
window.API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://your-ngrok-url.ngrok-free.app';
```

---

## 📊 Monitor Your App

### Check Backend Health
```bash
curl http://localhost:3000/api/health
```

### Check via ngrok Dashboard
Visit: `http://localhost:4040` (when ngrok is running)

### Vercel Logs
Visit: Vercel Dashboard → Your Project → Deployments → View Logs

---

## 🚀 Next Steps

1. **Add Authentication**: Protect your API
2. **Add Database**: Store analysis history
3. **Improve UI**: Make it prettier
4. **Deploy Backend**: Move to Railway/Render for 24/7 uptime
5. **Add File Storage**: Use AWS S3 for PDFs
6. **Add Rate Limiting**: Prevent abuse

---

## 📚 More Resources

- Full deployment guide: `DEPLOYMENT_GUIDE.md`
- Vercel docs: [vercel.com/docs](https://vercel.com/docs)
- ngrok docs: [ngrok.com/docs](https://ngrok.com/docs)
- Need help? Open an issue on GitHub

---

## ✅ Checklist

- [ ] Backend running on localhost:3000
- [ ] ngrok tunnel active
- [ ] config.js updated with ngrok URL
- [ ] Frontend deployed to Vercel
- [ ] Tested PDF upload
- [ ] Everything working!

---

**Happy summarizing! 🎉**