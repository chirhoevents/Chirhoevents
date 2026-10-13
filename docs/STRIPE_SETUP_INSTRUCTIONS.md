# Stripe Setup Instructions for ChiRho Events Subscription Tiers

This guide explains how to set up subscription products and prices in Stripe for ChiRho Events.

> **Source of truth:** prices live in `src/lib/subscription-tiers.ts`. If you change a price
> there, create a matching new price in Stripe and update the env var below. Existing
> organizations keep the price saved on their record until you edit it in master admin.
>
> The Chapel monthly price can use `STRIPE_PRICE_CHAPEL_MONTHLY` or the older
> `STRIPE_PRICE_STARTER_MONTHLY`; both work.

## Subscription Tier Overview

Paying yearly gets 2 months free on every plan (annual = monthly x 10).

| Tier | Monthly | Annual | One-Time Setup Fee | Events/Year | Max People | Includes |
|------|---------|--------|--------------------|-------------|------------|----------|
| **Chapel** | $39/mo | $390/year | $50 (account + branding set up, no call) | 5 simple events + unlimited faith formation | Unlimited | Lux |
| **Parish** | $59/mo | $590/year | $50 (account + branding set up, no call) | 10 simple events + unlimited faith formation | Unlimited | Lux |
| **Cathedral** | $150/mo | $1,500/year | $250 (includes 1-hour setup call) | 5 | 1,250 | Events portal, POROS, SALVE, RAPHA |
| **Shrine** | $200/mo | $2,000/year | $400 (includes 1-hour setup call) | 10 | 3,000 | Events portal, POROS, SALVE, RAPHA |
| **Basilica** | n/a | Starting at $5,000/year | Custom | Unlimited | Custom | All features |

## Other Fees

- **Extra help** (training, custom setup beyond what the setup fee covers): $90/hour
- **Event overage:** $50 per event over the plan limit
- **Reactivation** after canceling: one month of the plan ($39 / $59 / $150 / $200)
- **Platform fee:** 1%, only on online card payments made through ChiRho (not checks, cash, or outside payment systems)

---

## Step 1: Access Stripe Dashboard

1. Log in to your Stripe account at https://dashboard.stripe.com
2. Make sure you're in **Live Mode** (not Test Mode) for production setup
3. Navigate to **Products** in the left sidebar

---

## Step 2: Create Products for Each Tier

For each subscription tier, create a **Product** in Stripe:

### Chapel Product
1. Click **+ Add product**
2. **Name:** `ChiRho Events - Chapel`
3. **Description:** `Chapel subscription - Lux: 5 simple events/year, unlimited faith formation`
4. **Pricing:** Recurring
5. Click **Add product**

### Parish Product
1. Click **+ Add product**
2. **Name:** `ChiRho Events - Parish`
3. **Description:** `Parish subscription - Lux: 10 simple events/year, unlimited faith formation`
4. **Pricing:** Recurring
5. Click **Add product**

### Cathedral Product
1. Click **+ Add product**
2. **Name:** `ChiRho Events - Cathedral`
3. **Description:** `Cathedral subscription - 5 events/year, 1,250 people max, includes POROS/SALVE/RAPHA`
4. **Pricing:** Recurring
5. Click **Add product**

### Shrine Product
1. Click **+ Add product**
2. **Name:** `ChiRho Events - Shrine`
3. **Description:** `Shrine subscription - 10 events/year, 3,000 people max, includes POROS/SALVE/RAPHA`
4. **Pricing:** Recurring
5. Click **Add product**

---

## Step 3: Create Prices for Each Product

For each product, create a monthly and a yearly price:

### Chapel Prices
On the Chapel product, add TWO prices:

**Monthly Price:**
- **Pricing model:** Standard pricing
- **Price:** $39.00 USD
- **Billing period:** Monthly
- **Price ID:** Copy this for `STRIPE_PRICE_CHAPEL_MONTHLY`

**Annual Price:**
- **Pricing model:** Standard pricing
- **Price:** $390.00 USD
- **Billing period:** Yearly
- **Price ID:** Copy this for `STRIPE_PRICE_CHAPEL_ANNUAL`

### Parish Prices
On the Parish product, add TWO prices:

**Monthly Price:**
- **Pricing model:** Standard pricing
- **Price:** $59.00 USD
- **Billing period:** Monthly
- **Price ID:** Copy this for `STRIPE_PRICE_PARISH_MONTHLY`

**Annual Price:**
- **Pricing model:** Standard pricing
- **Price:** $590.00 USD
- **Billing period:** Yearly
- **Price ID:** Copy this for `STRIPE_PRICE_PARISH_ANNUAL`

### Cathedral Prices
On the Cathedral product, add TWO prices:

**Monthly Price:**
- **Pricing model:** Standard pricing
- **Price:** $150.00 USD
- **Billing period:** Monthly
- **Price ID:** Copy this for `STRIPE_PRICE_CATHEDRAL_MONTHLY`

**Annual Price:**
- **Pricing model:** Standard pricing
- **Price:** $1,500.00 USD
- **Billing period:** Yearly
- **Price ID:** Copy this for `STRIPE_PRICE_CATHEDRAL_ANNUAL`

### Shrine Prices
On the Shrine product, add TWO prices:

**Monthly Price:**
- **Pricing model:** Standard pricing
- **Price:** $200.00 USD
- **Billing period:** Monthly
- **Price ID:** Copy this for `STRIPE_PRICE_SHRINE_MONTHLY`

**Annual Price:**
- **Pricing model:** Standard pricing
- **Price:** $2,000.00 USD
- **Billing period:** Yearly
- **Price ID:** Copy this for `STRIPE_PRICE_SHRINE_ANNUAL`

---

## Step 4: Configure Environment Variables

Add the following environment variables to your `.env` file (or Vercel/deployment environment):

```env
# Stripe API Keys (replace with your actual keys from Stripe Dashboard)
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# Subscription Price IDs (copy from Stripe Dashboard after creating prices)
STRIPE_PRICE_CHAPEL_MONTHLY=<price-id-from-stripe>
STRIPE_PRICE_CHAPEL_ANNUAL=<price-id-from-stripe>
STRIPE_PRICE_PARISH_MONTHLY=<price-id-from-stripe>
STRIPE_PRICE_PARISH_ANNUAL=<price-id-from-stripe>
STRIPE_PRICE_CATHEDRAL_MONTHLY=<price-id-from-stripe>
STRIPE_PRICE_CATHEDRAL_ANNUAL=<price-id-from-stripe>
STRIPE_PRICE_SHRINE_MONTHLY=<price-id-from-stripe>
STRIPE_PRICE_SHRINE_ANNUAL=<price-id-from-stripe>
```

**Note:** Replace all `<placeholder>` values with your actual Stripe keys and Price IDs from Step 3.

---

## Step 5: Set Up Webhooks

1. Navigate to **Developers** > **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`
4. **Events to send:** Select the following events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** and add it as `STRIPE_WEBHOOK_SECRET` in your environment variables

---

## Step 6: Basilica (Enterprise) Tier Handling

The Basilica tier uses **custom pricing** and **manual invoicing**. This tier does NOT use Stripe subscriptions.

For Basilica organizations:
1. Create invoices manually in the ChiRho Events master admin dashboard
2. Send invoices via email with payment links
3. Accept payment via check or online payment
4. Track payment status in the billing dashboard

---

## Annual Billing Workflow

For organizations on annual billing (Cathedral, Shrine, Basilica):

### Automatic Reminders
The system sends automatic email reminders at:
- **30 days** before renewal
- **14 days** before renewal
- **7 days** before renewal

To run the reminder cron job manually:
```bash
curl -X GET https://your-domain.com/api/cron/annual-renewal-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Physical Letter Notifications
For organizations requiring physical letters:
1. Run the annual renewal reminders endpoint with `?dryRun=false`
2. Check the `physicalLettersList` in the response
3. The list includes:
   - Organization name
   - Billing address
   - Renewal date
   - Annual amount
4. Use this list to prepare and mail physical renewal letters

### Invoice Generation
Invoices are generated automatically via the cron job at:
```
/api/cron/generate-invoices
```

You can also manually trigger invoice generation from the master admin billing dashboard.

---

## Testing Stripe Integration

### Test Mode Setup
1. Toggle to **Test Mode** in Stripe Dashboard
2. Create test products and prices (same process as above)
3. Use test API keys in your development environment
4. Use Stripe test cards for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Verify Webhook Delivery
1. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
2. Check webhook logs in Stripe Dashboard under **Developers** > **Webhooks**

---

## Migration from Old Tier Names

If you have existing organizations with old tier names, the system automatically maps:

| Old Tier Name | Current Tier Name |
|---------------|-------------------|
| `starter` (DB enum) | **Chapel** (display name) |
| `small_diocese` | `Parish` |
| `growing` | `Cathedral` |
| `conference` | `Shrine` |
| `enterprise` | `Basilica` |

The old environment variables still work for backward compatibility:
- `STRIPE_PRICE_STARTER_MONTHLY` → Maps to Chapel pricing (DB enum value preserved)
- `STRIPE_PRICE_SMALL_DIOCESE_MONTHLY` → Maps to Parish pricing
- `STRIPE_PRICE_GROWING_MONTHLY` → Maps to Cathedral pricing
- `STRIPE_PRICE_CONFERENCE_MONTHLY` → Maps to Shrine pricing

However, we recommend updating to the new naming convention.

---

## Troubleshooting

### "No Stripe price configured" Error
- Verify the Price ID is correct in your environment variables
- Ensure you're using the correct mode (Test vs Live)
- Check that the product and price exist in your Stripe Dashboard

### Webhook Events Not Processing
- Verify the webhook endpoint URL is correct
- Check the webhook signing secret matches
- Review webhook logs in Stripe Dashboard for errors

### Subscription Not Creating
- Ensure the customer has a valid email
- Check Stripe Dashboard for failed payment attempts
- Verify the price ID exists and is active

---

## Support

For billing questions or Stripe integration issues, contact:
- **Technical Support:** support@chirhoevents.com
- **Billing Questions:** billing@chirhoevents.com

---

**Last Updated:** January 2026
