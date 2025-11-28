# ChiRho Events - System Architecture
**Version:** 1.0  
**Date:** November 26, 2025  
**Status:** Complete Specification

---

## 🎯 Executive Summary

ChiRho Events is a comprehensive Catholic youth ministry registration and event management platform designed specifically for conferences, retreats, and diocesan events. The platform serves 8 distinct user roles across 6 integrated systems.

**Core Value Proposition:**
- 30% lower cost than competitors (Eventbrite, Cvent, Campbrain)
- Catholic-specific features (liability forms, safe environment tracking, ADA compliance)
- All-in-one solution (registration → housing → check-in → medical → reporting)

**Target Market:**
- Catholic dioceses and archdioceses
- Youth ministry conferences (Steubenville-style events)
- Parish retreats and vocation programs
- Seminary programs

**Revenue Model:**
- Tiered monthly subscriptions ($49-$500+)
- One-time setup fee ($250)
- 98.4% profit margin at scale

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Landing    │  │ Registration │  │ Org Admin    │          │
│  │     Page     │  │    Portal    │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Poros Portal │  │    SALVE     │  │    Rapha     │          │
│  │  (Public +   │  │   Check-In   │  │   Medical    │          │
│  │   Admin)     │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Group Leader │  │  Master Admin│                            │
│  │    Portal    │  │  Dashboard   │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER (Next.js)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  API Routes          Business Logic         Authentication       │
│  ───────────         ───────────────        ───────────────      │
│  • Registration      • Payment Processing   • Clerk Auth          │
│  • Poros Portal      • Email Triggers       • Role-Based Access  │
│  • SALVE System      • PDF Generation       • 2FA Support         │
│  • Medical Records   • QR Code Generation   • Session Management │
│  • Reporting         • File Upload          • JWT Tokens          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Stripe  │  │  Resend  │  │  Google  │  │Mailchimp │       │
│  │ Connect  │  │  Email   │  │  Sheets  │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐                                     │
│  │QuickBooks│  │Cloudflare│                                     │
│  │  Online  │  │    R2    │                                     │
│  └──────────┘  └──────────┘                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────┐                │
│  │     Neon PostgreSQL Database (Primary)      │                │
│  │  • 60+ tables with Row-Level Security       │                │
│  │  • Real-time replication                    │                │
│  │  • Point-in-time recovery                   │                │
│  │  • Daily automated backups                  │                │
│  └─────────────────────────────────────────────┘                │
│                                                                   │
│  ┌─────────────────────────────────────────────┐                │
│  │     Cloudflare R2 (File Storage)            │                │
│  │  • Liability form PDFs                      │                │
│  │  • Safe environment certificates            │                │
│  │  • Custom uploaded documents                │                │
│  │  • Medical records                          │                │
│  └─────────────────────────────────────────────┘                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────┐                │
│  │     Railway (Application Hosting)           │                │
│  │  • Production: chirhoevents.com             │                │
│  │  • Staging: staging.chirhoevents.com        │                │
│  │  • Auto-deploy from GitHub                  │                │
│  │  • Environment variables management         │                │
│  └─────────────────────────────────────────────┘                │
│                                                                   │
│  ┌─────────────────────────────────────────────┐                │
│  │     GitHub (Version Control)                │                │
│  │  • Source code repository                   │                │
│  │  • Automated CI/CD pipeline                 │                │
│  │  • Branch protection rules                  │                │
│  └─────────────────────────────────────────────┘                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles & Permissions

### **1. Master Admin**
**Access Level:** Full platform control  
**Capabilities:**
- Create/edit/delete organizations
- Create Organization Admins
- View all system data (read-only)
- Manage billing and subscriptions
- Generate platform-wide analytics
- Archive/reactivate accounts

**Use Cases:**
- Onboard new dioceses
- Troubleshoot technical issues
- Monitor platform health
- Process reactivation fees

---

### **2. Organization Admin**
**Access Level:** Full control of their organization  
**Capabilities:**
- Create/edit/delete events
- Configure event settings (pricing, features, forms)
- Manage Poros Portal (assignments, rooms)
- Access SALVE and Rapha systems
- View financial reports
- Export data
- Connect Stripe account
- Manage email templates

**Use Cases:**
- Setup Mount 2000 conference
- Configure housing and meal assignments
- Monitor registrations in real-time
- Generate financial reports
- Manage check-in process

---

### **3. Group Leader**
**Access Level:** Limited to their youth group  
**Capabilities:**
- View group registration details
- Make payments (deposit, balance, late fees)
- See liability form completion status
- Upload safe environment certificates for chaperones
- Delete/restart liability forms (if someone messed up)
- Access group-specific information

**Cannot:**
- Edit liability form content
- See other groups' information
- Access Poros/SALVE/Rapha

**Use Cases:**
- Complete group registration
- Make final payment before deadline
- Check which team members completed liability forms
- Upload Fr. Tom's safe environment certificate

---

### **4. Individual Registrant**
**Access Level:** Own registration only  
**Capabilities:**
- Register for event
- Select room type and preferences
- Complete liability form
- Make payment
- View registration confirmation
- Update contact information

**Use Cases:**
- Register as individual adult
- Select double room with preferred roommate
- Pay for t-shirt add-on
- Complete liability form

---

### **5. Parent (Youth Under 18)**
**Access Level:** Child's liability form only  
**Capabilities:**
- Complete liability form for child
- Provide medical information
- E-sign consent
- Receive confirmation email
- Download completed form

**Use Cases:**
- Complete liability form for 15-year-old daughter
- Provide medication list and emergency contacts
- Grant permission for conference activities

---

### **6. Poros Portal Public User**
**Access Level:** Read-only event information  
**Capabilities:**
- Search for their youth group
- View seating assignments
- View meal times and colors
- View event schedule
- View small group assignments
- Access on mobile device

**Cannot:**
- See housing assignments (too sensitive)
- Edit any information
- Access other groups' details

**Use Cases:**
- Check what section St. Mary's is sitting in
- Find meal time (Blue group = 12:30 PM)
- View weekend schedule

---

### **7. SALVE Check-In User**
**Access Level:** Check-in operations only  
**Capabilities:**
- Scan QR codes or search by name
- View registration status
- Print check-in packets
- Mark groups/individuals as checked in
- Override missing payment (with note)
- Print on-demand name tags
- Access dietary restriction alerts
- View ADA accommodations

**Cannot:**
- Edit registration details
- Access financial information
- Modify housing assignments

**Use Cases:**
- Check in St. Mary's Youth Group
- Print group packet with room assignments
- Generate on-demand name tag for late arrival
- Flag person with severe peanut allergy for cafeteria staff

---

### **8. Rapha Medical User**
**Access Level:** Medical information only  
**Capabilities:**
- Search participants by name
- View medical history and allergies
- See current medications
- Access emergency contact information
- Create incident reports
- Print incident reports for participants

**Cannot:**
- View financial information
- Access registration details beyond medical
- Edit participant information

**Use Cases:**
- Look up Sarah's medication list after injury
- Create incident report for twisted ankle
- Contact parent during medical emergency
- Print incident report for Sarah to take home

---

## 🔄 System Integration Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION SYSTEM                           │
│  • Group Registration (youth, chaperones, priests)               │
│  • Individual Registration (room selection, add-ons)             │
│  • Payment Processing (Stripe Connect)                           │
│  • Email Confirmations (Resend)                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├──────────► LIABILITY FORMS SYSTEM
                     │            • Youth forms (parent completes)
                     │            • Chaperone forms (self-complete)
                     │            • Clergy forms (title selection)
                     │            • Safe environment uploads
                     │            • E-signature collection
                     │
                     ├──────────► GROUP LEADER PORTAL
                     │            • Payment management
                     │            • Form completion tracking
                     │            • Certificate uploads
                     │
                     ├──────────► POROS PORTAL (Import Registration Data)
                     │            • Housing assignments
                     │            • Priest housing (separate)
                     │            • Seating assignments
                     │            • Meal color assignments
                     │            • Small group assignments
                     │            • SGL management
                     │            • Religious staff assignments
                     │            • ADA tracking
                     │
                     ├──────────► PUBLIC RESOURCE PORTAL
                     │            • View seating assignments
                     │            • View meal times
                     │            • View event schedule
                     │
                     ├──────────► SALVE CHECK-IN SYSTEM (Reads All Data)
                     │            • QR code scanning
                     │            • Name/phone lookup
                     │            • Print check-in packets
                     │            • Dietary restriction highlighting
                     │            • On-demand name tags
                     │            • Custom document printing
                     │
                     ├──────────► RAPHA MEDICAL PLATFORM
                     │            • Medical history access
                     │            • Incident report creation
                     │            • Emergency contact information
                     │
                     └──────────► REPORTING & ANALYTICS
                                  • Financial reports (QuickBooks sync)
                                  • Registration analytics
                                  • Google Sheets export
                                  • Mailchimp email list sync
                                  • Custom report builder
```

---

## 📊 Data Flow Diagrams

### **Complete Registration → Check-In Flow**

```
1. GROUP REGISTRATION
   └─► Group leader visits: chirhoevents.com/mount2000-2026/register-group
   └─► Fills form: 45 youth, 8 chaperones, 2 priests
   └─► Selects: On-campus housing
   └─► Pays: $50 deposit per person ($2,650 total)
   └─► Receives: Access code (M2K2026-STMARYS-7X9K)
   └─► Email sent: Payment receipt + next steps
                     ↓
2. LIABILITY FORMS
   └─► Group leader shares access code with team
   └─► Each person visits: chirhoevents.com/mount2000-2026/forms
   └─► Enters access code
   └─► Selects role: Youth U18 / Youth O18 / Chaperone / Priest
   
   IF Youth Under 18:
   └─► Enters parent email
   └─► Parent receives email with form link
   └─► Parent completes: Medical, dietary, ADA, emergency contacts
   └─► Parent e-signs: Typed name + initials + date
   
   IF Youth Over 18, Chaperone, or Priest:
   └─► Completes form themselves
   └─► E-signs form
   
   IF Chaperone:
   └─► Option to upload safe environment certificate
   └─► Or group leader uploads later
                     ↓
3. PAYMENT COMPLETION
   └─► Group leader returns to portal
   └─► Makes final payment by June 30 deadline
   └─► Pays: $7,350 remaining balance
   └─► Email sent: Payment confirmation + "You're all set!"
                     ↓
4. POROS PORTAL (Before Event)
   └─► Org Admin logs in: chirhoevents.com/org/mount2000/poros
   └─► Clicks: "Import Groups from Registration"
   └─► System imports St. Mary's with all data
   └─► Org Admin assigns:
       • Housing: Sullivan Hall 101-105 (males), McCormick 201-204 (females)
       • Priest Housing: St. Joseph Hall 401
       • Meal Color: Blue (12:30 PM lunch)
       • Small Group: Room 5
       • Seating: Section A
   └─► Saves assignments
   └─► System syncs to SALVE database
                     ↓
5. PUBLIC RESOURCE PORTAL (Week Before Event)
   └─► Group leader visits: chirhoevents.com/mount2000-2026-poros
   └─► Searches: "St. Mary's Youth Group"
   └─► Sees:
       • Seating: Section A
       • Meal time: Blue - 12:30 PM
       • Small group: Room 5
       • Event schedule
                     ↓
6. QR CODES SENT (1 Day Before Event)
   └─► System emails group leader: QR code for check-in
   └─► System emails each individual: Personal QR code
                     ↓
7. SALVE CHECK-IN (Day of Event)
   └─► St. Mary's arrives at check-in table
   └─► SALVE operator scans group QR code
   └─► OR searches: "St. Mary's Youth Group"
   └─► SALVE displays:
       ✅ Payment: Paid in full
       ✅ Liability forms: 53/53 completed
       ✅ Safe environment: 8/8 uploaded
       • Housing: Sullivan 101-105, McCormick 201-204, St. Joseph 401
       • Meal color: Blue (12:30 PM)
       • Small group: Room 5
       • Dietary restrictions: 3 people flagged ⚠️
   └─► SALVE operator clicks: "Print Group Packet"
   └─► Printer generates 5-page packet:
       Page 1: Group overview
       Page 2-3: Participant lists (male/female/priests)
       Page 4: Dietary restrictions summary (HIGHLIGHTED)
       Page 5: Event schedule, meal times, emergency contacts
   └─► Group leader receives packet + room keys
   └─► SALVE marks: "St. Mary's - Checked in at 12:45 PM"
                     ↓
8. RAPHA MEDICAL (During Event)
   └─► Sarah Smith injured during activity
   └─► EMT takes her to medical tent
   └─► Medical staff opens Rapha: chirhoevents.com/org/mount2000/rapha
   └─► Searches: "Sarah Smith"
   └─► Views:
       • Allergies: Penicillin ⚠️
       • Medications: EpiPen (on person)
       • Medical conditions: Asthma (controlled)
       • Emergency contact: Mom - (918) 555-1234
   └─► Treats injury, creates incident report
   └─► Prints report for Sarah to take home
                     ↓
9. POST-EVENT REPORTING
   └─► Org Admin logs in
   └─► Generates financial report
   └─► Exports to:
       • Google Sheets (live spreadsheet)
       • QuickBooks (invoice sync)
       • PDF (for archival)
   └─► Downloads all liability forms as ZIP
   └─► Stores on flash drive for 7 years
   └─► Sends post-event survey to all participants
   └─► Exports email list to Mailchimp for future marketing
```

---

## 🔐 Security Architecture

### **Authentication (Clerk)**
```
┌─────────────────────────────────────┐
│        Clerk Authentication         │
├─────────────────────────────────────┤
│  • Email + Password                 │
│  • Magic Links (passwordless)       │
│  • 2FA (optional for Org Admins)    │
│  • Session Management               │
│  • JWT Tokens                       │
│  • Role-Based Access Control        │
└─────────────────────────────────────┘
```

### **Authorization (Row-Level Security)**
Every database query automatically filtered by:
- `organization_id` - Users only see their organization's data
- `event_id` - Further scoped to specific events
- `role` - Permissions based on user role

**Example SQL Policy:**
```sql
CREATE POLICY "Organizations can only access their own data"
ON events
FOR ALL
USING (organization_id = current_user_organization_id());
```

### **Data Encryption**
- **In Transit:** TLS 1.3 (all HTTP traffic encrypted)
- **At Rest:** AES-256 (database + file storage)
- **Passwords:** bcrypt hashing (cost factor 12)
- **API Keys:** Environment variables (never in code)

### **Sensitive Data Handling**
- **Payment Info:** Never stored (Stripe handles)
- **Medical Records:** Encrypted + access logged
- **Minor Data:** COPPA-compliant (parental consent)
- **Liability Forms:** Encrypted PDFs in R2

### **Audit Trail**
All actions logged:
```json
{
  "timestamp": "2026-06-15T14:32:15Z",
  "user_id": "org_admin_123",
  "action": "housing_assignment_modified",
  "resource": "group_stmarys",
  "changes": {
    "before": "Sullivan 101-104",
    "after": "Sullivan 101-105"
  },
  "ip_address": "192.168.1.100"
}
```

---

## 📡 API Architecture

### **RESTful API Endpoints**

**Base URL:** `https://chirhoevents.com/api`

### **Registration Endpoints**
```
POST   /registration/group          - Create group registration
GET    /registration/group/:id      - Get group details
PATCH  /registration/group/:id      - Update group details
POST   /registration/individual     - Create individual registration
GET    /registration/individual/:id - Get individual details

POST   /liability/form              - Submit liability form
GET    /liability/form/:id          - Get completed form
DELETE /liability/form/:id          - Delete form (group leader only)
POST   /liability/certificate       - Upload safe environment cert
```

### **Payment Endpoints**
```
POST   /payment/intent              - Create Stripe payment intent
POST   /payment/complete            - Confirm payment
GET    /payment/history/:groupId    - Get payment history
POST   /payment/late-fee            - Apply late fee
DELETE /payment/late-fee/:id        - Remove late fee
POST   /payment/check               - Record check payment
```

### **Poros Portal Endpoints**
```
POST   /poros/import                - Import groups from registration
GET    /poros/groups                - Get all groups for event
GET    /poros/rooms                 - Get all rooms
POST   /poros/room                  - Create new room
PATCH  /poros/room/:id              - Update room
DELETE /poros/room/:id              - Delete room

POST   /poros/assign/housing        - Assign group to housing
POST   /poros/assign/seating        - Assign group to seating
POST   /poros/assign/meal-color     - Assign meal color
POST   /poros/assign/small-group    - Assign small group
GET    /poros/recommendations       - Get auto-assignment suggestions
```

### **SALVE Endpoints**
```
GET    /salve/search                - Search by name/QR/phone
POST   /salve/checkin               - Mark as checked in
POST   /salve/print/group           - Generate group packet PDF
POST   /salve/print/individual      - Generate individual packet PDF
POST   /salve/print/nametag         - Generate name tag PDF
GET    /salve/stats                 - Get check-in statistics
```

### **Rapha Medical Endpoints**
```
GET    /rapha/participant/:id       - Get medical info
POST   /rapha/incident              - Create incident report
GET    /rapha/incident/:id          - Get incident report
POST   /rapha/incident/:id/print    - Generate incident PDF
```

### **Reporting Endpoints**
```
GET    /reports/financial           - Generate financial report
GET    /reports/registration        - Generate registration report
POST   /reports/custom              - Generate custom report
GET    /reports/export/sheets       - Export to Google Sheets
GET    /reports/export/quickbooks   - Sync to QuickBooks
GET    /reports/export/mailchimp    - Export to Mailchimp
```

---

## 🎨 Technology Stack

### **Frontend**
- **Framework:** Next.js 14 (React)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** React Context + hooks
- **Forms:** React Hook Form + Zod validation
- **Date Handling:** date-fns
- **QR Codes:** qrcode.react
- **PDF Generation:** @react-pdf/renderer

### **Backend**
- **Runtime:** Node.js 20
- **API:** Next.js API Routes
- **Authentication:** Clerk
- **Database:** Neon PostgreSQL 15
- **ORM:** Prisma
- **File Storage:** Cloudflare R2
- **Email:** Resend

### **Payments & Integrations**
- **Payments:** Stripe Connect
- **Spreadsheets:** Google Sheets API
- **Email Marketing:** Mailchimp API
- **Accounting:** QuickBooks Online API

### **Infrastructure**
- **Hosting:** Railway
- **Database:** Neon PostgreSQL
- **File Storage:** Cloudflare R2
- **CDN:** Cloudflare
- **DNS:** Cloudflare
- **Version Control:** GitHub
- **CI/CD:** GitHub Actions + Railway auto-deploy

### **Development Tools**
- **Code Editor:** VS Code + Claude Code
- **Package Manager:** npm
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript (optional, can use JavaScript)
- **Testing:** Vitest (future - not in MVP)

---

## 📈 Scalability Considerations

### **Current Architecture Supports:**
- ✅ Up to 1,000 organizations
- ✅ Up to 500,000 registrations/year
- ✅ Up to 10,000 concurrent users
- ✅ 99.9% uptime SLA

### **Scaling Strategy:**

**Phase 1 (0-100 Orgs):**
- Single Railway instance
- Single Neon database
- Basic monitoring

**Phase 2 (100-500 Orgs):**
- Horizontal scaling (multiple Railway instances)
- Read replicas (Neon)
- Redis caching layer
- Advanced monitoring (Datadog)

**Phase 3 (500-1,000 Orgs):**
- Load balancer
- Database sharding by organization
- CDN for static assets
- Dedicated file storage CDN

---

## 🎯 Success Metrics

### **Technical KPIs**
- Page load time: < 2 seconds
- API response time: < 500ms
- Database query time: < 100ms
- Uptime: 99.9%
- Error rate: < 0.1%

### **Business KPIs**
- Organizations onboarded: 100 in Year 1
- Active events per month: 200+
- Total registrations processed: 50,000+ in Year 1
- Customer retention: >90%
- Net Promoter Score: >50

---

## 🚀 Deployment Strategy

### **Environments**

**Production:** `chirhoevents.com`
- Main branch auto-deploys
- All traffic routed here
- Monitored 24/7

**Staging:** `staging.chirhoevents.com`
- Staging branch auto-deploys
- Test new features here
- Identical to production (separate database)

**Development:** `localhost:3000`
- Local development on your machine
- Claude Code tests here first

### **Deployment Flow**
```
1. Claude Code makes changes locally
2. Commit to `staging` branch
3. Push to GitHub
4. Railway auto-deploys to staging.chirhoevents.com
5. You test on staging
6. Approve? Merge staging → main
7. Railway auto-deploys to chirhoevents.com
8. New features live!
```

### **Rollback Strategy**
If something breaks:
1. Railway can instantly rollback to previous deploy
2. Takes 30 seconds
3. Zero downtime

---

## 📚 Documentation Standards

Every feature documented with:
- User stories ("As a group leader, I want to...")
- Acceptance criteria ("Given... When... Then...")
- API specifications (request/response examples)
- UI mockups (wireframes)
- Error handling scenarios
- Test cases

---

## ✅ Next Steps

1. ✅ Review this system architecture
2. ✅ Review database schema (next document)
3. ✅ Review technical specifications (per system)
4. ✅ Review development roadmap
5. ✅ Start building with Claude Code!

---

**END OF SYSTEM ARCHITECTURE DOCUMENT**
