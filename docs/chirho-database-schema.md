# ChiRho Events - Complete Database Schema
**Version:** 1.0  
**Date:** November 26, 2025  
**Database:** PostgreSQL 15 (Neon)  
**Total Tables:** 62

---

## 🗄️ Database Overview

**Architecture:** Shared database with Row-Level Security (RLS)  
**Isolation:** Organization-level (each org sees only their data)  
**Backup:** Daily snapshots + point-in-time recovery  
**Encryption:** AES-256 at rest, TLS 1.3 in transit

---

## 📋 Table of Contents

1. [Core Tables](#core-tables) (Organizations, Users, Events)
2. [Registration Tables](#registration-tables) (Groups, Individuals, Participants)
3. [Liability Form Tables](#liability-form-tables)
4. [Payment Tables](#payment-tables)
5. [Poros Portal Tables](#poros-portal-tables)
6. [SALVE Check-In Tables](#salve-check-in-tables)
7. [Rapha Medical Tables](#rapha-medical-tables)
8. [Communication Tables](#communication-tables)
9. [Reporting Tables](#reporting-tables)
10. [System Tables](#system-tables)

---

## 1. CORE TABLES

### **organizations**
Master table for all organizations (dioceses, archdioceses, retreat centers)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique organization ID |
| name | VARCHAR(255) | NOT NULL | Organization name |
| type | ENUM | NOT NULL | 'diocese', 'archdiocese', 'parish', 'retreat_center', 'other' |
| address | JSONB | | Full address object |
| contact_name | VARCHAR(255) | | Primary contact person |
| contact_email | VARCHAR(255) | NOT NULL, UNIQUE | Contact email |
| contact_phone | VARCHAR(20) | | Contact phone |
| stripe_account_id | VARCHAR(255) | UNIQUE | Stripe Connect account ID |
| subscription_tier | ENUM | NOT NULL | 'starter', 'small', 'growing', 'conference', 'enterprise' |
| subscription_status | ENUM | NOT NULL | 'active', 'archived', 'suspended', 'trial' |
| monthly_fee | DECIMAL(10,2) | NOT NULL | Current monthly subscription cost |
| setup_fee_paid | BOOLEAN | DEFAULT FALSE | Whether $250 setup fee paid |
| reactivation_fee_paid | BOOLEAN | DEFAULT FALSE | Whether $75 reactivation fee paid |
| storage_used_gb | DECIMAL(10,2) | DEFAULT 0 | Current storage usage |
| storage_limit_gb | INT | NOT NULL | Storage limit based on tier |
| events_per_year_limit | INT | | Events allowed per year |
| logo_url | TEXT | | Organization logo URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |
| archived_at | TIMESTAMPTZ | | When account was archived |

**Indexes:**
- `idx_org_email` on `contact_email`
- `idx_org_stripe` on `stripe_account_id`

---

### **users**
All users in the system (admins, group leaders, individuals)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User ID (from Clerk) |
| organization_id | UUID | FOREIGN KEY → organizations(id) | Which org user belongs to |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email |
| first_name | VARCHAR(255) | NOT NULL | First name |
| last_name | VARCHAR(255) | NOT NULL | Last name |
| preferred_name | VARCHAR(255) | | Display name/nickname |
| role | ENUM | NOT NULL | 'master_admin', 'org_admin', 'group_leader', 'individual', 'parent', 'salve_user', 'rapha_user' |
| phone | VARCHAR(20) | | Phone number |
| created_by | UUID | FOREIGN KEY → users(id) | Who created this user |
| last_login | TIMESTAMPTZ | | Last login timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_user_org` on `organization_id`
- `idx_user_email` on `email`
- `idx_user_role` on `role`

**RLS Policy:**
```sql
CREATE POLICY "Users can only see their organization"
ON users FOR ALL
USING (organization_id = current_user_organization_id() 
       OR current_user_role() = 'master_admin');
```

---

### **events**
Individual events/conferences created by organizations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Event ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | Which org owns this event |
| name | VARCHAR(255) | NOT NULL | Event name |
| slug | VARCHAR(255) | NOT NULL, UNIQUE | URL slug (mount2000-2026) |
| description | TEXT | | Event description |
| start_date | DATE | NOT NULL | Event start date |
| end_date | DATE | NOT NULL | Event end date |
| timezone | VARCHAR(50) | NOT NULL | Event timezone (America/New_York) |
| location_name | VARCHAR(255) | | Venue name |
| location_address | JSONB | | Venue address |
| capacity_total | INT | | Total capacity (individuals) |
| capacity_remaining | INT | | Remaining spots |
| registration_open_date | TIMESTAMPTZ | | When registration opens |
| registration_close_date | TIMESTAMPTZ | | When registration closes |
| status | ENUM | NOT NULL | 'draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed' |
| created_by | UUID | FOREIGN KEY → users(id) | Org Admin who created |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_event_org` on `organization_id`
- `idx_event_slug` on `slug`
- `idx_event_dates` on `start_date, end_date`

---

### **event_settings**
Configurable settings per event

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Settings ID |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL, UNIQUE | One settings per event |
| group_registration_enabled | BOOLEAN | DEFAULT TRUE | Allow group registration |
| individual_registration_enabled | BOOLEAN | DEFAULT TRUE | Allow individual registration |
| liability_forms_required_group | BOOLEAN | DEFAULT TRUE | Always required for groups |
| liability_forms_required_individual | BOOLEAN | DEFAULT FALSE | Optional for individuals |
| show_dietary_restrictions | BOOLEAN | DEFAULT TRUE | Show dietary field |
| dietary_restrictions_required | BOOLEAN | DEFAULT FALSE | Make it required |
| show_ada_accommodations | BOOLEAN | DEFAULT TRUE | Show ADA field |
| ada_accommodations_required | BOOLEAN | DEFAULT FALSE | Make it required |
| poros_housing_enabled | BOOLEAN | DEFAULT FALSE | Enable housing assignments |
| poros_priest_housing_enabled | BOOLEAN | DEFAULT FALSE | Enable priest housing |
| poros_seating_enabled | BOOLEAN | DEFAULT FALSE | Enable seating assignments |
| poros_meal_colors_enabled | BOOLEAN | DEFAULT FALSE | Enable meal color system |
| poros_small_group_enabled | BOOLEAN | DEFAULT FALSE | Enable small groups |
| poros_sgl_enabled | BOOLEAN | DEFAULT FALSE | Enable SGL assignments |
| poros_seminarian_enabled | BOOLEAN | DEFAULT FALSE | Enable seminarian assignments |
| poros_religious_staff_enabled | BOOLEAN | DEFAULT FALSE | Enable religious staff |
| poros_ada_enabled | BOOLEAN | DEFAULT FALSE | Enable ADA tracking |
| public_portal_enabled | BOOLEAN | DEFAULT FALSE | Enable public resource portal |
| salve_checkin_enabled | BOOLEAN | DEFAULT FALSE | Enable SALVE check-in |
| rapha_medical_enabled | BOOLEAN | DEFAULT FALSE | Enable medical platform |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **event_pricing**
Pricing configuration per event

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Pricing ID |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| youth_early_bird_price | DECIMAL(10,2) | | Early bird price per youth |
| youth_regular_price | DECIMAL(10,2) | NOT NULL | Regular price per youth |
| youth_late_price | DECIMAL(10,2) | | Late registration price |
| chaperone_early_bird_price | DECIMAL(10,2) | | Early bird chaperone |
| chaperone_regular_price | DECIMAL(10,2) | NOT NULL | Regular chaperone price |
| chaperone_late_price | DECIMAL(10,2) | | Late chaperone price |
| priest_price | DECIMAL(10,2) | DEFAULT 0.00 | Priest price (usually $0) |
| deposit_amount | DECIMAL(10,2) | NOT NULL | Required deposit |
| deposit_per_person | BOOLEAN | DEFAULT TRUE | Deposit per person or flat |
| early_bird_deadline | TIMESTAMPTZ | | Early bird cutoff |
| regular_deadline | TIMESTAMPTZ | | Regular pricing cutoff |
| full_payment_deadline | TIMESTAMPTZ | | When balance is due |
| late_fee_percentage | DECIMAL(5,2) | | Late fee % (20.00 = 20%) |
| late_fee_auto_apply | BOOLEAN | DEFAULT FALSE | Auto-apply late fees |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

## 2. REGISTRATION TABLES

### **group_registrations**
Youth group registrations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Registration ID |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| group_name | VARCHAR(255) | NOT NULL | Youth group name |
| parish_name | VARCHAR(255) | | Church/parish name |
| diocese_name | VARCHAR(255) | | Diocese name |
| group_leader_user_id | UUID | FOREIGN KEY → users(id) | Group leader account |
| group_leader_name | VARCHAR(255) | NOT NULL | Leader name |
| group_leader_email | VARCHAR(255) | NOT NULL | Leader email |
| group_leader_phone | VARCHAR(20) | NOT NULL | Leader phone |
| access_code | VARCHAR(50) | NOT NULL, UNIQUE | Access code for team |
| youth_count_male_u18 | INT | DEFAULT 0 | Male youth under 18 |
| youth_count_female_u18 | INT | DEFAULT 0 | Female youth under 18 |
| youth_count_male_o18 | INT | DEFAULT 0 | Male youth over 18 |
| youth_count_female_o18 | INT | DEFAULT 0 | Female youth over 18 |
| chaperone_count_male | INT | DEFAULT 0 | Male chaperones |
| chaperone_count_female | INT | DEFAULT 0 | Female chaperones |
| priest_count | INT | DEFAULT 0 | Number of priests |
| total_participants | INT | GENERATED ALWAYS | Sum of all counts |
| housing_type | ENUM | NOT NULL | 'on_campus', 'off_campus', 'day_pass' |
| special_requests | TEXT | | Any special requests |
| dietary_restrictions_summary | TEXT | | Summary of dietary needs |
| ada_accommodations_summary | TEXT | | Summary of ADA needs |
| registration_status | ENUM | DEFAULT 'incomplete' | 'incomplete', 'pending_forms', 'pending_payment', 'complete' |
| registered_at | TIMESTAMPTZ | DEFAULT NOW() | Registration timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_group_event` on `event_id`
- `idx_group_org` on `organization_id`
- `idx_group_access_code` on `access_code`

---

### **individual_registrations**
Individual adult registrations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Registration ID |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| user_id | UUID | FOREIGN KEY → users(id) | User account |
| first_name | VARCHAR(255) | NOT NULL | First name |
| last_name | VARCHAR(255) | NOT NULL | Last name |
| preferred_name | VARCHAR(255) | | Preferred/nickname |
| email | VARCHAR(255) | NOT NULL | Email |
| phone | VARCHAR(20) | NOT NULL | Phone |
| age | INT | | Age (optional) |
| gender | ENUM | | 'male', 'female', 'prefer_not_to_say' |
| room_type | ENUM | | 'single', 'double', 'triple', 'quad' |
| preferred_roommate | TEXT | | Requested roommate name(s) |
| dietary_restrictions | TEXT | | Dietary needs |
| ada_accommodations | TEXT | | ADA needs |
| emergency_contact_name | VARCHAR(255) | NOT NULL | Emergency contact |
| emergency_contact_phone | VARCHAR(20) | NOT NULL | Emergency phone |
| emergency_contact_relation | VARCHAR(100) | | Relationship |
| registration_status | ENUM | DEFAULT 'incomplete' | 'incomplete', 'pending_form', 'pending_payment', 'complete' |
| qr_code | TEXT | | Generated QR code data |
| registered_at | TIMESTAMPTZ | DEFAULT NOW() | Registration timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **participants**
Individual participants within group registrations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Participant ID |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id), NOT NULL | Which group |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| first_name | VARCHAR(255) | NOT NULL | First name |
| last_name | VARCHAR(255) | NOT NULL | Last name |
| preferred_name | VARCHAR(255) | | Nickname |
| email | VARCHAR(255) | | Email (if over 18) |
| age | INT | NOT NULL | Age |
| gender | ENUM | NOT NULL | 'male', 'female' |
| participant_type | ENUM | NOT NULL | 'youth_u18', 'youth_o18', 'chaperone', 'priest' |
| clergy_title | ENUM | | 'priest', 'deacon', 'bishop', 'cardinal' (if priest) |
| t_shirt_size | VARCHAR(10) | | T-shirt size |
| liability_form_completed | BOOLEAN | DEFAULT FALSE | Form completed |
| liability_form_url | TEXT | | PDF URL in R2 |
| safe_environment_cert_url | TEXT | | Certificate URL (chaperones) |
| safe_environment_cert_status | ENUM | | 'not_required', 'pending', 'uploaded', 'verified' |
| parent_email | VARCHAR(255) | | Parent email (if under 18) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_participant_group` on `group_registration_id`
- `idx_participant_type` on `participant_type`

---

### **add_ons**
Available add-ons per event

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Add-on ID |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| name | VARCHAR(255) | NOT NULL | Add-on name |
| description | TEXT | | Description |
| price | DECIMAL(10,2) | NOT NULL | Price |
| is_free | BOOLEAN | DEFAULT FALSE | Free add-on (just collect data) |
| addon_type | ENUM | NOT NULL | 't_shirt', 'meal_upgrade', 'saturday_activity', 'day_pass', 'custom' |
| inventory_tracking_enabled | BOOLEAN | DEFAULT FALSE | Track inventory |
| inventory_total | INT | | Total available |
| inventory_remaining | INT | | Remaining |
| available_for_group | BOOLEAN | DEFAULT FALSE | Available for groups |
| available_for_individual | BOOLEAN | DEFAULT TRUE | Available for individuals |
| active | BOOLEAN | DEFAULT TRUE | Currently offered |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **registration_add_ons**
Junction table linking registrations to add-ons

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Link ID |
| registration_id | UUID | NOT NULL | Registration (group or individual) |
| registration_type | ENUM | NOT NULL | 'group', 'individual' |
| add_on_id | UUID | FOREIGN KEY → add_ons(id), NOT NULL | Which add-on |
| quantity | INT | DEFAULT 1 | How many |
| unit_price | DECIMAL(10,2) | NOT NULL | Price at time of purchase |
| total_price | DECIMAL(10,2) | GENERATED | quantity * unit_price |
| metadata | JSONB | | Size, preferences, etc. |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Purchase date |

---

## 3. LIABILITY FORM TABLES

### **liability_forms**
Master table for all liability forms

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Form ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| participant_id | UUID | FOREIGN KEY → participants(id) | If group registration |
| individual_registration_id | UUID | FOREIGN KEY → individual_registrations(id) | If individual |
| form_type | ENUM | NOT NULL | 'youth_u18', 'youth_o18_chaperone', 'clergy' |
| completed_by_email | VARCHAR(255) | NOT NULL | Who completed (parent if u18) |
| medical_conditions | TEXT | | Medical conditions |
| medications | TEXT | | Current medications |
| allergies | TEXT | | Allergies |
| dietary_restrictions | TEXT | | Dietary restrictions |
| ada_accommodations | TEXT | | ADA accommodations |
| emergency_contact_1_name | VARCHAR(255) | NOT NULL | Primary emergency |
| emergency_contact_1_phone | VARCHAR(20) | NOT NULL | Phone |
| emergency_contact_1_relation | VARCHAR(100) | | Relationship |
| emergency_contact_2_name | VARCHAR(255) | | Secondary emergency |
| emergency_contact_2_phone | VARCHAR(20) | | Phone |
| emergency_contact_2_relation | VARCHAR(100) | | Relationship |
| insurance_provider | VARCHAR(255) | | Health insurance |
| insurance_policy_number | VARCHAR(100) | | Policy # |
| insurance_group_number | VARCHAR(100) | | Group # |
| signature_data | JSONB | NOT NULL | E-signature details |
| pdf_url | TEXT | | Generated PDF in R2 |
| completed_at | TIMESTAMPTZ | DEFAULT NOW() | When completed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**signature_data structure:**
```json
{
  "full_legal_name": "John Smith",
  "initials": "JS",
  "date_signed": "2026-05-15",
  "sections_initialed": [
    "medical_consent",
    "activity_waiver",
    "photo_release",
    "transportation"
  ]
}
```

---

### **liability_form_templates**
Custom form fields per organization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Template ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | Which org |
| event_id | UUID | FOREIGN KEY → events(id) | Specific to event or org-wide |
| form_type | ENUM | NOT NULL | 'youth_u18', 'youth_o18_chaperone', 'clergy' |
| custom_questions | JSONB | | Additional questions |
| custom_sections | JSONB | | Additional consent sections |
| active | BOOLEAN | DEFAULT TRUE | Currently in use |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **safe_environment_certificates**
Uploaded certificates for chaperones

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Certificate ID |
| participant_id | UUID | FOREIGN KEY → participants(id), NOT NULL | Which chaperone |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| file_url | TEXT | NOT NULL | PDF in R2 |
| file_size_bytes | BIGINT | | File size |
| uploaded_by_user_id | UUID | FOREIGN KEY → users(id) | Who uploaded |
| program_name | VARCHAR(255) | | Safe environment program |
| completion_date | DATE | | When completed |
| expiration_date | DATE | | When expires |
| status | ENUM | DEFAULT 'pending' | 'pending', 'verified', 'rejected', 'expired' |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |
| verified_at | TIMESTAMPTZ | | When verified |
| verified_by_user_id | UUID | FOREIGN KEY → users(id) | Who verified |

---

## 4. PAYMENT TABLES

### **payments**
All payment transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Payment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| registration_id | UUID | NOT NULL | Registration (group or individual) |
| registration_type | ENUM | NOT NULL | 'group', 'individual' |
| stripe_payment_intent_id | VARCHAR(255) | UNIQUE | Stripe PI ID |
| stripe_charge_id | VARCHAR(255) | | Stripe charge ID |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency |
| payment_method | ENUM | NOT NULL | 'card', 'check', 'cash', 'other' |
| payment_status | ENUM | DEFAULT 'pending' | 'pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled' |
| payment_type | ENUM | NOT NULL | 'deposit', 'balance', 'late_fee', 'add_on', 'refund' |
| check_number | VARCHAR(50) | | If check payment |
| check_amount | DECIMAL(10,2) | | Check amount |
| check_received_date | DATE | | When received |
| check_bounced | BOOLEAN | DEFAULT FALSE | If bounced |
| notes | TEXT | | Payment notes |
| processed_by_user_id | UUID | FOREIGN KEY → users(id) | Who processed |
| processed_at | TIMESTAMPTZ | | When processed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_payment_registration` on `registration_id, registration_type`
- `idx_payment_stripe` on `stripe_payment_intent_id`

---

### **payment_balances**
Current balance per registration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Balance ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| registration_id | UUID | NOT NULL, UNIQUE | Registration ID |
| registration_type | ENUM | NOT NULL | 'group', 'individual' |
| total_amount_due | DECIMAL(10,2) | NOT NULL | Total owed |
| amount_paid | DECIMAL(10,2) | DEFAULT 0.00 | Amount paid |
| amount_remaining | DECIMAL(10,2) | GENERATED | total - paid |
| late_fees_applied | DECIMAL(10,2) | DEFAULT 0.00 | Late fees added |
| last_payment_date | TIMESTAMPTZ | | Last payment |
| payment_status | ENUM | DEFAULT 'unpaid' | 'unpaid', 'partial', 'paid_full', 'overdue' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **refunds**
Refund transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Refund ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| payment_id | UUID | FOREIGN KEY → payments(id), NOT NULL | Original payment |
| stripe_refund_id | VARCHAR(255) | UNIQUE | Stripe refund ID |
| amount | DECIMAL(10,2) | NOT NULL | Refund amount |
| reason | TEXT | | Reason for refund |
| refund_status | ENUM | DEFAULT 'pending' | 'pending', 'succeeded', 'failed', 'canceled' |
| requested_by_user_id | UUID | FOREIGN KEY → users(id) | Who requested |
| approved_by_user_id | UUID | FOREIGN KEY → users(id) | Who approved |
| processed_at | TIMESTAMPTZ | | When processed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **coupons**
Discount codes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Coupon ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id) | Event-specific or null for org-wide |
| name | VARCHAR(255) | NOT NULL | Internal name |
| code | VARCHAR(50) | NOT NULL, UNIQUE | Coupon code |
| discount_type | ENUM | NOT NULL | 'percentage', 'fixed_amount' |
| discount_value | DECIMAL(10,2) | NOT NULL | Percentage or amount |
| usage_limit_type | ENUM | NOT NULL | 'unlimited', 'single_use' |
| usage_count | INT | DEFAULT 0 | Times used |
| max_uses | INT | | Max redemptions |
| is_stackable | BOOLEAN | DEFAULT FALSE | Can combine with others |
| restrict_to_email | VARCHAR(255) | | For specific person |
| expiration_date | TIMESTAMPTZ | | When expires |
| active | BOOLEAN | DEFAULT TRUE | Currently active |
| created_by_user_id | UUID | FOREIGN KEY → users(id) | Who created |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **coupon_redemptions**
Tracking coupon uses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Redemption ID |
| coupon_id | UUID | FOREIGN KEY → coupons(id), NOT NULL | Which coupon |
| registration_id | UUID | NOT NULL | Which registration |
| registration_type | ENUM | NOT NULL | 'group', 'individual' |
| discount_applied | DECIMAL(10,2) | NOT NULL | Amount saved |
| redeemed_at | TIMESTAMPTZ | DEFAULT NOW() | When redeemed |

---

## 5. POROS PORTAL TABLES

### **poros_rooms**
Physical rooms for housing

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Room ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| room_type | ENUM | NOT NULL | 'youth_housing', 'priest_housing', 'small_group', 'seating_section' |
| building_name | VARCHAR(255) | | Building name |
| room_number | VARCHAR(50) | NOT NULL | Room number/name |
| room_name | VARCHAR(255) | | Display name |
| capacity | INT | NOT NULL | Max occupancy |
| gender_restriction | ENUM | | 'male', 'female', 'mixed', 'none' |
| age_restriction | ENUM | | 'youth_u18', 'youth_o18', 'chaperone', 'priest', 'none' |
| is_ada_accessible | BOOLEAN | DEFAULT FALSE | ADA accessible |
| equipment | JSONB | | Equipment in room |
| floor_number | INT | | Floor number |
| notes | TEXT | | Special notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_room_event` on `event_id`
- `idx_room_type` on `room_type`

---

### **poros_housing_assignments**
Group/individual room assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| room_id | UUID | FOREIGN KEY → poros_rooms(id), NOT NULL | Which room |
| assignment_type | ENUM | NOT NULL | 'group', 'individual' |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id) | If group |
| individual_registration_id | UUID | FOREIGN KEY → individual_registrations(id) | If individual |
| participant_ids | JSONB | | Array of participant IDs (if tracking individuals) |
| occupancy_count | INT | NOT NULL | How many people |
| assignment_notes | TEXT | | Notes |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **poros_seating_assignments**
Seating section assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| seating_section_id | UUID | FOREIGN KEY → poros_rooms(id), NOT NULL | Which section (room_type='seating_section') |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id), NOT NULL | Which group |
| seats_reserved | INT | NOT NULL | Number of seats |
| section_notes | TEXT | | Notes |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **poros_meal_colors**
Meal color configuration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Color ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| color_name | VARCHAR(50) | NOT NULL | Red, Blue, Green, etc. |
| color_hex | VARCHAR(7) | | Hex color code (#FF0000) |
| meal_time | TIME | | Meal time (12:30:00) |
| meal_type | ENUM | | 'breakfast', 'lunch', 'dinner' |
| capacity | INT | | Max groups |
| groups_assigned | INT | DEFAULT 0 | Current assignments |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **poros_meal_assignments**
Group meal color assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| meal_color_id | UUID | FOREIGN KEY → poros_meal_colors(id), NOT NULL | Which color |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id), NOT NULL | Which group |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **poros_small_group_rooms**
Small group discussion rooms

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Room ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| room_name | VARCHAR(255) | NOT NULL | Room name |
| building_name | VARCHAR(255) | | Building |
| capacity | INT | NOT NULL | Max occupancy |
| equipment | JSONB | | Equipment list |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **poros_small_group_assignments**
Group assignments to small group rooms

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| small_group_room_id | UUID | FOREIGN KEY → poros_small_group_rooms(id), NOT NULL | Which room |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id), NOT NULL | Which group |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **poros_sgl_leaders**
Small Group Leaders (seminarians)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Leader ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| first_name | VARCHAR(255) | NOT NULL | First name |
| last_name | VARCHAR(255) | NOT NULL | Last name |
| email | VARCHAR(255) | | Email |
| phone | VARCHAR(20) | | Phone |
| seminary_name | VARCHAR(255) | | Seminary |
| year_in_seminary | VARCHAR(50) | | Year (1st, 2nd, etc.) |
| bio | TEXT | | Short bio |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **poros_sgl_assignments**
SGL assignments to small groups

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| sgl_leader_id | UUID | FOREIGN KEY → poros_sgl_leaders(id), NOT NULL | Which SGL |
| small_group_room_id | UUID | FOREIGN KEY → poros_small_group_rooms(id) | Room assigned to |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id) | Group assigned to |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **poros_religious_staff**
Religious staff (sisters/brothers) for assignment

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Staff ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| first_name | VARCHAR(255) | NOT NULL | First name |
| last_name | VARCHAR(255) | NOT NULL | Last name |
| religious_title | VARCHAR(100) | | Sr., Br., Fr., etc. |
| religious_order | VARCHAR(255) | | Order name |
| role | VARCHAR(255) | | Campus Minister, etc. |
| email | VARCHAR(255) | | Email |
| phone | VARCHAR(20) | | Phone |
| bio | TEXT | | Short bio |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **poros_religious_staff_assignments**
Religious staff assignments to small groups

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| religious_staff_id | UUID | FOREIGN KEY → poros_religious_staff(id), NOT NULL | Which staff |
| small_group_room_id | UUID | FOREIGN KEY → poros_small_group_rooms(id) | Room assigned to |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id) | Group assigned to |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **poros_ada_tracking**
ADA individuals and assignments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Tracking ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| participant_id | UUID | FOREIGN KEY → participants(id) | If group |
| individual_registration_id | UUID | FOREIGN KEY → individual_registrations(id) | If individual |
| ada_needs | TEXT | NOT NULL | Description of needs |
| wheelchair_accessible | BOOLEAN | DEFAULT FALSE | Needs wheelchair access |
| visual_impairment | BOOLEAN | DEFAULT FALSE | Visual needs |
| hearing_impairment | BOOLEAN | DEFAULT FALSE | Hearing needs |
| other_accommodations | TEXT | | Other needs |
| room_assigned_id | UUID | FOREIGN KEY → poros_rooms(id) | ADA room assigned |
| assigned_by_user_id | UUID | FOREIGN KEY → users(id) | Who assigned |
| assigned_at | TIMESTAMPTZ | | When assigned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

## 6. SALVE CHECK-IN TABLES

### **salve_checkins**
Check-in records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Check-in ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| checkin_type | ENUM | NOT NULL | 'group', 'individual' |
| group_registration_id | UUID | FOREIGN KEY → group_registrations(id) | If group |
| individual_registration_id | UUID | FOREIGN KEY → individual_registrations(id) | If individual |
| qr_code_scanned | BOOLEAN | DEFAULT FALSE | Used QR code |
| search_method | ENUM | | 'qr_code', 'name_search', 'phone_search' |
| checked_in_by_user_id | UUID | FOREIGN KEY → users(id), NOT NULL | SALVE operator |
| packet_printed | BOOLEAN | DEFAULT FALSE | Printed packet |
| nametags_printed | BOOLEAN | DEFAULT FALSE | Printed name tags |
| override_payment | BOOLEAN | DEFAULT FALSE | Checked in despite unpaid |
| override_forms | BOOLEAN | DEFAULT FALSE | Checked in despite incomplete forms |
| override_reason | TEXT | | Reason for override |
| notes | TEXT | | Check-in notes |
| checked_in_at | TIMESTAMPTZ | DEFAULT NOW() | Check-in timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

**Indexes:**
- `idx_salve_event` on `event_id`
- `idx_salve_time` on `checked_in_at`

---

### **salve_printed_documents**
Tracking printed documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Document ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| checkin_id | UUID | FOREIGN KEY → salve_checkins(id), NOT NULL | Which check-in |
| document_type | ENUM | NOT NULL | 'group_packet', 'individual_packet', 'nametag', 'custom_document' |
| document_name | VARCHAR(255) | | Document name |
| pdf_url | TEXT | | Generated PDF URL |
| printed_by_user_id | UUID | FOREIGN KEY → users(id) | Who printed |
| printed_at | TIMESTAMPTZ | DEFAULT NOW() | Print timestamp |

---

### **salve_custom_documents**
Custom documents to print at check-in

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Document ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| document_name | VARCHAR(255) | NOT NULL | Display name |
| original_filename | VARCHAR(255) | | Original filename |
| file_url | TEXT | NOT NULL | Uploaded file in R2 |
| file_size_bytes | BIGINT | | File size |
| file_type | VARCHAR(50) | | MIME type |
| print_for_groups | BOOLEAN | DEFAULT FALSE | Print for groups |
| print_for_individuals | BOOLEAN | DEFAULT FALSE | Print for individuals |
| uploaded_by_user_id | UUID | FOREIGN KEY → users(id) | Who uploaded |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **salve_nametag_settings**
Name tag configuration per event

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Settings ID |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL, UNIQUE | One per event |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| template_type | ENUM | DEFAULT 'standard' | 'standard_avery_74459', 'large_avery_5392', 'custom' |
| custom_width_inches | DECIMAL(5,2) | | If custom |
| custom_height_inches | DECIMAL(5,2) | | If custom |
| show_first_name | BOOLEAN | DEFAULT TRUE | Show first name |
| show_last_name | BOOLEAN | DEFAULT TRUE | Show last name |
| show_preferred_name | BOOLEAN | DEFAULT FALSE | Show nickname |
| show_group_name | BOOLEAN | DEFAULT TRUE | Show group |
| show_meal_color | BOOLEAN | DEFAULT TRUE | Show meal color dot |
| show_qr_code | BOOLEAN | DEFAULT TRUE | Show QR code |
| show_event_logo | BOOLEAN | DEFAULT TRUE | Show logo |
| show_dietary_flag | BOOLEAN | DEFAULT FALSE | Show dietary icon |
| show_ada_flag | BOOLEAN | DEFAULT FALSE | Show ADA icon |
| background_color | VARCHAR(7) | DEFAULT '#FFFFFF' | Background hex |
| text_color | VARCHAR(7) | DEFAULT '#000000' | Text hex |
| design_template | ENUM | DEFAULT 'classic' | 'classic', 'modern', 'custom' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

## 7. RAPHA MEDICAL TABLES

### **rapha_medical_access**
Who has access to medical platform

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Access ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| user_id | UUID | FOREIGN KEY → users(id), NOT NULL | Medical staff user |
| staff_name | VARCHAR(255) | NOT NULL | Staff name |
| staff_role | VARCHAR(100) | | EMT, Nurse, etc. |
| access_granted_by_user_id | UUID | FOREIGN KEY → users(id) | Who granted |
| access_granted_at | TIMESTAMPTZ | DEFAULT NOW() | When granted |
| access_revoked_at | TIMESTAMPTZ | | If revoked |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |

---

### **rapha_incident_reports**
Medical incident reports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Report ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id), NOT NULL | Which event |
| participant_id | UUID | FOREIGN KEY → participants(id) | If group |
| individual_registration_id | UUID | FOREIGN KEY → individual_registrations(id) | If individual |
| participant_name | VARCHAR(255) | NOT NULL | Participant name |
| incident_date | TIMESTAMPTZ | NOT NULL | When occurred |
| incident_location | VARCHAR(255) | | Where occurred |
| incident_description | TEXT | NOT NULL | What happened |
| injury_type | VARCHAR(255) | | Type of injury |
| treatment_provided | TEXT | NOT NULL | Treatment given |
| medications_administered | TEXT | | Medications given |
| transported_to_hospital | BOOLEAN | DEFAULT FALSE | Hospital transport |
| hospital_name | VARCHAR(255) | | If transported |
| parent_contacted | BOOLEAN | DEFAULT FALSE | Parent notified |
| parent_contact_time | TIMESTAMPTZ | | When contacted |
| follow_up_required | BOOLEAN | DEFAULT FALSE | Needs follow-up |
| follow_up_notes | TEXT | | Follow-up instructions |
| report_pdf_url | TEXT | | Generated PDF |
| created_by_user_id | UUID | FOREIGN KEY → users(id), NOT NULL | Medical staff |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Report creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

## 8. COMMUNICATION TABLES

### **email_templates**
Customizable email templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Template ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id) | Event-specific or null for org-wide |
| template_key | VARCHAR(100) | NOT NULL | 'registration_confirmation', 'payment_received', etc. |
| subject | VARCHAR(255) | NOT NULL | Email subject |
| body_html | TEXT | NOT NULL | HTML body |
| body_text | TEXT | NOT NULL | Plain text fallback |
| variables | JSONB | | Available variables |
| active | BOOLEAN | DEFAULT TRUE | Currently in use |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Example variables:**
```json
{
  "group_name": "St. Mary's Youth Group",
  "event_name": "Mount 2000 Summer 2026",
  "access_code": "M2K2026-STMARYS-7X9K",
  "amount_paid": "2650.00",
  "balance_remaining": "7350.00"
}
```

---

### **email_log**
Sent email tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Log ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id) | If event-related |
| template_key | VARCHAR(100) | | Which template |
| recipient_email | VARCHAR(255) | NOT NULL | To email |
| recipient_name | VARCHAR(255) | | To name |
| subject | VARCHAR(255) | NOT NULL | Email subject |
| resend_email_id | VARCHAR(255) | | Resend email ID |
| status | ENUM | DEFAULT 'sent' | 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed' |
| sent_at | TIMESTAMPTZ | DEFAULT NOW() | When sent |
| delivered_at | TIMESTAMPTZ | | When delivered |
| opened_at | TIMESTAMPTZ | | When opened |
| clicked_at | TIMESTAMPTZ | | When clicked |
| error_message | TEXT | | If failed |

**Indexes:**
- `idx_email_recipient` on `recipient_email`
- `idx_email_status` on `status`

---

### **sms_log**
SMS message tracking (future)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Log ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id) | If event-related |
| recipient_phone | VARCHAR(20) | NOT NULL | To phone |
| message_body | TEXT | NOT NULL | SMS content |
| twilio_message_id | VARCHAR(255) | | Twilio ID |
| status | ENUM | DEFAULT 'sent' | 'sent', 'delivered', 'failed' |
| sent_at | TIMESTAMPTZ | DEFAULT NOW() | When sent |
| delivered_at | TIMESTAMPTZ | | When delivered |
| error_message | TEXT | | If failed |

---

## 9. REPORTING TABLES

### **reports**
Saved custom reports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Report ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id) | If event-specific |
| report_name | VARCHAR(255) | NOT NULL | Display name |
| report_type | ENUM | NOT NULL | 'financial', 'registration', 'custom' |
| selected_fields | JSONB | NOT NULL | Which fields to include |
| filters | JSONB | | Report filters |
| sort_order | JSONB | | Sort configuration |
| created_by_user_id | UUID | FOREIGN KEY → users(id) | Who created |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **report_executions**
Report run history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Execution ID |
| report_id | UUID | FOREIGN KEY → reports(id), NOT NULL | Which report |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| executed_by_user_id | UUID | FOREIGN KEY → users(id) | Who ran it |
| output_format | ENUM | NOT NULL | 'pdf', 'excel', 'csv', 'google_sheets' |
| file_url | TEXT | | Generated file URL |
| row_count | INT | | Rows returned |
| execution_time_ms | INT | | How long it took |
| executed_at | TIMESTAMPTZ | DEFAULT NOW() | When executed |

---

### **integration_sync_log**
Third-party integration sync tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Sync ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| event_id | UUID | FOREIGN KEY → events(id) | If event-specific |
| integration_type | ENUM | NOT NULL | 'google_sheets', 'mailchimp', 'quickbooks' |
| sync_type | ENUM | NOT NULL | 'export', 'import', 'sync' |
| records_processed | INT | | Number of records |
| status | ENUM | DEFAULT 'processing' | 'processing', 'completed', 'failed' |
| error_message | TEXT | | If failed |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | Sync start |
| completed_at | TIMESTAMPTZ | | Sync end |

---

## 10. SYSTEM TABLES

### **audit_log**
System-wide audit trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Log ID |
| organization_id | UUID | FOREIGN KEY → organizations(id) | For RLS (null if platform-level) |
| user_id | UUID | FOREIGN KEY → users(id) | Who performed action |
| action | VARCHAR(100) | NOT NULL | Action type |
| resource_type | VARCHAR(100) | NOT NULL | Table/resource |
| resource_id | UUID | | Specific record |
| changes | JSONB | | Before/after values |
| ip_address | INET | | User IP |
| user_agent | TEXT | | Browser/device |
| timestamp | TIMESTAMPTZ | DEFAULT NOW() | When occurred |

**Indexes:**
- `idx_audit_org` on `organization_id`
- `idx_audit_user` on `user_id`
- `idx_audit_time` on `timestamp`

---

### **system_settings**
Platform-wide configuration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | VARCHAR(100) | PRIMARY KEY | Setting key |
| value | JSONB | NOT NULL | Setting value |
| description | TEXT | | What it does |
| updated_by_user_id | UUID | FOREIGN KEY → users(id) | Who updated |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### **file_uploads**
Tracking all uploaded files

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | File ID |
| organization_id | UUID | FOREIGN KEY → organizations(id), NOT NULL | For RLS |
| uploaded_by_user_id | UUID | FOREIGN KEY → users(id), NOT NULL | Who uploaded |
| original_filename | VARCHAR(255) | NOT NULL | Original name |
| stored_filename | VARCHAR(255) | NOT NULL | R2 filename |
| file_url | TEXT | NOT NULL | Full URL |
| file_size_bytes | BIGINT | NOT NULL | File size |
| mime_type | VARCHAR(100) | NOT NULL | File type |
| file_category | ENUM | NOT NULL | 'liability_form', 'certificate', 'custom_document', 'logo', 'other' |
| related_resource_type | VARCHAR(100) | | Which table |
| related_resource_id | UUID | | Which record |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload time |

**Indexes:**
- `idx_file_org` on `organization_id`
- `idx_file_category` on `file_category`

---

### **error_log**
Application error tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Error ID |
| organization_id | UUID | FOREIGN KEY → organizations(id) | If org-related |
| user_id | UUID | FOREIGN KEY → users(id) | If user-related |
| error_type | VARCHAR(100) | NOT NULL | Error category |
| error_message | TEXT | NOT NULL | Error message |
| stack_trace | TEXT | | Full stack trace |
| request_url | TEXT | | URL that failed |
| request_method | VARCHAR(10) | | GET, POST, etc. |
| request_body | JSONB | | Request data |
| user_agent | TEXT | | Browser/device |
| ip_address | INET | | User IP |
| occurred_at | TIMESTAMPTZ | DEFAULT NOW() | When occurred |

---

## 🔐 Row-Level Security (RLS) Policies

### **Example Policies:**

```sql
-- Organizations table
CREATE POLICY "Organizations see only themselves"
ON organizations FOR ALL
USING (id = current_user_organization_id() 
       OR current_user_role() = 'master_admin');

-- Events table
CREATE POLICY "Events belong to organization"
ON events FOR ALL
USING (organization_id = current_user_organization_id() 
       OR current_user_role() = 'master_admin');

-- Group registrations
CREATE POLICY "Groups belong to organization"
ON group_registrations FOR ALL
USING (organization_id = current_user_organization_id()
       OR (current_user_role() = 'group_leader' 
           AND group_leader_user_id = current_user_id()));

-- Liability forms
CREATE POLICY "Liability forms are private"
ON liability_forms FOR SELECT
USING (organization_id = current_user_organization_id()
       OR (participant_id IN (
           SELECT id FROM participants 
           WHERE group_registration_id IN (
               SELECT id FROM group_registrations 
               WHERE group_leader_user_id = current_user_id()
           )
       )));

-- Payments
CREATE POLICY "Payments belong to organization"
ON payments FOR ALL
USING (organization_id = current_user_organization_id());

-- Medical records (extra restricted)
CREATE POLICY "Medical records for medical staff only"
ON rapha_incident_reports FOR SELECT
USING (organization_id = current_user_organization_id()
       AND (current_user_role() = 'org_admin'
            OR current_user_role() = 'rapha_user'));
```

---

## 🔄 Database Relationships Diagram

```
organizations
    ├─► users (organization_id)
    ├─► events (organization_id)
    │     ├─► event_settings (event_id)
    │     ├─► event_pricing (event_id)
    │     ├─► group_registrations (event_id)
    │     │     ├─► participants (group_registration_id)
    │     │     │     └─► liability_forms (participant_id)
    │     │     ├─► payments (registration_id)
    │     │     └─► payment_balances (registration_id)
    │     ├─► individual_registrations (event_id)
    │     │     ├─► liability_forms (individual_registration_id)
    │     │     └─► payments (registration_id)
    │     ├─► add_ons (event_id)
    │     │     └─► registration_add_ons (add_on_id)
    │     ├─► coupons (event_id)
    │     │     └─► coupon_redemptions (coupon_id)
    │     ├─► poros_rooms (event_id)
    │     │     ├─► poros_housing_assignments (room_id)
    │     │     ├─► poros_seating_assignments (seating_section_id)
    │     │     └─► poros_small_group_rooms (event_id)
    │     ├─► poros_meal_colors (event_id)
    │     │     └─► poros_meal_assignments (meal_color_id)
    │     ├─► poros_sgl_leaders (event_id)
    │     │     └─► poros_sgl_assignments (sgl_leader_id)
    │     ├─► poros_religious_staff (event_id)
    │     │     └─► poros_religious_staff_assignments (religious_staff_id)
    │     ├─► poros_ada_tracking (event_id)
    │     ├─► salve_checkins (event_id)
    │     │     └─► salve_printed_documents (checkin_id)
    │     ├─► salve_custom_documents (event_id)
    │     ├─► salve_nametag_settings (event_id)
    │     ├─► rapha_medical_access (event_id)
    │     └─► rapha_incident_reports (event_id)
    └─► email_templates (organization_id)
          └─► email_log (organization_id)
```

---

## 📊 Storage Estimates

### **Per Organization (Average):**

| Data Type | Records | Size Each | Total Size |
|-----------|---------|-----------|------------|
| Users | 10 | 1 KB | 10 KB |
| Events | 5/year | 5 KB | 25 KB |
| Registrations | 1,000 | 2 KB | 2 MB |
| Participants | 5,000 | 1 KB | 5 MB |
| Liability Forms (data) | 5,000 | 5 KB | 25 MB |
| Liability PDFs | 5,000 | 200 KB | 1 GB |
| Certificates | 500 | 150 KB | 75 MB |
| Payments | 2,000 | 1 KB | 2 MB |
| Poros Assignments | 1,000 | 0.5 KB | 500 KB |
| SALVE Check-ins | 1,000 | 2 KB | 2 MB |
| Email Log | 10,000 | 0.5 KB | 5 MB |
| **Total Database** | | | **~50 MB** |
| **Total Files (R2)** | | | **~1.1 GB** |

**At 100 Organizations:**
- Database: ~5 GB
- Files: ~110 GB
- **Well within Neon + R2 limits!**

---

## 🔧 Database Maintenance

### **Automated Tasks:**

**Daily (2 AM ET):**
- Full database backup (Neon automatic)
- Vacuum analyze (optimize tables)
- Update registration statistics
- Clean expired sessions

**Weekly (Sunday 2 AM ET):**
- Compress old audit logs
- Archive completed events (>30 days past end date)
- Generate storage usage reports
- Email Org Admins with low payment balances

**Monthly:**
- Delete files >7 years old
- Archive organizations with no activity (>6 months)
- Generate platform analytics
- Check for orphaned records

---

## ✅ Database Migration Scripts

All tables will be created via Prisma migrations. Example migration file:

```javascript
// prisma/migrations/001_initial_schema/migration.sql

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL UNIQUE,
    subscription_tier VARCHAR(50) NOT NULL,
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    monthly_fee DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations see only themselves"
ON organizations FOR ALL
USING (id = current_user_organization_id() 
       OR current_user_role() = 'master_admin');

-- [Continue for all 62 tables...]
```

---

**END OF DATABASE SCHEMA DOCUMENT**

**Total Tables:** 62  
**Total Indexes:** ~80  
**Total RLS Policies:** ~62  
**Estimated Database Size (100 orgs):** 5 GB  
**Estimated File Storage (100 orgs):** 110 GB
