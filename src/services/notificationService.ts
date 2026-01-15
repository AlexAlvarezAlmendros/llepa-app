/**
 * Servicio de Notificaciones
 * 
 * Gestiona notificaciones locales con Expo Notifications:
 * - Solicitar permisos
 * - Programar notificaciones
 * - Cancelar notificaciones
 * - Reprogramación automática para frecuencias cada 2/3 días
 * - Integración con preferencias de usuario
 * - Modo No Molestar
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';
import { ReminderType } from '../types';

// Subscription para el listener de notificaciones recibidas
let notificationReceivedSubscription: Notifications.Subscription | null = null;
let notificationResponseSubscription: Notifications.Subscription | null = null;

// Callback para cuando el usuario toca una notificación
type NotificationResponseCallback = (response: Notifications.NotificationResponse) => void;
let notificationResponseCallback: NotificationResponseCallback | null = null;

/**
 * Configurar el comportamiento de las notificaciones
 * Integrado con las preferencias del usuario
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const preferences = useNotificationStore.getState().preferences;
    
    // Verificar si las notificaciones están habilitadas
    if (!preferences.enabled) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    
    // Verificar modo No Molestar
    const now = new Date();
    const isInDoNotDisturb = useNotificationStore.getState().isInDoNotDisturbPeriod(now);
    
    if (isInDoNotDisturb) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true, // Mantener badge para ver después
        shouldShowBanner: false,
        shouldShowList: true,
      };
    }
    
    // Verificar si el tipo de notificación está habilitado
    const data = notification.request.content.data;
    const type = data?.reminderType as ReminderType | undefined;
    
    if (type && !useNotificationStore.getState().isTypeEnabled(type)) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: preferences.sound,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Solicitar permisos de notificaciones
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      useNotificationStore.getState().setPermissionStatus('denied');
      return false;
    }

    // Configurar canales en Android
    if (Platform.OS === 'android') {
      // Canal principal para recordatorios
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Recordatorios',
        description: 'Recordatorios de medicación, citas y cuidados',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        enableVibrate: true,
        enableLights: true,
      });
      
      // Canal para medicación urgente
      await Notifications.setNotificationChannelAsync('medication', {
        name: 'Medicación',
        description: 'Recordatorios de medicación importantes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
        enableVibrate: true,
        enableLights: true,
        sound: 'default',
      });
      
      // Canal para citas veterinarias
      await Notifications.setNotificationChannelAsync('vet_appointment', {
        name: 'Citas Veterinarias',
        description: 'Recordatorios de citas veterinarias',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        enableVibrate: true,
        enableLights: true,
      });
      
      // Canal para vacunas
      await Notifications.setNotificationChannelAsync('vaccine', {
        name: 'Vacunas',
        description: 'Recordatorios de vacunación',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
        enableVibrate: true,
        enableLights: true,
      });
    }

    useNotificationStore.getState().setPermissionStatus('granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
};

/**
 * Obtener el canal de Android según el tipo de recordatorio
 */
const getChannelId = (type?: ReminderType): string => {
  if (Platform.OS !== 'android') return 'default';
  
  switch (type) {
    case 'MEDICATION':
    case 'ANTIPARASITIC':
      return 'medication';
    case 'VET_APPOINTMENT':
      return 'vet_appointment';
    case 'VACCINE':
      return 'vaccine';
    default:
      return 'default';
  }
};

/**
 * Programar una notificación local
 * Respeta las preferencias del usuario
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  scheduledDate: Date,
  data?: { reminderType?: ReminderType; reminderId?: string; petId?: string; petName?: string; [key: string]: any }
): Promise<string | null> => {
  try {
    const preferences = useNotificationStore.getState().preferences;
    const type = data?.reminderType;
    
    // Verificar si las notificaciones están habilitadas
    if (!preferences.enabled) {
      console.log('[Notifications] Notifications disabled, skipping schedule');
      return null;
    }
    
    // Verificar si el tipo está habilitado
    if (type && !useNotificationStore.getState().isTypeEnabled(type)) {
      console.log(`[Notifications] Type ${type} disabled, skipping schedule`);
      return null;
    }
    
    // Aplicar tiempo de anticipación si corresponde
    let adjustedDate = new Date(scheduledDate);
    if (type && preferences.typePreferences[type]) {
      const advanceMinutes = preferences.typePreferences[type].advanceMinutes;
      if (advanceMinutes > 0) {
        adjustedDate = new Date(adjustedDate.getTime() - advanceMinutes * 60 * 1000);
      }
    }
    
    // No programar si la fecha ya pasó
    if (adjustedDate <= new Date()) {
      console.log('[Notifications] Date is in the past, skipping schedule');
      return null;
    }
    
    const channelId = getChannelId(type);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          scheduledAt: scheduledDate.toISOString(),
        },
        sound: preferences.sound,
        badge: 1,
      },
      trigger: {
        channelId,
        date: adjustedDate,
      },
    });

    console.log(`[Notifications] Scheduled notification ${notificationId} for ${adjustedDate.toLocaleString()}`);
    return notificationId;
  } catch (error: any) {
    console.error('[Notifications] Error scheduling notification:', error);
    throw new Error(`Error al programar notificación: ${error.message}`);
  }
};

/**
 * Programar notificación recurrente
 * Para frecuencias no soportadas nativamente (cada 2/3 días, cada 8/12h), programamos solo la próxima notificación
 * Respeta las preferencias del usuario
 */
export const scheduleRecurringNotification = async (
  title: string,
  body: string,
  frequency: 'EVERY_8_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'EVERY_TWO_DAYS' | 'EVERY_THREE_DAYS' | 'WEEKLY' | 'MONTHLY',
  hour: number,
  minute: number,
  data?: { reminderType?: ReminderType; reminderId?: string; petId?: string; petName?: string; [key: string]: any }
): Promise<string | null> => {
  try {
    const preferences = useNotificationStore.getState().preferences;
    const type = data?.reminderType;
    
    // Verificar si las notificaciones están habilitadas
    if (!preferences.enabled) {
      console.log('[Notifications] Notifications disabled, skipping recurring schedule');
      return null;
    }
    
    // Verificar si el tipo está habilitado
    if (type && !useNotificationStore.getState().isTypeEnabled(type)) {
      console.log(`[Notifications] Type ${type} disabled, skipping recurring schedule`);
      return null;
    }
    
    const channelId = getChannelId(type);
    let trigger: any;

    switch (frequency) {
      case 'EVERY_8_HOURS':
      case 'EVERY_12_HOURS':
        // Para frecuencias sub-diarias, programamos la próxima notificación
        const intervalHours = frequency === 'EVERY_8_HOURS' ? 8 : 12;
        const nowSubDaily = new Date();
        const scheduledSubDaily = new Date(nowSubDaily);
        scheduledSubDaily.setHours(hour, minute, 0, 0);
        
        // Si la hora ya pasó, programar para la próxima ocurrencia
        if (scheduledSubDaily <= nowSubDaily) {
          scheduledSubDaily.setTime(scheduledSubDaily.getTime() + intervalHours * 60 * 60 * 1000);
        }
        
        const subDailyNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { ...data, frequency, intervalHours },
            sound: true,
          },
          trigger: {
            channelId: 'default',
            date: scheduledSubDaily,
          },
        });
        
        return subDailyNotificationId;
        
      case 'DAILY':
        trigger = {
          channelId: 'default',
          hour,
          minute,
          repeats: true,
        };
        break;
      case 'EVERY_TWO_DAYS':
      case 'EVERY_THREE_DAYS':
        // Expo Notifications no soporta nativamente cada 2 o 3 días
        // Programamos solo la PRÓXIMA notificación
        const intervalDays = frequency === 'EVERY_TWO_DAYS' ? 2 : 3;
        const now = new Date();
        const scheduledDate = new Date(now);
        scheduledDate.setHours(hour, minute, 0, 0);
        
        // Si la hora de hoy ya pasó, programar para el próximo intervalo
        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + intervalDays);
        }
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { ...data, frequency, intervalDays },
            sound: true,
          },
          trigger: {
            channelId: 'default',
            date: scheduledDate,
          },
        });
        
        return notificationId;
        
      case 'WEEKLY':
        trigger = {
          channelId: 'default',
          weekday: new Date().getDay() || 7, // Usar el día actual de la semana
          hour,
          minute,
          repeats: true,
        };
        break;
      case 'MONTHLY':
        trigger = {
          channelId: 'default',
          day: new Date().getDate(), // Usar el día actual del mes
          hour,
          minute,
          repeats: true,
        };
        break;
      default:
        throw new Error('Frecuencia no válida');
    }

    // Para DAILY, WEEKLY, MONTHLY usar el trigger nativo con repetición
    const recurringNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger,
    });

    return recurringNotificationId;
  } catch (error: any) {

    throw new Error(`Error al programar notificación recurrente: ${error.message}`);
  }
};

/**
 * Cancelar una notificación programada
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error: any) {

    throw new Error(`Error al cancelar notificación: ${error.message}`);
  }
};

/**
 * Cancelar todas las notificaciones programadas
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error: any) {

    throw new Error(`Error al cancelar todas las notificaciones: ${error.message}`);
  }
};

/**
 * Obtener todas las notificaciones programadas
 */
export const getAllScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error: any) {

    return [];
  }
};

/**
 * Crear notificación inmediata (útil para testing)
 */
export const sendImmediateNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<string> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Inmediata
    });

    return notificationId;
  } catch (error: any) {

    throw new Error(`Error al enviar notificación inmediata: ${error.message}`);
  }
};

/**
 * Reprogramar la próxima notificación para frecuencias personalizadas
 * (cada 8h, 12h, 2 días, 3 días)
 * Esta función se llama automáticamente cuando se recibe una notificación
 */
const rescheduleIntervalNotification = async (notification: Notifications.Notification) => {
  try {
    const data = notification.request.content.data;
    
    // Verificar si es una notificación con frecuencia personalizada
    if (!data?.frequency) return;
    
    const frequency = data.frequency as string;
    const title = notification.request.content.title || 'Recordatorio';
    const body = notification.request.content.body || '';
    
    // Obtener la hora original del trigger
    const originalTrigger = notification.request.trigger;
    const now = new Date();
    let hour = now.getHours();
    let minute = now.getMinutes();
    
    if (originalTrigger && 'date' in originalTrigger && originalTrigger.date) {
      const triggerDate = new Date(originalTrigger.date);
      hour = triggerDate.getHours();
      minute = triggerDate.getMinutes();
    }
    
    let nextDate: Date | null = null;
    
    // Manejar frecuencias sub-diarias (cada 8h o 12h)
    if (frequency === 'EVERY_8_HOURS' || frequency === 'EVERY_12_HOURS') {
      const intervalHours = frequency === 'EVERY_8_HOURS' ? 8 : 12;
      nextDate = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    }
    // Manejar frecuencias de días (cada 2 o 3 días)
    else if ((frequency === 'EVERY_TWO_DAYS' || frequency === 'EVERY_THREE_DAYS') && data?.intervalDays) {
      const intervalDays = data.intervalDays as number;
      nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + intervalDays);
      nextDate.setHours(hour, minute, 0, 0);
    }
    
    if (!nextDate) return;
    
    // Programar la próxima notificación
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data },
        sound: true,
      },
      trigger: {
        channelId: 'default',
        date: nextDate,
      },
    });
    
    console.log(`[Notifications] Reprogramada notificación "${title}" para ${nextDate.toLocaleString()}`);
  } catch (error) {
    console.error('[Notifications] Error al reprogramar notificación:', error);
  }
};

/**
 * Inicializar el listener para reprogramar notificaciones cada 2/3 días
 * Debe llamarse al iniciar la app
 */
export const initializeNotificationListeners = (
  onNotificationResponse?: NotificationResponseCallback
) => {
  // Evitar duplicar los listeners
  if (notificationReceivedSubscription) {
    notificationReceivedSubscription.remove();
  }
  if (notificationResponseSubscription) {
    notificationResponseSubscription.remove();
  }
  
  // Guardar el callback para respuestas
  notificationResponseCallback = onNotificationResponse || null;
  
  // Escuchar cuando se recibe una notificación (en primer plano)
  notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      console.log('[Notifications] Notification received:', notification.request.content.title);
      // Reprogramar si es una notificación con frecuencia cada 2/3 días
      await rescheduleIntervalNotification(notification);
    }
  );
  
  // Escuchar cuando el usuario toca una notificación
  notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('[Notifications] User tapped notification:', response.notification.request.content.title);
      if (notificationResponseCallback) {
        notificationResponseCallback(response);
      }
    }
  );
  
  console.log('[Notifications] Listeners inicializados');
};

/**
 * Limpiar los listeners de notificaciones
 * Llamar al desmontar la app si es necesario
 */
export const cleanupNotificationListeners = () => {
  if (notificationReceivedSubscription) {
    notificationReceivedSubscription.remove();
    notificationReceivedSubscription = null;
  }
  if (notificationResponseSubscription) {
    notificationResponseSubscription.remove();
    notificationResponseSubscription = null;
  }
  notificationResponseCallback = null;
};

/**
 * Verificar si los permisos de notificaciones están concedidos
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const granted = status === 'granted';
    useNotificationStore.getState().setPermissionStatus(
      granted ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
    );
    return granted;
  } catch (error) {
    console.error('[Notifications] Error checking permissions:', error);
    return false;
  }
};

/**
 * Obtener el estado del badge
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('[Notifications] Error getting badge count:', error);
    return 0;
  }
};

/**
 * Establecer el badge de la app
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[Notifications] Error setting badge count:', error);
  }
};

/**
 * Limpiar el badge de la app
 */
export const clearBadge = async (): Promise<void> => {
  await setBadgeCount(0);
};

/**
 * Cancelar notificaciones por reminderId
 */
export const cancelNotificationsByReminderId = async (reminderId: string): Promise<void> => {
  try {
    const scheduled = await getAllScheduledNotifications();
    const toCancel = scheduled.filter(
      (n) => n.content.data?.reminderId === reminderId
    );
    
    await Promise.all(
      toCancel.map((n) => cancelNotification(n.identifier))
    );
    
    console.log(`[Notifications] Cancelled ${toCancel.length} notifications for reminder ${reminderId}`);
  } catch (error) {
    console.error('[Notifications] Error cancelling notifications by reminderId:', error);
  }
};

/**
 * Obtener estadísticas de notificaciones programadas
 */
export const getNotificationStats = async (): Promise<{
  total: number;
  byType: Record<string, number>;
  nextScheduled: Date | null;
}> => {
  try {
    const scheduled = await getAllScheduledNotifications();
    
    const byType: Record<string, number> = {};
    let nextScheduled: Date | null = null;
    
    for (const notification of scheduled) {
      // Contar por tipo
      const type = (notification.content.data?.reminderType as string) || 'OTHER';
      byType[type] = (byType[type] || 0) + 1;
      
      // Encontrar la próxima notificación
      const trigger = notification.trigger;
      if (trigger && 'date' in trigger && trigger.date) {
        const triggerDate = new Date(trigger.date);
        if (!nextScheduled || triggerDate < nextScheduled) {
          nextScheduled = triggerDate;
        }
      }
    }
    
    return {
      total: scheduled.length,
      byType,
      nextScheduled,
    };
  } catch (error) {
    console.error('[Notifications] Error getting stats:', error);
    return { total: 0, byType: {}, nextScheduled: null };
  }
};

/**
 * Reprogramar todas las notificaciones (útil después de cambiar preferencias)
 * Esta función obtiene los recordatorios activos y reprograma sus notificaciones
 */
export const refreshAllNotifications = async (
  getActiveReminders: () => Promise<Array<{
    id: string;
    title: string;
    petName?: string;
    type: ReminderType;
    scheduledAt: Date;
    frequency?: string;
  }>>
): Promise<void> => {
  try {
    const preferences = useNotificationStore.getState().preferences;
    
    if (!preferences.enabled) {
      await cancelAllNotifications();
      console.log('[Notifications] All notifications cancelled (notifications disabled)');
      return;
    }
    
    // Cancelar notificaciones existentes
    await cancelAllNotifications();
    
    // Obtener recordatorios activos y reprogramar
    const reminders = await getActiveReminders();
    
    for (const reminder of reminders) {
      const body = reminder.petName
        ? `${reminder.title} - ${reminder.petName}`
        : reminder.title;
      
      await scheduleNotification(
        '🔔 Recordatorio',
        body,
        reminder.scheduledAt,
        {
          reminderType: reminder.type,
          reminderId: reminder.id,
        }
      );
    }
    
    console.log(`[Notifications] Refreshed ${reminders.length} notifications`);
  } catch (error) {
    console.error('[Notifications] Error refreshing notifications:', error);
  }
};
