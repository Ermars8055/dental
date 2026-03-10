# Phase 11: Testing & Optimization Guide

**Status:** ⏳ READY TO IMPLEMENT
**Estimated Time:** 1-2 days
**Complexity:** Medium

---

## Part 1: Testing Strategy

### Unit Tests (Backend)

```bash
npm install --save-dev jest @types/jest
```

**Create `__tests__/auth.test.js`:**

```javascript
const request = require('supertest');
const app = require('../src/server');

describe('Auth Endpoints', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@clinic.com',
        password: 'password123',
        name: 'Test User',
        role: 'doctor'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@clinic.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@clinic.com',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
  });
});
```

### Integration Tests

```javascript
// __tests__/appointments.integration.test.js
describe('Appointment Flow', () => {
  let token;
  let patientId;
  let appointmentId;

  it('should complete full appointment workflow', async () => {
    // 1. Create patient
    let res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'John Doe',
        phone: '+919876543210'
      });
    patientId = res.body.data.patient.id;

    // 2. Create appointment
    res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patient_id: patientId,
        scheduled_time: '2026-02-15T10:00:00Z',
        treatment_id: 'treatment-uuid'
      });
    appointmentId = res.body.data.appointment.id;
    expect(res.statusCode).toBe(201);

    // 3. Mark as completed
    res = await request(app)
      .post(`/api/appointments/${appointmentId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.appointment.status).toBe('completed');
  });
});
```

### Frontend Tests

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event
```

**Create `src/__tests__/AppointmentsToday.test.tsx`:**

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import AppointmentsToday from '../components/AppointmentsToday';

describe('AppointmentsToday', () => {
  it('should fetch and display appointments', async () => {
    render(<AppointmentsToday />);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(<AppointmentsToday />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('should display error message on API failure', async () => {
    // Mock API failure
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    );

    render(<AppointmentsToday />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});
```

---

## Part 2: Performance Optimization

### Backend Optimization

1. **Database Query Optimization**
   - Add indexes on frequently queried columns ✅ (Already done in migrations)
   - Use pagination for list endpoints ✅ (Already implemented)
   - Avoid N+1 queries

2. **Response Compression**
   - Already enabled with `compression()` middleware ✅

3. **Caching Strategy**
```javascript
// src/middleware/cache.js
export const cacheMiddleware = (req, res, next) => {
  // Cache GET requests for 5 minutes
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=300');
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
};

// Apply to specific routes
app.use('/api/settings', cacheMiddleware, settingsRoutes);
app.use('/api/treatments', cacheMiddleware);
```

4. **Connection Pooling** (Supabase handles automatically)

### Frontend Optimization

1. **Code Splitting**
```typescript
// Use React.lazy for route-based splitting
const AppointmentsToday = lazy(() => import('./components/AppointmentsToday'));
const MoneyToday = lazy(() => import('./components/MoneyToday'));

// In routing
<Suspense fallback={<LoadingSpinner />}>
  <AppointmentsToday />
</Suspense>
```

2. **Memoization**
```typescript
import { memo, useMemo } from 'react';

const AppointmentList = memo(({ appointments }) => {
  const sortedAppointments = useMemo(() => {
    return appointments.sort((a, b) =>
      new Date(a.time) - new Date(b.time)
    );
  }, [appointments]);

  return (
    // render
  );
});
```

3. **Debouncing API Calls**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useCallback(
  debounce((query) => {
    apiClient.get(`/patients/search?query=${query}`);
  }, 500),
  []
);

const handleSearch = (e) => {
  setSearchQuery(e.target.value);
  debouncedSearch(e.target.value);
};
```

4. **Image Optimization**
- Use WebP format where possible
- Lazy load images
- Use appropriate image sizes

---

## Part 3: Load Testing

```bash
npm install --save-dev loadtest
```

**Test API endpoints:**

```bash
# Test 100 concurrent requests to appointments endpoint
loadtest -n 1000 -c 100 http://localhost:5000/api/appointments \
  -H "Authorization: Bearer <token>"
```

**Monitor performance:**
```bash
# Watch backend performance
node --inspect src/server.js

# Then open chrome://inspect in Chrome DevTools
```

---

## Part 4: Security Testing

### OWASP Top 10 Checklist

- [ ] Input validation on all endpoints ✅
- [ ] SQL injection protection (using parameterized queries) ✅
- [ ] XSS protection (Helmet headers) ✅
- [ ] CSRF protection (token-based)
- [ ] Authentication & authorization ✅
- [ ] Sensitive data encryption
- [ ] Secure password storage (bcryptjs) ✅
- [ ] API rate limiting

**Add rate limiting:**

```bash
npm install express-rate-limit
```

```javascript
// src/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, try again later'
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests to this API'
});

// Apply
app.post('/api/auth/login', loginLimiter, loginEndpoint);
app.use('/api/', apiLimiter);
```

---

## Part 5: Testing Checklist

### Functional Testing
- [ ] All CRUD operations work correctly
- [ ] Authentication/authorization works
- [ ] Data validation works
- [ ] Error handling works
- [ ] Calculations are accurate (revenue, expenses, etc.)
- [ ] Date/time handling is correct
- [ ] Pagination works
- [ ] Filtering works
- [ ] Sorting works

### Performance Testing
- [ ] API response time < 200ms
- [ ] Frontend load time < 3s
- [ ] Can handle 100+ concurrent users
- [ ] Database queries are optimized
- [ ] No memory leaks

### Security Testing
- [ ] Unauthorized access is blocked
- [ ] SQL injection is prevented
- [ ] XSS attacks are prevented
- [ ] CSRF protection works
- [ ] Rate limiting works
- [ ] Sensitive data is encrypted

### User Acceptance Testing
- [ ] Appointments system works end-to-end
- [ ] Payment tracking works correctly
- [ ] Expense reporting is accurate
- [ ] Inventory management works
- [ ] Reports generate correctly
- [ ] UI/UX is intuitive

---

## Part 6: Monitoring in Production

### Logging Configuration

```javascript
// src/utils/logger.js - Enhanced
export const setupLogging = () => {
  // Log to file for production
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const logStream = fs.createWriteStream('logs/app.log', { flags: 'a' });

    process.stdout.write = (message) => logStream.write(message);
    process.stderr.write = (message) => logStream.write(message);
  }
};
```

### Error Tracking

```bash
npm install sentry-node
```

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.errorHandler());
```

---

**Next Phase:** Phase 12 - Deployment
