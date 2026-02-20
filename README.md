# AI Brain Portfolio — Render Deployment Guide

## 📁 Project Structure
```
aibrain-portfolio/
├── server.js          ← Express backend (handles contact form + email)
├── package.json
├── .env.example       ← Copy to .env for local dev
├── .gitignore
└── public/
    ├── index.html
    ├── style.css
    ├── mobile-fix-addon.css
    ├── about-section-redesign.css
    ├── mobile-navbar-scroll-fix.css
    └── logo.jpg
```

---

## 🚀 Step 1 — Push to GitHub

1. Create a new repo on [github.com](https://github.com) (e.g. `aibrain-portfolio`)
2. In this folder, run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aibrain-portfolio.git
git push -u origin main
```

---

## ☁️ Step 2 — Deploy on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Fill in:
   - **Name:** `aibrain-portfolio`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free

---

## 🔑 Step 3 — Set Environment Variables on Render

In Render Dashboard → your service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `EMAIL_USER` | `aibrain.lb@gmail.com` |
| `EMAIL_PASSWORD` | *(your Gmail App Password — see below)* |
| `ADMIN_EMAIL` | `aibrain.lb@gmail.com` |

---

## 📧 Step 4 — Get Gmail App Password

> **Important:** You need an App Password, NOT your regular Gmail password.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. **Security** → **2-Step Verification** → Enable it if not already on
3. Back in Security → scroll down → **App Passwords**
4. Select app: **Mail** → device: **Other** → type `Render`
5. Click **Generate** → copy the 16-character password
6. Paste it as `EMAIL_PASSWORD` in Render

---

## ✅ Done!

Once deployed, every contact form submission will:
1. Return a success message to the visitor
2. Send an email to **aibrain.lb@gmail.com** with all their details
3. The reply-to will be set to the visitor's email so you can reply directly

Your site will be live at: `https://aibrain-portfolio.onrender.com`
