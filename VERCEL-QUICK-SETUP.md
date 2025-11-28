# 🚀 ChiRho Events - Vercel Quick Setup

## ✅ Fix Applied - Deployment Should Work Now!

I've fixed the Vercel error. The changes are pushed to GitHub.

---

## 📋 Step 1: Add Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. For each variable below, click **Add New**

**Copy these variable names and values from your API codes I provided:**

| Variable Name | Where to Get Value |
|--------------|-------------------|
| `DATABASE_URL` | Your Neon connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (starts with `pk_test_`) |
| `CLERK_SECRET_KEY` | Clerk secret key (starts with `sk_test_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (starts with `pk_test_`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_test_`) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | Enter: `chirho-events-files` |
| `R2_PUBLIC_URL` | Enter: `https://chirho-events-files.r2.cloudflarestorage.com` |
| `RESEND_API_KEY` | Resend API key (starts with `re_`) |
| `RESEND_FROM_EMAIL` | Enter: `hello@chirhoevents.com` |
| `NEXT_PUBLIC_APP_URL` | Enter: `https://chirhoevents.com` |
| `NODE_ENV` | Enter: `production` |

**Important:** For each variable, select **all 3 environments**: Production, Preview, Development

---

## 🔄 Step 2: Redeploy

1. Go to **Deployments** tab
2. Click **⋮** (three dots) on latest deployment
3. Select **Redeploy**
4. Uncheck "Use existing Build Cache"
5. Click **Redeploy**

Should deploy successfully now! ✅

---

## 🌐 Step 3: Squarespace DNS Setup for chirhoevents.com

Log into Squarespace → Domains → chirhoevents.com → DNS Settings

### Add These DNS Records:

**Option 1: CNAME (Recommended)**

```
Type: CNAME
Host: @
Points to: cname.vercel-dns.com
TTL: Auto
```

```
Type: CNAME
Host: www
Points to: cname.vercel-dns.com
TTL: Auto
```

### Option 2: A Record (if CNAME doesn't work for @)

```
Type: A
Host: @
Points to: 76.76.21.21
TTL: Auto
```

```
Type: CNAME
Host: www
Points to: cname.vercel-dns.com
TTL: Auto
```

---

## ⏱ DNS Propagation

- Takes 15 min - 48 hours
- Check at [dnschecker.org](https://dnschecker.org)
- Site accessible at Vercel URL immediately

---

## 📞 Quick Links

- **Vercel:** [vercel.com](https://vercel.com)
- **Squarespace DNS:** [domains.squarespace.com](https://domains.squarespace.com)
- **DNS Checker:** [dnschecker.org](https://dnschecker.org)

---

**That's it! Deploy, add DNS records, and you're live!** 🎉
