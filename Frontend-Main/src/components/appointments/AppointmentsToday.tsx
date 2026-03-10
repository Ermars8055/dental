import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface Appointment {
  id: string;
  scheduled_time: string;
  patient_name: string;
  patient_id?: string;
  treatment_name: string;
  treatment_cost: number;
  status: 'scheduled' | 'in-chair' | 'completed' | 'no-show' | 'rescheduled';
}

interface OverdueFollowUp {
  id: string;
  scheduled_time: string;
  patient_id?: string;
  treatment_id?: string;
  patient_name: string;
  patient_phone: string;
  treatment_name: string;
  treatment_cost: number;
  status: 'scheduled' | 'in-chair' | 'completed' | 'rescheduled';
  notes?: string;
  is_overdue: boolean;
}

export function AppointmentsToday() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<OverdueFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completeModal, setCompleteModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    amount: string;
    paymentMethod: string;
    isSubmitting: boolean;
  }>({ isOpen: false, appointment: null, amount: '', paymentMethod: 'cash', isSubmitting: false });
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointment: OverdueFollowUp | null;
    newDateTime: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    appointment: null,
    newDateTime: '',
    isSubmitting: false,
  });
  // Guard against concurrent fetch requests from polling interval
  const isFetchingRef = useRef(false);

  // Fetch appointments on mount and periodically refresh
  useEffect(() => {
    fetchAppointments();

    // Refresh appointments every 60 seconds to balance data freshness with backend load
    const interval = setInterval(fetchAppointments, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    // Skip if already fetching (prevents overlapping requests on slow networks)
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Fetch today's appointments
      const appointmentsResponse = await apiClient.get<{
        appointments: Appointment[];
        summary: any;
      }>('/appointments/today');

      if (!appointmentsResponse.success) {
        throw new Error(appointmentsResponse.message || 'Failed to fetch appointments');
      }

      setAppointments(appointmentsResponse.data?.appointments || []);

      // Fetch next visits (future scheduled appointments, excluding today)
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const nextVisitsResponse = await apiClient.get<{
          appointments: OverdueFollowUp[];
        }>(`/appointments?status=scheduled&date_from=${tomorrow.toISOString()}`);

        if (nextVisitsResponse.success) {
          setOverdueFollowUps(nextVisitsResponse.data?.appointments || []);
        } else {
          console.error('Failed to fetch next visits:', nextVisitsResponse.message);
        }
      } catch (err) {
        console.error('Failed to fetch next visits:', err);
        setError('Failed to load upcoming appointments: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load appointments';
      setError(message);
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false; // Always clear the flag, even on error
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]';
      case 'in-chair':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-gray-100 text-gray-700';
      case 'no-show':
        return 'bg-red-50 text-[var(--color-red-critical)]';
    }
  };

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'in-chair':
        return 'In Chair';
      case 'no-show':
        return 'No-show';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getAppointmentTime = (scheduledTime: string) => {
    try {
      const date = new Date(scheduledTime);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const handleRescheduleClick = (appointment: OverdueFollowUp) => {
    setRescheduleModal({
      isOpen: true,
      appointment,
      newDateTime: '',
      isSubmitting: false,
    });
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModal.appointment || !rescheduleModal.newDateTime) return;

    setRescheduleModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await apiClient.post(
        `/appointments/${rescheduleModal.appointment.id}/reschedule`,
        {
          scheduled_time: rescheduleModal.newDateTime,
          reason: 'Rescheduled from missed appointment',
        }
      );

      if (response.success) {
        setRescheduleModal({ isOpen: false, appointment: null, newDateTime: '', isSubmitting: false });
        fetchAppointments();
      } else {
        alert(response.message || 'Failed to reschedule appointment');
      }
    } catch (err) {
      alert('Error rescheduling appointment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRescheduleModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleSkip = async (appointmentId: string) => {
    if (!window.confirm('Mark this appointment as skipped?')) {
      console.log('Skip cancelled by user');
      return;
    }

    try {
      console.log('Skipping appointment with ID:', appointmentId);
      const response = await apiClient.post(`/appointments/${appointmentId}/no-show`, {
        reason: 'Patient did not attend',
      });

      console.log('Skip API response:', response);

      if (response?.success) {
        console.log('Skip successful, refreshing appointments');
        await fetchAppointments();
        alert('Appointment marked as skipped');
      } else {
        console.error('Skip failed with response:', response);
        alert(response?.message || 'Failed to mark appointment as skipped');
      }
    } catch (err) {
      console.error('Skip error caught:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to skip appointment';
      console.error('Error message:', errorMessage);
      alert('Error: ' + errorMessage);
    }
  };

  const handleCompleteClick = (appointment: Appointment) => {
    setCompleteModal({
      isOpen: true,
      appointment,
      amount: String(appointment.treatment_cost || ''),
      paymentMethod: 'cash',
      isSubmitting: false,
    });
  };

  const handleCompleteSubmit = async () => {
    if (!completeModal.appointment || !completeModal.amount) return;
    setCompleteModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      // 1. Mark appointment complete + record payment via completeAppointment
      const response = await apiClient.post(`/appointments/${completeModal.appointment.id}/complete`, {
        actual_cost: parseFloat(completeModal.amount),
        payment_method: completeModal.paymentMethod,
        notes: 'Treatment completed',
      });

      if (response.success) {
        setCompleteModal({ isOpen: false, appointment: null, amount: '', paymentMethod: 'cash', isSubmitting: false });
        fetchAppointments();
      } else {
        alert(response.message || 'Failed to complete appointment');
        setCompleteModal((prev) => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setCompleteModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleComplete = (appointment: Appointment) => {
    handleCompleteClick(appointment);
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner message="Loading appointments..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage error={error} onRetry={fetchAppointments} onDismiss={() => setError(null)} />
      </div>
    );
  }

  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const noShowCount = appointments.filter((a) => a.status === 'no-show').length;
  const now = new Date();
  const currentTimeSlot = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-[var(--color-text-dark)]">
            Today's Schedule
          </h2>
          <button
            onClick={fetchAppointments}
            className="px-3 py-1 text-sm bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/20 rounded transition-colors"
            title="Refresh appointments"
          >
            ↻ Refresh
          </button>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            Patients booked:{' '}
            <span className="font-mono font-medium">{appointments.length}</span>
          </div>
          <div>
            Completed:{' '}
            <span className="font-mono font-medium text-[var(--color-accent-teal)]">
              {completedCount}
            </span>
          </div>
          {noShowCount > 0 && (
            <div>
              No-shows:{' '}
              <span className="font-mono font-medium text-[var(--color-red-critical)]">
                {noShowCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-dark)]/60">
                No appointments scheduled for today
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {appointments.map((appointment) => {
                  const appointmentTime = getAppointmentTime(appointment.scheduled_time);
                  const isCurrentSlot = appointmentTime === currentTimeSlot;
                  return (
                    <div
                      key={appointment.id}
                      className={`p-4 transition-colors hover:bg-[var(--color-hover)] ${
                        isCurrentSlot
                          ? 'bg-[var(--color-paper-highlight)] border-l-4 border-l-[var(--color-accent-teal)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="font-mono text-tabular text-sm text-[var(--color-text-dark)]/60 w-16 pt-1">
                          {appointmentTime}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-[var(--color-text-dark)] mb-1">
                            {appointment.patient_name || 'Unknown Patient'}
                          </div>
                          <div className="text-sm text-[var(--color-text-dark)]/70">
                            {appointment.treatment_name || 'No treatment assigned'}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                          {appointment.status === 'scheduled' || appointment.status === 'in-chair' ? (
                            <button
                              onClick={() => handleComplete(appointment)}
                              className="px-2 py-1 text-xs bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/20 rounded transition-colors"
                              title="Mark as completed"
                            >
                              ✓ Done
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-dark)] mb-3">
            Upcoming Appointments
          </h3>
          <div className="space-y-3">
            {overdueFollowUps.length === 0 ? (
              <div className="text-sm text-[var(--color-text-dark)]/60 italic py-8 text-center">
                No upcoming appointments scheduled.
              </div>
            ) : (
              overdueFollowUps.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-accent-teal)] transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-[var(--color-text-dark)] mb-1">
                      {visit.patient_name || 'Unknown Patient'}
                    </div>
                    <div className="text-sm text-[var(--color-text-dark)]/70 mb-1">
                      {visit.treatment_name || 'No treatment assigned'}
                    </div>
                    <div className="text-xs text-[var(--color-text-dark)]/60 mb-3">
                      Scheduled for:{' '}
                      <span className="font-medium text-[var(--color-accent-teal)]">
                        {new Date(visit.scheduled_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRescheduleClick(visit)}
                        className="px-2 py-1 text-xs bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/20 rounded transition-colors"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleSkip(visit.id)}
                        className="px-2 py-1 text-xs text-[var(--color-text-dark)]/60 hover:bg-[var(--color-hover)] rounded transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>


      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && rescheduleModal.appointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">
                Reschedule Appointment
              </h2>
              <button
                onClick={() => setRescheduleModal({ isOpen: false, appointment: null, newDateTime: '', isSubmitting: false })}
                className="text-[var(--color-text-dark)]/60 hover:text-[var(--color-text-dark)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm font-medium text-[var(--color-text-dark)] mb-1">
                  Patient
                </div>
                <div className="text-sm text-[var(--color-text-dark)]/70">
                  {rescheduleModal.appointment.patient_name || 'Unknown Patient'}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-[var(--color-text-dark)] mb-1">
                  Treatment
                </div>
                <div className="text-sm text-[var(--color-text-dark)]/70">
                  {rescheduleModal.appointment.treatment_name || 'No treatment'}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-[var(--color-text-dark)] mb-2 block">
                  New Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleModal.newDateTime}
                  onChange={(e) =>
                    setRescheduleModal((prev) => ({
                      ...prev,
                      newDateTime: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-teal)] text-sm"
                  disabled={rescheduleModal.isSubmitting}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setRescheduleModal({
                      isOpen: false,
                      appointment: null,
                      newDateTime: '',
                      isSubmitting: false,
                    })
                  }
                  className="flex-1 px-4 py-2 text-sm text-[var(--color-text-dark)]/70 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] transition-colors disabled:opacity-50"
                  disabled={rescheduleModal.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRescheduleSubmit}
                  disabled={!rescheduleModal.newDateTime || rescheduleModal.isSubmitting}
                  className="flex-1 px-4 py-2 text-sm bg-[var(--color-accent-teal)] text-white rounded-lg hover:bg-[var(--color-accent-teal)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rescheduleModal.isSubmitting ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Appointment Modal */}
      {completeModal.isOpen && completeModal.appointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-[var(--color-accent-teal)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-dark)]">Mark as Completed</h2>
              </div>
              <button onClick={() => setCompleteModal({ isOpen: false, appointment: null, amount: '', paymentMethod: 'cash', isSubmitting: false })}
                className="text-[var(--color-text-dark)]/50 hover:text-[var(--color-text-dark)]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[var(--color-bg-warm)] rounded-lg p-3 text-sm">
                <div className="font-medium text-[var(--color-text-dark)]">{completeModal.appointment.patient_name}</div>
                <div className="text-[var(--color-text-dark)]/60">{completeModal.appointment.treatment_name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">Fee Collected (₹)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={completeModal.amount}
                  onChange={(e) => setCompleteModal((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">Payment Method</label>
                <select
                  value={completeModal.paymentMethod}
                  onChange={(e) => setCompleteModal((p) => ({ ...p, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setCompleteModal({ isOpen: false, appointment: null, amount: '', paymentMethod: 'cash', isSubmitting: false })}
                  className="flex-1 px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] transition-colors"
                  disabled={completeModal.isSubmitting}
                >Cancel</button>
                <button
                  onClick={handleCompleteSubmit}
                  disabled={!completeModal.amount || completeModal.isSubmitting}
                  className="flex-1 px-4 py-2 text-sm bg-[var(--color-accent-teal)] text-white rounded-lg hover:bg-[var(--color-accent-teal)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >{completeModal.isSubmitting ? 'Saving...' : '✓ Complete & Record'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
