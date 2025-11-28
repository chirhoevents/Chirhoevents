# ChiRho Events - Testing Checklist
**Version:** 1.0  
**Date:** November 26, 2025  
**Purpose:** Systematic testing guide for all features

---

## 🎯 Testing Philosophy

**Test Early, Test Often:**
- Test each feature immediately after Claude Code builds it
- Don't wait until the end to test everything
- Catch bugs early when they're easier to fix

**Test Like a User:**
- Follow actual user workflows
- Try to break things (edge cases)
- Test on multiple devices
- Think like someone who's never seen the platform

**Document Everything:**
- Note what works ✅
- Note what doesn't work ❌
- Take screenshots of bugs
- Describe expected vs actual behavior

---

## 📋 Testing Environment Setup

### **Required Accounts:**
- [ ] Clerk account (authentication)
- [ ] Stripe test account (test mode)
- [ ] Test email accounts (minimum 3)
  - Admin: admin@test.com
  - Group leader: leader@test.com
  - Parent: parent@test.com
- [ ] Test phone number (for SMS testing if added)

### **Test Devices:**
- [ ] Desktop browser (Chrome, Firefox, Safari)
- [ ] Mobile phone (iOS or Android)
- [ ] Tablet (optional but recommended)

### **Test Data:**
- [ ] Test organization created
- [ ] Test event created
- [ ] Test pricing configured
- [ ] Test rooms created

---

## 🏗️ MONTH 1: REGISTRATION SYSTEM

### **1.1 Group Registration (Week 2-3)**

#### **Happy Path Testing:**
- [ ] **Visit registration page**
  - Page loads without errors
  - All form fields visible
  - Logo displays correctly
  - Mobile responsive

- [ ] **Fill out group registration form**
  - Group name: "Test Youth Group"
  - Youth counts: 10 male U18, 8 female U18
  - Chaperone counts: 2 male, 2 female
  - Priest count: 1
  - Housing type: On-campus
  - All required fields marked with asterisk

- [ ] **Submit form**
  - Validation works (empty fields rejected)
  - Email format validated
  - Phone format validated
  - Price calculates correctly
  - Shows total amount due

- [ ] **Complete payment (Stripe test)**
  - Test card: 4242 4242 4242 4242
  - CVV: 123, Exp: 12/34, ZIP: 12345
  - Payment processes successfully
  - Redirect to confirmation page

- [ ] **Confirmation page**
  - Shows access code (ex: M2K2026-TESTGROUP-ABC1)
  - Shows payment receipt
  - Shows next steps (complete liability forms)
  - "Download Receipt" button works

- [ ] **Email confirmation**
  - Received within 1 minute
  - Contains access code
  - Contains payment receipt
  - Contains event details
  - Links work

#### **Edge Case Testing:**
- [ ] **Invalid inputs**
  - Submit with empty required fields → Shows errors
  - Enter invalid email → Shows error
  - Enter invalid phone → Shows error
  - Enter text in number fields → Prevents or shows error

- [ ] **Payment failures**
  - Declined card (4000 0000 0000 0002) → Shows error message
  - Insufficient funds (4000 0000 0000 9995) → Shows error
  - Card expires during payment → Handles gracefully

- [ ] **Browser back button**
  - Click back after payment → Doesn't duplicate charge
  - Shows appropriate message

- [ ] **Network interruption**
  - Disconnect internet mid-form → Shows error
  - Reconnect → Can continue

- [ ] **Coupon codes (if implemented)**
  - Valid code → Discount applied
  - Invalid code → Error shown
  - Expired code → Error shown
  - Stackable codes → Both apply or error shown

---

### **1.2 Individual Registration (Week 4)**

#### **Happy Path Testing:**
- [ ] **Fill individual registration**
  - First name, last name, email, phone
  - Age: 28
  - Gender: Female
  - Room type: Double
  - Preferred roommate: "Jane Smith"
  - Dietary restrictions: "Vegetarian"
  - Emergency contact info

- [ ] **Add-ons (if available)**
  - Add t-shirt (size L)
  - Price updates correctly
  - Can remove add-on

- [ ] **Payment**
  - Full payment processed
  - QR code generated
  - Email with QR code received

#### **Edge Cases:**
- [ ] Different room types (single, triple, quad)
- [ ] No roommate preference (leave blank)
- [ ] Multiple add-ons selected
- [ ] No add-ons selected

---

## 📝 MONTH 2: LIABILITY FORMS

### **2.1 Youth Under 18 Form (Week 5-6)**

#### **Access Code Login:**
- [ ] **Navigate to form URL**
  - /events/[eventId]/forms loads
  - Access code input visible

- [ ] **Enter access code**
  - Valid code: M2K2026-TESTGROUP-ABC1
  - Redirects to role selection

- [ ] **Select role: Youth Under 18**
  - Shows participant information form
  - Asks for parent email

#### **Participant Fills Info:**
- [ ] **Enter participant details**
  - First name: Sarah
  - Last name: Test
  - Age: 15
  - Gender: Female
  - T-shirt size: M
  - Parent email: parent@test.com

- [ ] **Submit**
  - Confirmation message shown
  - Email sent to parent

#### **Parent Completes Form:**
- [ ] **Parent receives email**
  - Email arrives within 1 minute
  - Contains link to form
  - Pre-filled with Sarah Test's name

- [ ] **Parent clicks link**
  - Form loads with participant name
  - Medical section visible

- [ ] **Fill medical information**
  - Medical conditions: "Asthma (controlled)"
  - Medications: "Albuterol inhaler"
  - Allergies: "Penicillin, peanuts"
  - Dietary: "Vegetarian"
  - ADA: "None"

- [ ] **Emergency contacts**
  - Contact 1: Name, phone, relation
  - Contact 2: Name, phone, relation

- [ ] **Insurance information**
  - Provider, policy #, group #

- [ ] **E-signature**
  - Type full legal name
  - Initial each section (4 sections)
  - Type date
  - Submit

- [ ] **Confirmation**
  - Success message shown
  - PDF generated
  - Can download PDF
  - Can email PDF
  - Email confirmation received

#### **Edge Cases:**
- [ ] Parent doesn't receive email → Resend button works
- [ ] Parent clicks expired link → Shows error, can regenerate
- [ ] Submit without initials → Shows validation error
- [ ] Submit without date → Shows validation error
- [ ] Parent email typo → Group leader can delete and redo

---

### **2.2 Youth Over 18 + Chaperone Forms (Week 7)**

#### **Youth Over 18:**
- [ ] **Select role: Youth Over 18**
  - Shows self-completion form (no parent email)
  - Same fields as Under 18
  - Can complete themselves

- [ ] **Submit form**
  - PDF generated
  - Email confirmation received

#### **Chaperone:**
- [ ] **Select role: Chaperone**
  - Shows chaperone form
  - Same fields as youth
  - Additional: Safe environment certificate upload

- [ ] **Upload certificate (optional)**
  - Can upload PDF
  - Can skip and upload later
  - Shows "I'll submit this later" option

- [ ] **Complete form**
  - PDF generated
  - Email received

---

### **2.3 Clergy Form (Week 8)**

#### **Clergy Form:**
- [ ] **Select role: Priest**
  - Shows clergy form
  - Title dropdown: Priest, Deacon, Bishop, Cardinal

- [ ] **Fill additional fields**
  - Select title: Priest
  - Diocese of incardination: "Diocese of Tulsa"
  - Faculty information fields visible

- [ ] **Complete form**
  - E-signature collected
  - PDF generated
  - Different wording from youth/chaperone forms

---

### **2.4 Group Leader Portal (Week 8)**

#### **Portal Access:**
- [ ] **Login with access code**
  - Navigate to /portal/[accessCode]
  - Dashboard loads

#### **Dashboard Overview:**
- [ ] **Statistics display**
  - Total participants: 23
  - Forms completed: 18/23
  - Forms pending: 5 (names listed)
  - Safe environment: 3/4

#### **Form Management:**
- [ ] **View form status**
  - See who completed forms (green checkmark)
  - See who hasn't started (red X)
  - Click name → View details (but can't edit)

- [ ] **Delete form**
  - Select form
  - Click "Delete"
  - Confirmation modal appears
  - Confirm deletion
  - Form deleted, person can redo

- [ ] **Upload certificate**
  - Click "Upload Certificate" for chaperone
  - Select PDF file
  - Upload successful
  - Status changes to "Uploaded"

#### **Payment Management:**
- [ ] **View payment summary**
  - Total due: $4,600
  - Paid: $1,150
  - Remaining: $3,450

- [ ] **Make payment**
  - Click "Make Payment"
  - Enter amount (can pay full or partial)
  - Process through Stripe
  - Payment successful
  - Receipt downloaded
  - Balance updates

---

## 🏠 MONTH 3: POROS PORTAL

### **3.1 Housing Assignments (Week 9-10)**

#### **Import Groups:**
- [ ] **Navigate to Poros Portal**
  - /org/[orgId]/poros loads
  - Tabs visible: Dashboard, Youth Groups, Room Management, Assignments

- [ ] **Click "Import Groups"**
  - Modal appears
  - Shows count of groups to import
  - Confirm import
  - Groups load into system
  - Success message shown

#### **Room Management:**
- [ ] **Create youth housing room**
  - Building: Sullivan Hall
  - Room number: 101
  - Capacity: 6
  - Gender: Male
  - Age: Youth U18
  - ADA: No
  - Save successful

- [ ] **Create more rooms**
  - Sullivan 102, 103, 104 (male youth)
  - McCormick 201-204 (female youth)
  - Sullivan 109-110 (male chaperones)
  - St. Joseph 401 (priests)

- [ ] **Edit room**
  - Click edit button
  - Change capacity
  - Save changes
  - Updates reflected

- [ ] **Delete room**
  - Click delete
  - Confirmation modal
  - Confirm deletion
  - Room removed (only if unassigned)

#### **Housing Assignments:**
- [ ] **Drag-and-drop assignment**
  - Find "Test Youth Group" card
  - Shows: 10 male U18, 8 female U18, 2 male chaperones
  - Drag to Sullivan 101
  - System shows: "6/6 filled"
  - Drag to Sullivan 102
  - System shows: "4/6 filled"

- [ ] **Auto-recommendations**
  - Click "Get Recommendations" for group
  - System suggests: Sullivan 101-102 (10 males)
  - Click "Auto-assign"
  - Rooms filled automatically

- [ ] **Capacity warnings**
  - Try to assign 8 people to 6-bed room
  - Warning shown: "Not enough capacity"
  - Assignment prevented

- [ ] **Gender restrictions**
  - Try to assign males to female room
  - Error: "Gender mismatch"
  - Assignment prevented

- [ ] **View assignments**
  - Room card shows assigned group
  - Shows occupancy: 6/6
  - Click room → See all occupants

#### **Priest Housing:**
- [ ] **Navigate to Priest Housing tab**
  - Shows only priest-designated rooms
  - Shows groups with priests

- [ ] **Assign priests**
  - Drag group → St. Joseph 401
  - Only priests assigned (not youth/chaperones)
  - Works correctly

#### **ADA Tracking:**
- [ ] **Mark individual as ADA**
  - Find person with ADA needs
  - Flag as ADA
  - Shows wheelchair icon

- [ ] **Assign to ADA room**
  - Drag to ADA-accessible room
  - Assignment successful
  - Non-ADA person to non-ADA room also works

---

### **3.2 Seating + Meal Colors (Week 11)**

#### **Seating Management:**
- [ ] **Create seating sections**
  - Venue: Main Conference Hall
  - Section A: 500 seats
  - Section B: 500 seats
  - Section C: 500 seats

- [ ] **Assign groups to sections**
  - Drag Test Youth Group → Section A
  - Reserves 23 seats
  - Section shows: 477/500 remaining

#### **Meal Colors:**
- [ ] **Create meal colors**
  - Color: Blue
  - Time: 12:30 PM
  - Type: Lunch
  - Capacity: 50 groups

- [ ] **Assign groups**
  - Drag Test Youth Group → Blue
  - Assignment successful
  - Shows on group card: "Blue - 12:30 PM"

#### **Feature Toggles:**
- [ ] **Navigate to Settings**
  - Toggle "Housing Assignments" OFF
  - Housing tab disappears
  - Toggle back ON
  - Tab reappears

- [ ] **Warning on disable**
  - Toggle OFF when data exists
  - Warning: "This will delete assignments"
  - Cancel → No change
  - Confirm → Assignments deleted

---

### **3.3 Small Groups (Week 12)**

#### **Small Group Rooms:**
- [ ] **Create small group rooms**
  - Room: St. Thomas Room
  - Building: Newman Center
  - Capacity: 60
  - Equipment: Whiteboard, projector

#### **SGL Management:**
- [ ] **Add seminarian**
  - Name: John Smith
  - Seminary: Mount St. Mary's
  - Year: 2nd Theology
  - Bio: (optional)

- [ ] **Assign to group**
  - Drag John → Test Youth Group
  - Assignment successful

#### **Religious Staff:**
- [ ] **Add religious staff**
  - Name: Sr. Maria
  - Title: Sr.
  - Order: Sisters of Charity
  - Role: Campus Minister

- [ ] **Assign to group**
  - Drag Sr. Maria → Test Youth Group
  - Works correctly

---

## ✅ MONTH 4: SALVE CHECK-IN

### **4.1 SALVE Search (Week 13-14)**

#### **QR Code Scanning:**
- [ ] **Open SALVE**
  - /org/[orgId]/salve loads
  - QR scanner visible

- [ ] **Scan QR code**
  - Use phone to display QR from email
  - Scan with camera
  - Registration loads instantly

#### **Name Search:**
- [ ] **Search by name**
  - Type "Test Youth"
  - Results appear
  - Select correct group

#### **Phone Search:**
- [ ] **Search by phone**
  - Enter (918) 555-1234
  - Group leader's group appears

#### **Registration Display:**
- [ ] **View registration details**
  - Group name shown
  - Participant count shown
  - Payment status: ✅ Paid full
  - Forms status: ✅ 23/23
  - Safe environment: ✅ 4/4
  - Housing shown: Sullivan 101-102, etc.
  - Meal color: Blue - 12:30 PM
  - Seating: Section A
  - **Dietary flags: ⚠️ 3 people**

#### **Check-In:**
- [ ] **Mark as checked in**
  - Click "Check In"
  - Confirmation appears
  - Timestamp recorded
  - Status changes to "Checked In"

#### **Overrides:**
- [ ] **Override payment (test)**
  - Group with unpaid balance
  - Click "Check In"
  - Warning: "Payment incomplete"
  - Check "Override payment"
  - Enter reason: "Paying by check, will process later"
  - Check in successful

---

### **4.2 PDF Printing (Week 15)**

#### **Group Packet:**
- [ ] **Print group packet**
  - Click "Print Packet"
  - PDF generates (5 pages)
  - Page 1: Group overview
  - Page 2-3: Participant lists by gender
  - Page 4: **DIETARY RESTRICTIONS (HIGHLIGHTED)**
  - Page 5: Event schedule
  - Download successful
  - Opens in browser

- [ ] **Verify dietary highlighting**
  - Page 4 has dietary summary
  - Each person with restrictions has:
    - **Bold red text** or **yellow highlight**
    - Icon next to name
  - Easy to see at a glance

#### **Individual Packet:**
- [ ] **Print individual packet**
  - Single page
  - Name, room, meal time
  - Payment receipt
  - Add-ons listed
  - QR code present

#### **Name Tags:**
- [ ] **Configure name tag settings**
  - Navigate to Settings
  - Select template: Standard Avery 74459
  - Show: First name, last name, group, meal color, QR
  - Save settings

- [ ] **Print name tags**
  - Select Test Youth Group
  - Click "Print Name Tags"
  - PDF generates (8 per sheet)
  - Each badge shows:
    - Name (large)
    - Group name
    - Meal color dot (blue)
    - QR code
    - Event logo

- [ ] **On-demand name tag**
  - Search individual
  - Click "Print Name Tag"
  - Single badge prints

#### **Custom Documents:**
- [ ] **Upload custom document**
  - Navigate to SALVE Settings
  - Upload PDF: "Parking Pass"
  - Set to print with groups
  - Save

- [ ] **Print with custom doc**
  - Print group packet
  - Parking pass appended to PDF
  - Works correctly

---

### **4.3 SALVE Dashboard (Week 16)**

#### **Real-Time Statistics:**
- [ ] **View dashboard**
  - Total registered: 5,000
  - Checked in: 0
  - Remaining: 5,000
  - Updates live (refresh page)

- [ ] **Check in groups**
  - Check in Test Youth Group
  - Dashboard updates: 23 checked in
  - Check in more groups
  - Numbers update

#### **Live Feed:**
- [ ] **Last 10 check-ins**
  - Shows recent check-ins
  - Updates automatically
  - Timestamps accurate

#### **Charts:**
- [ ] **Check-ins by hour**
  - Bar chart displays
  - Updates as check-ins happen

---

## 🏥 MONTH 5: RAPHA MEDICAL

### **5.1 Medical Platform (Week 17-18)**

#### **Access Management:**
- [ ] **Create Rapha user**
  - Org Admin creates medical staff user
  - Email: medical@test.com
  - Role: Rapha User
  - Invitation sent

- [ ] **Rapha user logs in**
  - Receives email
  - Creates account
  - Can access /org/[orgId]/rapha

#### **Participant Search:**
- [ ] **Search by name**
  - Type "Sarah Test"
  - Result appears
  - Click to view profile

#### **Medical Profile:**
- [ ] **View medical information**
  - Name, age, gender shown
  - Medical conditions: Asthma
  - Medications: Albuterol inhaler
  - **Allergies: ⚠️ PENICILLIN, PEANUTS** (highlighted)
  - Dietary: Vegetarian
  - Insurance info shown
  - Emergency contacts (2) shown

#### **Incident Report:**
- [ ] **Create incident**
  - Click "Create Incident Report"
  - Date: Today
  - Location: Recreation field
  - Description: Twisted ankle
  - Injury type: Sprain - right ankle
  - Treatment: Ice, wrapped, resting
  - Medications given: None
  - Hospital transport: No
  - Parent contacted: Yes
  - Contact time: 2:45 PM
  - Follow-up required: Yes
  - Follow-up notes: See doctor in 48 hours

- [ ] **Generate PDF**
  - Click "Generate Report"
  - PDF creates
  - Can download
  - Can print
  - Contains all information

- [ ] **View incident history**
  - Navigate to Incidents
  - See all incidents
  - Can search by participant

---

### **5.2 Group Leader Portal Enhancement (Week 19)**

#### **Payment History:**
- [ ] **View payment history**
  - Shows all payments made
  - Deposit: $1,150
  - Balance: $3,450
  - Dates shown
  - Can download receipts

#### **Upcoming Deadlines:**
- [ ] **Deadline display**
  - "Final payment due: June 30"
  - Countdown timer
  - Red if overdue

---

### **5.3 Late Fees + Coupons (Week 20)**

#### **Late Fees:**
- [ ] **Apply late fees (Org Admin)**
  - Navigate to Late Fees
  - Shows unpaid groups (Test Group has $3,450 remaining)
  - Click "Apply Late Fees"
  - Modal: "Apply 20% ($690) to 1 group?"
  - Confirm
  - Late fee applied: $690
  - New balance: $4,140
  - Email sent to group leader

- [ ] **Group leader sees late fee**
  - Login to portal
  - Balance updated: $4,140
  - Late fee listed separately

- [ ] **Remove late fee**
  - Org Admin can remove for specific group
  - Click "Remove Late Fee"
  - Balance returns to $3,450

#### **Coupons:**
- [ ] **Create coupon (Org Admin)**
  - Code: EARLYBIRD
  - Type: Percentage
  - Value: 20%
  - Usage: Unlimited
  - Stackable: No
  - Expiration: June 1
  - Save

- [ ] **Use coupon during registration**
  - New registration
  - Enter code: EARLYBIRD
  - Click "Apply"
  - Discount shown: -$460
  - New total: $1,840

- [ ] **Try stacking (if enabled)**
  - Apply EARLYBIRD
  - Try second code
  - If stackable: Both apply
  - If not: Error shown

---

## 🌐 MONTH 6: PUBLIC PORTAL + INTEGRATIONS

### **6.1 Public Resource Portal (Week 21-22)**

#### **Portal Setup:**
- [ ] **Enable public portal**
  - Org Admin → Event Settings
  - Toggle "Public Portal: ON"
  - Save

- [ ] **Customize portal**
  - Welcome message: "Welcome to Mount 2000!"
  - Upload logo
  - Set color scheme (navy & gold)
  - Upload documents: Map, WiFi info

#### **Public Access:**
- [ ] **Visit public URL**
  - chirhoevents.com/mount2000-2026-poros
  - Page loads (no login required)
  - Mobile-optimized

- [ ] **Search for group**
  - Enter "Test Youth Group"
  - Click Search
  - Results show:
    - Seating: Section A
    - Meal time: Blue - 12:30 PM
    - Small group: St. Thomas Room
    - Event schedule
  - **Housing NOT shown** (correct)

- [ ] **QR code poster**
  - Org Admin downloads QR poster
  - QR points to portal URL
  - Scan with phone → Portal loads

---

### **6.2 Google Sheets (Week 23)**

#### **Connect Google Account:**
- [ ] **OAuth connection**
  - Navigate to Integrations
  - Click "Connect Google Sheets"
  - Login with Google
  - Grant permissions
  - Connection successful

#### **Export Data:**
- [ ] **One-time export**
  - Select template: Registration Data
  - Click "Export"
  - New sheet created in Google Drive
  - Data populates correctly

- [ ] **Live sync**
  - Enable "Live Sync"
  - Frequency: 5 minutes
  - Create new registration
  - Wait 5 minutes
  - Check sheet → New row appears

---

### **6.3 Mailchimp + QuickBooks (Week 24)**

#### **Mailchimp:**
- [ ] **Connect account**
  - OAuth flow
  - Select audience
  - Connection successful

- [ ] **Export email list**
  - Select: Group leaders + Individuals
  - Add tags: Mount2000-2026, Youth
  - Export
  - Check Mailchimp → Contacts appear

#### **QuickBooks:**
- [ ] **Connect account**
  - OAuth flow
  - Grant permissions
  - Connection successful

- [ ] **Sync payments**
  - Click "Sync to QuickBooks"
  - Invoices created for each registration
  - Payments recorded
  - Late fees as line items
  - Check QuickBooks → Data matches

---

## 🎨 MONTH 7: UI/UX POLISH

### **7.1 Design Consistency (Week 25-26)**

#### **Color Palette:**
- [ ] **Navy blue used consistently**
- [ ] **Gold used for CTAs**
- [ ] **Beige backgrounds**
- [ ] **Success green, error red**

#### **Typography:**
- [ ] **Headings use correct sizes**
- [ ] **Body text 16px**
- [ ] **Labels 14px**
- [ ] **Mobile font sizes reduced**

#### **Buttons:**
- [ ] **Primary buttons: Gold**
- [ ] **Secondary buttons: Outline**
- [ ] **Hover states work**
- [ ] **Disabled states gray**

#### **Forms:**
- [ ] **Focus states visible (gold outline)**
- [ ] **Error messages show in red**
- [ ] **Helper text in gray**
- [ ] **Labels above fields**

---

### **7.2 Mobile Testing (Week 25-26)**

#### **Responsive Design:**
- [ ] **Mobile phone (320px - 767px)**
  - All pages stack to 1 column
  - Text readable
  - Buttons large enough (48px)
  - Navigation works
  - Forms usable

- [ ] **Tablet (768px - 1023px)**
  - 2-column layouts
  - Features display nicely
  - Navigation appropriate

- [ ] **Desktop (1024px+)**
  - 3-column layouts
  - Maximum width 1200px
  - Centered content

#### **Touch Targets:**
- [ ] **All buttons 44px+ minimum**
- [ ] **Spacing between buttons**
- [ ] **No tiny click areas**

---

### **7.3 Loading States (Week 25-26)**

- [ ] **Skeleton loaders**
  - Show while data loads
  - Match final content layout

- [ ] **Spinners**
  - Show during processing
  - Gold color
  - Smooth animation

- [ ] **Progress bars**
  - Show during uploads
  - Update correctly

---

### **7.4 Accessibility (Week 25-26)**

#### **Keyboard Navigation:**
- [ ] **Tab through forms**
  - Logical order
  - Focus visible
  - Can submit with Enter

- [ ] **Skip links**
  - Present at top
  - Jump to main content

#### **Screen Readers:**
- [ ] **Alt text on images**
- [ ] **ARIA labels on buttons**
- [ ] **Form labels connected**
- [ ] **Error announcements**

#### **Color Contrast:**
- [ ] **Navy on white: Pass**
- [ ] **Gray on white: Pass**
- [ ] **Gold only for accents (not text)**

---

## 🐛 MONTH 7-8: BUG FIXES

### **Common Bugs to Check:**

#### **Forms:**
- [ ] Empty required fields rejected
- [ ] Can't submit twice
- [ ] Data persists on back button
- [ ] File uploads work
- [ ] Validation messages clear

#### **Payments:**
- [ ] No duplicate charges
- [ ] Failed payments handled
- [ ] Balance calculates correctly
- [ ] Receipts generate

#### **Assignments:**
- [ ] Can't over-assign rooms
- [ ] Gender restrictions enforced
- [ ] Drag-and-drop smooth
- [ ] Assignments save

#### **Search:**
- [ ] Returns correct results
- [ ] No results shows message
- [ ] Special characters handled
- [ ] Case-insensitive

---

## 🎯 MONTH 8: BETA TESTING (Mount 2000)

### **Pre-Event Testing:**
- [ ] 500+ registrations processed
- [ ] All forms collected
- [ ] All payments recorded
- [ ] Housing assigned
- [ ] Seating assigned
- [ ] SALVE ready

### **During Event:**
- [ ] **Check-in (Day 1)**
  - SALVE operators trained
  - QR scanning works
  - Name search works
  - Packets print quickly
  - Dietary flags visible
  - No major issues

- [ ] **Medical incidents**
  - Rapha accessible
  - Medical info accurate
  - Incident reports work

- [ ] **Real-time monitoring**
  - Statistics update
  - No crashes
  - Performance good

### **Post-Event:**
- [ ] Reports generate correctly
- [ ] Data exports work
- [ ] Feedback collected
- [ ] Bugs documented

---

## ✅ FINAL PRE-LAUNCH CHECKLIST

### **Functionality:**
- [ ] All core features working
- [ ] No critical bugs
- [ ] Performance acceptable (<2s page load)
- [ ] Mobile fully functional

### **Content:**
- [ ] Landing page complete
- [ ] Pricing page accurate
- [ ] Help documentation written
- [ ] FAQ answered

### **Technical:**
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] Backups running
- [ ] Monitoring active
- [ ] Error logging working

### **Legal:**
- [ ] Terms of Service live
- [ ] Privacy Policy live
- [ ] COPPA compliance verified
- [ ] PCI compliance (Stripe)

### **Support:**
- [ ] Support email active
- [ ] Response process defined
- [ ] Common issues documented

---

## 📊 Bug Reporting Template

When you find a bug, document it like this:

```
BUG REPORT #001

Title: Late fee doesn't apply to all groups

Severity: Medium

Steps to Reproduce:
1. Navigate to Late Fees page
2. Click "Apply Late Fees to All"
3. Confirm application

Expected Behavior:
Late fees should apply to all 48 unpaid groups

Actual Behavior:
Late fees only applied to 32 groups

Environment:
- Browser: Chrome 120
- Device: Desktop
- User Role: Org Admin
- Event: Mount 2000 Summer 2026

Screenshots: [attach]

Additional Notes:
Groups with $0 balance incorrectly included in count
```

---

## ✅ Testing Sign-Off

Once testing is complete:

**Tested By:** ________________  
**Date:** ________________  
**Approved for Launch:** ☐ Yes  ☐ No  
**Notes:** ________________________________

---

**END OF TESTING CHECKLIST**

**Total Test Cases:** 200+  
**Estimated Testing Time:** 40-50 hours across 8 months  
**Critical Features:** All tested before launch
