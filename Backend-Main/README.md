# Dr. Sharma Dental Clinic - Backend API

Backend API for the dental clinic management system built with Node.js, Express, and Supabase.

## Features

- Patient management (CRUD)
- Appointment scheduling and tracking
- Payment processing and tracking
- Expense management
- Inventory management
- SMS/WhatsApp appointment reminders
- Reports and analytics

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- (Optional) Twilio account for SMS features

## Installation

1. Clone the repository:
```bash
cd Backend-Main
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
```

## Development

Start the development server with file watching:

```bash
npm run dev
```

The server will start on `http://localhost:5000` by default.

## Production

Build and start the production server:

```bash
npm start
```

## Project Structure

```
src/
├── config/          # Configuration files (Supabase, database)
├── controllers/     # Route controllers/handlers
├── middleware/      # Custom middleware (auth, error handling, etc.)
├── models/          # Database models and schemas
├── routes/          # API route definitions
├── services/        # Business logic services
├── utils/           # Utility functions (JWT, logger, etc.)
├── jobs/            # Background jobs (reminders, etc.)
└── server.js        # Main Express application
```

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /api/status` - API status

### Authentication (Phase 1)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Patients (Phase 2)
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/patients/:id/history` - Get treatment history

### Appointments (Phase 3)
- `GET /api/appointments` - List appointments
- `GET /api/appointments/today` - Today's schedule
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `POST /api/appointments/:id/complete` - Mark as completed
- `POST /api/appointments/:id/no-show` - Mark as no-show
- `POST /api/appointments/:id/reschedule` - Reschedule

### Payments (Phase 4)
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/pending` - Get pending payments
- `GET /api/payments/summary/daily` - Daily summary
- `GET /api/payments/summary/monthly` - Monthly summary

### Expenses (Phase 6)
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Add expense
- `GET /api/expenses/summary/daily` - Daily summary
- `GET /api/expenses/summary/monthly` - Monthly summary

### Inventory (Phase 5)
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add item
- `GET /api/inventory/low-stock` - Low stock items
- `POST /api/inventory/:id/use` - Record usage

## Environment Variables

See `.env.example` for complete list of configuration options.

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service key (admin)
- `JWT_SECRET` - Secret for JWT token signing

### Optional
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `TWILIO_*` - SMS service credentials
- `SMTP_*` - Email service credentials
- `WHATSAPP_*` - WhatsApp API credentials

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in request headers:

```
Authorization: Bearer <token>
```

## Database Schema

The backend uses PostgreSQL via Supabase with the following main tables:

- `users` - Clinic staff
- `patients` - Patient information
- `appointments` - Appointment records
- `treatments` - Treatment types
- `payments` - Payment records
- `expenses` - Expense records
- `inventory_items` - Medical supplies inventory
- `inventory_transactions` - Inventory changes
- `breaks_schedules` - Break/lunch time slots
- `clinic_settings` - Clinic configuration

Database migrations will be set up in Phase 1.2.

## Testing

```bash
npm test
```

## Deployment

Deployment instructions will be added in Phase 12.

## Troubleshooting

### Supabase Connection Error
- Verify `SUPABASE_URL` and keys are correct
- Check that Supabase project is active
- Ensure network connectivity

### Port Already in Use
```bash
# Change port in .env
PORT=5001
```

### JWT Errors
- Verify `JWT_SECRET` matches across instances
- Check token expiration time
- Ensure Authorization header format is correct

## Contributing

Follow the established code structure and conventions when adding features.

## License

MIT

## Support

For issues or questions, contact the development team.

---

**Status:** Phase 1 - Core Setup Complete ✓
**Next:** Phase 1.2 - Database Schema & Authentication Setup
