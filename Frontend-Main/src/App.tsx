import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { AppLayout } from './components/AppLayout';
import { AppointmentsToday } from './components/appointments/AppointmentsToday';
import { AppointmentsRegister } from './components/appointments/AppointmentsRegister';
import { AppointmentsNextVisits } from './components/appointments/AppointmentsNextVisits';
import { MoneyToday } from './components/money/MoneyToday';
import { MoneyMonth } from './components/money/MoneyMonth';
import { MoneyAddExpense } from './components/money/MoneyAddExpense';

type Section = 'appointments' | 'money';

function AppRoutes() {
  const [currentSection, setCurrentSection] = useState<Section>('appointments');
  const [currentTab, setCurrentTab] = useState('today');

  const handleNavigate = (section: Section, tab: string) => {
    setCurrentSection(section);
    setCurrentTab(tab);
  };

  const renderContent = () => {
    if (currentSection === 'appointments') {
      switch (currentTab) {
        case 'today':
          return <AppointmentsToday />;
        case 'register':
          return <AppointmentsRegister />;
        case 'next-visits':
          return <AppointmentsNextVisits />;
        default:
          return <AppointmentsToday />;
      }
    } else if (currentSection === 'money') {
      switch (currentTab) {
        case 'today':
          return <MoneyToday />;
        case 'month':
          return <MoneyMonth />;
        case 'add-expense':
          return <MoneyAddExpense />;
        default:
          return <MoneyToday />;
      }
    }
  };

  return (
    <AppLayout
      currentSection={currentSection}
      currentTab={currentTab}
      onNavigate={handleNavigate}
    >
      {renderContent()}
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/reset-password" element={<Login />} />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin', 'receptionist']}>
                <AppRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/money"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin', 'receptionist']}>
                <AppRoutes />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/appointments" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
