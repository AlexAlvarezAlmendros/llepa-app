/**
 * Servicio de Notificaciones
 * 
 * Gestiona notificaciones locales con Expo Notifications:
 * - Solicitar permisos
 * - Programar notificaciones
 * - Cancelar notificaciones
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
 */
export const scheduleRecurringNotification = async (
  title: string,
  body: string,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  hour: number,
  minute: number,
  data?: any
): Promise<string> => {
  try {
    let trigger: any;

    switch (frequency) {
      case 'DAILY':
        trigger = {
          channelId: 'default',
          hour,
          minute,
          repeats: true,
        };
        break;
      case 'WEEKLY':
        trigger = {
          channelId: 'default',
          weekday: 1, // Lunes (1 = Monday)
          hour,
          minute,
          repeats: true,
        };
        break;
      case 'MONTHLY':
        trigger = {
          channelId: 'default',
          day: 1, // Día 1 del mes
          hour,
          minute,
          repeats: true,
        };
        break;
      default:
        throw new Error('Frecuencia no válida');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger,
    });

    return notificationId;
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
