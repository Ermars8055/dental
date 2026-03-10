# Phase 10: Frontend Integration Guide

**Status:** ⏳ READY TO IMPLEMENT
**Estimated Time:** 2-3 days (1-2 developers)
**Complexity:** Medium

---

## Overview

This phase replaces all mock data in the frontend with real API calls to the backend.

---

## Step 1: Frontend Configuration (15 minutes)

### Create `.env.local` file

```env
VITE_API_URL=http://localhost:5000/api
VITE_AUTH_TOKEN_KEY=authToken
```

### Create API client utility (`src/services/api.ts`)

```typescript
const API_URL = import.meta.env.VITE_API_URL;

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    return response.json();
  },

  get(endpoint: string) {
    return this.request(endpoint);
  },

  post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
```

---

## Step 2: Update Components (2-3 hours)

### 2.1 AppointmentsToday.tsx

**Before:**
```typescript
const mockAppointments = [
  { id: '1', time: '09:00', patientName: 'John Doe', ... },
  ...
];
const [appointments, setAppointments] = useState(mockAppointments);
```

**After:**
```typescript
import { apiClient } from '../services/api';

const [appointments, setAppointments] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/appointments/today');
      if (response.success) {
        setAppointments(response.data.appointments);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  fetchAppointments();
}, []);

// Add loading and error states to render
if (loading) return <div>Loading appointments...</div>;
if (error) return <div className="text-red-600">Error: {error}</div>;
```

### 2.2 AppointmentsRegister.tsx

**Handle form submission:**

```typescript
const handleCreateAppointment = async (formData) => {
  try {
    const response = await apiClient.post('/appointments', {
      patient_id: formData.patientId,
      scheduled_time: formData.dateTime,
      treatment_id: formData.treatmentId,
      notes: formData.notes,
    });

    if (response.success) {
      // Show success message
      setFormData({...}); // Reset form
      // Refresh appointments
      fetchAppointments();
    } else {
      setError(response.message);
    }
  } catch (error) {
    setError('Failed to create appointment');
  }
};
```

### 2.3 AppointmentsNextVisits.tsx

```typescript
useEffect(() => {
  const fetchOverdueFollowups = async () => {
    const response = await apiClient.get('/appointments/overdue');
    if (response.success) {
      setAppointments(response.data.overdueFollowUps);
    }
  };
  fetchOverdueFollowups();
}, []);
```

### 2.4 MoneyToday.tsx

```typescript
useEffect(() => {
  const fetchDailySummary = async () => {
    const response = await apiClient.get('/payments/summary/daily');
    if (response.success) {
      setSummary({
        totalCollected: response.data.totalCollected,
        byMethod: response.data.byMethod,
        transactionCount: response.data.transactionCount,
      });
    }
  };
  fetchDailySummary();
}, []);
```

### 2.5 MoneyMonth.tsx

```typescript
const handleMonthChange = async (month) => {
  const response = await apiClient.get(`/payments/summary/monthly?month=${month}`);
  if (response.success) {
    setMonthlySummary(response.data);
  }
};
```

### 2.6 MoneyAddExpense.tsx

```typescript
const handleAddExpense = async (formData) => {
  const response = await apiClient.post('/expenses', {
    category: formData.category,
    amount: parseFloat(formData.amount),
    description: formData.description,
    notes: formData.notes,
    date: formData.date,
  });

  if (response.success) {
    // Success handling
    setFormData({...}); // Reset
  }
};
```

---

## Step 3: Authentication Implementation (1 hour)

### Create Login Component

```typescript
// src/components/Login.tsx
import { apiClient } from '../services/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      if (response.success) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/appointments');
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Login failed');
    }
  };

  return (
    <div className="login-form">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <p className="text-red-600">{error}</p>}
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};
```

### Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx
export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
};
```

---

## Step 4: Error Handling & Loading States (1 hour)

### Create Loading component

```typescript
export const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
  </div>
);
```

### Create Error component

```typescript
export const ErrorMessage = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded p-4">
    <p className="text-red-700">{error}</p>
    {onRetry && (
      <button onClick={onRetry} className="text-red-600 underline mt-2">
        Try Again
      </button>
    )}
  </div>
);
```

---

## Step 5: Testing Checklist

- [ ] User can login with valid credentials
- [ ] Token is saved in localStorage
- [ ] Appointments display from `/api/appointments/today`
- [ ] Can create new appointment
- [ ] Appointment marks as completed
- [ ] Can reschedule appointment
- [ ] Daily revenue shows correct data
- [ ] Monthly summary updates correctly
- [ ] Can add new expense
- [ ] All error messages display correctly
- [ ] Loading states show during API calls
- [ ] Session persists on page refresh
- [ ] Logout clears token and redirects

---

## Step 6: Common Issues & Solutions

### CORS Error
- Ensure backend is running
- Check CORS_ORIGIN in backend .env includes frontend URL

### 401 Unauthorized
- Token might be expired, user needs to login again
- Check token is being sent in Authorization header

### Blank Data
- Check API response format matches what component expects
- Add console.log to debug response data

### API Timeout
- Increase fetch timeout if needed
- Check backend is running and responsive

---

## Deployment Notes

Update `VITE_API_URL` for production:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

---

**Next Phase:** Phase 11 - Testing & Optimization
