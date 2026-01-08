/**
 * Servicio de Notificaciones
 * 
 * Gestiona notificaciones locales con Expo Notifications:
 * - Solicitar permisos
 * - Programar notificaciones
 * - Cancelar notificaciones
 * - Reprogramación automática para frecuencias cada 2/3 días
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Subscription para el listener de notificaciones recibidas
let notificationReceivedSubscription: Notifications.Subscription | null = null;

/**
 * Configurar el comportamiento de las notificaciones
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
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

      return false;
    }

    // Configurar canal en Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Recordatorios',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    return true;
  } catch (error) {

    return false;
  }
};

/**
 * Programar una notificación local
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  scheduledDate: Date,
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
      trigger: {
        channelId: 'default',
        date: scheduledDate,
      },
    });

    return notificationId;
  } catch (error: any) {

    throw new Error(`Error al programar notificación: ${error.message}`);
  }
};

/**
 * Programar notificación recurrente
 * Para frecuencias no soportadas nativamente (cada 2/3 días, cada 8/12h), programamos solo la próxima notificación
 */
export const scheduleRecurringNotification = async (
  title: string,
  body: string,
  frequency: 'EVERY_8_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'EVERY_TWO_DAYS' | 'EVERY_THREE_DAYS' | 'WEEKLY' | 'MONTHLY',
  hour: number,
  minute: number,
  data?: any
): Promise<string> => {
  try {
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
export const initializeNotificationListeners = () => {
  // Evitar duplicar el listener
  if (notificationReceivedSubscription) {
    notificationReceivedSubscription.remove();
  }
  
  // Escuchar cuando se recibe una notificación
  notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      // Reprogramar si es una notificación con frecuencia cada 2/3 días
      await rescheduleIntervalNotification(notification);
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
};
