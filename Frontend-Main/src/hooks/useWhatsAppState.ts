import { useState, useCallback } from 'react';
import { WHATSAPP_CONFIG } from '../config/whatsappConfig';

interface WhatsAppStateReturn {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  canSendMessage: () => boolean;
  recordMessageSent: () => void;
  messagesSentToday: number;
}

/**
 * Custom hook for managing WhatsApp notification modal state
 * Handles rate limiting using localStorage
 * No WhatsApp navigation - only state management
 */
export function useWhatsAppState(): WhatsAppStateReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messagesSentToday, setMessagesSentToday] = useState(0);

  // Initialize message count from localStorage
  const initializeCount = useCallback(() => {
    try {
      const stored = localStorage.getItem(WHATSAPP_CONFIG.storageKey);
      if (!stored) {
        return 0;
      }

      const data = JSON.parse(stored);
      const today = new Date().toDateString();

      // If data is from today, use the count; otherwise reset
      if (data.date === today) {
        return data.count || 0;
      }

      return 0;
    } catch {
      // Fallback if localStorage fails
      return 0;
    }
  }, []);

  const openModal = useCallback(() => {
    const count = initializeCount();
    setMessagesSentToday(count);
    setIsModalOpen(true);
  }, [initializeCount]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const canSendMessage = useCallback((): boolean => {
    const count = initializeCount();
    return count < WHATSAPP_CONFIG.maxMessagesPerDay;
  }, [initializeCount]);

  const recordMessageSent = useCallback(() => {
    try {
      const count = initializeCount();
      const newCount = count + 1;
      const today = new Date().toDateString();

      localStorage.setItem(
        WHATSAPP_CONFIG.storageKey,
        JSON.stringify({
          date: today,
          count: newCount,
        })
      );

      setMessagesSentToday(newCount);
    } catch {
      // Fallback if localStorage fails
      console.warn('Failed to record WhatsApp message sent');
    }
  }, [initializeCount]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    canSendMessage,
    recordMessageSent,
    messagesSentToday,
  };
}
