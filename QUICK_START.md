# 🚀 Quick Start Guide - Dental Clinic Backend & Frontend

This guide will get you up and running with both the backend API and frontend in minutes.

---

## Prerequisites

- Node.js v18+ installed
- npm or yarn
- Supabase account (free at https://supabase.com)
- A code editor (VS Code recommended)

---

## 📂 Project Structure

```
/Users/admin/Desktop/dental/
├── Backend-Main/          ← Backend API (Node.js + Express)
├── Frontend-Main/         ← Frontend UI (React + Vite)
└── PLAN.md               ← Implementation roadmap
```

---

## 🔧 Backend Setup (5 minutes)

### Step 1: Navigate to Backend
```bash
cd /Users/admin/Desktop/dental/Backend-Main
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your credentials from **Settings → API**
3. Update `.env` file:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
JWT_SECRET=your_secret_key_here
```

### Step 4: Set Up Database

1. Go to your Supabase project → **SQL Editor**
2. Click **New Query**
3. Copy-paste contents of `migrations/001_create_initial_schema.sql`
4. Click **Run**
5. Wait for "Success" message

### Step 5: Start Backend Server
```bash
npm run dev
```

You should see:
```
[INFO] Server started successfully {port: 5000, environment: development, url: http://localhost:5000}
```

### Step 6: Test Backend
```bash
# In another terminal, test the API
curl http://localhost:5000/health

# Should return:
# {"success":true,"message":"Server is running",...}
```

✅ **Backend is running!**

---

## 🎨 Frontend Setup (3 minutes)

### Step 1: Navigate to Frontend
```bash
cd /Users/admin/Desktop/dental/Frontend-Main
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure API URL

Update `Frontend-Main/src/App.tsx` (or create `.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Start Frontend Dev Server
```bash
npm run dev
```

You should see:
```
  ➜  local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 5: Open in Browser
```
http://localhost:5173
```

✅ **Frontend is running!**

---

## 🔌 Connecting Frontend to Backend

### Option 1: Using Environment Variables (Recommended)

**Frontend: Create `.env` file**
```env
VITE_API_URL=http://localhost:5000/api
```

**Frontend: Update API calls in components**
```typescript
// Example: AppointmentsToday.tsx
const API_URL = import.meta.env.VITE_API_URL;

// Fetch data
const response = await fetch(`${API_URL}/appointments/today`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Option 2: Manual URL Update

In each component, replace mock data with API calls:

**Before (Mock Data):**
```typescript
const mockAppointments = [
  { id: '1', time: '09:00', patientName: 'John' },
  ...
];
```

**After (Real API):**
```typescript
const [appointments, setAppointments] = useState([]);

useEffect(() => {
  fetch('http://localhost:5000/api/appointments/today', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(data => setAppointments(data.data.appointments));
}, []);
```

---

## 🔐 Authentication Flow

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinic.com",
    "password": "password123",
    "name": "Dr. Sharma",
    "role": "doctor"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "name": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2. Use Token in Requests

Save the token and include in all API requests:

```typescript
const token = localStorage.getItem('authToken');

fetch('http://localhost:5000/api/patients', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### 3. Refresh Token When Expired

```typescript
// When you get a 403 Unauthorized
const newToken = await fetch('http://localhost:5000/api/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({ token: oldToken })
}).then(r => r.json()).then(d => d.data.token);

localStorage.setItem('authToken', newToken);
```

---

## 📚 API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient
- `GET /api/patients/:id/history` - Patient history

### Appointments
- `GET /api/appointments/today` - Today's schedule
- `GET /api/appointments` - All appointments
- `POST /api/appointments` - Book appointment
- `POST /api/appointments/:id/complete` - Mark done
- `POST /api/appointments/:id/reschedule` - Reschedule

### Payments
- `GET /api/payments/pending` - Overdue payments
- `POST /api/payments` - Record payment
- `GET /api/payments/summary/daily` - Daily revenue

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Add expense
- `GET /api/expenses/summary/monthly` - Monthly summary

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/monthly` - Monthly report
- `GET /api/reports/dashboard` - Dashboard summary

**Complete list:** See `Backend-Main/API_ENDPOINTS.md`

---

## 🧪 Testing the Integration

### 1. Start Both Servers
```bash
# Terminal 1: Backend
cd Backend-Main && npm run dev

# Terminal 2: Frontend
cd Frontend-Main && npm run dev
```

### 2. Test in Browser

1. Open http://localhost:5173
2. Go to **Appointments** → **Today**
3. You should see real data (or empty if no appointments)
4. Try creating a new appointment
5. Check if it appears in the list

### 3. Test API Directly

```bash
# Register a user
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@clinic.com",
    "password": "test123",
    "name": "Test User",
    "role": "doctor"
  }' | jq -r '.data.token')

# List patients
curl http://localhost:5000/api/patients \
  -H "Authorization: Bearer $TOKEN"

# Create patient
curl -X POST http://localhost:5000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com"
  }'
```

---

## 🐛 Troubleshooting

### Backend Issues

**Port 5000 already in use:**
```bash
# Change port in .env
PORT=5001

# Or kill process
lsof -ti:5000 | xargs kill -9
```

**Supabase connection error:**
- Check SUPABASE_URL and keys in `.env`
- Verify Supabase project is active
- Check internet connection

**Database error:**
- Verify migrations were run
- Check Supabase SQL Editor for errors
- Review migrations/README.md

### Frontend Issues

**API not responding:**
- Ensure backend is running on port 5000
- Check VITE_API_URL is correct
- Open browser console for error messages

**CORS error:**
- Backend CORS is configured for localhost:5173
- Check frontend URL matches

**Authentication failing:**
- Clear localStorage and login again
- Check token is being sent in headers
- Verify user exists in database

---

## 📖 Documentation

- **[PLAN.md](./PLAN.md)** - Complete roadmap
- **[BACKEND_STATUS.md](./BACKEND_STATUS.md)** - Backend progress
- **[Backend-Main/README.md](./Backend-Main/README.md)** - Backend details
- **[Backend-Main/API_ENDPOINTS.md](./Backend-Main/API_ENDPOINTS.md)** - All 110+ endpoints
- **[Backend-Main/SETUP_GUIDE.md](./Backend-Main/SETUP_GUIDE.md)** - Detailed setup

---

## 🎯 Next Steps

### For Frontend Developers
1. ✅ Get backend running
2. ✅ Test authentication
3. Update AppointmentsToday.tsx to use `/api/appointments/today`
4. Update AppointmentsRegister.tsx to use POST `/api/appointments`
5. Update MoneyToday.tsx to use `/api/payments/summary/daily`
6. Update all other components
7. Test full workflow

### For Backend Developers
1. ✅ Backend complete
2. Phase 9 (optional): Add SMS notifications
3. Phase 11: Write tests
4. Phase 12: Deploy

---

## 💡 Common Tasks

### Create a New Patient via API
```bash
curl -X POST http://localhost:5000/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "phone": "+919999999999",
    "email": "jane@example.com",
    "dob": "1995-05-15",
    "gender": "F",
    "city": "Mumbai",
    "allergies": ["penicillin"],
    "preferred_payment_method": "upi"
  }'
```

### Book an Appointment
```bash
curl -X POST http://localhost:5000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PATIENT_UUID",
    "scheduled_time": "2026-01-26T10:00:00Z",
    "treatment_id": "TREATMENT_UUID",
    "notes": "Regular checkup"
  }'
```

### Record a Payment
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "APPOINTMENT_UUID",
    "patient_id": "PATIENT_UUID",
    "amount": 5000,
    "status": "paid",
    "payment_method": "upi"
  }'
```

---

## 📞 Support

If you encounter issues:

1. Check the relevant README file
2. Review API_ENDPOINTS.md
3. Check browser console for errors
4. Check backend logs (terminal output)
5. Verify Supabase connection

---

## ✅ Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Supabase connected
- [ ] Database migrated
- [ ] User registered
- [ ] Token saved in localStorage
- [ ] API calls working from frontend
- [ ] All endpoints tested

---

**Status:** ✅ Ready to go!
**Total Setup Time:** ~15 minutes
**Endpoints Ready:** 110+
**Backend Version:** 1.0.0

Happy coding! 🎉

