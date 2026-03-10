// Pure utility functions for WhatsApp intent handling
// No DOM manipulation, no state management, no side effects

import { WHATSAPP_CONFIG } from '../config/whatsappConfig';

export interface WhatsAppMessageData {
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  treatmentType: string;
  duration: number;
  phone: string;
}

/**
 * Build WhatsApp Web intent URL with pre-filled message
 * Format: https://wa.me/{phone}?text={message}
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  // Remove all non-digit characters from phone, keep only + and digits
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  if (!cleanPhone) {
    throw new Error('Invalid phone number');
  }

  // URL encode the message
  const encodedMessage = encodeURIComponent(message);

  // Return WhatsApp intent URL
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Compose message by replacing template placeholders
 */
export function composeMessage(data: WhatsAppMessageData): string {
  let message = WHATSAPP_CONFIG.messageTemplate;

  message = message.replace('{patientName}', data.patientName);
  message = message.replace('{clinicName}', WHATSAPP_CONFIG.clinicName);
  message = message.replace('{clinicPhone}', WHATSAPP_CONFIG.clinicPhone);
  message = message.replace('{appointmentDate}', data.appointmentDate);
  message = message.replace('{appointmentTime}', data.appointmentTime);
  message = message.replace('{treatmentType}', data.treatmentType);
  message = message.replace('{duration}', String(data.duration));

  return message;
}

/**
 * Check if WhatsApp is likely available on this device/browser
 * Returns boolean - does not guarantee availability
 */
export function isWhatsAppLikelyAvailable(): boolean {
  // Check if WhatsApp Web URL scheme is supported
  const isWeb = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Check if likely mobile with native WhatsApp
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );

  // WhatsApp available on HTTPS web or mobile with app
  return isWeb || isMobile;
}

/**
 * Validate phone number format (basic)
 * Accepts E.164 format: +[1-9]{1,3}[0-9]{1,14}
 */
export function isValidPhoneFormat(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validate message length (WhatsApp has no hard limit, but URL has limits)
 * Returns true if message is reasonable length for intent URL
 */
export function isValidMessageLength(message: string): boolean {
  // URL length limit is typically 2048 characters
  // Account for base URL and phone encoding
  const maxLength = 1500;
  return message.length > 0 && message.length <= maxLength;
}
