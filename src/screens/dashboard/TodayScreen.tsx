import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { FAB, ActivityIndicator, useTheme, Icon, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useTodayItems, useCalendarItems } from '../../hooks';
import { ReminderItem, VisitItem, CalendarView } from '../../components/ui';
import { Reminder, VetVisit, RootStackParamList } from '../../types';
import { deleteReminder } from '../../services/reminderService';
import { useDialog } from '../../contexts/DialogContext';

type TodayScreenProp = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'agenda' | 'calendar';

const TodayScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<TodayScreenProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const { showError, showDestructiveConfirm } = useDialog();

  // Hook para vista de agenda (hoy)
  const { 
    items: todayItems, 
    loading: todayLoading, 
    refreshing: todayRefreshing, 
    refresh: todayRefresh, 
    toggleReminderComplete: todayToggle 
  } = useTodayItems(user?.uid);

  // Hook para vista de calendario
  const {
    markedDates,
    selectedDate,
    selectedDateItems,
    loading: calendarLoading,
    refreshing: calendarRefreshing,
    setSelectedDate,
    refresh: calendarRefresh,
    toggleReminderComplete: calendarToggle,
  } = useCalendarItems(user?.uid);

  const getReminderColor = useCallback((type: string): string => {
    switch (type) {
      case 'MEDICATION':
        return '#4F46E5'; // indigo
      case 'VET_APPOINTMENT':
        return '#EF4444'; // red
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
        return '#EF4444'; // red
      case 'OTHER':
      default:
        return '#6B7280'; // gray
    }
  }, []);

  // Memoizar fecha formateada
  const capitalizedDate = useMemo(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }, []);

  // Memoizar handlers con useCallback para prevenir re-renders innecesarios
  const handleAddReminder = useCallback(() => {
    navigation.navigate('AddReminder', {});
  }, [navigation]);

  const handleToggleReminder = useCallback((reminderId: string) => {
    if (viewMode === 'agenda') {
      todayToggle(reminderId);
    } else {
      calendarToggle(reminderId);
    }
  }, [viewMode, todayToggle, calendarToggle]);

  const handleNavigateToPets = useCallback(() => {
    (navigation as any).navigate('Pets');
  }, [navigation]);

  const handleVisitPress = useCallback((petId: string) => {
    (navigation as any).navigate('Pets');
  }, [navigation]);

  const handleViewModeChange = useCallback((value: string) => {
    setViewMode(value as ViewMode);
  }, []);

  const handleEditReminder = useCallback((reminderId: string) => {
    navigation.navigate('AddReminder', { reminderId });
  }, [navigation]);

  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    if (!user) return;
    
    try {
      await deleteReminder(user.uid, reminderId);
      // Refrescar la lista después de eliminar
      if (viewMode === 'agenda') {
        todayRefresh();
      } else {
        calendarRefresh();
      }
    } catch (error) {
      showError('Error', 'No se pudo eliminar el recordatorio');
    }
  }, [user, viewMode, todayRefresh, calendarRefresh, showError]);

  const handleRequestDeleteReminder = useCallback((reminderId: string, title: string) => {
    showDestructiveConfirm(
      'Eliminar recordatorio',
      `¿Estás seguro de que quieres eliminar "${title}"?`,
      () => handleDeleteReminder(reminderId),
      undefined,
      'Eliminar',
      'Cancelar'
    );
  }, [showDestructiveConfirm, handleDeleteReminder]);

  // Vista de Agenda (Timeline)
  const renderAgendaView = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={todayRefreshing} onRefresh={todayRefresh} />
        }
      >
        <View style={styles.body}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Tareas de Hoy
          </Text>

          {todayLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : todayItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                source="calendar-check"
                size={80}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                ¡Todo tranquilo por aquí!
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                No tienes tareas programadas para hoy.{'\n'}
                Usa el botón + para agregar recordatorios.
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {todayItems.map((item, index) => {
                if (item.type === 'reminder') {
                  const reminder = item.data as Reminder;
                  const reminderColor = getReminderColor(reminder.type);

                  return (
                    <ReminderItem
                      key={`reminder-${item.id}`}
                      item={item}
                      reminderColor={reminderColor}
                      onToggleComplete={handleToggleReminder}
                      onEdit={handleEditReminder}
                      onDelete={handleDeleteReminder}
                      onRequestDelete={handleRequestDeleteReminder}
                      showConnectorLine={index < todayItems.length - 1}
                    />
                  );
                } else {
                  const visit = item.data as VetVisit;
                  const visitColor = getReminderColor('VISIT');

                  return (
                    <VisitItem
                      key={`visit-${item.id}`}
                      item={item}
                      visitColor={visitColor}
                      onPress={handleVisitPress}
                      showConnectorLine={index < todayItems.length - 1}
                    />
                  );
                }
              })}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg, backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.greeting, { color: theme.colors.onSurface }]}>Hola 👋</Text>
        <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>{capitalizedDate}</Text>

        {/* View Mode Toggle */}
        <View style={styles.segmentedContainer}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={handleViewModeChange}
            buttons={[
              {
                value: 'agenda',
                label: 'Agenda',
                icon: 'format-list-bulleted',
              },
              {
                value: 'calendar',
                label: 'Calendario',
                icon: 'calendar-month',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'agenda' ? (
        renderAgendaView()
      ) : (
        <CalendarView
          markedDates={markedDates}
          selectedDate={selectedDate}
          selectedDateItems={selectedDateItems}
          loading={calendarLoading}
          refreshing={calendarRefreshing}
          onDateSelect={setSelectedDate}
          onRefresh={calendarRefresh}
          onToggleComplete={handleToggleReminder}
          onVisitPress={handleVisitPress}
          onEditReminder={handleEditReminder}
          onDeleteReminder={handleDeleteReminder}
          onRequestDelete={handleRequestDeleteReminder}
        />
      )}

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleAddReminder}
        color={theme.colors.onPrimary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    padding: spacing.lg,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 16,
    marginTop: spacing.xs,
  },
  segmentedContainer: {
    marginTop: spacing.md,
  },
  segmentedButtons: {
    // Los estilos de SegmentedButtons ya manejan su apariencia
  },
  body: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  timeline: {
    marginBottom: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
});

export default TodayScreen;
