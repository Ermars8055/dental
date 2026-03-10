import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { WhatsAppNotificationModal } from '../WhatsAppNotificationModal';
import { useWhatsAppState } from '../../hooks/useWhatsAppState';

interface Appointment {
  id: string;
  scheduled_time: string;
  patient_name: string;
  patient_phone: string;
  treatment_name: string;
  treatment_cost: number;
  status: string;
}

interface Treatment {
  id: string;
  name: string;
  base_cost: number;
  category?: string;
}

interface FormData {
  time: string;
  patientName: string;
  patientPhone: string;
  treatmentId: string;
  notes: string;
}

export function AppointmentsRegister() {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    time: '09:00',
    patientName: '',
    patientPhone: '',
    treatmentId: '',
    notes: '',
  });
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    newDateTime: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    appointment: null,
    newDateTime: '',
    isSubmitting: false,
  });

  // WhatsApp notification state
  const whatsappState = useWhatsAppState();
  const [whatsappPatient, setWhatsappPatient] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [whatsappAppointment, setWhatsappAppointment] = useState<Appointment | null>(null);

  // Fetch appointments for selected date
  useEffect(() => {
    fetchAppointmentsForDate(selectedDate);
  }, [selectedDate]);

  // Fetch treatments on mount
  useEffect(() => {
    fetchTreatments();
  }, []);

  const fetchAppointmentsForDate = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/appointments?date_from=${date}T00:00:00Z&date_to=${date}T23:59:59Z`);
      if (response.success) {
        setAppointments(response.data.appointments || []);
      }
    } catch (err) {
      setError('Failed to load appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreatments = async () => {
    try {
      const response = await apiClient.get('/treatments');
      if (response.success && response.data?.treatments) {
        setTreatments(response.data.treatments);
      } else {
        console.error('Failed to fetch treatments:', response.message);
      }
    } catch (err) {
      console.error('Error fetching treatments:', err);
    }
  };

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRescheduleClick = (appointment: Appointment) => {
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
          reason: 'Rescheduled from register',
        }
      );

      if (response.success) {
        setRescheduleModal({
          isOpen: false,
          appointment: null,
          newDateTime: '',
          isSubmitting: false,
        });
        await fetchAppointmentsForDate(selectedDate);
      } else {
        alert(response.message || 'Failed to reschedule appointment');
      }
    } catch (err) {
      alert('Error rescheduling appointment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRescheduleModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleWhatsAppSend = (whatsappUrl: string) => {
    try {
      // Record message sent (rate limiting)
      whatsappState.recordMessageSent();

      // Close modal
      setWhatsappPatient(null);
      setWhatsappAppointment(null);

      // Open WhatsApp Web
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      alert('Failed to open WhatsApp: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      // Validate form data
      if (!formData.time || !formData.patientName || !formData.patientPhone || !formData.treatmentId) {
        setFormError('Please fill in all required fields');
        setFormLoading(false);
        return;
      }

      // Validate phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.patientPhone)) {
        setFormError('Phone number must be in international format (e.g., +919876543210)');
        setFormLoading(false);
        return;
      }

      // Combine date and time
      const localDateTime = new Date(`${selectedDate}T${formData.time}:00`);
      const scheduledTime = localDateTime.toISOString();

      // Prevent booking in the past (only for today's date)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      if (selectedDate === todayStr && localDateTime < now) {
        setFormError(`Cannot book in the past. Current time is ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — please choose a future time slot.`);
        setFormLoading(false);
        return;
      }

      // First, search for existing patient by phone
      let patientId: string | null = null;
      try {
        const searchResponse = await apiClient.get(`/patients/search?query=${formData.patientPhone}&limit=1`);
        if (searchResponse.success && searchResponse.data.patients.length > 0) {
          patientId = searchResponse.data.patients[0].id;
        }
      } catch (err) {
        // Patient not found, we'll create a new one
      }

      // If patient doesn't exist, create new patient
      if (!patientId) {
        try {
          const createPatientResponse = await apiClient.post('/patients', {
            name: formData.patientName,
            phone: formData.patientPhone,
          });
          if (createPatientResponse.success) {
            patientId = createPatientResponse.data.patient.id;
          } else {
            // Handle 409 conflict - patient already exists
            if (createPatientResponse.statusCode === 409) {
              const retrySearch = await apiClient.get(`/patients/search?query=${formData.patientPhone}&limit=1`);
              if (retrySearch.success && retrySearch.data.patients?.length > 0) {
                patientId = retrySearch.data.patients[0].id;
              } else {
                throw new Error('Patient exists but cannot be found');
              }
            } else {
              throw new Error(createPatientResponse.message || 'Failed to create patient');
            }
          }
        } catch (err: any) {
          throw new Error(err.message || 'Failed to create or find patient');
        }

        if (!patientId) {
          throw new Error('Failed to create or find patient');
        }
      }

      // Create appointment
      const appointmentResponse = await apiClient.post('/appointments', {
        patient_id: patientId,
        scheduled_time: scheduledTime,
        treatment_id: formData.treatmentId,
        notes: formData.notes || null,
      });

      if (appointmentResponse.success) {
        // Reset form and refresh appointments list
        setFormData({
          time: '09:00',
          patientName: '',
          patientPhone: '',
          treatmentId: '',
          notes: '',
        });
        setShowAddPanel(false);
        await fetchAppointmentsForDate(selectedDate);

        // Trigger WhatsApp notification modal
        if (whatsappState.canSendMessage()) {
          const treatment = treatments.find((t) => t.id === formData.treatmentId);
          const newAppointment: Appointment = {
            id: appointmentResponse.data.appointment.id,
            scheduled_time: scheduledTime,
            patient_name: formData.patientName,
            patient_phone: formData.patientPhone,
            treatment_name: treatment?.name || 'Treatment',
            treatment_cost: treatment?.base_cost || 0,
            status: 'scheduled',
          };
          setWhatsappPatient({ id: patientId!, name: formData.patientName, phone: formData.patientPhone });
          setWhatsappAppointment(newAppointment);
          whatsappState.openModal();
        }
      } else {
        setFormError(appointmentResponse.message || 'Failed to create appointment');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create appointment');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-[var(--color-text-dark)]">Register</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="date-picker" className="text-sm text-[var(--color-text-dark)]/70">
              Viewing day:
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-[var(--color-border)] rounded text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-teal)] text-white rounded hover:bg-[var(--color-accent-teal)]/90 transition-colors"
        >
          <Plus size={18} />
          Add entry
        </button>
      </div>

      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} onRetry={() => fetchAppointmentsForDate(selectedDate)} />}

      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading appointments..." size="small" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
                    <th className="sticky left-0 bg-[var(--color-paper-highlight)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Treatment
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-[var(--color-hover)] transition-colors">
                      <td className="sticky left-0 bg-white px-4 py-3 text-sm font-mono text-[var(--color-text-dark)]">
                        {new Date(appt.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-dark)]">
                        {appt.patient_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-dark)]/70">
                        {appt.patient_phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-dark)]/80">
                        {appt.treatment_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-dark)]/70">
                        <span className="capitalize">{appt.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-dark)]">
                        {appt.treatment_cost ? `₹${appt.treatment_cost}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {appt.status === 'scheduled' || appt.status === 'in-chair' ? (
                          <button
                            onClick={() => handleRescheduleClick(appt)}
                            className="px-2 py-1 text-xs bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/20 rounded transition-colors"
                          >
                            Reschedule
                          </button>
                        ) : (
                          <span className="text-[var(--color-text-dark)]/40 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {appointments.length === 0 && (
              <div className="py-12 text-center text-sm text-[var(--color-text-dark)]/60 italic">
                No appointments yet for this day. Time for a tea?
              </div>
            )}
          </>
        )}
      </div>

      {showAddPanel && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-end z-50">
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">
                  Add Entry
                </h3>
                <button
                  onClick={() => setShowAddPanel(false)}
                  className="p-1 hover:bg-[var(--color-hover)] rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {formError && <ErrorMessage error={formError} onDismiss={() => setFormError(null)} />}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => handleFormChange('patientName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded"
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                    Phone *
                    <span className="text-[var(--color-text-dark)]/60 font-normal">(with country code)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.patientPhone}
                    onChange={(e) => handleFormChange('patientPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded"
                    placeholder="+919876543210"
                    required
                  />
                  <p className="text-xs text-[var(--color-text-dark)]/60 mt-1">
                    Format: +country code + 10 digits (e.g., +919876543210 for India)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                    Treatment *
                  </label>
                  <select
                    value={formData.treatmentId}
                    onChange={(e) => handleFormChange('treatmentId', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded"
                    required
                  >
                    <option value="">Select a treatment</option>
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (₹{t.base_cost})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded"
                    placeholder="Any special notes..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 bg-[var(--color-accent-teal)] text-white rounded font-medium hover:bg-[var(--color-accent-teal)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Saving...' : 'Save entry'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && rescheduleModal.appointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">
                Reschedule Appointment
              </h2>
              <button
                onClick={() =>
                  setRescheduleModal({
                    isOpen: false,
                    appointment: null,
                    newDateTime: '',
                    isSubmitting: false,
                  })
                }
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

      {/* WhatsApp Notification Modal */}
      {whatsappState.isModalOpen && whatsappPatient && whatsappAppointment && (
        <WhatsAppNotificationModal
          isOpen={whatsappState.isModalOpen}
          patient={whatsappPatient}
          appointment={whatsappAppointment}
          onClose={() => {
            whatsappState.closeModal();
            setWhatsappPatient(null);
            setWhatsappAppointment(null);
          }}
          onSendClick={handleWhatsAppSend}
          messagesSentToday={whatsappState.messagesSentToday}
        />
      )}
    </div>
  );
}
