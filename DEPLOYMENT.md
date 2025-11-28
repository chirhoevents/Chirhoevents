# ChiRho Events - Vercel Deployment Guide

## 🚀 Quick Start

Your ChiRho Events landing page is ready to deploy! Follow these steps to go live on Vercel.

---

## 📋 Prerequisites

Before deploying, make sure you have:

1. ✅ **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. ✅ **Domain Ready** - chirhoevents.com (from Squarespace)
3. ✅ **API Keys Ready** (for future features):
   - Clerk (authentication)
   - Stripe (payments)
   - Neon PostgreSQL (database)
   - Resend (email)
   - Cloudflare R2 (file storage)

---

## 🎯 Deployment Steps

### Step 1: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub account
4. Choose the **chirhoevents/Chirhoevents** repository
5. Select the branch: `claude/catholic-event-registration-01Uy2D4n6tjNEmHqykwdy8nm`

### Step 2: Configure Project

Vercel will auto-detect Next.js. Verify these settings:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (leave default)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### Step 3: Environment Variables (Optional for Landing Page)

For now, the landing page doesn't need environment variables. But when you're ready to add functionality, add these in Vercel:

Go to **Settings** → **Environment Variables** and add:

```
# Database (when ready)
DATABASE_URL=your_neon_postgresql_url

# Clerk (when adding authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Stripe (when adding payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Resend (when adding email)
RESEND_API_KEY=your_resend_api_key

# Cloudflare R2 (when adding file uploads)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
```

### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Vercel will give you a URL like: `chirhoevents.vercel.app`

### Step 5: Connect Custom Domain

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your domain: `chirhoevents.com`
3. Vercel will provide DNS records

**In Squarespace (or your DNS provider):**

Add these DNS records (provided by Vercel):

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Wait 24-48 hours for DNS propagation**

---

## ✅ Verify Deployment

Once deployed, test these:

- [ ] Landing page loads at your domain
- [ ] All 8 sections render correctly
- [ ] Navigation links work
- [ ] Mobile responsive
- [ ] Contact form displays (not functional yet, that's next phase)
- [ ] Pricing tables show correctly
- [ ] FAQ accordion works

---

## 🔄 Future Updates

Every time you push to the `claude/catholic-event-registration-01Uy2D4n6tjNEmHqykwdy8nm` branch:

1. Vercel auto-detects the push
2. Automatically builds and deploys
3. Live in ~2 minutes!

**No manual deployment needed!**

---

## 🛠 Local Development

Want to test locally before deploying?

```bash
# Install dependencies (if not done)
npm install

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

---

## 📊 What You've Built

✅ **Complete Landing Page** with:
- Hero section with value proposition
- Cost comparison table (30% savings)
- 6 feature cards
- Founder story
- 5 pricing tiers
- FAQ accordion
- Contact form UI
- Professional footer

✅ **Tech Stack:**
- Next.js 14 (React framework)
- TypeScript (type safety)
- Tailwind CSS (styling with brand colors)
- Radix UI (accessible components)
- Optimized for SEO and performance

✅ **Ready for Next Steps:**
- Database schema designed (62 tables)
- API documentation complete
- Development roadmap planned
- All dependencies installed

---

## 🎯 Next Phase: Full Registration System

Once the landing page is live, next steps are:

1. **Month 1:** Group & individual registration
2. **Month 2:** Liability forms system
3. **Month 3:** Poros Portal (housing assignments)
4. **Month 4:** SALVE check-in system
5. **Month 5:** Rapha medical platform
6. **Month 6:** Integrations (Sheets, Mailchimp, QuickBooks)

See `docs/chirho-development-roadmap.md` for full timeline.

---

## 📞 Need Help?

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **Your Specs:** All in `/docs` folder

---

## 🎉 You're Ready!

Your ChiRho Events landing page is production-ready and optimized for performance. Deploy to Vercel and start sharing with potential customers!

**Deployment URL:** chirhoevents.com (once DNS configured)
**GitHub Branch:** claude/catholic-event-registration-01Uy2D4n6tjNEmHqykwdy8nm

Good luck! 🚀
