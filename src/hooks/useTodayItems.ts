import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { getTodayReminders, updateReminder } from '../services/reminderService';
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

      const [todayReminders, allVisits, pets] = await Promise.all([
        getTodayReminders(userId),
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

      const reminderItems: TodayItem[] = todayReminders.map((reminder) => {
        const pet = reminder.petId ? petsMap.get(reminder.petId) : null;
        return {
          id: reminder.id,
          type: 'reminder' as const,
          time: formatTime(reminder.scheduledAt.toDate()),
          title: reminder.title,
          subtitle: pet?.name,
          icon: getReminderIcon(reminder.type),
          completed: reminder.completed,
          data: reminder,
        };
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
        const timeA = a.type === 'reminder' 
          ? (a.data as Reminder).scheduledAt.toDate() 
          : (a.data as VetVisit).date.toDate();
        const timeB = b.type === 'reminder' 
          ? (b.data as Reminder).scheduledAt.toDate() 
          : (b.data as VetVisit).date.toDate();
        return timeA.getTime() - timeB.getTime();
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

  const toggleReminderComplete = async (reminderId: string) => {
    const item = items.find(i => i.id === reminderId);
    if (!item || item.type !== 'reminder') return;

    const reminder = item.data as Reminder;
    const newCompleted = !reminder.completed;

    setItems(prevItems =>
      prevItems.map(i =>
        i.id === reminderId
          ? { ...i, completed: newCompleted, data: { ...i.data, completed: newCompleted } }
          : i
      )
    );

    try {
      await updateReminder(userId!, reminderId, { completed: newCompleted });
    } catch (error) {
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === reminderId
            ? { ...i, completed: !newCompleted, data: { ...i.data, completed: !newCompleted } }
            : i
        )
      );
      Alert.alert('Error', 'No se pudo actualizar el recordatorio');
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
    case 'HYGIENE':
      return 'shower';
    case 'FOOD':
      return 'food';
    case 'OTHER':
      return 'bell';
    default:
      return 'bell';
  }
};
