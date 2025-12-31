import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { FAB, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useTodayItems } from '../../hooks';
import { ReminderItem, VisitItem } from '../../components/ui';
import { Reminder, VetVisit, RootStackParamList } from '../../types';

type TodayScreenProp = NativeStackNavigationProp<RootStackParamList>;

const getReminderColor = (type: string): string => {
  switch (type) {
    case 'MEDICATION':
      return colors.primary;
    case 'HYGIENE':
      return '#10B981';
    case 'FOOD':
      return '#F59E0B';
    case 'VISIT':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const TodayScreen = () => {
  const navigation = useNavigation<TodayScreenProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { items: todayItems, loading, refreshing, refresh, toggleReminderComplete } = useTodayItems(user?.uid);

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
    toggleReminderComplete(reminderId);
  }, [toggleReminderComplete]);

  const handleNavigateToPets = useCallback(() => {
    (navigation as any).navigate('Pets');
  }, [navigation]);

  const handleVisitPress = useCallback((petId: string) => {
    // En el futuro, podrías navegar al detalle de la visita
    (navigation as any).navigate('Pets');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={styles.greeting}>Hola 👋</Text>
          <Text style={styles.date}>{capitalizedDate}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Tareas de Hoy</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : todayItems.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={80}
                color={colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>¡Todo tranquilo por aquí!</Text>
              <Text style={styles.emptySubtitle}>
                No tienes tareas programadas para hoy.{'\n'}
                Usa el botón + para agregar recordatorios.
              </Text>
            </View>
          ) : (
            /* Timeline de Tareas */
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
                      showConnectorLine={index < todayItems.length - 1}
                    />
                  );
                } else {
                  // Visita veterinaria
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

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddReminder}
        color={colors.surface}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  greeting: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  date: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
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
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
  },
});

export default TodayScreen;
