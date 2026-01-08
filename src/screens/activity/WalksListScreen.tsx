import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  useTheme,
  FAB,
  Chip,
  Icon,
} from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useDialog } from '../../contexts/DialogContext';
import { PetsStackParamList, Walk, WalkType } from '../../types';
import {
  getPetWalks,
  deleteWalk,
  getWalkStats,
} from '../../services/walkService';
import { formatDate } from '../../utils/dateUtils';

type WalksListRouteProp = RouteProp<PetsStackParamList, 'WalksList'>;
type WalksListNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'WalksList'>;

const WALK_TYPE_LABELS: Record<WalkType, string> = {
  SHORT: 'Corto',
  MEDIUM: 'Medio',
  LONG: 'Largo',
  HIKE: 'Excursión',
  RUN: 'Carrera',
  PLAY: 'Juego',
};

const WALK_TYPE_ICONS: Record<WalkType, string> = {
  SHORT: 'walk',
  MEDIUM: 'hiking',
  LONG: 'map-marker-distance',
  HIKE: 'terrain',
  RUN: 'run-fast',
  PLAY: 'dog',
};

const MOOD_ICONS: Record<string, { icon: string; color: string }> = {
  HAPPY: { icon: 'emoticon-happy', color: '#10B981' },
  NORMAL: { icon: 'emoticon-neutral', color: '#6B7280' },
  TIRED: { icon: 'emoticon-sad', color: '#F59E0B' },
  EXCITED: { icon: 'emoticon-excited', color: '#8B5CF6' },
};

const WalksListScreen = () => {
  const theme = useTheme();
  const route = useRoute<WalksListRouteProp>();
  const navigation = useNavigation<WalksListNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { showConfirm, showSuccess, showError } = useDialog();

  const { petId } = route.params;
  const pet = pets.find((p) => p.id === petId);

  const [walks, setWalks] = useState<Walk[]>([]);
  const [stats, setStats] = useState({
    totalWalks: 0,
    totalMinutes: 0,
    totalDistance: 0,
    averageMinutes: 0,
    walksByDay: [] as { date: string; count: number; minutes: number }[],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [walksData, statsData] = await Promise.all([
        getPetWalks(user.uid, petId),
        getWalkStats(user.uid, petId, 7),
      ]);
      setWalks(walksData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching walks:', error);
      showError('Error', 'No se pudieron cargar los paseos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, petId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = (walk: Walk) => {
    showConfirm(
      'Eliminar paseo',
      '¿Seguro que quieres eliminar este paseo?',
      async () => {
        if (!user) return;
        try {
          await deleteWalk(user.uid, petId, walk.id);
          showSuccess('Eliminado', 'El paseo se ha eliminado correctamente');
          fetchData();
        } catch (error) {
          showError('Error', 'No se pudo eliminar el paseo');
        }
      }
    );
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const renderWalkItem = ({ item }: { item: Walk }) => {
    const moodInfo = item.mood ? MOOD_ICONS[item.mood] : null;

    return (
      <Card style={styles.walkCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddWalk', { petId, walkId: item.id })}
          onLongPress={() => handleDelete(item)}
        >
          <View style={styles.walkHeader}>
            <View style={styles.walkTypeContainer}>
              <Icon
                source={WALK_TYPE_ICONS[item.type]}
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.walkInfo}>
              <Text style={[styles.walkType, { color: theme.colors.onSurface }]}>
                {WALK_TYPE_LABELS[item.type]}
              </Text>
              <Text style={[styles.walkDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(item.date.toDate())}
              </Text>
            </View>
            {moodInfo && (
              <Icon source={moodInfo.icon} size={24} color={moodInfo.color} />
            )}
          </View>

          <View style={styles.statsRow}>
            <Chip icon="clock-outline" mode="outlined" compact style={styles.statChip}>
              {formatDuration(item.durationMinutes)}
            </Chip>
            {item.distanceKm && (
              <Chip icon="map-marker-distance" mode="outlined" compact style={styles.statChip}>
                {item.distanceKm.toFixed(1)} km
              </Chip>
            )}
            {item.steps && (
              <Chip icon="shoe-print" mode="outlined" compact style={styles.statChip}>
                {item.steps.toLocaleString()} pasos
              </Chip>
            )}
          </View>

          {item.notes && (
            <Text style={[styles.notes, { color: theme.colors.onSurfaceVariant }]}>
              {item.notes}
            </Text>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Estadísticas de la semana */}
      <Card style={styles.statsCard}>
        <Text style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
          🚶 Esta semana
        </Text>
        <View style={styles.weekStatsRow}>
          <View style={styles.weekStatItem}>
            <Icon source="walk" size={24} color={theme.colors.primary} />
            <Text style={[styles.weekStatNumber, { color: theme.colors.primary }]}>
              {stats.totalWalks}
            </Text>
            <Text style={[styles.weekStatLabel, { color: theme.colors.onSurfaceVariant }]}>
              Paseos
            </Text>
          </View>
          <View style={styles.weekStatItem}>
            <Icon source="clock-outline" size={24} color={theme.colors.secondary} />
            <Text style={[styles.weekStatNumber, { color: theme.colors.secondary }]}>
              {formatDuration(stats.totalMinutes)}
            </Text>
            <Text style={[styles.weekStatLabel, { color: theme.colors.onSurfaceVariant }]}>
              Total
            </Text>
          </View>
          <View style={styles.weekStatItem}>
            <Icon source="chart-line" size={24} color={theme.colors.tertiary} />
            <Text style={[styles.weekStatNumber, { color: theme.colors.tertiary }]}>
              {stats.averageMinutes} min
            </Text>
            <Text style={[styles.weekStatLabel, { color: theme.colors.onSurfaceVariant }]}>
              Promedio
            </Text>
          </View>
          {stats.totalDistance > 0 && (
            <View style={styles.weekStatItem}>
              <Icon source="map-marker-distance" size={24} color="#10B981" />
              <Text style={[styles.weekStatNumber, { color: '#10B981' }]}>
                {stats.totalDistance.toFixed(1)} km
              </Text>
              <Text style={[styles.weekStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                Distancia
              </Text>
            </View>
          )}
        </View>
      </Card>

      <FlatList
        data={walks}
        keyExtractor={(item) => item.id}
        renderItem={renderWalkItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon source="dog-side" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Aún no hay paseos registrados
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Registra los paseos de {pet?.name} para ver su actividad
            </Text>
          </View>
        }
      />

      {/* FAB para iniciar tracking en vivo */}
      <FAB
        icon="play"
        style={[styles.trackingFab, { backgroundColor: theme.colors.tertiary }]}
        color={theme.colors.onTertiary}
        onPress={() => navigation.navigate('ActiveWalk', { petId })}
      />
      
      {/* FAB para añadir paseo manual */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddWalk', { petId })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    margin: spacing.md,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  weekStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekStatItem: {
    alignItems: 'center',
  },
  weekStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  weekStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  walkCard: {
    marginBottom: spacing.sm,
  },
  walkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walkTypeContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  walkInfo: {
    flex: 1,
  },
  walkType: {
    fontSize: 16,
    fontWeight: '600',
  },
  walkDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  statChip: {
    height: 28,
  },
  notes: {
    fontSize: 14,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
  },
  trackingFab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 72, // Encima del FAB de añadir
    elevation: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default WalksListScreen;
