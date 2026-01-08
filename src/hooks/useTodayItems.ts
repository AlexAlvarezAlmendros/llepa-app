import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { getUserReminders, updateReminder } from '../services/reminderService';
import { getUserVisits } from '../services/vetVisitService';
import { getUserPets } from '../services/petService';
import { Reminder, VetVisit, Pet } from '../types';
import { formatTime } from '../utils/dateUtils';

export interface TodayItem {
  id: string;
  type: 'reminder' | 'visit';
  time: string;
  title: string;
  subtitle?: string;
  icon: string;
  completed?: boolean;
  data: Reminder | VetVisit;
}

interface UseTodayItemsResult {
  items: TodayItem[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  toggleReminderComplete: (reminderId: string) => Promise<void>;
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Verifica si un recordatorio aplica para la fecha de hoy basándose en su frecuencia
 */
const reminderAppliesToday = (reminder: Reminder): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);
  
  const originalDate = reminder.scheduledAt.toDate();
  const originalDateNormalized = new Date(originalDate);
  originalDateNormalized.setHours(0, 0, 0, 0);
  const originalKey = formatDateKey(originalDate);
  
  // Si tiene fecha de fin y ya pasó, no aplica
  if (reminder.endDate) {
    const endDate = reminder.endDate.toDate();
    endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
    if (today > endDate) {
      return false;
    }
  }
  
  // Si es la fecha original, siempre aplica
  if (originalKey === todayKey) {
    return true;
  }
  
  // Si no tiene frecuencia o es única, solo aplica en la fecha original
  if (!reminder.frequency || reminder.frequency === 'ONCE') {
    return false;
  }
  
  // Si la fecha original es en el futuro, no aplica hoy
  if (originalDateNormalized > today) {
    return false;
  }
  
  // Calcular diferencia en días de forma precisa (usando fechas UTC para evitar problemas de zona horaria)
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const originalUTC = Date.UTC(originalDateNormalized.getFullYear(), originalDateNormalized.getMonth(), originalDateNormalized.getDate());
  const diffDays = Math.round((todayUTC - originalUTC) / (1000 * 60 * 60 * 24));
  
  switch (reminder.frequency) {
    case 'EVERY_8_HOURS':
    case 'EVERY_12_HOURS':
      // Las frecuencias sub-diarias aplican todos los días después de la fecha de inicio
      return true;
    case 'DAILY':
      return true; // Todos los días después de la fecha original
    case 'EVERY_TWO_DAYS':
      return diffDays % 2 === 0; // Cada 2 días (día 0, 2, 4, 6...)
    case 'EVERY_THREE_DAYS':
      return diffDays % 3 === 0; // Cada 3 días (día 0, 3, 6, 9...)
    case 'WEEKLY':
      return diffDays % 7 === 0; // Cada 7 días
    case 'MONTHLY':
      // Verificar si es el mismo día del mes
      return originalDate.getDate() === today.getDate();
    default:
      return false;
  }
};

/**
 * Genera las instancias de un recordatorio sub-diario para hoy
 * Para recordatorios cada 8h o 12h, genera múltiples instancias con diferentes horarios
 */
const generateSubDailyInstances = (reminder: Reminder, todayDate: Date): { time: Date; instanceKey: string }[] => {
  const originalDate = reminder.scheduledAt.toDate();
  const instances: { time: Date; instanceKey: string }[] = [];
  
  if (!reminder.frequency || (reminder.frequency !== 'EVERY_8_HOURS' && reminder.frequency !== 'EVERY_12_HOURS')) {
    // Para recordatorios no sub-diarios, solo una instancia
    const todayWithOriginalTime = new Date(todayDate);
    todayWithOriginalTime.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
    return [{ time: todayWithOriginalTime, instanceKey: '' }];
  }
  
  const intervalHours = reminder.frequency === 'EVERY_8_HOURS' ? 8 : 12;
  const startHour = originalDate.getHours();
  const startMinute = originalDate.getMinutes();
  
  // Generar las horas del día basándose en el intervalo
  // Por ejemplo, si empieza a las 8:00 y es cada 8h: 8:00, 16:00, 00:00 (del día siguiente)
  for (let i = 0; i < 24 / intervalHours; i++) {
    const hour = (startHour + i * intervalHours) % 24;
    const instanceTime = new Date(todayDate);
    instanceTime.setHours(hour, startMinute, 0, 0);
    
    // Solo incluir si ya pasó la fecha de inicio del tratamiento
    const originalDateNormalized = new Date(originalDate);
    originalDateNormalized.setHours(0, 0, 0, 0);
    
    if (todayDate >= originalDateNormalized || instanceTime >= originalDate) {
      instances.push({ 
        time: instanceTime, 
        instanceKey: `-${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}` 
      });
    }
  }
  
  return instances.sort((a, b) => a.time.getTime() - b.time.getTime());
};

/**
 * Verifica si un recordatorio recurrente está completado para una fecha y hora específica
 */
const isCompletedForDate = (reminder: Reminder, date: Date, instanceKey: string = ''): boolean => {
  // Para recordatorios únicos, usar el campo completed
  if (!reminder.frequency || reminder.frequency === 'ONCE') {
    return reminder.completed || false;
  }
  
  // Para recordatorios recurrentes, verificar en completedDates
  // El formato incluye la hora para frecuencias sub-diarias: YYYY-MM-DD-HH:MM
  const dateKey = formatDateKey(date) + instanceKey;
  return reminder.completedDates?.includes(dateKey) || false;
};

export const useTodayItems = (userId: string | undefined): UseTodayItemsResult => {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTodayData = useCallback(async (isRefreshing = false) => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      const [allReminders, allVisits, pets] = await Promise.all([
        getUserReminders(userId),
        getUserVisits(userId),
        getUserPets(userId),
      ]);

      const petsMap = new Map(pets.map(pet => [pet.id, pet]));

      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const tomorrowDate = new Date(todayDate);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);

      const todayVisits = allVisits.filter((visit) => {
        const visitDate = visit.date.toDate();
        return visitDate >= todayDate && visitDate < tomorrowDate;
      });

      // Filtrar recordatorios que aplican para hoy (incluyendo recurrentes)
      const todayReminders = allReminders.filter(reminderAppliesToday);

      // Generar items, expandiendo los recordatorios sub-diarios en múltiples instancias
      const reminderItems: TodayItem[] = [];
      
      todayReminders.forEach((reminder) => {
        const pet = reminder.petId ? petsMap.get(reminder.petId) : null;
        const instances = generateSubDailyInstances(reminder, todayDate);
        
        instances.forEach(({ time, instanceKey }) => {
          const isCompleted = isCompletedForDate(reminder, todayDate, instanceKey);
          
          reminderItems.push({
            id: reminder.id + instanceKey, // ID único para cada instancia
            type: 'reminder' as const,
            time: formatTime(time),
            title: reminder.title,
            subtitle: pet?.name,
            icon: getReminderIcon(reminder.type),
            completed: isCompleted,
            data: { ...reminder, _instanceKey: instanceKey, _instanceTime: time } as Reminder & { _instanceKey: string; _instanceTime: Date },
          });
        });
      });

      const visitItems: TodayItem[] = todayVisits.map((visit) => {
        const pet = visit.petId ? petsMap.get(visit.petId) : null;
        return {
          id: visit.id,
          type: 'visit' as const,
          time: formatTime(visit.date.toDate()),
          title: visit.reason || 'Visita veterinaria',
          subtitle: pet?.name,
          icon: 'medical-bag',
          data: visit,
        };
      });

      const allItems = [...reminderItems, ...visitItems].sort((a, b) => {
        // Para recordatorios, usar _instanceTime si existe (para frecuencias sub-diarias)
        const getTime = (item: TodayItem): Date => {
          if (item.type === 'reminder') {
            const reminderData = item.data as Reminder & { _instanceTime?: Date };
            return reminderData._instanceTime || reminderData.scheduledAt.toDate();
          }
          return (item.data as VetVisit).date.toDate();
        };
        
        return getTime(a).getTime() - getTime(b).getTime();
      });

      setItems(allItems);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar las tareas del día');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const refresh = async () => {
    setRefreshing(true);
    await loadTodayData(true);
  };

  const toggleReminderComplete = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.type !== 'reminder') return;

    const reminderData = item.data as Reminder & { _instanceKey?: string };
    const instanceKey = reminderData._instanceKey || '';
    // El ID real del recordatorio en Firestore (sin el instanceKey)
    const actualReminderId = reminderData.id;
    
    const isRecurring = reminderData.frequency && reminderData.frequency !== 'ONCE';
    const currentlyCompleted = item.completed;
    const newCompleted = !currentlyCompleted;
    
    // Obtener la fecha de hoy con el instanceKey para frecuencias sub-diarias
    const today = new Date();
    const dateKey = formatDateKey(today) + instanceKey;

    if (isRecurring) {
      // Para recordatorios recurrentes, actualizar completedDates
      const currentCompletedDates = reminderData.completedDates || [];
      let newCompletedDates: string[];
      
      if (newCompleted) {
        // Añadir la fecha si no existe
        newCompletedDates = [...currentCompletedDates, dateKey];
      } else {
        // Quitar la fecha
        newCompletedDates = currentCompletedDates.filter(d => d !== dateKey);
      }

      // Actualizar la UI (solo el item específico)
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === itemId
            ? { ...i, completed: newCompleted, data: { ...i.data, completedDates: newCompletedDates } }
            : i
        )
      );

      try {
        await updateReminder(userId!, actualReminderId, { completedDates: newCompletedDates });
      } catch (error) {
        // Revertir en caso de error
        setItems(prevItems =>
          prevItems.map(i =>
            i.id === itemId
              ? { ...i, completed: currentlyCompleted, data: { ...i.data, completedDates: currentCompletedDates } }
              : i
          )
        );
        Alert.alert('Error', 'No se pudo actualizar el recordatorio');
      }
    } else {
      // Para recordatorios únicos, usar el campo completed
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === itemId
            ? { ...i, completed: newCompleted, data: { ...i.data, completed: newCompleted } }
            : i
        )
      );

      try {
        await updateReminder(userId!, actualReminderId, { completed: newCompleted });
      } catch (error) {
        setItems(prevItems =>
          prevItems.map(i =>
            i.id === itemId
              ? { ...i, completed: !newCompleted, data: { ...i.data, completed: !newCompleted } }
              : i
          )
        );
        Alert.alert('Error', 'No se pudo actualizar el recordatorio');
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [loadTodayData])
  );

  return {
    items,
    loading,
    refreshing,
    refresh,
    toggleReminderComplete,
  };
};

const getReminderIcon = (type: string): string => {
  switch (type) {
    case 'MEDICATION':
      return 'pill';
    case 'VET_APPOINTMENT':
      return 'hospital-building';
    case 'VACCINE':
      return 'needle';
    case 'ANTIPARASITIC':
      return 'bug';
    case 'HYGIENE':
      return 'shower';
    case 'GROOMING':
      return 'content-cut';
    case 'FOOD':
      return 'food';
    case 'WALK':
      return 'walk';
    case 'TRAINING':
      return 'dog-side';
    case 'OTHER':
    default:
      return 'bell';
  }
};
