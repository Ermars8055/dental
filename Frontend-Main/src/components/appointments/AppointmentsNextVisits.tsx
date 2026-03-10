import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface NextVisitEntry {
  id: string;
  patientName: string;
  nextVisitDate: string;
  note: string;
  lastTreatmentDate: string;
  section: 'today' | 'this-week' | 'later';
  isRescheduled: boolean;
}

export function AppointmentsNextVisits() {
  const [visits, setVisits] = useState<NextVisitEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Only fetch scheduled/in-chair appointments from today onwards
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const response = await apiClient.get(
        `/appointments?status=scheduled&date_from=${today.toISOString()}&limit=100`
      );

      if (response.success && response.data?.appointments) {
        const appointments = response.data.appointments;
        const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Helper to compare dates without time component
        const getDateOnly = (date: Date) =>
          new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const todayDateOnly = getDateOnly(today);
        const weekLaterDateOnly = getDateOnly(weekLater);

        const formattedVisits = appointments
          .filter((apt: any) =>
            apt.status === 'scheduled' || apt.status === 'in-chair'
          )
          .map((apt: any) => {
            const scheduledDate = new Date(apt.scheduled_time);
            // Guard against invalid dates (null, undefined, malformed)
            const scheduledDateOnly = isNaN(scheduledDate.getTime()) ? null : getDateOnly(scheduledDate);
            let section: 'today' | 'this-week' | 'later' = 'later';

            // Only perform date comparisons if scheduledDate is valid
            if (scheduledDateOnly !== null) {
              if (scheduledDateOnly.getTime() === todayDateOnly.getTime()) {
                section = 'today';
              } else if (
                scheduledDateOnly > todayDateOnly &&
                scheduledDateOnly < weekLaterDateOnly
              ) {
                section = 'this-week';
              }
            }
            // If invalid date, section remains 'later' (safe fallback)

            return {
              id: apt.id,
              patientName: apt.patient_name || 'Unknown Patient',
              nextVisitDate: scheduledDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }),
              note: apt.treatment_name || apt.notes || 'Appointment',
              lastTreatmentDate: scheduledDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              section,
              isRescheduled: apt.status === 'rescheduled',
            };
          });

        setVisits(formattedVisits);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleSkip = async (visitId: string) => {
    if (!window.confirm('Mark this appointment as skipped?')) return;

    try {
      console.log('Skipping appointment:', visitId);
      const response = await apiClient.post(`/appointments/${visitId}/no-show`, {
        reason: 'Patient did not attend',
      });

      console.log('Skip response:', response);
      if (response?.success) {
        alert('Appointment marked as skipped');
        fetchAppointments();
      } else {
        alert(response?.message || 'Failed to skip appointment');
      }
    } catch (err) {
      console.error('Skip error:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to skip'));
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  const groupedVisits = {
    today: visits.filter((v) => v.section === 'today'),
    thisWeek: visits.filter((v) => v.section === 'this-week'),
    later: visits.filter((v) => v.section === 'later'),
  };

  const renderVisitRow = (visit: NextVisitEntry) => (
    <div
      key={visit.id}
      className="flex items-center gap-4 p-4 hover:bg-[var(--color-hover)] transition-colors border-b border-[var(--color-border)] last:border-b-0"
    >
      <div className="flex-1 grid grid-cols-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-[var(--color-text-dark)]">
              {visit.patientName}
            </div>
            {visit.isRescheduled && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                Rescheduled
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm text-[var(--color-text-dark)]/70">
            {visit.nextVisitDate}
          </div>
        </div>
        <div>
          <div className="text-sm text-[var(--color-text-dark)]/70">{visit.note}</div>
        </div>
        <div>
          <div className="text-sm text-[var(--color-text-dark)]/60">
            Last: {visit.lastTreatmentDate}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleSkip(visit.id)}
          className="px-3 py-1.5 text-sm text-[var(--color-text-dark)]/60 hover:bg-[var(--color-hover)] rounded transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)]">
          Next Visits
        </h2>
        <p className="text-sm text-[var(--color-text-dark)]/60 mt-1">
          Upcoming recalls and follow-up appointments
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        {groupedVisits.today.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-dark)]">Today</h3>
            </div>
            <div>{groupedVisits.today.map(renderVisitRow)}</div>
          </div>
        )}

        {groupedVisits.thisWeek.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-dark)]">
                This Week
              </h3>
            </div>
            <div>{groupedVisits.thisWeek.map(renderVisitRow)}</div>
          </div>
        )}

        {groupedVisits.later.length > 0 && (
          <div>
            <div className="px-4 py-3 bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-dark)]">Later</h3>
            </div>
            <div>{groupedVisits.later.map(renderVisitRow)}</div>
          </div>
        )}

        {visits.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--color-text-dark)]/60 italic">
            No upcoming visits scheduled. All clear!
          </div>
        )}
      </div>
    </div>
  );
}
