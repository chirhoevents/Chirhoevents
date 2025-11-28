# ChiRho Events - API Documentation
**Version:** 1.0  
**Date:** November 26, 2025  
**Base URL:** `https://chirhoevents.com/api`  
**Authentication:** Clerk JWT tokens

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Registration Endpoints](#registration-endpoints)
3. [Liability Form Endpoints](#liability-form-endpoints)
4. [Payment Endpoints](#payment-endpoints)
5. [Poros Portal Endpoints](#poros-portal-endpoints)
6. [SALVE Check-In Endpoints](#salve-check-in-endpoints)
7. [Rapha Medical Endpoints](#rapha-medical-endpoints)
8. [Reporting Endpoints](#reporting-endpoints)
9. [Integration Endpoints](#integration-endpoints)
10. [Admin Endpoints](#admin-endpoints)
11. [Error Handling](#error-handling)

---

## 🔐 AUTHENTICATION

All API requests require authentication via Clerk JWT tokens (except public endpoints).

### **Authentication Header**
```
Authorization: Bearer <clerk_jwt_token>
```

### **User Context**
Every authenticated request includes:
- `user_id` - Current user's ID
- `organization_id` - User's organization
- `role` - User's role (master_admin, org_admin, group_leader, etc.)

### **Row-Level Security**
Database automatically filters data by `organization_id` based on authenticated user.

---

## 📝 REGISTRATION ENDPOINTS

### **POST /api/registration/group**
Create a new group registration

**Authentication:** Not required (public)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "group_name": "St. Mary's Youth Group",
  "parish_name": "St. Mary's Catholic Church",
  "diocese_name": "Diocese of Tulsa",
  "group_leader_name": "Mike Johnson",
  "group_leader_email": "mike@stmarystulsa.org",
  "group_leader_phone": "(918) 555-1234",
  "youth_count_male_u18": 15,
  "youth_count_female_u18": 18,
  "youth_count_male_o18": 3,
  "youth_count_female_o18": 4,
  "chaperone_count_male": 3,
  "chaperone_count_female": 4,
  "priest_count": 2,
  "housing_type": "on_campus",
  "special_requests": "Please keep our group together if possible",
  "coupon_code": "EARLYBIRD" // Optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "group_name": "St. Mary's Youth Group",
  "access_code": "M2K2026-STMARYS-7X9K",
  "total_participants": 49,
  "total_amount_due": 9800.00,
  "deposit_amount": 2450.00,
  "balance_remaining": 7350.00,
  "payment_intent_id": "pi_1234567890",
  "payment_intent_client_secret": "pi_1234567890_secret_abcdef",
  "message": "Registration created successfully. Please complete payment to confirm."
}
```

**Error Responses:**
- `400` - Invalid request data
- `404` - Event not found
- `409` - Event at capacity
- `422` - Validation error (invalid email, phone, etc.)

---

### **GET /api/registration/group/:id**
Get group registration details

**Authentication:** Required (group leader or org admin)

**Response (200 OK):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_name": "Mount 2000 Summer 2026",
  "group_name": "St. Mary's Youth Group",
  "access_code": "M2K2026-STMARYS-7X9K",
  "group_leader": {
    "name": "Mike Johnson",
    "email": "mike@stmarystulsa.org",
    "phone": "(918) 555-1234"
  },
  "participants": {
    "youth_male_u18": 15,
    "youth_female_u18": 18,
    "youth_male_o18": 3,
    "youth_female_o18": 4,
    "chaperone_male": 3,
    "chaperone_female": 4,
    "priests": 2,
    "total": 49
  },
  "housing_type": "on_campus",
  "registration_status": "pending_forms",
  "payment_summary": {
    "total_amount_due": 9800.00,
    "amount_paid": 2450.00,
    "amount_remaining": 7350.00,
    "payment_status": "partial"
  },
  "liability_forms": {
    "total_required": 49,
    "completed": 42,
    "pending": 7
  },
  "safe_environment_certificates": {
    "total_required": 7,
    "uploaded": 6,
    "pending": 1
  },
  "registered_at": "2026-03-15T10:30:00Z"
}
```

---

### **PATCH /api/registration/group/:id**
Update group registration

**Authentication:** Required (group leader or org admin)

**Request Body:**
```json
{
  "group_leader_phone": "(918) 555-9999",
  "special_requests": "Updated: Need ADA accessible rooms"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration updated successfully"
}
```

---

### **POST /api/registration/individual**
Create individual registration

**Authentication:** Not required (public)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "Jane",
  "last_name": "Doe",
  "preferred_name": "Janey",
  "email": "jane@example.com",
  "phone": "(555) 123-4567",
  "age": 28,
  "gender": "female",
  "room_type": "double",
  "preferred_roommate": "Sarah Smith",
  "dietary_restrictions": "Vegetarian, gluten-free",
  "ada_accommodations": "None",
  "emergency_contact_name": "John Doe",
  "emergency_contact_phone": "(555) 987-6543",
  "emergency_contact_relation": "Spouse",
  "add_ons": [
    {
      "add_on_id": "750e8400-e29b-41d4-a716-446655440000",
      "quantity": 1,
      "metadata": { "size": "L" }
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "registration_id": "850e8400-e29b-41d4-a716-446655440001",
  "qr_code": "data:image/png;base64,...",
  "total_amount_due": 150.00,
  "payment_intent_id": "pi_9876543210",
  "payment_intent_client_secret": "pi_9876543210_secret_xyz",
  "message": "Registration created. Please complete payment."
}
```

---

### **POST /api/registration/access-code-login**
Login to group portal with access code

**Authentication:** Not required

**Request Body:**
```json
{
  "access_code": "M2K2026-STMARYS-7X9K"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "group_id": "650e8400-e29b-41d4-a716-446655440001",
  "group_name": "St. Mary's Youth Group",
  "event_name": "Mount 2000 Summer 2026",
  "portal_url": "/portal/M2K2026-STMARYS-7X9K"
}
```

**Error:**
- `404` - Access code not found
- `403` - Access code expired

---

## ✍️ LIABILITY FORM ENDPOINTS

### **POST /api/liability/form**
Submit a liability form

**Authentication:** Not required (uses access code)

**Request Body (Youth Under 18):**
```json
{
  "group_registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "form_type": "youth_u18",
  "participant_first_name": "Sarah",
  "participant_last_name": "Smith",
  "participant_age": 15,
  "participant_gender": "female",
  "parent_email": "parent@example.com", // Parent will receive email
  "t_shirt_size": "M"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "form_id": "950e8400-e29b-41d4-a716-446655440001",
  "message": "Email sent to parent to complete form",
  "parent_email": "parent@example.com"
}
```

---

**Request Body (Parent Completing Form):**
```json
{
  "form_id": "950e8400-e29b-41d4-a716-446655440001",
  "token": "parent_token_abc123", // From email link
  "medical_conditions": "Asthma (controlled with inhaler)",
  "medications": "Albuterol inhaler (as needed)",
  "allergies": "Penicillin, peanuts",
  "dietary_restrictions": "Vegetarian",
  "ada_accommodations": "None",
  "emergency_contact_1": {
    "name": "Jane Smith",
    "phone": "(555) 123-4567",
    "relation": "Mother"
  },
  "emergency_contact_2": {
    "name": "John Smith",
    "phone": "(555) 987-6543",
    "relation": "Father"
  },
  "insurance_provider": "Blue Cross Blue Shield",
  "insurance_policy_number": "ABC123456",
  "insurance_group_number": "XYZ789",
  "signature_data": {
    "full_legal_name": "Jane Smith",
    "initials": "JS",
    "date_signed": "2026-04-15",
    "sections_initialed": [
      "medical_consent",
      "activity_waiver",
      "photo_release",
      "transportation"
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "form_id": "950e8400-e29b-41d4-a716-446655440001",
  "pdf_url": "https://r2.chirhoevents.com/org-id/event-id/forms/form-id.pdf",
  "message": "Liability form completed successfully"
}
```

---

### **GET /api/liability/form/:id**
Get liability form details

**Authentication:** Required (org admin, group leader for their forms)

**Response (200 OK):**
```json
{
  "id": "950e8400-e29b-41d4-a716-446655440001",
  "form_type": "youth_u18",
  "participant_name": "Sarah Smith",
  "completed": true,
  "completed_by": "parent@example.com",
  "completed_at": "2026-04-15T14:30:00Z",
  "pdf_url": "https://r2.chirhoevents.com/.../form-id.pdf",
  "medical_summary": {
    "has_conditions": true,
    "has_medications": true,
    "has_allergies": true,
    "has_dietary": true,
    "has_ada": false
  }
}
```

---

### **DELETE /api/liability/form/:id**
Delete liability form (if participant made mistake)

**Authentication:** Required (group leader only)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Form deleted. Participant can fill out a new one."
}
```

---

### **POST /api/liability/certificate**
Upload safe environment certificate

**Authentication:** Required (group leader or org admin)

**Request (multipart/form-data):**
```
participant_id: 950e8400-e29b-41d4-a716-446655440001
file: [PDF file]
program_name: "VIRTUS Training"
completion_date: "2025-11-15"
expiration_date: "2027-11-15"
```

**Response (201 Created):**
```json
{
  "success": true,
  "certificate_id": "a50e8400-e29b-41d4-a716-446655440001",
  "file_url": "https://r2.chirhoevents.com/.../cert-id.pdf",
  "status": "pending",
  "message": "Certificate uploaded successfully"
}
```

---

## 💳 PAYMENT ENDPOINTS

### **POST /api/payment/intent**
Create Stripe payment intent

**Authentication:** Required (or access code)

**Request Body:**
```json
{
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "registration_type": "group",
  "amount": 7350.00,
  "payment_type": "balance",
  "description": "Balance payment for St. Mary's Youth Group"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "payment_intent_id": "pi_1234567890",
  "client_secret": "pi_1234567890_secret_abcdef",
  "amount": 7350.00,
  "currency": "usd"
}
```

---

### **POST /api/payment/complete**
Confirm payment after Stripe success

**Authentication:** Required

**Request Body:**
```json
{
  "payment_intent_id": "pi_1234567890",
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "registration_type": "group"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "payment_id": "b50e8400-e29b-41d4-a716-446655440001",
  "amount": 7350.00,
  "balance_remaining": 0.00,
  "payment_status": "paid_full",
  "receipt_url": "https://stripe.com/receipts/...",
  "message": "Payment successful! Registration complete."
}
```

---

### **GET /api/payment/history/:registrationId**
Get payment history for registration

**Authentication:** Required (group leader or org admin)

**Query Params:**
- `registration_type` (required): "group" or "individual"

**Response (200 OK):**
```json
{
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "total_amount_due": 9800.00,
  "amount_paid": 9800.00,
  "balance_remaining": 0.00,
  "payment_status": "paid_full",
  "payments": [
    {
      "id": "c50e8400-e29b-41d4-a716-446655440001",
      "amount": 2450.00,
      "payment_type": "deposit",
      "payment_method": "card",
      "payment_status": "succeeded",
      "processed_at": "2026-03-15T11:00:00Z",
      "receipt_url": "https://stripe.com/receipts/..."
    },
    {
      "id": "d50e8400-e29b-41d4-a716-446655440002",
      "amount": 7350.00,
      "payment_type": "balance",
      "payment_method": "card",
      "payment_status": "succeeded",
      "processed_at": "2026-06-25T14:30:00Z",
      "receipt_url": "https://stripe.com/receipts/..."
    }
  ]
}
```

---

### **POST /api/payment/late-fee/apply**
Apply late fees to all unpaid registrations

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "registrations_affected": 48,
  "total_late_fees_applied": 14490.00,
  "late_fee_percentage": 20,
  "message": "Late fees applied to 48 registrations"
}
```

---

### **POST /api/payment/check**
Record check payment

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "registration_type": "group",
  "amount": 2450.00,
  "check_number": "1234",
  "check_received_date": "2026-03-20",
  "notes": "Deposit payment"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "payment_id": "e50e8400-e29b-41d4-a716-446655440001",
  "message": "Check payment recorded"
}
```

---

## 🏠 POROS PORTAL ENDPOINTS

### **POST /api/poros/import**
Import groups from registration to Poros

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "groups_imported": 125,
  "message": "Groups imported successfully"
}
```

---

### **GET /api/poros/groups**
Get all groups for event

**Authentication:** Required (org admin only)

**Query Params:**
- `event_id` (required)
- `housing_assigned` (optional): true/false

**Response (200 OK):**
```json
{
  "total": 125,
  "groups": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "group_name": "St. Mary's Youth Group",
      "total_participants": 49,
      "youth_male_u18": 15,
      "youth_female_u18": 18,
      "youth_male_o18": 3,
      "youth_female_o18": 4,
      "chaperone_male": 3,
      "chaperone_female": 4,
      "priests": 2,
      "housing_assigned": true,
      "seating_assigned": true,
      "meal_color_assigned": true,
      "small_group_assigned": false,
      "has_dietary_restrictions": true,
      "has_ada_needs": false
    }
    // ... more groups
  ]
}
```

---

### **POST /api/poros/room**
Create a room

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "room_type": "youth_housing",
  "building_name": "Sullivan Hall",
  "room_number": "101",
  "room_name": "Sullivan 101",
  "capacity": 6,
  "gender_restriction": "male",
  "age_restriction": "youth_u18",
  "is_ada_accessible": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "room_id": "f50e8400-e29b-41d4-a716-446655440001",
  "message": "Room created successfully"
}
```

---

### **POST /api/poros/assign/housing**
Assign group to housing

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "group_registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "room_assignments": [
    {
      "room_id": "f50e8400-e29b-41d4-a716-446655440001",
      "participant_type": "youth_male_u18",
      "occupancy_count": 6
    },
    {
      "room_id": "f50e8400-e29b-41d4-a716-446655440002",
      "participant_type": "youth_male_u18",
      "occupancy_count": 6
    },
    {
      "room_id": "f50e8400-e29b-41d4-a716-446655440003",
      "participant_type": "youth_male_u18",
      "occupancy_count": 3
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "assignments_created": 3,
  "message": "Housing assigned successfully"
}
```

---

### **GET /api/poros/recommendations**
Get auto-assignment recommendations

**Authentication:** Required (org admin only)

**Query Params:**
- `event_id` (required)
- `group_id` (required)
- `assignment_type`: "housing", "seating", "small_group"

**Response (200 OK):**
```json
{
  "group_name": "St. Mary's Youth Group",
  "recommendations": {
    "youth_male_u18": {
      "count": 15,
      "recommended_rooms": [
        {
          "room_id": "f50e8400-e29b-41d4-a716-446655440001",
          "room_name": "Sullivan 101",
          "capacity": 6,
          "current_occupancy": 0,
          "available": 6
        },
        {
          "room_id": "f50e8400-e29b-41d4-a716-446655440002",
          "room_name": "Sullivan 102",
          "capacity": 6,
          "current_occupancy": 0,
          "available": 6
        },
        {
          "room_id": "f50e8400-e29b-41d4-a716-446655440003",
          "room_name": "Sullivan 103",
          "capacity": 6,
          "current_occupancy": 3,
          "available": 3
        }
      ],
      "message": "Assign to Sullivan 101-103 (15 beds total)"
    },
    "youth_female_u18": {
      "count": 18,
      "recommended_rooms": [
        // ... female room recommendations
      ]
    }
  }
}
```

---

## ✅ SALVE CHECK-IN ENDPOINTS

### **GET /api/salve/search**
Search for registration by name or phone

**Authentication:** Required (salve user or org admin)

**Query Params:**
- `event_id` (required)
- `query` (required): search term (name or phone)

**Response (200 OK):**
```json
{
  "results": [
    {
      "registration_id": "650e8400-e29b-41d4-a716-446655440001",
      "registration_type": "group",
      "name": "St. Mary's Youth Group",
      "group_leader": "Mike Johnson",
      "total_participants": 49,
      "payment_status": "paid_full",
      "liability_forms_complete": true,
      "safe_environment_complete": true,
      "checked_in": false,
      "housing_assigned": true,
      "meal_color": "Blue - 12:30 PM",
      "seating_section": "Section A",
      "dietary_flags": 3,
      "ada_flags": 0
    }
  ]
}
```

---

### **GET /api/salve/qr/:code**
Look up registration by QR code

**Authentication:** Required (salve user or org admin)

**Response (200 OK):**
```json
{
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "registration_type": "group",
  "name": "St. Mary's Youth Group",
  // ... same as search response
}
```

---

### **POST /api/salve/checkin**
Mark registration as checked in

**Authentication:** Required (salve user or org admin)

**Request Body:**
```json
{
  "registration_id": "650e8400-e29b-41d4-a716-446655440001",
  "registration_type": "group",
  "search_method": "qr_code",
  "override_payment": false,
  "override_forms": false,
  "notes": "All participants present"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "checkin_id": "g50e8400-e29b-41d4-a716-446655440001",
  "checked_in_at": "2026-07-10T09:15:00Z",
  "message": "St. Mary's Youth Group checked in successfully"
}
```

---

### **POST /api/salve/print/group**
Generate group check-in packet PDF

**Authentication:** Required (salve user or org admin)

**Request Body:**
```json
{
  "group_registration_id": "650e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "pdf_url": "https://chirhoevents.com/api/pdf/temp/packet-abc123.pdf",
  "expires_at": "2026-07-10T10:15:00Z",
  "pages": 5,
  "message": "PDF generated successfully"
}
```

---

### **POST /api/salve/print/nametag**
Generate name tag PDF

**Authentication:** Required (salve user or org admin)

**Request Body:**
```json
{
  "participant_ids": [
    "h50e8400-e29b-41d4-a716-446655440001",
    "h50e8400-e29b-41d4-a716-446655440002"
  ],
  "template": "standard_avery_74459"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "pdf_url": "https://chirhoevents.com/api/pdf/temp/nametags-xyz789.pdf",
  "expires_at": "2026-07-10T10:15:00Z",
  "badges_per_sheet": 8,
  "total_sheets": 1
}
```

---

### **GET /api/salve/stats**
Get real-time check-in statistics

**Authentication:** Required (salve user or org admin)

**Query Params:**
- `event_id` (required)

**Response (200 OK):**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_registered": 5000,
  "checked_in": 3847,
  "remaining": 1153,
  "check_in_rate": 76.94,
  "average_checkin_time_seconds": 45,
  "last_10_checkins": [
    {
      "name": "St. Mary's Youth Group",
      "time": "2026-07-10T09:15:00Z",
      "participants": 49
    }
    // ... 9 more
  ],
  "checkins_by_hour": {
    "08:00": 234,
    "09:00": 892,
    "10:00": 1543,
    "11:00": 987,
    "12:00": 191
  }
}
```

---

## 🏥 RAPHA MEDICAL ENDPOINTS

### **GET /api/rapha/participant/:id**
Get participant medical information

**Authentication:** Required (rapha user or org admin)

**Response (200 OK):**
```json
{
  "participant_id": "h50e8400-e29b-41d4-a716-446655440001",
  "name": "Sarah Smith",
  "age": 15,
  "gender": "female",
  "group_name": "St. Mary's Youth Group",
  "medical_conditions": "Asthma (controlled with inhaler)",
  "medications": "Albuterol inhaler (as needed)",
  "allergies": "⚠️ PENICILLIN, PEANUTS",
  "dietary_restrictions": "Vegetarian",
  "insurance": {
    "provider": "Blue Cross Blue Shield",
    "policy_number": "ABC123456",
    "group_number": "XYZ789"
  },
  "emergency_contacts": [
    {
      "name": "Jane Smith",
      "phone": "(555) 123-4567",
      "relation": "Mother"
    },
    {
      "name": "John Smith",
      "phone": "(555) 987-6543",
      "relation": "Father"
    }
  ]
}
```

---

### **POST /api/rapha/incident**
Create incident report

**Authentication:** Required (rapha user or org admin)

**Request Body:**
```json
{
  "participant_id": "h50e8400-e29b-41d4-a716-446655440001",
  "incident_date": "2026-07-11T14:30:00Z",
  "incident_location": "Recreation field",
  "incident_description": "Twisted ankle during soccer game",
  "injury_type": "Sprain - right ankle",
  "treatment_provided": "Ice applied for 20 minutes, ankle wrapped, participant resting",
  "medications_administered": "None",
  "transported_to_hospital": false,
  "parent_contacted": true,
  "parent_contact_time": "2026-07-11T14:45:00Z",
  "follow_up_required": true,
  "follow_up_notes": "Recommend following up with family doctor within 48 hours"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "incident_id": "i50e8400-e29b-41d4-a716-446655440001",
  "pdf_url": "https://r2.chirhoevents.com/.../incident-report.pdf",
  "message": "Incident report created successfully"
}
```

---

## 📊 REPORTING ENDPOINTS

### **GET /api/reports/financial**
Generate financial report

**Authentication:** Required (org admin only)

**Query Params:**
- `event_id` (required)
- `format`: "json", "pdf", "excel", "csv"

**Response (200 OK):**
```json
{
  "event_name": "Mount 2000 Summer 2026",
  "report_date": "2026-07-15T10:00:00Z",
  "summary": {
    "total_registrations": 5000,
    "total_revenue": 500000.00,
    "total_collected": 487500.00,
    "total_outstanding": 12500.00,
    "late_fees_collected": 5000.00,
    "refunds_issued": 2500.00
  },
  "breakdown_by_type": {
    "group": {
      "registrations": 120,
      "participants": 4800,
      "revenue": 480000.00
    },
    "individual": {
      "registrations": 200,
      "participants": 200,
      "revenue": 20000.00
    }
  },
  "payment_methods": {
    "card": 450000.00,
    "check": 35000.00,
    "cash": 2500.00
  }
}
```

---

### **POST /api/reports/export/sheets**
Export to Google Sheets

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "template": "registration_data",
  "live_sync": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "sheet_url": "https://docs.google.com/spreadsheets/d/abc123.../edit",
  "sheet_id": "abc123...",
  "live_sync_enabled": true,
  "sync_frequency": "5 minutes",
  "message": "Data exported to Google Sheets"
}
```

---

### **POST /api/reports/export/mailchimp**
Export email list to Mailchimp

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience_id": "mailchimp_audience_123",
  "include_types": ["group_leaders", "individuals"],
  "tags": ["Mount2000-2026", "Youth"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "contacts_exported": 320,
  "tags_applied": ["Mount2000-2026", "Youth"],
  "message": "320 contacts exported to Mailchimp"
}
```

---

## 🔗 INTEGRATION ENDPOINTS

### **POST /api/integrations/mailchimp/connect**
Connect Mailchimp account

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "code": "oauth_authorization_code_from_mailchimp"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "account_name": "St. Mary's Diocese",
  "connected_at": "2026-07-15T10:30:00Z",
  "message": "Mailchimp connected successfully"
}
```

---

### **POST /api/integrations/quickbooks/sync**
Sync payments to QuickBooks

**Authentication:** Required (org admin only)

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "sync_type": "full"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "invoices_created": 120,
  "payments_recorded": 98,
  "errors": 0,
  "message": "QuickBooks sync completed"
}
```

---

## 👤 ADMIN ENDPOINTS

### **POST /api/admin/organizations**
Create new organization (Master Admin only)

**Authentication:** Required (master admin only)

**Request Body:**
```json
{
  "name": "Diocese of Oklahoma City",
  "type": "archdiocese",
  "contact_name": "Fr. John Smith",
  "contact_email": "fr.john@okcatholic.org",
  "contact_phone": "(405) 555-1234",
  "subscription_tier": "conference",
  "events_per_year_limit": 25
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "organization_id": "j50e8400-e29b-41d4-a716-446655440001",
  "setup_fee": 250.00,
  "message": "Organization created successfully"
}
```

---

### **POST /api/admin/organizations/:id/archive**
Archive organization

**Authentication:** Required (master admin only)

**Response (200 OK):**
```json
{
  "success": true,
  "archived_at": "2026-07-15T10:30:00Z",
  "reactivation_fee": 75.00,
  "message": "Organization archived"
}
```

---

## ⚠️ ERROR HANDLING

### **Error Response Format**
```json
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "value": "invalid-email",
    "constraint": "Must be valid email"
  },
  "timestamp": "2026-07-15T10:30:00Z"
}
```

### **Common Error Codes**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | No permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate, capacity) |
| `UNPROCESSABLE_ENTITY` | 422 | Validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 🔒 Rate Limiting

**Limits:**
- Public endpoints: 100 requests/hour per IP
- Authenticated endpoints: 1000 requests/hour per user
- Payment endpoints: 50 requests/hour per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1625097600
```

---

## 📝 Request/Response Best Practices

### **Request Headers**
```
Content-Type: application/json
Authorization: Bearer <token>
X-Request-ID: <unique-id> (optional, for tracking)
```

### **Response Headers**
```
Content-Type: application/json
X-Request-ID: <unique-id>
X-Response-Time: 45ms
```

### **Timestamps**
All timestamps in ISO 8601 format with UTC timezone:
```
2026-07-15T10:30:00Z
```

### **Pagination**
Use cursor-based pagination for large datasets:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true
  }
}
```

---

**END OF API DOCUMENTATION**

**Total Endpoints:** 50+  
**Authentication:** Clerk JWT  
**Database:** Row-Level Security (automatic filtering)  
**Rate Limits:** 100-1000 requests/hour
