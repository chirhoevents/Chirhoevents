# ChiRho Events - Development Roadmap
**Version:** 1.0  
**Date:** November 26, 2025  
**Timeline:** 6-8 Months  
**Development Method:** Claude Code + GitHub + Railway

---

## 🎯 Executive Summary

**Total Development Time:** 6-8 months from start to beta launch  
**Your Time Investment:** 10-15 hours/week (testing and feedback)  
**Claude Code Time:** Handles 90% of coding automatically  
**MVP Launch:** Month 6  
**Beta Testing:** Month 7  
**Public Launch:** Month 8

---

## 📅 Month-by-Month Overview

| Month | Focus | Key Deliverables | Status |
|-------|-------|------------------|--------|
| **Month 1** | Core Registration System | Group + Individual registration, Payment flow | 🚀 Ready to start |
| **Month 2** | Liability Forms | 3 form types, E-signatures, File uploads | |
| **Month 3** | Poros Portal | Housing, Seating, Meal Colors, Assignments | |
| **Month 4** | SALVE Check-In | QR scanning, Printing, Dietary highlighting | |
| **Month 5** | Rapha Medical + Group Leader Portal | Medical platform, Payment management | |
| **Month 6** | Public Portal + Integrations | Resource portal, Sheets, Mailchimp, QuickBooks | |
| **Month 7** | Polish + Bug Fixes | Testing, refinements, documentation | |
| **Month 8** | Beta Testing | Mount 2000 + 2 orgs, feedback, fixes | |

---

## 🚀 MONTH 1: Core Registration System

**Goal:** Users can register (group + individual) and make payments

### **Week 1: Project Setup**

**Claude Code Tasks:**
```
YOU: "Set up a new Next.js 14 project for ChiRho Events"

CLAUDE CODE WILL:
1. Create Next.js project with TypeScript (optional) or JavaScript
2. Install dependencies:
   - Tailwind CSS for styling
   - shadcn/ui for components
   - Clerk for authentication
   - Prisma for database
   - Stripe for payments
   - Resend for email
3. Configure Railway deployment
4. Set up Neon PostgreSQL connection
5. Create initial folder structure:
   /app (pages)
   /components (UI components)
   /lib (utilities)
   /prisma (database schema)
   /public (static assets)
6. Set up environment variables
7. Deploy to staging.chirhoevents.com
8. Confirm everything works
```

**Your Tasks:**
- Provide API keys (Clerk, Stripe, Resend, Neon)
- Test staging site loads
- Approve setup (30 minutes)

**Deliverables:**
- ✅ Next.js app running on staging
- ✅ Database connected
- ✅ GitHub repo created
- ✅ Railway auto-deploy configured

---

### **Week 2-3: Group Registration**

**Claude Code Tasks:**
```
YOU: "Build the group registration system based on the specification"

CLAUDE CODE WILL:
1. Create database tables:
   - organizations
   - users
   - events
   - event_settings
   - event_pricing
   - group_registrations
   - participants

2. Build registration page: /events/[eventId]/register-group
   - Group name, leader info
   - Youth counts (male U18, female U18, male O18, female O18)
   - Chaperone counts (male, female)
   - Priest count
   - Housing type selector
   - Price calculation
   - Payment integration

3. Create API endpoints:
   POST /api/registration/group - Create registration
   GET /api/registration/group/[id] - Get registration
   PATCH /api/registration/group/[id] - Update registration

4. Implement Stripe payment flow:
   - Create payment intent
   - Deposit only (configurable amount)
   - Payment confirmation page
   - Receipt email

5. Generate access code (M2K2026-STMARYS-7X9K format)

6. Send confirmation email with:
   - Payment receipt
   - Access code
   - Next steps (liability forms)
```

**Your Tasks:**
- Test group registration flow end-to-end
- Try different youth/chaperone combinations
- Test payment with Stripe test cards
- Check email confirmations
- Report any bugs (2-3 hours)

**Deliverables:**
- ✅ Group registration form live
- ✅ Stripe payments working
- ✅ Email confirmations sending
- ✅ Access codes generating

---

### **Week 4: Individual Registration**

**Claude Code Tasks:**
```
YOU: "Build individual registration based on the specification"

CLAUDE CODE WILL:
1. Create database tables:
   - individual_registrations
   - add_ons
   - registration_add_ons

2. Build registration page: /events/[eventId]/register-individual
   - Personal information
   - Room type selection (single, double, triple, quad)
   - Preferred roommate field
   - Dietary restrictions
   - ADA accommodations
   - Emergency contact
   - Add-on selection (t-shirts, activities, etc.)
   - Price calculation
   - Payment (full payment required)

3. Create API endpoints:
   POST /api/registration/individual
   GET /api/registration/individual/[id]

4. Generate QR code for check-in

5. Send confirmation email with:
   - Payment receipt
   - QR code image
   - Event details
```

**Your Tasks:**
- Test individual registration
- Try different room types
- Add various add-ons
- Test QR code generation
- Check emails (1-2 hours)

**Deliverables:**
- ✅ Individual registration live
- ✅ Add-ons system working
- ✅ QR codes generating
- ✅ Room selection functional

---

## 🗒️ MONTH 2: Liability Forms

**Goal:** All 3 liability form types working with e-signatures

### **Week 5-6: Form System + Youth Under 18 Form**

**Claude Code Tasks:**
```
YOU: "Build the liability forms system starting with youth under 18"

CLAUDE CODE WILL:
1. Create database tables:
   - liability_forms
   - liability_form_templates
   - safe_environment_certificates

2. Build access code login page: /events/[eventId]/forms
   - Enter access code
   - Select role: Youth U18, Youth O18, Chaperone, Priest

3. Build youth U18 form flow:
   /events/[eventId]/forms/youth-u18
   - Participant enters their name
   - Asks for parent email
   - Sends email to parent
   - Parent receives link with pre-filled participant name
   - Parent completes:
     * Medical conditions
     * Medications
     * Allergies
     * Dietary restrictions
     * ADA accommodations
     * Emergency contacts (2)
     * Insurance information
   - E-signature system:
     * Type full legal name
     * Initial after each section
     * Type date
   - Generate PDF
   - Upload to Cloudflare R2
   - Send confirmation email to parent AND participant

4. Create API endpoints:
   POST /api/liability/form - Submit form
   GET /api/liability/form/[id] - Get form
   DELETE /api/liability/form/[id] - Delete (group leader only)
   POST /api/liability/generate-pdf - Create PDF
```

**Your Tasks:**
- Test youth U18 form flow
- Receive parent email
- Complete form as parent
- Check PDF generation
- Verify E-signature capture
- Test email confirmations (2-3 hours)

**Deliverables:**
- ✅ Youth U18 form complete
- ✅ Parent email flow working
- ✅ E-signatures capturing
- ✅ PDFs generating and storing in R2

---

### **Week 7: Youth Over 18 + Chaperone Forms**

**Claude Code Tasks:**
```
YOU: "Build youth over 18 and chaperone liability forms"

CLAUDE CODE WILL:
1. Build youth O18 form (same as chaperone):
   - Self-complete (no parent email)
   - Same fields as U18 but participant fills out
   - E-signature by participant

2. Build chaperone form:
   - Same structure as youth O18
   - Additional field: Safe environment certificate upload
   - Or "I'll submit this later" option
   - Group leader can upload later from portal

3. Create file upload system for certificates:
   - Accept PDF only
   - Store in R2: /org-id/event-id/certificates/participant-id.pdf
   - Track upload status in database
```

**Your Tasks:**
- Test youth O18 form (self-complete)
- Test chaperone form
- Upload safe environment certificate
- Test "submit later" option (1-2 hours)

**Deliverables:**
- ✅ Youth O18 form working
- ✅ Chaperone form complete
- ✅ Certificate upload functional

---

### **Week 8: Clergy Form + Group Leader Dashboard**

**Claude Code Tasks:**
```
YOU: "Build clergy liability form and group leader dashboard for managing forms"

CLAUDE CODE WILL:
1. Build clergy form:
   - Title selection (Priest, Deacon, Bishop, Cardinal)
   - Same medical/emergency fields
   - Faculty information section
   - Diocese of incardination
   - E-signature

2. Build group leader portal: /portal/[accessCode]
   - Login with access code
   - Dashboard showing:
     * Total participants
     * Forms completed (53/53)
     * Forms pending (names listed)
     * Safe environment status (8/8)
   - Actions:
     * View form completion status
     * Delete form (if someone messed up)
     * Upload safe environment certificates
     * Make payments

3. Create API endpoints:
   GET /api/portal/[accessCode]/status
   DELETE /api/liability/form/[id]
   POST /api/certificate/upload
```

**Your Tasks:**
- Test clergy form
- Login to group leader portal
- Check status dashboard
- Delete a test form
- Upload certificate for someone (2-3 hours)

**Deliverables:**
- ✅ Clergy form complete
- ✅ Group leader portal functional
- ✅ Form management working

---

## 🏠 MONTH 3: Poros Portal

**Goal:** Complete housing, seating, and assignment system

### **Week 9-10: Housing Assignments**

**Claude Code Tasks:**
```
YOU: "Build Poros Portal housing assignment system"

CLAUDE CODE WILL:
1. Create database tables:
   - poros_rooms
   - poros_housing_assignments
   - poros_ada_tracking

2. Build Org Admin dashboard: /org/[orgId]/poros
   - Navigation tabs (Dashboard, Youth Groups, Room Management, Assignments)

3. Import functionality:
   - Button: "Import Groups from Registration"
   - Loads all registered groups for event
   - Shows group cards with:
     * Group name
     * Total participants
     * Youth male U18, youth female U18
     * Youth male O18, youth female O18
     * Chaperones (male, female)
     * Priests
     * Housing type
     * Dietary/ADA flags

4. Room management:
   - Create rooms:
     * Building name
     * Room number
     * Capacity
     * Gender restriction (male, female, mixed)
     * Age restriction (youth U18, O18, chaperone, priest)
     * ADA accessible checkbox
   - Edit/delete rooms
   - Room cards show:
     * Room name
     * Capacity (X of Y filled)
     * Gender/age restrictions
     * Currently assigned groups

5. Housing assignment interface:
   - Drag-and-drop groups to rooms
   - Auto-recommendations:
     * "St. Mary's (29 males) → Needs 5 rooms"
     * Suggests Rooms 101-105
   - Visual capacity indicators:
     * Green: Room has space
     * Yellow: Nearly full
     * Red: Full
     * Blue: ADA room
   - Conflict detection:
     * Can't assign male group to female room
     * Can't assign youth U18 and O18 together
     * Can't assign youth and chaperones together
     * Can't assign non-priests to priest housing

6. Priest housing (separate tab):
   - Same drag-and-drop
   - Only priest-designated rooms shown
   - Auto-calculate priest rooms needed

7. ADA tracking:
   - List all ADA individuals
   - Assign to ADA-accessible rooms
   - Alert if ADA person not in ADA room

8. Save assignments → Syncs to SALVE database
```

**Your Tasks:**
- Import test groups
- Create test rooms (Sullivan Hall, McCormick Hall, St. Joseph Hall)
- Drag groups to rooms
- Test auto-recommendations
- Try to assign incompatible combinations (should prevent)
- Assign ADA individuals
- Assign priests to priest housing (3-4 hours)

**Deliverables:**
- ✅ Poros Portal housing system complete
- ✅ Drag-and-drop working
- ✅ Auto-recommendations functional
- ✅ Conflict detection active
- ✅ Priest housing separate

---

### **Week 11: Seating + Meal Colors**

**Claude Code Tasks:**
```
YOU: "Build seating assignments and meal color system"

CLAUDE CODE WILL:
1. Create database tables:
   - poros_meal_colors
   - poros_meal_assignments
   - poros_seating_assignments (uses poros_rooms with type='seating_section')

2. Seating management:
   - Create seating sections:
     * Venue name (Main Conference Hall)
     * Section name (Section A, B, C)
     * Capacity (seats per section)
   - Assign groups to sections (drag-and-drop)
   - Track capacity per section

3. Meal color system:
   - Create meal colors:
     * Color name (Red, Blue, Green, etc.)
     * Hex color code
     * Meal time (12:00 PM, 12:30 PM, 1:00 PM)
     * Meal type (breakfast, lunch, dinner)
     * Capacity (groups per color)
   - Assign groups to colors (drag-and-drop)
   - Visual meal schedule

4. Settings tab:
   - Enable/disable features per event:
     * Housing assignments
     * Priest housing
     * Seating assignments
     * Meal colors
     * Small groups
     * SGL management
     * Seminarian assignments
     * Religious staff assignments
     * ADA tracking
   - When disabled, tabs disappear from Poros
```

**Your Tasks:**
- Create seating sections
- Assign groups to sections
- Create meal colors
- Assign groups to meal times
- Toggle features on/off
- Verify tabs appear/disappear (2-3 hours)

**Deliverables:**
- ✅ Seating system complete
- ✅ Meal color system working
- ✅ Feature toggles functional

---

### **Week 12: Small Groups + SGL/Religious Staff**

**Claude Code Tasks:**
```
YOU: "Build small group assignment system with SGL and religious staff"

CLAUDE CODE WILL:
1. Create database tables:
   - poros_small_group_rooms
   - poros_small_group_assignments
   - poros_sgl_leaders
   - poros_sgl_assignments
   - poros_religious_staff
   - poros_religious_staff_assignments

2. Small group room management:
   - Create rooms:
     * Room name (St. Thomas Room)
     * Building
     * Capacity
     * Equipment (whiteboard, projector, etc.)
   - Assign groups to small group rooms

3. SGL (Small Group Leader) management:
   - Add seminarians:
     * Name
     * Seminary name
     * Year in seminary
     * Bio (optional)
   - Assign seminarians to small group rooms
   - Can assign multiple SGLs per room

4. Religious staff management:
   - Add religious staff:
     * Name
     * Title (Sr., Br., Fr.)
     * Religious order
     * Role (Campus Minister, etc.)
     * Bio (optional)
   - Assign staff to small group rooms

5. Dashboard statistics:
   - Total groups
   - Groups needing housing
   - Groups needing seating
   - Groups needing meal color
   - Groups needing small group
   - Housing capacity (male/female utilization %)
   - ADA people total
   - Real-time updates (30-second polling)
```

**Your Tasks:**
- Create small group rooms
- Assign groups to rooms
- Add test seminarians
- Assign seminarians to groups
- Add religious staff
- Assign staff to groups
- Check dashboard statistics update (2-3 hours)

**Deliverables:**
- ✅ Small groups complete
- ✅ SGL management working
- ✅ Religious staff system functional
- ✅ Dashboard statistics live

---

## ✅ MONTH 4: SALVE Check-In System

**Goal:** Complete check-in system with printing

### **Week 13-14: SALVE Core System**

**Claude Code Tasks:**
```
YOU: "Build SALVE check-in system with QR scanning and search"

CLAUDE CODE WILL:
1. Create database tables:
   - salve_checkins
   - salve_printed_documents
   - salve_custom_documents
   - salve_nametag_settings

2. Build check-in interface: /org/[orgId]/salve
   - Search methods:
     * QR code scanner (camera access)
     * Name search
     * Phone search
   - Results display:
     * Group/individual name
     * Payment status (✅ or ⚠️ with balance)
     * Liability forms status (53/53 or 48/53 pending)
     * Safe environment status (8/8 or 6/8 pending)
     * Room assignments (read from Poros)
     * Meal color
     * Seating section
     * Small group
     * Dietary restrictions (⚠️ HIGHLIGHTED)
     * ADA accommodations

3. Check-in actions:
   - Mark as checked in
   - Override payment (with note/reason)
   - Override forms (with note)
   - Print group packet
   - Print individual packet
   - Print name tags

4. Create API endpoints:
   GET /api/salve/search - Search by name/phone
   GET /api/salve/qr/[code] - Look up by QR
   POST /api/salve/checkin - Mark checked in
   POST /api/salve/print/group - Generate group PDF
   POST /api/salve/print/individual - Generate individual PDF
```

**Your Tasks:**
- Search for test groups
- Scan QR codes (test with phone)
- Check payment/form statuses display correctly
- Try override options (2-3 hours)

**Deliverables:**
- ✅ SALVE search working (QR + name + phone)
- ✅ Status displays accurate
- ✅ Check-in marking functional
- ✅ Overrides working

---

### **Week 15: PDF Generation + Printing**

**Claude Code Tasks:**
```
YOU: "Build PDF generation for group packets, individual packets, and name tags"

CLAUDE CODE WILL:
1. Install @react-pdf/renderer for PDF generation

2. Group packet PDF:
   - Page 1: Group overview
     * Group name, leader contact
     * Participant count breakdown
     * Housing assignments (gender breakdown)
     * Meal color/time
     * Seating section
     * Small group room
     * Payment status
   
   - Page 2-3: Participant lists
     * Male participants (Sullivan Hall 101-105)
       - John Smith (Room 101) - **DIETARY: Gluten-Free** 🌾
       - Mike Johnson (Room 101)
       - Tom Brown (Room 102) - **DIETARY: Vegetarian** 🥕
     * Female participants (McCormick Hall 201-204)
     * Chaperones (male/female breakdown)
     * Priests (St. Joseph Hall 401)
   
   - Page 4: Dietary restrictions summary
     * ALL dietary restrictions listed with icons
     * Color-coded highlighting
   
   - Page 5: Event schedule, meal times, emergency contacts

3. Individual packet PDF:
   - Single page format
   - Name, registration #
   - Room assignment
   - Meal color/time
   - Seating section
   - Dietary restrictions (if any) - **HIGHLIGHTED**
   - Add-ons purchased
   - Payment receipt
   - Event schedule

4. Name tag PDF:
   - Template based on settings:
     * Standard Avery 74459 (2¼" × 3½", 8 per sheet)
     * Large Avery 5392 (2" × 4", 10 per sheet)
     * Custom dimensions
   - Elements (configurable):
     * First name (large)
     * Last name
     * Preferred name
     * Youth group name
     * Meal color dot (colored circle)
     * QR code
     * Event logo
     * Dietary icon (🌾 ⚠️)
     * ADA icon (♿)
   - Background color (event colors)
   - On-demand printing (print 1 badge at a time)

5. Custom documents:
   - Org Admin uploads custom PDFs
   - Set to print with groups/individuals
   - Example: COVID waiver, parking pass, etc.
   - Automatically append to packet

6. Create PDF API endpoints:
   POST /api/pdf/group-packet
   POST /api/pdf/individual-packet
   POST /api/pdf/nametag
   POST /api/pdf/batch-nametags (print all for event)
```

**Your Tasks:**
- Print test group packet
- Verify all pages generate correctly
- Check dietary restrictions are HIGHLIGHTED
- Print individual packet
- Configure name tag settings
- Print test name tags
- Upload custom document
- Verify custom doc prints with packet (3-4 hours)

**Deliverables:**
- ✅ Group packet PDFs generating
- ✅ Individual packet PDFs generating
- ✅ Dietary restrictions HIGHLIGHTED in red/yellow
- ✅ Name tags printing (multiple formats)
- ✅ Custom documents appending

---

### **Week 16: SALVE Dashboard + Statistics**

**Claude Code Tasks:**
```
YOU: "Build SALVE dashboard and real-time statistics"

CLAUDE CODE WILL:
1. Build dashboard: /org/[orgId]/salve/dashboard
   - Real-time statistics (10-second polling):
     * Total registered (groups + individuals)
     * Checked in today
     * Remaining to check in
     * Average check-in time
     * Last 10 check-ins (live feed)
   
   - Charts:
     * Check-ins by hour (bar chart)
     * Payment status (pie chart)
     * Form completion (pie chart)
   
   - Filters:
     * Groups vs Individuals
     * Date range
     * Payment status
     * Form status

2. Print queue system:
   - List all print jobs
   - Reprint any packet/nametag
   - Bulk operations:
     * Print all nametags
     * Print all group packets (advance option)

3. Settings:
   - Name tag configuration
   - Custom document management
   - Check-in station setup (multi-device support)
```

**Your Tasks:**
- View dashboard
- Watch live check-in feed
- Test filters
- Reprint packets
- Configure name tags (1-2 hours)

**Deliverables:**
- ✅ SALVE dashboard complete
- ✅ Real-time statistics working
- ✅ Reprint functionality active
- ✅ Multi-device check-in ready

---

## 🏥 MONTH 5: Rapha Medical + Enhancements

**Goal:** Medical platform complete + group leader enhancements

### **Week 17-18: Rapha Medical Platform**

**Claude Code Tasks:**
```
YOU: "Build Rapha medical information platform"

CLAUDE CODE WILL:
1. Create database tables:
   - rapha_medical_access
   - rapha_incident_reports

2. Build medical staff access management:
   - Org Admin creates Rapha users
   - Email invitation sent
   - Rapha user account created

3. Build Rapha interface: /org/[orgId]/rapha
   - Search participants:
     * By name
     * By group
     * By registration #
   
   - Participant medical profile:
     * Name, age, gender
     * Medical conditions
     * Current medications
     * Allergies (⚠️ HIGHLIGHTED)
     * Dietary restrictions
     * Insurance information
     * Emergency contacts (2)
   
   - Read-only (cannot edit)
   - Data pulled from liability forms

4. Incident report creation:
   - Form fields:
     * Participant name (auto-filled)
     * Incident date/time
     * Location
     * Description
     * Injury type
     * Treatment provided
     * Medications administered
     * Transported to hospital? (Y/N)
     * Hospital name (if yes)
     * Parent contacted? (Y/N)
     * Contact time
     * Follow-up required? (Y/N)
     * Follow-up notes
   
   - Generate incident PDF
   - Print for participant to take home
   - Store in database

5. Create API endpoints:
   GET /api/rapha/participant/[id]
   POST /api/rapha/incident
   GET /api/rapha/incident/[id]
   POST /api/rapha/incident/[id]/print
```

**Your Tasks:**
- Create medical staff user
- Search for participant
- View medical information
- Create test incident report
- Print incident report (2-3 hours)

**Deliverables:**
- ✅ Rapha medical platform complete
- ✅ Search functional
- ✅ Medical profiles displaying
- ✅ Incident reports working

---

### **Week 19: Group Leader Portal Enhancements**

**Claude Code Tasks:**
```
YOU: "Enhance group leader portal with payment management"

CLAUDE CODE WILL:
1. Expand group leader portal: /portal/[accessCode]
   - Dashboard sections:
     * Registration summary
     * Payment history
     * Balance remaining
     * Form completion status
     * Safe environment certificates
   
   - Payment management:
     * Make additional payment (balance, late fees)
     * View payment history
     * Download receipts
     * See upcoming deadlines
   
   - Form management:
     * See who completed forms
     * See who hasn't started
     * Delete forms (if error)
     * Upload safe environment certs for team
   
   - Communication:
     * Email group members who haven't completed forms
     * Automatic reminders (set frequency)

2. Create API endpoints:
   GET /api/portal/[accessCode]/payments
   POST /api/portal/[accessCode]/payment
   GET /api/portal/[accessCode]/forms
   POST /api/portal/[accessCode]/email-reminders
```

**Your Tasks:**
- Login as group leader
- Make test payment
- View payment history
- Email form reminders
- Upload certificate (1-2 hours)

**Deliverables:**
- ✅ Payment management complete
- ✅ Form reminders working
- ✅ Certificate upload functional

---

### **Week 20: Late Fees + Coupons**

**Claude Code Tasks:**
```
YOU: "Build late fee system and coupon/discount code functionality"

CLAUDE CODE WILL:
1. Create database tables:
   - coupons
   - coupon_redemptions

2. Late fee system:
   - Org Admin interface: /org/[orgId]/events/[eventId]/late-fees
   - Shows all unpaid balances
   - Button: "Apply Late Fees to All Unpaid"
   - Confirmation modal:
     * "Apply 20% late fee ($14,490 total) to 48 groups?"
   - Applies percentage to remaining balance
   - Sends email to each group
   - Manual removal per group (if needed)

3. Coupon management:
   - Create coupons: /org/[orgId]/events/[eventId]/coupons
   - Form fields:
     * Coupon name (internal)
     * Coupon code (EARLYBIRD)
     * Discount type (percentage, fixed)
     * Discount value (20%, $50)
     * Usage limit (unlimited, single-use)
     * Stackable? (yes/no)
     * Restrict to email? (optional)
     * Expiration date
   
   - Apply during registration:
     * Input field: "Have a coupon code?"
     * Apply button
     * Show discount immediately
     * If stackable, show "Add another code?"
   
   - Track redemptions
   - Usage analytics

4. Create API endpoints:
   POST /api/late-fees/apply
   DELETE /api/late-fees/remove/[groupId]
   POST /api/coupons
   GET /api/coupons/validate
   POST /api/coupons/redeem
```

**Your Tasks:**
- Create test late fees scenario
- Apply late fees
- Remove late fee from one group
- Create coupons (stackable and non-stackable)
- Test coupon redemption
- Try stacking multiple codes (2-3 hours)

**Deliverables:**
- ✅ Late fees system working
- ✅ Coupon creation functional
- ✅ Coupon redemption working
- ✅ Stacking logic correct

---

## 🌐 MONTH 6: Public Portal + Integrations

**Goal:** Public resource portal + third-party integrations

### **Week 21-22: Public Resource Portal**

**Claude Code Tasks:**
```
YOU: "Build public-facing Poros portal for participants to view their info"

CLAUDE CODE WILL:
1. Build public portal: /events/[eventId]/[eventSlug]-poros
   - Mobile-optimized design
   - Search interface:
     * "Enter your group name"
     * Search button
     * Instant results
   
   - Display (read-only):
     * Group name
     * Seating section
     * Meal color/time
     * Event schedule
     * Small group room (optional)
     * Small group leader names (optional)
     * Custom content from Org Admin
   
   - DO NOT show:
     * Housing assignments (too sensitive)
     * Payment information
     * Personal details

2. Org Admin customization: /org/[orgId]/events/[eventId]/public-portal
   - Enable/disable portal
   - Custom welcome message
   - Upload custom documents (maps, parking info, WiFi password)
   - Color scheme (match event branding)
   - Logo upload
   - Footer content

3. Automatic link generation:
   - When portal enabled: chirhoevents.com/mount2000-2026-poros
   - QR code generated (Org Admin can print posters)

4. Create API endpoints:
   GET /api/public-portal/[eventId]/search
   GET /api/public-portal/[eventId]/settings
```

**Your Tasks:**
- Enable public portal for test event
- Customize welcome message
- Upload test documents
- Change color scheme
- Search for group on mobile phone
- Verify housing doesn't show
- Test QR code poster (2-3 hours)

**Deliverables:**
- ✅ Public resource portal live
- ✅ Mobile-optimized
- ✅ Customization options working
- ✅ Search functional
- ✅ QR code generation ready

---

### **Week 23: Google Sheets Integration**

**Claude Code Tasks:**
```
YOU: "Build Google Sheets export and live sync integration"

CLAUDE CODE WILL:
1. Set up Google Sheets API connection
   - OAuth authentication
   - Org Admin authorizes Google account

2. Build export interface: /org/[orgId]/reports/export
   - Pre-built templates:
     * Registration data (all registrations)
     * Financial report (payments, balances)
     * Housing assignments (room assignments)
     * Dietary restrictions (all dietary needs)
     * Check-in status (who checked in when)
   
   - Custom export builder:
     * Select fields to include
     * Save custom templates
     * One-click re-run

3. Export options:
   - One-time export (creates new sheet)
   - Live sync (updates every 5 minutes)
   - Manual refresh button

4. Create API endpoints:
   POST /api/integrations/sheets/export
   POST /api/integrations/sheets/sync-start
   POST /api/integrations/sheets/sync-stop
```

**Your Tasks:**
- Connect Google account
- Export registration data
- Try pre-built templates
- Create custom export
- Test live sync (updates every 5 min)
- Verify data accuracy (2 hours)

**Deliverables:**
- ✅ Google Sheets integration working
- ✅ Pre-built templates functional
- ✅ Custom export builder ready
- ✅ Live sync operational

---

### **Week 24: Mailchimp + QuickBooks**

**Claude Code Tasks:**
```
YOU: "Build Mailchimp and QuickBooks integrations"

CLAUDE CODE WILL:
1. Mailchimp integration:
   - OAuth connection
   - Export email lists:
     * All registered participants
     * Groups only (group leaders)
     * Individuals only
     * Past attendees (after event)
   - Sync to Mailchimp audience
   - Tag management (add tags: "Mount2000-2026", "Youth", etc.)

2. QuickBooks Online integration:
   - OAuth connection
   - Sync payments:
     * Create invoices per registration
     * Mark invoices as paid
     * Add late fees as line items
     * Record check payments
     * Create credit memos for refunds
   - Daily summary sync
   - Manual sync button

3. Integration dashboard: /org/[orgId]/integrations
   - Connected accounts display
   - Connect/disconnect buttons
   - Sync status
   - Last sync timestamp
   - Sync logs

4. Create API endpoints:
   POST /api/integrations/mailchimp/connect
   POST /api/integrations/mailchimp/export
   POST /api/integrations/quickbooks/connect
   POST /api/integrations/quickbooks/sync
```

**Your Tasks:**
- Connect Mailchimp account
- Export test email list
- Verify tags apply correctly
- Connect QuickBooks (if you have account)
- Test invoice sync
- Check payment updates (2-3 hours)

**Deliverables:**
- ✅ Mailchimp integration working
- ✅ Email list exports functional
- ✅ QuickBooks integration working
- ✅ Invoice sync accurate

---

## 🔧 MONTH 7: Polish + Bug Fixes

**Goal:** Refinements, testing, bug fixes, documentation

### **Week 25-26: UI/UX Polish**

**Claude Code Tasks:**
```
YOU: "Polish UI/UX across entire platform based on feedback"

CLAUDE CODE WILL:
1. Implement design system consistently:
   - Colors from your logo (navy, gold, beige)
   - Typography (modern sans-serif)
   - Button styles
   - Form inputs
   - Card components
   - Loading states
   - Error messages

2. Mobile optimization:
   - Test all pages on mobile
   - Fix responsive issues
   - Touch-friendly buttons
   - Mobile navigation

3. Loading states:
   - Skeleton loaders while data loads
   - Progress indicators for long operations
   - Optimistic UI updates

4. Error handling:
   - User-friendly error messages
   - Retry buttons
   - Form validation feedback
   - Network error handling

5. Accessibility:
   - Keyboard navigation
   - Screen reader support
   - Color contrast compliance
   - Focus indicators
```

**Your Tasks:**
- Test every page on desktop and mobile
- Report any UI issues
- Check error messages make sense
- Test with keyboard only
- Verify all buttons have labels (3-4 hours over 2 weeks)

**Deliverables:**
- ✅ Consistent design system
- ✅ Mobile-optimized
- ✅ Loading states everywhere
- ✅ Accessible interface

---

### **Week 27-28: Bug Fixes + Performance**

**Claude Code Tasks:**
```
YOU: "Fix all reported bugs and optimize performance"

CLAUDE CODE WILL:
1. Bug fixes:
   - Fix any bugs from your testing
   - Fix edge cases
   - Handle invalid input
   - Prevent duplicate submissions

2. Performance optimization:
   - Database query optimization
   - Add indexes where needed
   - Lazy load images
   - Code splitting
   - Caching strategy

3. Security audit:
   - Check RLS policies
   - Verify authentication
   - Test authorization
   - SQL injection prevention
   - XSS protection

4. Documentation:
   - Inline code comments
   - API documentation
   - README files
   - Deployment guide
```

**Your Tasks:**
- Report any bugs you find
- Test edge cases (empty forms, invalid data)
- Try to break things
- Time how long pages load
- Report slow pages (2-3 hours)

**Deliverables:**
- ✅ All bugs fixed
- ✅ Performance optimized
- ✅ Security verified
- ✅ Code documented

---

## 🧪 MONTH 8: Beta Testing

**Goal:** Real-world testing with Mount 2000 + 2 other organizations

### **Week 29-30: Mount 2000 Beta**

**Your Tasks:**
1. Create Mount 2000 organization account
2. Create Summer 2026 event
3. Configure all settings (pricing, features, forms)
4. Set up Poros Portal (rooms, assignments)
5. Test registration flow with real participants
6. Complete liability forms
7. Make test payments
8. Run SALVE check-in during event
9. Use Rapha Medical platform
10. Generate reports

**Claude Code Tasks:**
```
YOU: "Fix any bugs Mount 2000 discovers during beta testing"

CLAUDE CODE WILL:
- Monitor errors in real-time
- Fix bugs immediately
- Deploy fixes to production
- Support you throughout event
```

**Success Metrics:**
- ✅ 500+ registrations processed
- ✅ 0 critical bugs
- ✅ Check-in completes in <2 minutes per group
- ✅ All liability forms collected
- ✅ Payments processed successfully
- ✅ Reports accurate

---

### **Week 31-32: Additional Beta Testing + Refinements**

**Your Tasks:**
1. Onboard 2 more beta organizations
2. Guide them through setup
3. Collect feedback
4. Document common questions

**Claude Code Tasks:**
```
YOU: "Implement feedback and final refinements"

CLAUDE CODE WILL:
- Add requested features (if quick)
- Fix any new bugs
- Improve documentation
- Optimize based on usage patterns
```

**Deliverables:**
- ✅ 3 organizations successfully using platform
- ✅ All critical bugs fixed
- ✅ Feedback implemented
- ✅ Platform stable

---

## 🎉 MONTH 8 (END): Public Launch

### **Week 33-34: Marketing + Launch**

**Tasks:**
1. Finalize landing page
2. Create pricing page
3. Set up domain (chirhoevents.com)
4. Deploy to production
5. Announce launch:
   - Email dioceses
   - Post on Catholic youth ministry forums
   - Reach out to Steubenville conferences
   - Contact archdioceses

**Launch Checklist:**
- ✅ All systems tested
- ✅ Landing page live
- ✅ Pricing page ready
- ✅ Onboarding flow smooth
- ✅ Support email active (support@chirhoevents.com)
- ✅ Documentation complete
- ✅ Monitoring active

---

## 📊 Time Estimates

### **Your Weekly Time Commitment:**

| Month | Your Hours/Week | Tasks |
|-------|-----------------|-------|
| **1-2** | 10-12 hours | Testing registration, forms, payments |
| **3-4** | 12-15 hours | Testing Poros, SALVE, assignments |
| **5-6** | 8-10 hours | Testing Rapha, integrations, portal |
| **7** | 5-8 hours | UI testing, bug reporting |
| **8** | 15-20 hours | Beta testing, real events |

**Total:** ~400-450 hours over 8 months (~12 hours/week average)

---

## 🤖 Claude Code Efficiency

**How Claude Code Speeds Up Development:**

Traditional Manual Coding:
- Write boilerplate: 2-3 hours
- Implement feature: 5-10 hours
- Test and debug: 3-5 hours
- Fix bugs: 2-4 hours
- **Total per feature:** 12-22 hours

Claude Code:
- Write boilerplate: Auto-generated (5 minutes)
- Implement feature: 30-60 minutes
- Test and debug: Auto-tested (10 minutes)
- Fix bugs: 10-20 minutes
- **Total per feature:** 1-2 hours

**Speed Increase:** 10-20x faster!

---

## 🎯 Critical Success Factors

### **What Makes This Timeline Work:**

1. ✅ **Clear Specification** (what we just created)
   - Claude Code knows exactly what to build
   - No ambiguity, no guessing

2. ✅ **Iterative Testing** (you test each feature)
   - Catch bugs early
   - Course-correct quickly

3. ✅ **Focused Sprints** (one system at a time)
   - Registration → Forms → Poros → SALVE → Rapha
   - Don't jump around

4. ✅ **Automated Deployment** (Railway + GitHub)
   - Push code → Auto-deploys
   - Test on staging immediately

5. ✅ **Real-World Beta** (Mount 2000)
   - Find bugs in production
   - Validate with actual users

---

## ⚠️ Potential Delays & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bug takes longer to fix | +1-3 days | Claude Code usually fixes quickly; escalate if stuck |
| Integration issues (Stripe, Sheets) | +3-5 days | Test early, have backup plans |
| Scope creep (new features) | +2-4 weeks | Stick to MVP, add features in Phase 2 |
| Your availability | +1-2 weeks | Communicate schedule, Claude Code can pause |
| Beta feedback major changes | +2-4 weeks | Limit beta to 3 orgs, focus feedback |

**Buffer Built In:** 6-8 month range accounts for delays

---

## 📈 Post-Launch Roadmap (Months 9-12)

### **Phase 2 Features:**
- Spanish translation
- Mobile apps (Org Admin, SALVE, Attendee)
- Advanced reporting
- Zapier integration
- Automated backup system (AWS S3)
- Multi-language support
- SMS notifications (Twilio)

### **Maintenance:**
- Monthly feature releases
- Bug fixes within 24-48 hours
- Performance monitoring
- Security updates
- Customer support

---

## ✅ Next Steps

1. ✅ Review this roadmap
2. ✅ Confirm timeline works for you
3. ✅ Provide API keys (Clerk, Stripe, Resend, Neon)
4. ✅ Start Month 1, Week 1: Project Setup!

---

**END OF DEVELOPMENT ROADMAP**

**Total Duration:** 6-8 months  
**Your Time:** ~12 hours/week  
**Claude Code:** Handles 90% of coding  
**Outcome:** Complete, production-ready ChiRho Events platform
