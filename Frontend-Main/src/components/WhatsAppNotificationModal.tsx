import { useState } from 'react';
import { X } from 'lucide-react';
import { buildWhatsAppUrl, composeMessage, isWhatsAppLikelyAvailable, isValidPhoneFormat } from '../utils/whatsappIntentHandler';
import { WHATSAPP_CONFIG } from '../config/whatsappConfig';

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  scheduled_time: string;
  treatment_name?: string;
  treatments?: {
    name: string;
  };
}

interface WhatsAppNotificationModalProps {
  isOpen: boolean;
  patient: Patient;
  appointment: Appointment;
  onClose: () => void;
  onSendClick: (whatsappUrl: string) => void;
  messagesSentToday: number;
}

/**
 * Modal component for WhatsApp notification confirmation
 * Presentational only - no API calls, no navigation logic
 * All side effects handled by parent component via props
 */
export function WhatsAppNotificationModal({
  isOpen,
  patient,
  appointment,
  onClose,
  onSendClick,
  messagesSentToday,
}: WhatsAppNotificationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  // Format appointment data for display and message
  const appointmentDate = new Date(appointment.scheduled_time);
  const dateString = appointmentDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeString = appointmentDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const treatmentType = appointment.treatment_name || appointment.treatments?.name || 'Appointment';
  const duration = 30; // Default duration, could be extended to appointment.duration

  // Compose message
  const message = composeMessage({
    patientName: patient.name,
    appointmentDate: dateString,
    appointmentTime: timeString,
    treatmentType: treatmentType,
    duration: duration,
    phone: patient.phone,
  });

  // Check if WhatsApp is available
  const whatsappAvailable = isWhatsAppLikelyAvailable();
  const phoneValid = isValidPhoneFormat(patient.phone);
  const canSend = whatsappAvailable && phoneValid && messagesSentToday < WHATSAPP_CONFIG.maxMessagesPerDay;

  // Build WhatsApp URL (only if can send)
  let whatsappUrl = '';
  if (canSend) {
    try {
      whatsappUrl = buildWhatsAppUrl(patient.phone, message);
    } catch (error) {
      console.warn('Failed to build WhatsApp URL:', error);
    }
  }

  // Handle copy to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Handle send click
  const handleSendClick = () => {
    if (canSend && whatsappUrl) {
      onSendClick(whatsappUrl);
    }
  };

  // Render unavailable state
  if (!whatsappAvailable) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">WhatsApp Not Available</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            WhatsApp Web or mobile app is not logged in on this device. You can manually send this message instead.
          </p>

          <div className="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-700 max-h-32 overflow-y-auto">
            {message}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyMessage}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              {copied ? 'Copied!' : 'Copy Message'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render limit reached state
  if (messagesSentToday >= WHATSAPP_CONFIG.maxMessagesPerDay) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daily Limit Reached</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            You've sent {WHATSAPP_CONFIG.maxMessagesPerDay} WhatsApp messages today. Limit resets tomorrow.
          </p>

          <div className="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-700 max-h-32 overflow-y-auto">
            {message}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyMessage}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              {copied ? 'Copied!' : 'Copy Message'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render main modal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Send Appointment Confirmation</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm font-medium text-gray-700">Patient: {patient.name}</p>
          <p className="text-sm text-gray-600">{dateString} at {timeString}</p>
          <p className="text-sm text-gray-600">{treatmentType}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Message Preview:</p>
          <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {message}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSendClick}
            disabled={!canSend}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium"
          >
            Send via WhatsApp
          </button>
          <button
            onClick={handleCopyMessage}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            Skip
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Messages sent today: {messagesSentToday} / {WHATSAPP_CONFIG.maxMessagesPerDay}
        </p>
      </div>
    </div>
  );
}
