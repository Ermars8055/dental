# Database Migrations

This directory contains SQL migration files for setting up the PostgreSQL database schema in Supabase.

## How to Run Migrations

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `001_create_initial_schema.sql`
5. Click **Run** (or press `Ctrl+Enter`)
6. Wait for the query to complete

### Option 2: Using psql CLI

```bash
# Install psql if you don't have it
# Then connect to your database and run:

psql postgresql://[user]:[password]@[host]:5432/[database] < 001_create_initial_schema.sql
```

### Option 3: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## Migration Files

### 001_create_initial_schema.sql

Initial database schema creation including:

**Tables Created:**
- `users` - Clinic staff/users
- `treatments` - Treatment types and costs
- `patients` - Patient information and preferences
- `appointments` - Appointment scheduling
- `appointment_reminders` - SMS/Email/WhatsApp reminders
- `payments` - Payment tracking
- `expenses` - Clinic expenses
- `suppliers` - Medical supply suppliers
- `inventory_items` - Medical supply inventory
- `inventory_transactions` - Inventory usage tracking
- `break_schedules` - Lunch/tea breaks
- `clinic_settings` - Clinic configuration

**Features:**
- Proper indexing for performance
- Foreign key relationships
- Constraints and validations
- Row-Level Security (RLS) policies
- Useful views (overdue_payments, todays_appointments, low_stock_items)
- Automatic updated_at timestamps
- UUID primary keys

## Verifying the Schema

After running migrations, verify the schema was created:

```sql
-- List all tables
\dt

-- Check specific table structure
\d appointments

-- List all indexes
\di

-- List all views
\dv
```

## Schema Diagram

```
users (1) ──┬─→ appointments (n)
            │    └──→ payments (n)
            │    └──→ appointment_reminders (n)
            ├─→ expenses (n)
            └─→ inventory_transactions (n)

patients (1) ──┬─→ appointments (n)
               └─→ payments (n)

treatments (1) ──→ appointments (n)

suppliers (1) ──→ inventory_items (n)

inventory_items (1) ──→ inventory_transactions (n)
```

## Important Notes

1. **UUID Primary Keys:** All tables use UUID for primary keys (auto-generated)
2. **Timestamps:** All tables have `created_at` and `updated_at` timestamps
3. **Soft Deletes:** Some tables have `deleted_at` for soft deletion
4. **Constraints:** Foreign keys are configured with ON DELETE CASCADE/RESTRICT
5. **Indexing:** All frequently queried columns are indexed for performance
6. **RLS:** Row Level Security is enabled but can be further customized

## Rollback (If Needed)

To drop all tables and start fresh:

```sql
DROP TABLE IF EXISTS appointment_reminders CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS break_schedules CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS treatments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clinic_settings CASCADE;

-- Drop views
DROP VIEW IF EXISTS overdue_payments CASCADE;
DROP VIEW IF EXISTS todays_appointments CASCADE;
DROP VIEW IF EXISTS low_stock_items CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Next Steps

After running migrations:
1. Set up authentication endpoints
2. Create API routes for each feature
3. Test database connections
4. Create seed data for testing

## Troubleshooting

**Error: Extension "uuid-ossp" does not exist**
- Supabase has UUID support built-in, this error can be ignored

**Error: Row level security is not enabled**
- Run: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

**Foreign key constraint violation**
- Ensure parent records exist before inserting child records
- Check the ON DELETE rules for your relationships

## Support

For issues with migrations, consult:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
