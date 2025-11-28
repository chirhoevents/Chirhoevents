# ChiRho Events - Deployment Guide
**Version:** 1.0  
**Date:** November 26, 2025  
**Infrastructure:** Railway + Neon + Cloudflare R2 + Stripe + Clerk

---

## 🎯 Deployment Overview

**Environments:**
1. **Development:** Your local machine (`localhost:3000`)
2. **Staging:** `staging.chirhoevents.com` (testing)
3. **Production:** `chirhoevents.com` (live)

**Deployment Flow:**
```
Local Development → GitHub → Railway Auto-Deploy → Production
```

---

## 📋 Pre-Deployment Checklist

Before starting deployment, ensure you have:
- [ ] GitHub account
- [ ] Railway account
- [ ] Neon account
- [ ] Cloudflare account
- [ ] Stripe account
- [ ] Clerk account
- [ ] Domain name (chirhoevents.com)
- [ ] Credit card for paid services

---

## 🏗️ STEP 1: GitHub Repository Setup

### **1.1 Create Repository**

```bash
# Option A: Claude Code will create this for you
# (Recommended - Claude Code handles Git setup)

# Option B: Manual setup
git init
git remote add origin https://github.com/your-username/chirho-events.git
```

### **1.2 Repository Structure**
```
chirho-events/
├── app/                    # Next.js pages
├── components/             # React components
├── lib/                    # Utilities
├── prisma/                 # Database schema
├── public/                 # Static assets
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore file
├── package.json            # Dependencies
├── next.config.js          # Next.js config
└── README.md               # Documentation
```

### **1.3 Branch Strategy**

**Main Branch:** `main` (production)
- Deploys to: chirhoevents.com
- Requires approval before merge

**Staging Branch:** `staging` (testing)
- Deploys to: staging.chirhoevents.com
- Test features here first

**Feature Branches:** `feature/registration`, `feature/poros`, etc.
- Merge to staging first
- Then merge staging to main

---

## 🗄️ STEP 2: Neon Database Setup

### **2.1 Create Neon Account**

1. Go to: https://neon.tech
2. Sign up (free tier available)
3. Verify email

### **2.2 Create Database**

1. **Create new project:**
   - Name: `chirho-events-production`
   - Region: US East (Ohio) or closest to your users
   - Postgres version: 15

2. **Get connection string:**
   ```
   postgres://[user]:[password]@[host]/[database]?sslmode=require
   ```
   Example:
   ```
   postgres://juanito:abc123xyz@ep-cool-sound-123456.us-east-2.aws.neon.tech/chirhoevents?sslmode=require
   ```

3. **Save connection string** (you'll need this for Railway)

### **2.3 Create Staging Database**

Repeat above steps for staging:
- Name: `chirho-events-staging`
- Save connection string separately

### **2.4 Configure Neon Settings**

**Compute Settings:**
- Autoscaling: ON (0.25 - 2 CU)
- Auto-suspend: After 5 minutes
- Storage: Unlimited

**Backups:**
- Point-in-Time Recovery: ON (30 days)
- Daily snapshots: Enabled

**Connection Pooling:**
- Enabled
- Mode: Transaction
- Max connections: 100

---

## ☁️ STEP 3: Cloudflare R2 Setup

### **3.1 Create Cloudflare Account**

1. Go to: https://cloudflare.com
2. Sign up
3. Navigate to R2 Storage

### **3.2 Create R2 Bucket**

1. **Create bucket:**
   - Name: `chirho-events-files`
   - Location: Automatic

2. **Create API token:**
   - Permissions: Object Read & Write
   - Save Access Key ID and Secret Access Key

3. **Configure CORS (if needed):**
   ```json
   [
     {
       "AllowedOrigins": ["https://chirhoevents.com", "https://staging.chirhoevents.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```

4. **Get connection details:**
   ```
   Account ID: abc123...
   Access Key ID: xyz789...
   Secret Access Key: secret123...
   Endpoint: https://[account-id].r2.cloudflarestorage.com
   Bucket: chirho-events-files
   ```

---

## 🔐 STEP 4: Clerk Authentication Setup

### **4.1 Create Clerk Account**

1. Go to: https://clerk.com
2. Sign up
3. Create application: "ChiRho Events"

### **4.2 Configure Clerk**

**Application Settings:**
- Name: ChiRho Events
- Logo: Upload Chi-Rho logo
- Brand color: #1E3A5F (navy)
- Support email: support@chirhoevents.com

**Sign-In Options:**
- Email + Password: ON
- Magic Links: ON
- Google: ON (optional)
- Two-Factor: Optional

**User Profile Fields:**
- First Name: Required
- Last Name: Required
- Phone: Optional
- Organization: Custom field

### **4.3 Get API Keys**

Navigate to API Keys:
- **Publishable Key:** `pk_test_...` (client-side)
- **Secret Key:** `sk_test_...` (server-side)

Save both keys for Railway environment variables.

### **4.4 Configure Domains**

**Development:**
- Allowed: `localhost:3000`

**Staging:**
- Allowed: `staging.chirhoevents.com`

**Production:**
- Allowed: `chirhoevents.com`

---

## 💳 STEP 5: Stripe Setup

### **5.1 Create Stripe Account**

1. Go to: https://stripe.com
2. Sign up
3. Verify business information

### **5.2 Enable Stripe Connect**

1. Navigate to: Connect → Get Started
2. Select: Platform
3. Application name: ChiRho Events
4. Branding: Upload logo

### **5.3 Configure Stripe Connect**

**Platform Settings:**
- Account types: Standard
- Onboarding: Express (easier for users)
- Branding: Navy & gold colors

**Fees:**
- Application fee: 0.3% (our cut) + Stripe fees
- Total: 3.06% per transaction

### **5.4 Get API Keys**

**Test Mode:**
- Publishable Key: `pk_test_...`
- Secret Key: `sk_test_...`

**Live Mode:**
- Publishable Key: `pk_live_...`
- Secret Key: `sk_live_...`

Save all keys for environment variables.

### **5.5 Test Cards**

For testing payments:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
CVV: 123
Exp: 12/34
ZIP: 12345
```

---

## 📧 STEP 6: Resend Email Setup

### **6.1 Create Resend Account**

1. Go to: https://resend.com
2. Sign up
3. Verify email

### **6.2 Add Domain**

1. **Add domain:** chirhoevents.com
2. **Add DNS records** (in Cloudflare):
   ```
   Type: TXT
   Name: @
   Value: [provided by Resend]
   
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]
   ```

3. **Verify domain** (can take up to 72 hours)

### **6.3 Create API Key**

1. Navigate to API Keys
2. Create key: "Production"
3. Save key: `re_...`

### **6.4 Test Email**

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@chirhoevents.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test"
  }'
```

---

## 🚂 STEP 7: Railway Deployment

### **7.1 Create Railway Account**

1. Go to: https://railway.app
2. Sign up with GitHub
3. Connect GitHub repository

### **7.2 Create Project**

1. **New Project → Deploy from GitHub**
2. Select repository: `chirho-events`
3. Railway detects: Next.js app
4. Auto-configures build settings

### **7.3 Configure Environment Variables**

Navigate to: Variables → Add Variables

**Production Environment:**
```bash
# Database
DATABASE_URL=postgres://[neon-connection-string]

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare R2
R2_ACCOUNT_ID=abc123...
R2_ACCESS_KEY_ID=xyz789...
R2_SECRET_ACCESS_KEY=secret123...
R2_BUCKET_NAME=chirho-events-files

# Resend
RESEND_API_KEY=re_...

# Next.js
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://chirhoevents.com
```

**Staging Environment:**
```bash
# Same as above but with staging keys/URLs
DATABASE_URL=postgres://[neon-staging-connection-string]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_BASE_URL=https://staging.chirhoevents.com
```

### **7.4 Configure Build Settings**

Railway auto-detects Next.js:
```
Build Command: npm run build
Start Command: npm start
Node Version: 20
```

### **7.5 Deploy**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Railway auto-deploys:**
   - Detects push
   - Installs dependencies
   - Runs build
   - Deploys to Railway URL
   - Process takes 2-3 minutes

3. **Check deployment:**
   - Railway provides URL: `chirho-events-production.up.railway.app`
   - Visit URL to verify deployment

---

## 🌐 STEP 8: Domain Configuration

### **8.1 Add Custom Domain (Railway)**

1. **In Railway → Settings → Domains**
2. **Add domain:** `chirhoevents.com`
3. **Add staging:** `staging.chirhoevents.com`

### **8.2 Configure DNS (Cloudflare)**

1. **Go to Cloudflare Dashboard**
2. **Add site:** chirhoevents.com
3. **Update nameservers** at domain registrar (GoDaddy, Namecheap, etc.)

4. **Add DNS records:**

```
Type: CNAME
Name: @
Target: [railway-provided-url]
Proxy: ON (orange cloud)

Type: CNAME
Name: staging
Target: [railway-staging-url]
Proxy: ON
```

5. **SSL/TLS Settings:**
   - Mode: Full (strict)
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON

6. **Wait for propagation** (5-30 minutes)

### **8.3 Verify Domain**

Visit:
- https://chirhoevents.com → Should load
- https://staging.chirhoevents.com → Should load
- Both should have valid SSL (green lock)

---

## 🔄 STEP 9: Database Migration

### **9.1 Run Prisma Migrations**

Once deployed to Railway:

```bash
# Railway runs this automatically on deploy:
npx prisma migrate deploy

# This creates all 62 tables in Neon
```

### **9.2 Verify Tables**

In Neon Dashboard:
1. Navigate to SQL Editor
2. Run query:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
3. Should see 62 tables

### **9.3 Seed Data (Optional)**

For testing, seed with sample data:

```bash
npx prisma db seed
```

Creates:
- Test organization
- Test event
- Test pricing
- Sample rooms

---

## 🔔 STEP 10: Webhook Configuration

### **10.1 Stripe Webhooks**

1. **In Stripe Dashboard → Developers → Webhooks**
2. **Add endpoint:**
   ```
   URL: https://chirhoevents.com/api/webhooks/stripe
   Events to listen:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
   ```

3. **Get webhook secret:** `whsec_...`
4. **Add to Railway:** `STRIPE_WEBHOOK_SECRET`

### **10.2 Clerk Webhooks**

1. **In Clerk Dashboard → Webhooks**
2. **Add endpoint:**
   ```
   URL: https://chirhoevents.com/api/webhooks/clerk
   Events:
   - user.created
   - user.updated
   - user.deleted
   - session.created
   ```

3. **Get signing secret**
4. **Add to Railway:** `CLERK_WEBHOOK_SECRET`

---

## 📊 STEP 11: Monitoring Setup

### **11.1 Railway Metrics**

Built-in monitoring:
- CPU usage
- Memory usage
- Network I/O
- Deploy history
- Logs

Access: Railway Dashboard → Metrics

### **11.2 Error Logging**

Railway captures:
- Application errors
- Build errors
- Crash logs

Access: Railway Dashboard → Logs

### **11.3 Uptime Monitoring (Optional)**

Use external service:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom** (paid)

Monitor:
- https://chirhoevents.com (main site)
- https://chirhoevents.com/api/health (API endpoint)

---

## 🚀 STEP 12: Launch Checklist

### **Pre-Launch:**
- [ ] All environment variables set
- [ ] Database migrated (62 tables)
- [ ] Domain DNS configured
- [ ] SSL certificates active
- [ ] Stripe webhooks configured
- [ ] Clerk webhooks configured
- [ ] Email domain verified
- [ ] Test payment successful
- [ ] Test registration complete
- [ ] Landing page loads

### **Launch Day:**
- [ ] Switch from test mode to live mode (Stripe/Clerk)
- [ ] Update environment variables with live keys
- [ ] Deploy to production
- [ ] Test live payment with real card
- [ ] Monitor for errors
- [ ] Announce launch

### **Post-Launch:**
- [ ] Monitor uptime
- [ ] Check error logs
- [ ] Review performance
- [ ] Collect user feedback
- [ ] Plan improvements

---

## 🔧 STEP 13: Continuous Deployment

### **13.1 Auto-Deploy Flow**

```
1. Code on local machine
2. Commit to Git: git commit -m "Add feature X"
3. Push to GitHub: git push origin staging
4. Railway detects push
5. Railway auto-builds
6. Railway auto-deploys to staging
7. Test on staging
8. Merge staging to main: git merge staging
9. Railway deploys to production
10. Live in 2-3 minutes
```

### **13.2 Rollback Process**

If deployment breaks:

**Option A: Rollback in Railway**
1. Go to Railway Dashboard
2. Navigate to Deployments
3. Click on previous working deploy
4. Click "Redeploy"
5. Live in 30 seconds

**Option B: Git Revert**
```bash
git revert HEAD
git push origin main
# Railway auto-deploys previous version
```

---

## 💾 STEP 14: Backup Strategy

### **14.1 Database Backups**

**Automatic (Neon):**
- Point-in-Time Recovery: Last 30 days
- Daily snapshots: Kept for 30 days

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%F).sql
```

**Restore:**
```bash
psql $DATABASE_URL < backup-2026-07-15.sql
```

### **14.2 File Backups (R2)**

**Weekly backup to AWS S3:**
```bash
# Script runs weekly
aws s3 sync s3://chirho-events-files s3://chirho-backup/$(date +%F)/
```

### **14.3 Code Backups**

**GitHub = backup:**
- All code versioned
- Can restore any commit
- Protected main branch

---

## 🔒 STEP 15: Security Checklist

### **Pre-Production:**
- [ ] All secrets in environment variables (not code)
- [ ] `.env` files in `.gitignore`
- [ ] API keys rotated from test to production
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Row-Level Security (RLS) policies active

### **Post-Launch:**
- [ ] Monitor for unusual activity
- [ ] Review access logs weekly
- [ ] Rotate API keys quarterly
- [ ] Update dependencies monthly
- [ ] Security audit annually

---

## 📈 STEP 16: Performance Optimization

### **16.1 Next.js Optimizations**

**Already included:**
- Static page generation where possible
- Image optimization (next/image)
- Code splitting (automatic)
- Tree shaking (removes unused code)

**Additional:**
- Use `revalidate` for ISR (Incremental Static Regeneration)
- Lazy load heavy components
- Implement caching headers

### **16.2 Database Optimizations**

**Indexes:**
All common queries indexed:
```sql
CREATE INDEX idx_group_event ON group_registrations(event_id);
CREATE INDEX idx_user_org ON users(organization_id);
-- ... see database schema for all indexes
```

**Connection Pooling:**
- Enabled via Neon
- Max connections: 100

### **16.3 CDN (Cloudflare)**

**Auto-enabled:**
- Static assets cached
- Images cached
- API responses not cached

**Cache rules:**
- HTML: 1 hour
- CSS/JS: 1 year
- Images: 1 year

---

## 🆘 STEP 17: Troubleshooting

### **Common Issues:**

#### **Issue: "Application failed to start"**
**Cause:** Missing environment variable
**Fix:**
1. Check Railway logs
2. Compare environment variables with `.env.example`
3. Add missing variables
4. Redeploy

#### **Issue: "Database connection failed"**
**Cause:** Invalid connection string
**Fix:**
1. Verify DATABASE_URL in Railway
2. Test connection in Neon dashboard
3. Check for typos
4. Ensure `?sslmode=require` at end

#### **Issue: "Stripe webhook failing"**
**Cause:** Incorrect webhook secret
**Fix:**
1. Get new secret from Stripe dashboard
2. Update STRIPE_WEBHOOK_SECRET in Railway
3. Test webhook in Stripe dashboard

#### **Issue: "Images not uploading"**
**Cause:** R2 credentials incorrect
**Fix:**
1. Verify R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
2. Check bucket name
3. Test upload manually

#### **Issue: "Emails not sending"**
**Cause:** Domain not verified in Resend
**Fix:**
1. Check DNS records in Cloudflare
2. Wait up to 72 hours for propagation
3. Test domain verification in Resend

---

## 📞 STEP 18: Support Setup

### **Support Email:**
Create: support@chirhoevents.com

**Forward to:**
- Your personal email
- Or Zendesk/Help Scout (future)

### **Status Page (Optional):**
Use StatusCake or similar:
- Show uptime
- Announce maintenance
- Report incidents

### **Documentation:**
Create help center:
- How to register
- How to use Poros Portal
- How to check in with SALVE
- FAQs

---

## 🎉 STEP 19: Launch!

### **Launch Day Checklist:**

**Morning:**
- [ ] Switch Stripe to live mode
- [ ] Switch Clerk to live mode
- [ ] Update all live API keys in Railway
- [ ] Deploy to production
- [ ] Test live registration ($1 test)
- [ ] Verify email confirmations
- [ ] Check SALVE check-in

**Afternoon:**
- [ ] Announce on social media
- [ ] Email beta customers
- [ ] Post in Catholic youth ministry forums
- [ ] Contact dioceses directly

**Evening:**
- [ ] Monitor error logs
- [ ] Check uptime
- [ ] Review first registrations
- [ ] Respond to support emails

**Week 1:**
- [ ] Daily monitoring
- [ ] Quick bug fixes
- [ ] User feedback collection
- [ ] Performance optimization

---

## 🔄 STEP 20: Update Process

### **Regular Updates:**

**Weekly:**
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Test locally
npm run dev

# Push to staging
git push origin staging

# Test on staging
# If good, merge to main
git checkout main
git merge staging
git push origin main

# Railway auto-deploys
```

**Security Updates:**
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Deploy immediately if critical
```

**Feature Updates:**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Develop feature
# ...

# Push to staging
git push origin staging

# Test thoroughly

# Merge to main
git checkout main
git merge staging
git push origin main
```

---

## 📊 Cost Summary

### **Monthly Costs (100 Organizations):**

| Service | Plan | Cost |
|---------|------|------|
| Railway | Pro | $20 |
| Neon | Launch | $19 |
| Cloudflare R2 | Pay-as-go | ~$15 |
| Clerk | Pro | $25 |
| Stripe | Pay-as-go | 3.06% fees |
| Resend | Pro | $20 |
| Domain | Annual | $1/mo |
| **Total** | | **~$100/mo** |

**At 100 Organizations:**
- Revenue: $9,900/mo (avg $99/org)
- Costs: $100/mo
- **Profit: $9,800/mo (98.9% margin)**

---

## ✅ Deployment Complete!

**You now have:**
- ✅ Production site at chirhoevents.com
- ✅ Staging site at staging.chirhoevents.com
- ✅ Database with 62 tables
- ✅ File storage configured
- ✅ Payment processing live
- ✅ Email system active
- ✅ SSL certificates
- ✅ Auto-deployment from GitHub
- ✅ Monitoring active
- ✅ Backups configured

**Next Steps:**
1. Create first organization (yours - Mount 2000)
2. Create first event
3. Test full workflow
4. Invite beta users
5. Collect feedback
6. Iterate and improve

---

**END OF DEPLOYMENT GUIDE**

**Total Setup Time:** 2-4 hours  
**Complexity:** Medium (well-documented)  
**Support:** Railway, Neon, Cloudflare all have excellent docs  
**Cost:** ~$100/month (scales linearly)
