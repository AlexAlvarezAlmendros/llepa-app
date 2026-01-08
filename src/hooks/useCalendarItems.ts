import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { getUserReminders, updateReminder } from '../services/reminderService';
import { getUserVisits } from '../services/vetVisitService';
import { getUserPets } from '../services/petService';
import { Reminder, VetVisit, Pet } from '../types';
import { formatTime } from '../utils/dateUtils';
import { TodayItem } from './useTodayItems';

export interface MarkedDate {
  marked: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  dots?: Array<{ key: string; color: string }>;
}

export interface CalendarMarkedDates {
  [date: string]: MarkedDate;
}

interface UseCalendarItemsResult {
  items: TodayItem[];
  markedDates: CalendarMarkedDates;
  selectedDate: string;
  selectedDateItems: TodayItem[];
  loading: boolean;
  refreshing: boolean;
  setSelectedDate: (date: string) => void;
  refresh: () => Promise<void>;
  toggleReminderComplete: (reminderId: string) => Promise<void>;
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const getReminderColor = (type: string): string => {
  switch (type) {
    case 'MEDICATION':
      return '#4F46E5'; // primary/indigo
    case 'VET_APPOINTMENT':
      return '#EF4444'; // error/red
    case 'VACCINE':
      return '#10B981'; // emerald
    case 'ANTIPARASITIC':
      return '#8B5CF6'; // violet
    case 'HYGIENE':
      return '#06B6D4'; // cyan
    case 'GROOMING':
      return '#EC4899'; // pink
    case 'FOOD':
      return '#F59E0B'; // amber
    case 'WALK':
      return '#22C55E'; // green
    case 'TRAINING':
      return '#F97316'; // orange
    case 'VISIT':
      return '#EF4444'; // error/red
    case 'OTHER':
    default:
      return '#6B7280'; // gray
  }
};

/**
 * Genera ocurrencias de un recordatorio recurrente
 * @param reminder - El recordatorio original
 * @param startDate - Fecha de inicio para generar ocurrencias
 * @param endDate - Fecha límite para generar ocurrencias
 * @returns Array de fechas donde aplica el recordatorio
 */
const generateRecurringDates = (
  reminder: Reminder,
  startDate: Date,
  endDate: Date
): Date[] => {
  const dates: Date[] = [];
  const originalDate = reminder.scheduledAt.toDate();
  const originalDateNormalized = new Date(originalDate);
  originalDateNormalized.setHours(0, 0, 0, 0);
  
  // Si el recordatorio tiene fecha de fin, usarla como límite
  let effectiveEndDate = endDate;
  if (reminder.endDate) {
    const reminderEndDate = reminder.endDate.toDate();
    reminderEndDate.setHours(23, 59, 59, 999);
    if (reminderEndDate < effectiveEndDate) {
      effectiveEndDate = reminderEndDate;
    }
  }
  
  // Si no tiene frecuencia o es única, solo devolver la fecha original
  if (!reminder.frequency || reminder.frequency === 'ONCE') {
    if (originalDateNormalized >= startDate && originalDateNormalized <= effectiveEndDate) {
      dates.push(originalDateNormalized);
    }
    return dates;
  }

  // Calcular el intervalo en días según la frecuencia
  let intervalDays = 1;
  switch (reminder.frequency) {
    case 'EVERY_8_HOURS':
    case 'EVERY_12_HOURS':
    case 'DAILY':
      intervalDays = 1; // Frecuencias sub-diarias aparecen cada día
      break;
    case 'EVERY_TWO_DAYS':
      intervalDays = 2;
      break;
    case 'EVERY_THREE_DAYS':
      intervalDays = 3;
      break;
    case 'WEEKLY':
      intervalDays = 7;
      break;
    case 'MONTHLY':
      intervalDays = 30; // Aproximación
      break;
  }

  // Normalizar startDate
  const startDateNormalized = new Date(startDate);
  startDateNormalized.setHours(0, 0, 0, 0);

  // Generar fechas desde la fecha original hacia adelante
  let currentDate = new Date(originalDateNormalized);
  
  // Si la fecha original es anterior al rango, calcular la primera ocurrencia dentro del rango
  if (currentDate < startDateNormalized) {
    if (reminder.frequency === 'MONTHLY') {
      // Para mensual, encontrar el próximo mes que tenga el mismo día
      while (currentDate < startDateNormalized) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else {
      // Calcular cuántos intervalos completos han pasado
      const diffTime = startDateNormalized.getTime() - currentDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const intervalsToSkip = Math.floor(diffDays / intervalDays);
      currentDate = new Date(currentDate.getTime() + intervalsToSkip * intervalDays * 24 * 60 * 60 * 1000);
      
      // Asegurar que estamos en o después de startDate
      while (currentDate < startDateNormalized) {
        currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      }
    }
  }

  // Generar todas las ocurrencias dentro del rango
  while (currentDate <= effectiveEndDate) {
    dates.push(new Date(currentDate));
    
    if (reminder.frequency === 'MONTHLY') {
      // Para mensual, usar el mismo día del mes siguiente
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      currentDate = nextMonth;
    } else {
      currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }
  }

  return dates;
};

/**
 * Verifica si un recordatorio está completado para una fecha específica
 */
const isCompletedForDate = (reminder: Reminder, dateKey: string, instanceKey: string = ''): boolean => {
  // Para recordatorios únicos (ONCE), usar el campo completed tradicional
  if (!reminder.frequency || reminder.frequency === 'ONCE') {
    return reminder.completed;
  }
  
  // Para recordatorios recurrentes, verificar si la fecha está en completedDates
  // El formato incluye la hora para frecuencias sub-diarias
  const fullKey = dateKey + instanceKey;
  return reminder.completedDates?.includes(fullKey) ?? false;
};

/**
 * Genera las instancias sub-diarias para un recordatorio en una fecha específica
 */
const generateSubDailyInstances = (
  reminder: Reminder,
  occurrenceDate: Date
): { time: Date; instanceKey: string }[] => {
  const originalDate = reminder.scheduledAt.toDate();
  const instances: { time: Date; instanceKey: string }[] = [];
  
  if (!reminder.frequency || (reminder.frequency !== 'EVERY_8_HOURS' && reminder.frequency !== 'EVERY_12_HOURS')) {
    // Para recordatorios no sub-diarios, solo una instancia
    const timeWithOriginalHour = new Date(occurrenceDate);
    timeWithOriginalHour.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
    return [{ time: timeWithOriginalHour, instanceKey: '' }];
  }
  
  const intervalHours = reminder.frequency === 'EVERY_8_HOURS' ? 8 : 12;
  const startHour = originalDate.getHours();
  const startMinute = originalDate.getMinutes();
  
  // Generar las horas del día basándose en el intervalo
  for (let i = 0; i < 24 / intervalHours; i++) {
    const hour = (startHour + i * intervalHours) % 24;
    const instanceTime = new Date(occurrenceDate);
    instanceTime.setHours(hour, startMinute, 0, 0);
    
    instances.push({
      time: instanceTime,
      instanceKey: `-${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
    });
  }
  
  return instances.sort((a, b) => a.time.getTime() - b.time.getTime());
};

/**
 * Crea TodayItems para una ocurrencia específica de un recordatorio
 * Para frecuencias sub-diarias, genera múltiples items
 */
const createReminderOccurrences = (
  reminder: Reminder,
  occurrenceDate: Date,
  petName?: string
): TodayItem[] => {
  const dateKey = formatDateKey(occurrenceDate);
  const instances = generateSubDailyInstances(reminder, occurrenceDate);
  
  return instances.map(({ time, instanceKey }) => {
    const isCompleted = isCompletedForDate(reminder, dateKey, instanceKey);
    
    return {
      id: `${reminder.id}_${dateKey}${instanceKey}`,
      type: 'reminder' as const,
      time: formatTime(time),
      title: reminder.title,
      subtitle: petName,
      icon: getReminderIcon(reminder.type),
      completed: isCompleted,
      data: {
        ...reminder,
        _occurrenceDate: occurrenceDate,
        _instanceKey: instanceKey,
        _instanceTime: time,
      } as Reminder & { _occurrenceDate?: Date; _instanceKey?: string; _instanceTime?: Date },
    };
  });
};

export const useCalendarItems = (userId: string | undefined): UseCalendarItemsResult => {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey(new Date()));

  const loadCalendarData = useCallback(async (isRefreshing = false) => {
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

      // Definir el rango de fechas para el calendario (3 meses atrás, 6 meses adelante)
      const today = new Date();
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 6);
      endDate.setHours(23, 59, 59, 999);

      // Expandir recordatorios recurrentes
      const reminderItems: TodayItem[] = [];
      
      allReminders.forEach((reminder) => {
        const pet = reminder.petId ? petsMap.get(reminder.petId) : null;
        const recurringDates = generateRecurringDates(reminder, startDate, endDate);
        
        recurringDates.forEach((occurrenceDate) => {
          // createReminderOccurrences devuelve un array (múltiples instancias para sub-diarias)
          const occurrenceItems = createReminderOccurrences(reminder, occurrenceDate, pet?.name);
          reminderItems.push(...occurrenceItems);
        });
      });

      const visitItems: TodayItem[] = allVisits.map((visit) => {
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
        const getItemTime = (item: TodayItem): Date => {
          if (item.type === 'reminder') {
            const reminderData = item.data as Reminder & { _occurrenceDate?: Date; _instanceTime?: Date };
            // Usar _instanceTime si existe (para frecuencias sub-diarias), luego _occurrenceDate, luego scheduledAt
            return reminderData._instanceTime || reminderData._occurrenceDate || reminderData.scheduledAt.toDate();
          }
          return (item.data as VetVisit).date.toDate();
        };
        
        return getItemTime(a).getTime() - getItemTime(b).getTime();
      });

      setItems(allItems);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los datos del calendario');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Generar fechas marcadas para el calendario
  const markedDates = useMemo((): CalendarMarkedDates => {
    const dates: CalendarMarkedDates = {};

    items.forEach((item) => {
      let itemDate: Date;
      
      if (item.type === 'reminder') {
        const reminderData = item.data as Reminder & { _occurrenceDate?: Date };
        // Usar la fecha de ocurrencia si existe, sino la fecha original
        itemDate = reminderData._occurrenceDate || reminderData.scheduledAt.toDate();
      } else {
        itemDate = (item.data as VetVisit).date.toDate();
      }
      
      const dateKey = formatDateKey(itemDate);
      const itemType = item.type === 'reminder' ? (item.data as Reminder).type : 'VISIT';
      const dotColor = getReminderColor(itemType);

      if (!dates[dateKey]) {
        dates[dateKey] = {
          marked: true,
          dots: [{ key: item.id, color: dotColor }],
        };
      } else {
        // Agregar más puntos si ya hay eventos en esa fecha
        const existingDots = dates[dateKey].dots || [];
        // Limitar a 3 puntos máximo
        if (existingDots.length < 3) {
          dates[dateKey].dots = [...existingDots, { key: item.id, color: dotColor }];
        }
      }
    });

    // Marcar la fecha seleccionada
    if (dates[selectedDate]) {
      dates[selectedDate] = {
        ...dates[selectedDate],
        selected: true,
        selectedColor: '#4F46E5',
      };
    } else {
      dates[selectedDate] = {
        marked: false,
        selected: true,
        selectedColor: '#4F46E5',
      };
    }

    return dates;
  }, [items, selectedDate]);

  // Filtrar items por fecha seleccionada
  const selectedDateItems = useMemo((): TodayItem[] => {
    return items.filter((item) => {
      let itemDate: Date;
      
      if (item.type === 'reminder') {
        const reminderData = item.data as Reminder & { _occurrenceDate?: Date };
        itemDate = reminderData._occurrenceDate || reminderData.scheduledAt.toDate();
      } else {
        itemDate = (item.data as VetVisit).date.toDate();
      }
      
      return formatDateKey(itemDate) === selectedDate;
    }).sort((a, b) => {
      const getItemTime = (item: TodayItem): Date => {
        if (item.type === 'reminder') {
          const reminderData = item.data as Reminder & { _occurrenceDate?: Date };
          const occDate = reminderData._occurrenceDate || reminderData.scheduledAt.toDate();
          const originalDate = reminderData.scheduledAt.toDate();
          // Usar la hora original con la fecha de ocurrencia
          occDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
          return occDate;
        }
        return (item.data as VetVisit).date.toDate();
      };
      
      return getItemTime(a).getTime() - getItemTime(b).getTime();
    });
  }, [items, selectedDate]);

  const refresh = async () => {
    setRefreshing(true);
    await loadCalendarData(true);
  };

  const toggleReminderComplete = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.type !== 'reminder') return;

    const reminderData = item.data as Reminder & { _occurrenceDate?: Date; _instanceKey?: string };
    const actualReminderId = reminderData.id;
    const instanceKey = reminderData._instanceKey || '';
    const isRecurring = reminderData.frequency && reminderData.frequency !== 'ONCE';
    
    // Obtener la fecha de la ocurrencia con el instanceKey para frecuencias sub-diarias
    const occurrenceDate = reminderData._occurrenceDate || reminderData.scheduledAt.toDate();
    const dateKey = formatDateKey(occurrenceDate) + instanceKey;
    
    const currentlyCompleted = item.completed ?? false;
    const newCompleted = !currentlyCompleted;

    if (isRecurring) {
      // Para recordatorios recurrentes, actualizar solo esta fecha específica
      const currentCompletedDates = reminderData.completedDates || [];
      let newCompletedDates: string[];
      
      if (newCompleted) {
        // Añadir la fecha si no existe
        newCompletedDates = [...currentCompletedDates, dateKey];
      } else {
        // Quitar la fecha
        newCompletedDates = currentCompletedDates.filter(d => d !== dateKey);
      }

      // Actualizar solo este item específico en la UI
      setItems(prevItems =>
        prevItems.map(i => {
          if (i.id === itemId) {
            const updatedItem: TodayItem = { 
              ...i, 
              completed: newCompleted, 
              data: { ...i.data, completedDates: newCompletedDates } as Reminder
            };
            return updatedItem;
          }
          return i;
        })
      );

      try {
        await updateReminder(userId!, actualReminderId, { completedDates: newCompletedDates });
      } catch (error) {
        // Revertir el cambio en caso de error
        setItems(prevItems =>
          prevItems.map(i => {
            if (i.id === itemId) {
              const revertedItem: TodayItem = { 
                ...i, 
                completed: currentlyCompleted, 
                data: { ...i.data, completedDates: currentCompletedDates } as Reminder
              };
              return revertedItem;
            }
            return i;
          })
        );
        Alert.alert('Error', 'No se pudo actualizar el recordatorio');
      }
    } else {
      // Para recordatorios únicos (ONCE), usar el comportamiento tradicional
      setItems(prevItems =>
        prevItems.map(i => {
          if (i.id === itemId) {
            const updatedItem: TodayItem = { 
              ...i, 
              completed: newCompleted, 
              data: { ...i.data, completed: newCompleted } as Reminder
            };
            return updatedItem;
          }
          return i;
        })
      );

      try {
        await updateReminder(userId!, actualReminderId, { completed: newCompleted });
      } catch (error) {
        setItems(prevItems =>
          prevItems.map(i => {
            if (i.id === itemId) {
              const revertedItem: TodayItem = { 
                ...i, 
                completed: currentlyCompleted, 
                data: { ...i.data, completed: currentlyCompleted } as Reminder
              };
              return revertedItem;
            }
            return i;
          })
        );
        Alert.alert('Error', 'No se pudo actualizar el recordatorio');
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
    }, [loadCalendarData])
  );

  return {
    items,
    markedDates,
    selectedDate,
    selectedDateItems,
    loading,
    refreshing,
    setSelectedDate,
    refresh,
    toggleReminderComplete,
  };
};
