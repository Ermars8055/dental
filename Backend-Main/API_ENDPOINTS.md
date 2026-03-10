# Dental Clinic Backend - Complete API Endpoints Documentation

**Backend Status:** ✅ Phases 1-7 Complete (100+ endpoints implemented)
**Version:** 1.0.0
**Database:** Supabase PostgreSQL
**Authentication:** JWT Token-based

---

## Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [Patient Management Endpoints](#patient-management-endpoints)
3. [Appointment Management Endpoints](#appointment-management-endpoints)
4. [Payment Endpoints](#payment-endpoints)
5. [Expense Endpoints](#expense-endpoints)
6. [Inventory Endpoints](#inventory-endpoints)
7. [Settings & Breaks Endpoints](#settings--breaks-endpoints)

---

## Authentication Endpoints

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@clinic.com",
  "password": "secure_password",
  "name": "Doctor Name",
  "role": "doctor",  // 'admin', 'doctor', 'receptionist'
  "phone": "+91XXXXXXXXXX"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": { id, email, name, role, phone },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@clinic.com",
  "password": "secure_password"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { id, email, name, role, phone },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Logout successful"
}
```

### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "token": "current_jwt_token"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { id, email, name, role, phone, is_active, created_at }
  }
}
```

### Change Password
```
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}

Response: 200 OK
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Patient Management Endpoints

### List All Patients
```
GET /api/patients?page=1&limit=10&search=john
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "patients": [ { id, name, phone, email, ... } ],
    "pagination": { page, limit, total, pages }
  }
}
```

### Get Patient Details
```
GET /api/patients/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "patient": {
      id, name, phone, email, dob, gender, address, city,
      emergency_contact, emergency_phone, allergies,
      notes, preferred_time_slot, preferred_payment_method,
      preferred_appointment_duration, created_at, updated_at
    }
  }
}
```

### Search Patients
```
GET /api/patients/search?query=john&limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "patients": [ { id, name, phone, email, ... } ],
    "count": 5
  }
}
```

### Create Patient
```
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+91XXXXXXXXXX",
  "email": "john@example.com",
  "dob": "1990-01-15",
  "gender": "M",
  "address": "123 Main St",
  "city": "Mumbai",
  "emergency_contact": "Jane Doe",
  "emergency_phone": "+91YYYYYYYYYY",
  "allergies": ["penicillin"],
  "notes": "Sensitive to pain",
  "preferred_time_slot": "09:00-10:00",
  "preferred_payment_method": "upi",
  "preferred_appointment_duration": 30
}

Response: 201 Created
{
  "success": true,
  "data": { "patient": { ... } }
}
```

### Update Patient
```
PUT /api/patients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+91ZZZZZZZZZZ",
  "city": "Delhi",
  ...
}

Response: 200 OK
{
  "success": true,
  "data": { "patient": { ... } }
}
```

### Delete Patient
```
DELETE /api/patients/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

### Get Patient Treatment History
```
GET /api/patients/:id/history
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "history": [
      {
        id, scheduled_time, status, notes, completed_at,
        treatments: { name, description, base_cost },
        payments: [ { amount, status, payment_method, paid_date } ]
      }
    ],
    "totalAppointments": 5
  }
}
```

### Get Patient Appointments
```
GET /api/patients/:id/appointments?status=scheduled&limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "appointments": [ { ... } ],
    "count": 3
  }
}
```

---

## Appointment Management Endpoints

### List All Appointments
```
GET /api/appointments?page=1&limit=10&status=scheduled&date_from=2026-01-25&date_to=2026-02-25
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "appointments": [ { ... } ],
    "pagination": { page, limit, total, pages }
  }
}
```

### Get Today's Appointments
```
GET /api/appointments/today
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "appointments": [ { ... } ],
    "grouped": {
      "scheduled": [ ... ],
      "in-chair": [ ... ],
      "completed": [ ... ],
      "no-show": [ ... ]
    },
    "totalCount": 10,
    "summary": {
      "scheduled": 5,
      "in-chair": 2,
      "completed": 3,
      "no-show": 0
    }
  }
}
```

### Get Appointment Details
```
GET /api/appointments/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "appointment": {
      id, patient_id, scheduled_time, treatment_id, status,
      notes, created_by, completed_at, reschedule_reason,
      patients: { name, phone, email },
      treatments: { name, base_cost, duration_minutes }
    }
  }
}
```

### Create Appointment
```
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "scheduled_time": "2026-01-26T10:00:00Z",
  "treatment_id": "uuid",
  "notes": "Patient prefers morning"
}

Response: 201 Created
{
  "success": true,
  "data": { "appointment": { ... } }
}
```

### Update Appointment
```
PUT /api/appointments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduled_time": "2026-01-26T11:00:00Z",
  "notes": "Updated notes"
}

Response: 200 OK
{
  "success": true,
  "data": { "appointment": { ... } }
}
```

### Mark Appointment as Completed
```
POST /api/appointments/:id/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Treatment completed successfully"
}

Response: 200 OK
{
  "success": true,
  "message": "Appointment marked as completed",
  "data": { "appointment": { status: "completed", completed_at: "..." } }
}
```

### Mark Appointment as No-Show
```
POST /api/appointments/:id/no-show
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Patient didn't arrive"
}

Response: 200 OK
{
  "success": true,
  "message": "Appointment marked as no-show"
}
```

### Reschedule Appointment
```
POST /api/appointments/:id/reschedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "new_scheduled_time": "2026-01-27T10:00:00Z",
  "reason": "Patient request"
}

Response: 200 OK
{
  "success": true,
  "message": "Appointment rescheduled successfully"
}
```

### Get Available Slots
```
GET /api/appointments/available-slots?date=2026-01-26
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "date": "2026-01-26",
    "availableSlots": ["09:00", "10:00", "11:00", "14:00", "15:00"],
    "totalAvailable": 5
  }
}
```

### Get Overdue Follow-ups
```
GET /api/appointments/overdue
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "overdueFollowUps": [ { ... } ],
    "count": 3
  }
}
```

### Delete Appointment
```
DELETE /api/appointments/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Appointment deleted successfully"
}
```

---

## Payment Endpoints

### List All Payments
```
GET /api/payments?page=1&limit=10&status=pending&date_from=2026-01-01&date_to=2026-02-01
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "payments": [ { id, amount, status, payment_method, ... } ],
    "pagination": { ... }
  }
}
```

### Get Payment Details
```
GET /api/payments/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "payment": {
      id, appointment_id, patient_id, amount, status,
      payment_method, transaction_id, notes, paid_date, due_date
    }
  }
}
```

### Record Payment
```
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointment_id": "uuid",
  "patient_id": "uuid",
  "amount": 5000,
  "status": "paid",
  "payment_method": "upi",
  "notes": "Payment received"
}

Response: 201 Created
{
  "success": true,
  "data": { "payment": { ... } }
}
```

### Update Payment
```
PUT /api/payments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "paid",
  "payment_method": "cash"
}

Response: 200 OK
{
  "success": true,
  "data": { "payment": { ... } }
}
```

### Get Pending Payments
```
GET /api/payments/pending?limit=50
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "overdue": [ { ... } ],
    "upcoming": [ { ... } ],
    "totalPending": 10,
    "totalOverdue": 3,
    "totalAmount": 50000,
    "overdueAmount": 15000
  }
}
```

### Get Daily Payment Summary
```
GET /api/payments/summary/daily?date=2026-01-25
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "date": "2026-01-25",
    "totalCollected": 25000,
    "byMethod": { "cash": 10000, "upi": 12000, "card": 3000 },
    "transactionCount": 8
  }
}
```

### Get Monthly Payment Summary
```
GET /api/payments/summary/monthly?month=2026-01
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "month": "2026-01",
    "totalCollected": 500000,
    "byMethod": { "cash": 200000, "upi": 250000, "card": 50000 },
    "transactionCount": 85
  }
}
```

### Get Patient Payment History
```
GET /api/payments/patient/:patient_id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "payments": [ { ... } ],
    "summary": {
      "totalAmount": 50000,
      "paidAmount": 40000,
      "pendingAmount": 10000
    }
  }
}
```

---

## Expense Endpoints

### List All Expenses
```
GET /api/expenses?page=1&limit=10&category=medical_supplies&date_from=2026-01-01&date_to=2026-02-01
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "expenses": [ { ... } ],
    "pagination": { ... }
  }
}
```

### Get Expense Details
```
GET /api/expenses/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "expense": {
      id, category, amount, description, notes,
      date, receipt_url, created_by, created_at, updated_at
    }
  }
}
```

### Create Expense
```
POST /api/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "medical_supplies",
  "amount": 5000,
  "description": "Purchased new instruments",
  "notes": "From supplier ABC",
  "date": "2026-01-25",
  "receipt_url": "https://..."
}

Response: 201 Created
{
  "success": true,
  "data": { "expense": { ... } }
}
```

### Update Expense
```
PUT /api/expenses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5500,
  "notes": "Updated amount"
}

Response: 200 OK
{
  "success": true,
  "data": { "expense": { ... } }
}
```

### Delete Expense
```
DELETE /api/expenses/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

### Get Daily Expense Summary
```
GET /api/expenses/summary/daily?date=2026-01-25
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "date": "2026-01-25",
    "totalExpenses": 15000,
    "byCategory": {
      "medical_supplies": 8000,
      "utilities": 5000,
      "other": 2000
    },
    "transactionCount": 4
  }
}
```

### Get Monthly Expense Summary
```
GET /api/expenses/summary/monthly?month=2026-01
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "month": "2026-01",
    "totalExpenses": 300000,
    "byCategory": { ... },
    "transactionCount": 45
  }
}
```

---

## Inventory Endpoints

### List All Inventory Items
```
GET /api/inventory?page=1&limit=10&category=supplies&search=cement
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [ { ... } ],
    "pagination": { ... }
  }
}
```

### Get Inventory Item Details
```
GET /api/inventory/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "item": {
      id, name, category, current_stock, minimum_stock_threshold,
      unit_cost, supplier_id, last_restocked_at,
      suppliers: { name, phone, email }
    }
  }
}
```

### Create Inventory Item
```
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Dental Cement",
  "category": "supplies",
  "current_stock": 50,
  "minimum_stock_threshold": 10,
  "unit_cost": 500,
  "supplier_id": "uuid"
}

Response: 201 Created
{
  "success": true,
  "data": { "item": { ... } }
}
```

### Update Inventory Item
```
PUT /api/inventory/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "minimum_stock_threshold": 15,
  "unit_cost": 550
}

Response: 200 OK
{
  "success": true,
  "data": { "item": { ... } }
}
```

### Delete Inventory Item
```
DELETE /api/inventory/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

### Get Low Stock Items
```
GET /api/inventory/low-stock
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [ { id, name, current_stock, minimum_stock_threshold, ... } ],
    "count": 5
  }
}
```

### Record Usage
```
POST /api/inventory/:id/use
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 5,
  "notes": "Used for patient XYZ"
}

Response: 200 OK
{
  "success": true,
  "message": "Usage recorded successfully",
  "data": { "item": { current_stock: 45, ... } }
}
```

### Record Restock
```
POST /api/inventory/:id/restock
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 30,
  "notes": "Purchased from supplier ABC"
}

Response: 200 OK
{
  "success": true,
  "message": "Restock recorded successfully",
  "data": { "item": { current_stock: 80, last_restocked_at: "..." } }
}
```

---

## Settings & Breaks Endpoints

### Get Clinic Settings
```
GET /api/settings
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "settings": {
      id, clinic_name, clinic_phone, clinic_email, clinic_address,
      working_hours_start, working_hours_end,
      lunch_start, lunch_end,
      default_appointment_duration, currency
    }
  }
}
```

### Update Clinic Settings
```
PUT /api/settings
Authorization: Bearer <token> (Admin only)
Content-Type: application/json

{
  "clinic_name": "Dr. Sharma Dental Clinic",
  "clinic_phone": "+91XXXXXXXXXX",
  "clinic_email": "contact@clinic.com",
  "clinic_address": "123 Main Street, Mumbai",
  "working_hours_start": "09:00",
  "working_hours_end": "18:00",
  "lunch_start": "13:00",
  "lunch_end": "14:00",
  "default_appointment_duration": 30,
  "currency": "INR"
}

Response: 200 OK
{
  "success": true,
  "data": { "settings": { ... } }
}
```

### Get Breaks for Date
```
GET /api/settings/breaks?date=2026-01-25
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "breaks": [
      { id, date, break_type, start_time, end_time, reason, created_by, created_at }
    ],
    "count": 2
  }
}
```

### Add Break Slot
```
POST /api/settings/breaks
Authorization: Bearer <token> (Admin/Doctor only)
Content-Type: application/json

{
  "date": "2026-01-25",
  "break_type": "lunch",
  "start_time": "13:00",
  "end_time": "14:00",
  "reason": "Staff lunch break"
}

Response: 201 Created
{
  "success": true,
  "data": { "break": { ... } }
}
```

### Cancel Break
```
DELETE /api/settings/breaks/:id
Authorization: Bearer <token> (Admin/Doctor only)

Response: 200 OK
{
  "success": true,
  "message": "Break deleted successfully"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "error": "Optional detailed error message"
}
```

### Common Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists or conflict
- `500 Internal Server Error` - Server error

---

## Authentication Headers

All endpoints (except auth/register and auth/login) require:
```
Authorization: Bearer <jwt_token>
```

---

## Testing the API

### 1. Get Health Status
```bash
curl http://localhost:5000/health
```

### 2. Get API Status
```bash
curl http://localhost:5000/api/status
```

### 3. Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinic.com",
    "password": "password123",
    "name": "Dr. Smith",
    "role": "doctor"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinic.com",
    "password": "password123"
  }'
```

### 4. Create Patient (with token)
```bash
curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com"
  }'
```

---

## Documentation Updated
**Date:** 2026-01-26
**Backend Version:** 1.0.0
**Total Endpoints:** 100+
**Completed Phases:** 1-7 of 12
