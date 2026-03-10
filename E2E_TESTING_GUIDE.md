# End-to-End Testing Guide - Dental Clinic Management System

This guide covers testing the complete workflow from user login through appointment booking and payment recording.

## Prerequisites

### Backend Setup
1. Ensure backend server is running:
   ```bash
   cd /Users/admin/Desktop/dental/Backend-Main
   npm start
   # Should see: "Server running on http://localhost:5000"
   ```

2. Verify Supabase connection:
   - Check `.env` file has `SUPABASE_URL` and `SUPABASE_KEY`
   - Backend should connect without errors

### Frontend Setup
1. Ensure frontend dev server is running:
   ```bash
   cd /Users/admin/Desktop/dental/Frontend-Main
   npm run dev
   # Should see: "Local: http://localhost:5173"
   ```

2. Verify API connection:
   - Check `.env.local` has `VITE_API_URL=http://localhost:5000/api`
   - Check `VITE_AUTH_TOKEN_KEY=authToken`

---

## Test Workflow 1: User Registration & Login

### Step 1.1: Register New Account
1. Open http://localhost:5173
2. You should see the Login page
3. Look for "Need an account?" link or click "Sign up" button
4. Fill in registration form:
   - **Email**: `test@dentist.com` (use unique email each test)
   - **Password**: `SecurePassword123!`
   - **Name**: `Test Dentist`
   - **Role**: `doctor` or `receptionist`
5. Click **Register**
6. ✅ Should redirect to dashboard (Appointments Today page)
7. ✅ Token should be saved in localStorage

**Verify in DevTools:**
- Open DevTools → Application → Local Storage
- Should see `authToken` with a JWT token

### Step 1.2: Logout & Login Again
1. Click user menu → **Logout**
2. Should redirect to /login
3. Login with same credentials:
   - **Email**: `test@dentist.com`
   - **Password**: `SecurePassword123!`
4. Click **Login**
5. ✅ Should redirect to Appointments Today
6. ✅ Should load real data from API

---

## Test Workflow 2: Create Patient & Book Appointment

### Step 2.1: Navigate to Register Tab
1. On Appointments page, click **Register** tab
2. Should show "Add entry" button
3. Should show table with existing appointments (or empty state)

### Step 2.2: Add New Appointment
1. Click **Add entry** button
2. A sidebar form should appear with fields:
   - **Time**: `09:00` (format HH:MM)
   - **Patient Name**: `John Doe` (new patient)
   - **Phone**: `+91 9876543210`
   - **Treatment**: Select from dropdown
   - **Notes**: Optional
3. Fill in all required fields (marked with *)
4. Click **Save entry**
5. ✅ Form should show loading state
6. ✅ Modal should close after success
7. ✅ New appointment should appear in table
8. ✅ Should see success message or notification

**If patient already exists (same phone):**
- The system should find existing patient
- Create appointment for that patient
- Not create duplicate patient record

### Step 2.3: Verify Appointment Created
1. The table should refresh automatically
2. New row should show:
   - Correct time
   - Patient name
   - Phone number
   - Treatment name
   - Status: `scheduled`
   - Correct fee amount
3. Can select different date to view that day's appointments
4. Old appointments should disappear when changing date

---

## Test Workflow 3: Today's Money & Financials

### Step 3.1: View Today's Income
1. Navigate to **Money** section → **Today** tab
2. Should see three cards showing:
   - **Collected Today**: Should show ₹0 initially (or real data if payments exist)
   - **Expenses Today**: Should show ₹0 initially (or real data)
   - **Net Today**: Should be Collected - Expenses
3. ✅ Table below should show:
   - Income by Patient (from payments)
   - Expenses list
   - Both should be empty initially OR show real data

**Expected API calls:**
- `/api/payments/summary/daily` → Returns today's payments
- `/api/expenses` → Returns all expenses (filtered by today's date)

### Step 3.2: View Monthly Summary
1. Click **Monthly** tab
2. Should show month selector dropdown
3. Should display 4 cards:
   - **Total Income**: Sum of all payments in month
   - **Total Expenses**: Sum of all expenses in month
   - **Net**: Income - Expenses
   - **Patients Seen**: Count of unique payments
4. ✅ Bar chart should show Income vs Expenses percentage split
5. ✅ Two tables below:
   - Income by Payment Method (Cash, UPI, Card)
   - Expenses by Category

**Expected API calls:**
- `/api/payments/summary/monthly` → Returns monthly summary
- `/api/expenses/summary` → Returns expense summary by category

### Step 3.3: Add New Expense
1. Click **Add Expense** tab
2. Should show form with fields:
   - **Date**: Today's date (changeable)
   - **Category**: Dropdown with options (Medical Supplies, Utilities, Rent, etc.)
   - **Amount**: Numeric input with ₹ symbol
   - **Notes**: Text area for description
3. Fill in a test expense:
   - **Date**: Today
   - **Category**: `Medical Supplies`
   - **Amount**: `500`
   - **Notes**: `Testing expense entry`
4. Click **Save expense**
5. ✅ Form should show loading state
6. ✅ Form should reset after success
7. ✅ Recent Expenses list should update automatically
8. ✅ New expense should appear at top of list

**Expected API calls:**
- `POST /api/expenses` → Creates new expense
- `GET /api/expenses` → Fetches recent expenses (auto-refresh)

---

## Test Workflow 4: Next Visits (Overdue Follow-ups)

### Step 4.1: View Overdue Follow-ups
1. On Appointments → Today tab
2. Look for **Next Visits** section or **Overdue Follow-ups** section
3. Should show any appointments where follow-up is overdue
4. Each entry should show:
   - Patient name
   - Last appointment treatment
   - Days overdue
   - Action to reschedule

**Expected API calls:**
- `/api/appointments/overdue` → Returns appointments overdue for follow-up

---

## Troubleshooting Common Issues

### Issue: "Failed to load appointments"
**Symptoms**: Error message on Appointments page
**Solutions:**
1. Check backend is running: `curl http://localhost:5000/api/appointments/today`
2. Check token is valid: Look in DevTools → Network → check Authorization header
3. Check CORS: Backend should have CORS enabled for http://localhost:5173
4. Check database connection: Backend logs should show Supabase connection status

### Issue: "Patient with this phone already exists"
**Symptoms**: Cannot create appointment for existing phone number
**Expected behavior**: Should reuse existing patient, not error
**Solutions:**
1. Use a different phone number for test
2. Check if patient was created in previous test
3. Look at patientController searchPatients endpoint

### Issue: Login token expired
**Symptoms**: Auto-redirected to /login
**Solutions:**
1. Clear localStorage and login again
2. Check token expiration time in JWT (should be set in authController)
3. Backend should issue new token on each login

### Issue: No data showing in Money tabs
**Symptoms**: All zeros on Today/Monthly tabs
**Expected behavior**: Show data from real appointments and payments
**Solutions:**
1. Verify appointments were created in previous tests
2. Check if payments exist in database: `curl http://localhost:5000/api/payments`
3. Check if expenses exist: `curl http://localhost:5000/api/expenses`
4. May need to create test data manually in Supabase

---

## Full E2E Test Checklist

### Authentication (20 points)
- [ ] User can register new account
- [ ] Registration token is saved to localStorage
- [ ] User is redirected to dashboard after register
- [ ] User can logout
- [ ] User can login with credentials
- [ ] Invalid credentials show error
- [ ] Protected routes redirect to login if not authenticated
- [ ] Session persists after page refresh
- [ ] Expired token redirects to login

### Appointments (30 points)
- [ ] Appointments Today tab loads without errors
- [ ] Shows real data from API (not mock)
- [ ] Date picker filters appointments correctly
- [ ] Can open Add Entry form
- [ ] Form validation: required fields shown with *
- [ ] Can create appointment for new patient (auto-creates patient)
- [ ] Can create appointment for existing patient
- [ ] Time slot conflict detection (prevents double-booking)
- [ ] New appointment appears in table
- [ ] Appointment status shows correctly
- [ ] Register tab shows all appointments for selected date
- [ ] Overdue follow-ups display correctly

### Money (25 points)
- [ ] Today tab loads income and expenses
- [ ] Today totals calculate correctly
- [ ] Income table shows patient payments
- [ ] Expense table shows recorded expenses
- [ ] Monthly tab shows selected month data
- [ ] Monthly summary cards calculate correctly
- [ ] Income vs Expense bar chart displays
- [ ] Can add new expense
- [ ] New expense appears in Recent Expenses list
- [ ] Monthly tabs refresh on expense add
- [ ] Payment method summary shows breakdown
- [ ] Expense category summary shows breakdown

### Error Handling (15 points)
- [ ] API errors show appropriate messages
- [ ] Network errors show error message
- [ ] Invalid data shows validation error
- [ ] Retry button works on errors
- [ ] Form errors prevent submission

### Loading States (10 points)
- [ ] Loading spinner shows while fetching
- [ ] Submit button shows loading state
- [ ] Disabled state prevents double-click
- [ ] No "flash" of empty state on refresh

---

## Test Data Reference

### Test User Account
```
Email: testdoctor@clinic.com
Password: Test@12345
Role: doctor
```

### Test Patient
```
Name: Rajesh Kumar
Phone: +91 9876543210
Email: rajesh@example.com
```

### Test Treatment
```
Name: Routine Checkup
Cost: ₹500
Duration: 30 minutes
```

### Test Appointment
```
Patient: Rajesh Kumar
Date: 2026-01-26
Time: 10:00 AM
Treatment: Routine Checkup
Fee: ₹500
Status: scheduled
```

### Test Payment
```
Appointment ID: [from created appointment]
Amount: ₹500
Method: UPI
Status: completed
```

### Test Expense
```
Category: Medical Supplies
Amount: ₹1500
Description: Dental cement
Date: 2026-01-26
```

---

## Verification Commands

Run these curl commands to verify backend is working:

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Get today's appointments
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/appointments/today

# Get all patients
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/patients

# Get daily payment summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/payments/summary/daily

# Get all expenses
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/expenses
```

---

## Performance Baselines

Expected response times:
- Login: < 1 second
- Load Appointments: < 500ms
- Create Appointment: < 2 seconds
- Load Money tabs: < 1 second
- Add Expense: < 2 seconds

If slower, check:
- Network tab in DevTools
- Database query performance
- Backend logs for slow queries

---

## When to Stop Testing

✅ All features work with real data from API
✅ No mock data visible in UI
✅ Error handling works correctly
✅ Loading states display properly
✅ Form validation prevents invalid input
✅ Session management works correctly
✅ No console errors visible
✅ All responsive design works (test on mobile view)

---

## Next Steps After Testing

If all tests pass:
1. ✅ Document any bugs found
2. ✅ Mark CRITICAL #9 as complete
3. ✅ Proceed with documentation creation (CRITICAL #10)

If tests fail:
1. Check error logs in terminal
2. Verify backend/frontend connection
3. Check browser console for errors
4. Review API response in Network tab
