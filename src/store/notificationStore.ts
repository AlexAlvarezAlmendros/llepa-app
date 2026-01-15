/**
 * Store de Preferencias de Notificaciones
 * 
 * Gestiona las preferencias del usuario para notificaciones:
 * - Notificaciones habilitadas/deshabilitadas
 * - Preferencias por tipo de recordatorio
 * - Horarios de "No molestar"
 * - Sonido y vibración
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderType } from '../types';

export interface NotificationPreferences {
  // General
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  
  // Modo No Molestar
  doNotDisturb: {
    enabled: boolean;
    startHour: number; // 0-23
    startMinute: number;
    endHour: number;
    endMinute: number;
  };
  
  // Preferencias por tipo de recordatorio
  typePreferences: {
    [key in ReminderType]: {
      enabled: boolean;
      advanceMinutes: number; // Minutos antes para notificar (0 = a la hora exacta)
    };
  };
  
  // Recordatorios anticipados para vacunas
  vaccineAdvanceDays: number; // Días antes para recordar vacunas próximas
  
  // Estadísticas
  lastPermissionRequest: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

interface NotificationState {
  preferences: NotificationPreferences;
  
  // Acciones
  setEnabled: (enabled: boolean) => void;
  setSound: (enabled: boolean) => void;
  setVibration: (enabled: boolean) => void;
  setDoNotDisturb: (settings: Partial<NotificationPreferences['doNotDisturb']>) => void;
  setTypePreference: (type: ReminderType, settings: { enabled?: boolean; advanceMinutes?: number }) => void;
  setVaccineAdvanceDays: (days: number) => void;
  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => void;
  resetPreferences: () => void;
  
  // Helpers
  isTypeEnabled: (type: ReminderType) => boolean;
  isInDoNotDisturbPeriod: (date: Date) => boolean;
  shouldNotify: (type: ReminderType, scheduledDate: Date) => boolean;
}

const DEFAULT_TYPE_PREFERENCES: NotificationPreferences['typePreferences'] = {
  MEDICATION: { enabled: true, advanceMinutes: 5 },
  VET_APPOINTMENT: { enabled: true, advanceMinutes: 60 },
  VACCINE: { enabled: true, advanceMinutes: 0 },
  ANTIPARASITIC: { enabled: true, advanceMinutes: 0 },
  HYGIENE: { enabled: true, advanceMinutes: 15 },
  GROOMING: { enabled: true, advanceMinutes: 60 },
  FOOD: { enabled: true, advanceMinutes: 0 },
  WALK: { enabled: true, advanceMinutes: 10 },
  TRAINING: { enabled: true, advanceMinutes: 5 },
  OTHER: { enabled: true, advanceMinutes: 0 },
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  vibration: true,
  doNotDisturb: {
    enabled: false,
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  },
  typePreferences: DEFAULT_TYPE_PREFERENCES,
  vaccineAdvanceDays: 7,
  lastPermissionRequest: null,
  permissionStatus: 'undetermined',
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      
      setEnabled: (enabled) =>
        set((state) => ({
          preferences: { ...state.preferences, enabled },
        })),
      
      setSound: (sound) =>
        set((state) => ({
          preferences: { ...state.preferences, sound },
        })),
      
      setVibration: (vibration) =>
        set((state) => ({
          preferences: { ...state.preferences, vibration },
        })),
      
      setDoNotDisturb: (settings) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            doNotDisturb: { ...state.preferences.doNotDisturb, ...settings },
          },
        })),
      
      setTypePreference: (type, settings) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            typePreferences: {
              ...state.preferences.typePreferences,
              [type]: {
                ...state.preferences.typePreferences[type],
                ...settings,
              },
            },
          },
        })),
      
      setVaccineAdvanceDays: (days) =>
        set((state) => ({
          preferences: { ...state.preferences, vaccineAdvanceDays: days },
        })),
      
      setPermissionStatus: (status) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            permissionStatus: status,
            lastPermissionRequest: new Date().toISOString(),
          },
        })),
      
      resetPreferences: () =>
        set({ preferences: DEFAULT_PREFERENCES }),
      
      isTypeEnabled: (type) => {
        const { preferences } = get();
        return preferences.enabled && preferences.typePreferences[type]?.enabled;
      },
      
      isInDoNotDisturbPeriod: (date) => {
        const { preferences } = get();
        const { doNotDisturb } = preferences;
        
        if (!doNotDisturb.enabled) return false;
        
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const currentMinutes = hours * 60 + minutes;
        
        const startMinutes = doNotDisturb.startHour * 60 + doNotDisturb.startMinute;
        const endMinutes = doNotDisturb.endHour * 60 + doNotDisturb.endMinute;
        
        // Si el período cruza la medianoche
        if (startMinutes > endMinutes) {
          return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        }
        
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      },
      
      shouldNotify: (type, scheduledDate) => {
        const state = get();
        const { preferences, isTypeEnabled, isInDoNotDisturbPeriod } = state;
        
        if (!preferences.enabled) return false;
        if (!isTypeEnabled(type)) return false;
        if (isInDoNotDisturbPeriod(scheduledDate)) return false;
        
        return true;
      },
    }),
    {
      name: 'notification-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper para obtener el label de un tipo de recordatorio
export const getReminderTypeLabel = (type: ReminderType): string => {
  const labels: Record<ReminderType, string> = {
    MEDICATION: 'Medicación',
    VET_APPOINTMENT: 'Citas Veterinarias',
    VACCINE: 'Vacunas',
    ANTIPARASITIC: 'Antiparasitarios',
    HYGIENE: 'Higiene',
    GROOMING: 'Peluquería',
    FOOD: 'Alimentación',
    WALK: 'Paseos',
    TRAINING: 'Entrenamiento',
    OTHER: 'Otros',
  };
  return labels[type];
};

// Helper para obtener el icono de un tipo de recordatorio
export const getReminderTypeIcon = (type: ReminderType): string => {
  const icons: Record<ReminderType, string> = {
    MEDICATION: 'pill',
    VET_APPOINTMENT: 'hospital-building',
    VACCINE: 'needle',
    ANTIPARASITIC: 'bug',
    HYGIENE: 'shower',
    GROOMING: 'content-cut',
    FOOD: 'food-drumstick',
    WALK: 'walk',
    TRAINING: 'whistle',
    OTHER: 'bell',
  };
  return icons[type];
};
