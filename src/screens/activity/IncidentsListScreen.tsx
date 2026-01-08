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
  Badge,
} from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useDialog } from '../../contexts/DialogContext';
import { PetsStackParamList, HealthIncident, IncidentCategory, IncidentSeverity } from '../../types';
import {
  getPetIncidents,
  deleteIncident,
  resolveIncident,
  getIncidentStats,
} from '../../services/incidentService';
import { formatDate } from '../../utils/dateUtils';

type IncidentsListRouteProp = RouteProp<PetsStackParamList, 'IncidentsList'>;
type IncidentsListNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'IncidentsList'>;

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  DIGESTIVE: 'Digestivo',
  MOBILITY: 'Movilidad',
  SKIN: 'Piel',
  RESPIRATORY: 'Respiratorio',
  BEHAVIOR: 'Comportamiento',
  INJURY: 'Lesión',
  OTHER: 'Otro',
};

const CATEGORY_ICONS: Record<IncidentCategory, string> = {
  DIGESTIVE: 'stomach',
  MOBILITY: 'walk',
  SKIN: 'hand-back-left',
  RESPIRATORY: 'lungs',
  BEHAVIOR: 'head-question',
  INJURY: 'bandage',
  OTHER: 'help-circle',
};

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  LOW: 'Leve',
  MEDIUM: 'Moderado',
  HIGH: 'Grave',
};

const IncidentsListScreen = () => {
  const theme = useTheme();
  const route = useRoute<IncidentsListRouteProp>();
  const navigation = useNavigation<IncidentsListNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { showConfirm, showSuccess, showError } = useDialog();

  const { petId } = route.params;
  const pet = pets.find((p) => p.id === petId);

  const [incidents, setIncidents] = useState<HealthIncident[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    unresolved: 0,
    byCategory: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [incidentsData, statsData] = await Promise.all([
        getPetIncidents(user.uid, petId),
        getIncidentStats(user.uid, petId),
      ]);
      setIncidents(incidentsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      showError('Error', 'No se pudieron cargar los incidentes');
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

  const handleDelete = (incident: HealthIncident) => {
    showConfirm(
      'Eliminar incidente',
      '¿Seguro que quieres eliminar este incidente?',
      async () => {
        if (!user) return;
        try {
          await deleteIncident(user.uid, petId, incident.id);
          showSuccess('Eliminado', 'El incidente se ha eliminado correctamente');
          fetchData();
        } catch (error) {
          showError('Error', 'No se pudo eliminar el incidente');
        }
      }
    );
  };

  const handleResolve = (incident: HealthIncident) => {
    showConfirm(
      'Marcar como resuelto',
      '¿El incidente se ha resuelto?',
      async () => {
        if (!user) return;
        try {
          await resolveIncident(user.uid, petId, incident.id);
          showSuccess('¡Bien!', 'El incidente se ha marcado como resuelto');
          fetchData();
        } catch (error) {
          showError('Error', 'No se pudo actualizar el incidente');
        }
      },
      undefined,
      'Sí, resuelto',
      'Cancelar'
    );
  };

  const filteredIncidents = incidents.filter((i) => {
    if (filter === 'active') return !i.resolved;
    if (filter === 'resolved') return i.resolved;
    return true;
  });

  const renderIncidentItem = ({ item }: { item: HealthIncident }) => {
    return (
      <Card style={[styles.incidentCard, item.resolved && styles.resolvedCard]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddIncident', { petId, incidentId: item.id })}
          onLongPress={() => handleDelete(item)}
        >
          <View style={styles.incidentHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: SEVERITY_COLORS[item.severity] + '20' }]}>
              <Icon
                source={CATEGORY_ICONS[item.category]}
                size={24}
                color={SEVERITY_COLORS[item.severity]}
              />
            </View>
            <View style={styles.incidentInfo}>
              <View style={styles.titleRow}>
                <Text style={[
                  styles.incidentTitle,
                  { color: theme.colors.onSurface },
                  item.resolved && styles.resolvedText
                ]}>
                  {item.title}
                </Text>
                {item.resolved && (
                  <Icon source="check-circle" size={18} color="#10B981" />
                )}
              </View>
              <Text style={[styles.incidentDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(item.date.toDate())}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={{ backgroundColor: SEVERITY_COLORS[item.severity] + '20' }}
              textStyle={{ color: SEVERITY_COLORS[item.severity], fontSize: 11 }}
              compact
            >
              {SEVERITY_LABELS[item.severity]}
            </Chip>
          </View>

          <View style={styles.tagsRow}>
            <Chip
              icon={CATEGORY_ICONS[item.category]}
              mode="outlined"
              compact
              style={styles.categoryChip}
            >
              {CATEGORY_LABELS[item.category]}
            </Chip>
          </View>

          {item.description && (
            <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              {item.description}
            </Text>
          )}

          {item.symptoms && item.symptoms.length > 0 && (
            <View style={styles.symptomsRow}>
              {item.symptoms.map((symptom, index) => (
                <Chip
                  key={index}
                  mode="flat"
                  compact
                  style={styles.symptomChip}
                  textStyle={{ fontSize: 11 }}
                >
                  {symptom}
                </Chip>
              ))}
            </View>
          )}

          {!item.resolved && (
            <TouchableOpacity
              style={[styles.resolveButton, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => handleResolve(item)}
            >
              <Icon source="check" size={18} color={theme.colors.onPrimaryContainer} />
              <Text style={{ color: theme.colors.onPrimaryContainer, marginLeft: spacing.xs }}>
                Marcar como resuelto
              </Text>
            </TouchableOpacity>
          )}

          {item.resolved && item.resolvedNotes && (
            <View style={[styles.resolvedNotes, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="note-text" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.resolvedNotesText, { color: theme.colors.onSurfaceVariant }]}>
                {item.resolvedNotes}
              </Text>
            </View>
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
      {/* Estadísticas */}
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <Text style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
            ⚠️ Registro de incidentes
          </Text>
          {stats.unresolved > 0 && (
            <Badge style={{ backgroundColor: '#EF4444' }}>{stats.unresolved}</Badge>
          )}
        </View>
        <Text style={[styles.statsSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Información vital para tu veterinario
        </Text>
        
        <View style={styles.filterRow}>
          <Chip
            mode={filter === 'all' ? 'flat' : 'outlined'}
            onPress={() => setFilter('all')}
            style={styles.filterChip}
          >
            Todos ({stats.total})
          </Chip>
          <Chip
            mode={filter === 'active' ? 'flat' : 'outlined'}
            onPress={() => setFilter('active')}
            style={[styles.filterChip, filter === 'active' && { backgroundColor: '#FEF3C7' }]}
            textStyle={filter === 'active' ? { color: '#F59E0B' } : undefined}
          >
            Activos ({stats.unresolved})
          </Chip>
          <Chip
            mode={filter === 'resolved' ? 'flat' : 'outlined'}
            onPress={() => setFilter('resolved')}
            style={[styles.filterChip, filter === 'resolved' && { backgroundColor: '#D1FAE5' }]}
            textStyle={filter === 'resolved' ? { color: '#10B981' } : undefined}
          >
            Resueltos ({stats.resolved})
          </Chip>
        </View>
      </Card>

      <FlatList
        data={filteredIncidents}
        keyExtractor={(item) => item.id}
        renderItem={renderIncidentItem}
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
            <Icon source="clipboard-check-outline" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {filter === 'all'
                ? 'No hay incidentes registrados'
                : filter === 'active'
                ? '¡Genial! No hay incidentes activos'
                : 'No hay incidentes resueltos'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Registra cualquier anomalía de {pet?.name} para llevar un control
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddIncident', { petId })}
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
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    height: 32,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  incidentCard: {
    marginBottom: spacing.sm,
  },
  resolvedCard: {
    opacity: 0.7,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  incidentInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resolvedText: {
    textDecorationLine: 'line-through',
  },
  incidentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  categoryChip: {
    height: 26,
  },
  description: {
    fontSize: 14,
    marginTop: spacing.sm,
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  symptomChip: {
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  resolvedNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  resolvedNotesText: {
    fontSize: 13,
    flex: 1,
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
    paddingHorizontal: spacing.xl,
  },
});

export default IncidentsListScreen;
