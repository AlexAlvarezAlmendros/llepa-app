import React, { useEffect, useState, useCallback } from 'react';
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
  Divider,
  Icon,
  ProgressBar,
} from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useDialog } from '../../contexts/DialogContext';
import { PetsStackParamList, TrainingTrick, TrainingLevel } from '../../types';
import {
  getPetTraining,
  deleteTrainingTrick,
  updateTrainingLevel,
  getTrainingStats,
} from '../../services/trainingService';

type TrainingListRouteProp = RouteProp<PetsStackParamList, 'TrainingList'>;
type TrainingListNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'TrainingList'>;

const LEVEL_LABELS: Record<TrainingLevel, string> = {
  IN_PROGRESS: 'En proceso',
  LEARNED: 'Aprendido',
  CONSOLIDATED: 'Consolidado',
};

const LEVEL_COLORS: Record<TrainingLevel, string> = {
  IN_PROGRESS: '#F59E0B',
  LEARNED: '#3B82F6',
  CONSOLIDATED: '#10B981',
};

const CATEGORY_LABELS: Record<string, string> = {
  BASIC: 'Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
  FUN: 'Divertido',
};

const TrainingListScreen = () => {
  const theme = useTheme();
  const route = useRoute<TrainingListRouteProp>();
  const navigation = useNavigation<TrainingListNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { showConfirm, showSuccess, showError } = useDialog();

  const { petId } = route.params;
  const pet = pets.find((p) => p.id === petId);

  const [tricks, setTricks] = useState<TrainingTrick[]>([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, learned: 0, consolidated: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [tricksData, statsData] = await Promise.all([
        getPetTraining(user.uid, petId),
        getTrainingStats(user.uid, petId),
      ]);
      setTricks(tricksData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching training:', error);
      showError('Error', 'No se pudieron cargar los entrenamientos');
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

  const handleDelete = (trick: TrainingTrick) => {
    showConfirm(
      'Eliminar truco',
      `¿Seguro que quieres eliminar "${trick.name}"?`,
      async () => {
        if (!user) return;
        try {
          await deleteTrainingTrick(user.uid, petId, trick.id);
          showSuccess('Eliminado', 'El truco se ha eliminado correctamente');
          fetchData();
        } catch (error) {
          showError('Error', 'No se pudo eliminar el truco');
        }
      }
    );
  };

  const handleLevelChange = async (trick: TrainingTrick, newLevel: TrainingLevel) => {
    if (!user) return;
    try {
      await updateTrainingLevel(user.uid, petId, trick.id, newLevel);
      showSuccess('¡Bien!', `${trick.name} ahora está ${LEVEL_LABELS[newLevel].toLowerCase()}`);
      fetchData();
    } catch (error) {
      showError('Error', 'No se pudo actualizar el nivel');
    }
  };

  const getNextLevel = (currentLevel: TrainingLevel): TrainingLevel | null => {
    if (currentLevel === 'IN_PROGRESS') return 'LEARNED';
    if (currentLevel === 'LEARNED') return 'CONSOLIDATED';
    return null;
  };

  const renderTrickItem = ({ item }: { item: TrainingTrick }) => {
    const nextLevel = getNextLevel(item.level);

    return (
      <Card style={styles.trickCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddTraining', { petId, trickId: item.id })}
          onLongPress={() => handleDelete(item)}
        >
          <View style={styles.trickHeader}>
            <View style={styles.trickInfo}>
              <Text style={[styles.trickName, { color: theme.colors.onSurface }]}>
                {item.name}
              </Text>
              <Text style={[styles.trickCategory, { color: theme.colors.onSurfaceVariant }]}>
                {CATEGORY_LABELS[item.category]}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={{ backgroundColor: LEVEL_COLORS[item.level] + '20' }}
              textStyle={{ color: LEVEL_COLORS[item.level], fontSize: 12 }}
            >
              {LEVEL_LABELS[item.level]}
            </Chip>
          </View>

          {item.notes && (
            <Text style={[styles.notes, { color: theme.colors.onSurfaceVariant }]}>
              {item.notes}
            </Text>
          )}

          {nextLevel && (
            <TouchableOpacity
              style={[styles.levelUpButton, { backgroundColor: LEVEL_COLORS[nextLevel] + '20' }]}
              onPress={() => handleLevelChange(item, nextLevel)}
            >
              <Icon source="arrow-up-circle" size={18} color={LEVEL_COLORS[nextLevel]} />
              <Text style={{ color: LEVEL_COLORS[nextLevel], marginLeft: spacing.xs }}>
                Pasar a {LEVEL_LABELS[nextLevel]}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  const progress = stats.total > 0 ? stats.consolidated / stats.total : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Estadísticas */}
      <Card style={styles.statsCard}>
        <Text style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
          🎓 Progreso de {pet?.name}
        </Text>
        <ProgressBar
          progress={progress}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: LEVEL_COLORS.IN_PROGRESS }]}>
              {stats.inProgress}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              En proceso
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: LEVEL_COLORS.LEARNED }]}>
              {stats.learned}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Aprendidos
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: LEVEL_COLORS.CONSOLIDATED }]}>
              {stats.consolidated}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Consolidados
            </Text>
          </View>
        </View>
      </Card>

      <FlatList
        data={tricks}
        keyExtractor={(item) => item.id}
        renderItem={renderTrickItem}
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
            <Icon source="school-outline" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Aún no hay trucos registrados
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Empieza a entrenar a {pet?.name} y registra su progreso
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddTraining', { petId })}
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
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  trickCard: {
    marginBottom: spacing.sm,
  },
  trickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trickInfo: {
    flex: 1,
  },
  trickName: {
    fontSize: 16,
    fontWeight: '600',
  },
  trickCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  notes: {
    fontSize: 14,
    marginTop: spacing.sm,
  },
  levelUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
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

export default TrainingListScreen;
