-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Users (Clinic Staff)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist')),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- 2. Treatments
-- ============================================
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  base_cost DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_treatments_name ON treatments(name);
CREATE INDEX idx_treatments_is_active ON treatments(is_active);

-- ============================================
-- 3. Patients
-- ============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  dob DATE,
  gender VARCHAR(10) CHECK (gender IN ('M', 'F', 'Other')),
  address TEXT,
  city VARCHAR(100),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  allergies JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  preferred_time_slot VARCHAR(100),
  preferred_payment_method VARCHAR(50) CHECK (preferred_payment_method IN ('cash', 'upi', 'card')),
  preferred_appointment_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_created_at ON patients(created_at);

-- ============================================
-- 4. Appointments
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in-chair', 'completed', 'no-show', 'rescheduled', 'cancelled')
  ),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  reschedule_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled_time ON appointments(scheduled_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at);
-- Note: DATE() on timestamptz is not immutable; the idx_appointments_scheduled_time index above covers date-range queries
-- CREATE INDEX idx_appointments_date ON appointments(DATE(scheduled_time));

-- ============================================
-- 5. Appointment Reminders
-- ============================================
CREATE TABLE appointment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('sms', 'whatsapp', 'email')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminders_appointment_id ON appointment_reminders(appointment_id);
CREATE INDEX idx_reminders_status ON appointment_reminders(status);
CREATE INDEX idx_reminders_scheduled_at ON appointment_reminders(scheduled_at);

-- ============================================
-- 6. Payments
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'partial', 'paid', 'refunded')
  ),
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'upi', 'card')),
  transaction_id VARCHAR(255),
  notes TEXT,
  paid_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_patient_id ON payments(patient_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_paid_date ON payments(paid_date);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- ============================================
-- 7. Expenses
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL CHECK (
    category IN ('medical_supplies', 'utilities', 'rent', 'staff_salary', 'maintenance', 'equipment', 'marketing', 'other')
  ),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  notes TEXT,
  date DATE NOT NULL,
  receipt_url VARCHAR(500),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

-- ============================================
-- 8. Suppliers
-- ============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- ============================================
-- 9. Inventory Items
-- ============================================
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock_threshold INTEGER NOT NULL DEFAULT 5,
  unit_cost DECIMAL(10, 2),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_inventory_items_name ON inventory_items(name);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_stock_below_threshold ON inventory_items(current_stock)
WHERE current_stock < minimum_stock_threshold;
CREATE INDEX idx_inventory_items_supplier_id ON inventory_items(supplier_id);

-- ============================================
-- 10. Inventory Transactions
-- ============================================
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (
    transaction_type IN ('purchase', 'usage', 'adjustment', 'reorder')
  ),
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inv_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX idx_inv_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_transactions_created_at ON inventory_transactions(created_at);

-- ============================================
-- 11. Break Schedules
-- ============================================
CREATE TABLE break_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  break_type VARCHAR(50) NOT NULL CHECK (break_type IN ('lunch', 'tea', 'custom')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, start_time, end_time)
);

CREATE INDEX idx_breaks_date ON break_schedules(date);
CREATE INDEX idx_breaks_break_type ON break_schedules(break_type);

-- ============================================
-- 12. Clinic Settings
-- ============================================
CREATE TABLE clinic_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_name VARCHAR(255) NOT NULL,
  clinic_phone VARCHAR(20),
  clinic_email VARCHAR(255),
  clinic_address TEXT,
  working_hours_start TIME DEFAULT '09:00:00',
  working_hours_end TIME DEFAULT '18:00:00',
  lunch_start TIME DEFAULT '13:00:00',
  lunch_end TIME DEFAULT '14:00:00',
  default_appointment_duration INTEGER DEFAULT 30,
  currency VARCHAR(10) DEFAULT 'INR',
  settings_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid OR id IS NOT NULL)
);

-- ============================================
-- Views for Common Queries
-- ============================================

-- Overdue Payments View
CREATE VIEW overdue_payments AS
SELECT
  p.id,
  p.patient_id,
  pat.name as patient_name,
  pat.phone as patient_phone,
  p.amount,
  p.status,
  p.due_date,
  CURRENT_TIMESTAMP - p.due_date as days_overdue
FROM payments p
JOIN patients pat ON p.patient_id = pat.id
WHERE p.status IN ('pending', 'partial')
  AND p.due_date < CURRENT_DATE
ORDER BY p.due_date ASC;

-- Today's Appointments View
CREATE VIEW todays_appointments AS
SELECT
  a.id,
  a.scheduled_time,
  pat.name as patient_name,
  pat.phone as patient_phone,
  t.name as treatment_name,
  a.status,
  a.notes
FROM appointments a
JOIN patients pat ON a.patient_id = pat.id
JOIN treatments t ON a.treatment_id = t.id
WHERE DATE(a.scheduled_time) = CURRENT_DATE
  AND a.deleted_at IS NULL
ORDER BY a.scheduled_time ASC;

-- Low Stock Items View
CREATE VIEW low_stock_items AS
SELECT
  id,
  name,
  current_stock,
  minimum_stock_threshold,
  category,
  supplier_id
FROM inventory_items
WHERE current_stock <= minimum_stock_threshold
  AND deleted_at IS NULL
ORDER BY current_stock ASC;

-- ============================================
-- Timestamps Update Function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_break_schedules_updated_at BEFORE UPDATE ON break_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_settings_updated_at BEFORE UPDATE ON clinic_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_reminders_updated_at BEFORE UPDATE ON appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Supabase RLS policies and role grants removed — not needed for standalone Postgres)
