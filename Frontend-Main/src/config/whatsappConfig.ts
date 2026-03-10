// WhatsApp notification feature configuration
// Pure configuration object - no logic, no side effects

export const WHATSAPP_CONFIG = {
  // Feature control
  featureEnabled: true,

  // Rate limiting
  maxMessagesPerDay: 6,
  storageKey: 'whatsapp_sent_today',

  // Clinic information (customize as needed)
  clinicName: 'Dental Clinic',
  clinicPhone: '+91 75024 10307',

  // Message template with placeholders
  messageTemplate: `Hi {patientName}, your appointment at {clinicName} has been confirmed!

📅 Appointment Details:
Date: {appointmentDate}
Time: {appointmentTime}
Treatment: {treatmentType}
Duration: {duration} minutes

If you need to reschedule, please call {clinicPhone}

Looking forward to seeing you! 😊`,
} as const;

export type WhatsAppConfig = typeof WHATSAPP_CONFIG;
