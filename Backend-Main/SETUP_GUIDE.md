# Backend Setup Guide

Complete step-by-step guide to set up and run the Dental Clinic Backend.

## Prerequisites

- Node.js v18+ installed
- npm or yarn
- Supabase account (free at https://supabase.com)
- Git installed

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or login
3. Click **New Project**
4. Fill in project details:
   - Name: `dental-clinic`
   - Database Password: Create a strong password (save this!)
   - Region: Choose closest to you
5. Click **Create new project** and wait for setup to complete

## Step 2: Get Your Supabase Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. You'll see:
   - **Project URL** - Copy this
   - **Anon Key** - Copy this
   - **Service Key** - Copy this (keep this secret!)

## Step 3: Clone/Download Backend

```bash
cd /Users/admin/Desktop/dental/Backend-Main
```

## Step 4: Configure Environment Variables

1. Update `.env` file with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret (change this to something random)
JWT_SECRET=your_super_secret_key_12345_change_in_production
```

## Step 5: Run Database Migrations

1. Go to your Supabase dashboard
2. Open **SQL Editor** from the left sidebar
3. Click **New Query**
4. Open `migrations/001_create_initial_schema.sql`
5. Copy-paste the entire SQL content
6. Click **Run** button
7. Wait for the query to complete (should show "Success")

**What this does:**
- Creates all database tables
- Sets up indexes for performance
- Creates views for common queries
- Enables Row Level Security
- Sets up automatic timestamps

## Step 6: Start the Backend Server

```bash
# Install dependencies (if not already done)
npm install

# Start development server with auto-reload
npm run dev
```

You should see:
```
[2026-01-26] [INFO] Server started successfully {port: 5000, environment: development, url: http://localhost:5000}
```

## Step 7: Test the Backend

1. Open your browser and go to: `http://localhost:5000/health`
2. You should see:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-26T...",
  "environment": "development"
}
```

3. Test the API status: `http://localhost:5000/api/status`
4. You should see:
```json
{
  "success": true,
  "message": "API is operational",
  "timestamp": "2026-01-26T...",
  "version": "1.0.0"
}
```

## Step 8: Test Database Connection

The server automatically tests the Supabase connection on startup. You should see:
```
[2026-01-26] [INFO] Testing Supabase connection...
[2026-01-26] [INFO] Supabase connection successful
```

If you see an error, check:
- Is your Supabase URL correct?
- Are your API keys correct?
- Is the project active?
- Do you have internet connection?

## Frontend Connection

Once the backend is running, update your frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Then update your frontend API calls to use this URL.

## File Structure Overview

```
Backend-Main/
├── src/
│   ├── config/          # Configuration (Supabase, database)
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions (JWT, logger)
│   ├── routes/          # API routes (to be created)
│   ├── controllers/     # Route handlers (to be created)
│   ├── models/          # Database models (to be created)
│   ├── services/        # Business logic (to be created)
│   ├── jobs/            # Background jobs (to be created)
│   └── server.js        # Main Express app
├── migrations/          # Database migrations
├── .env                 # Environment variables (local)
├── .env.example         # Environment template
└── package.json         # Dependencies
```

## Common Issues & Fixes

### Issue: "Cannot find module"
**Solution:** Run `npm install`

### Issue: "SUPABASE_URL not found"
**Solution:** Check `.env` file has correct values and SUPABASE_URL is not empty

### Issue: "Port 5000 already in use"
**Solution:**
```bash
# Change PORT in .env
PORT=5001

# Or kill the process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Issue: "Connection refused"
**Solution:**
- Is Supabase project running?
- Is your internet connection working?
- Check firewall settings

### Issue: "Authentication failed"
**Solution:**
- Verify SUPABASE_SERVICE_KEY is correct (not the anon key)
- Check that the key is not expired
- Regenerate keys if needed in Supabase dashboard

## Database Verification

To verify your database is set up correctly:

1. Go to Supabase dashboard
2. Click **Table Editor** in left sidebar
3. You should see these tables:
   - users
   - treatments
   - patients
   - appointments
   - appointment_reminders
   - payments
   - expenses
   - suppliers
   - inventory_items
   - inventory_transactions
   - break_schedules
   - clinic_settings

4. Click on any table to see columns and data

## Next Steps

1. ✅ Backend initialized
2. ✅ Database schema created
3. ⬜ Authentication endpoints (Phase 1.4)
4. ⬜ Patient management endpoints (Phase 2)
5. ⬜ Appointment management endpoints (Phase 3)
6. ⬜ Payment endpoints (Phase 4)
7. ⬜ And more...

## Useful Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Install packages
npm install package-name

# View logs in real-time
npm run dev

# Stop the server
Ctrl + C
```

## Support

- Check `.env` file configuration
- Review server logs for error messages
- Check Supabase dashboard for database status
- Verify migration SQL ran successfully

---

**Status:** Phase 1 - Setup Complete ✅
**Next:** Phase 1.4 - Authentication Endpoints
