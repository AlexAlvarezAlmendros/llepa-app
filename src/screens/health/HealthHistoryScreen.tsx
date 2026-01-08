import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { FAB, useTheme, Icon } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { getPetVisits, deleteVisit } from '../../services/vetVisitService';
import { getActiveMedications } from '../../services/medicationService';
import { VetVisit, PetsStackParamList, Medication } from '../../types';

type HealthHistoryRouteProp = RouteProp<PetsStackParamList, 'HealthHistory'>;
type HealthHistoryNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'HealthHistory'>;

const HealthHistoryScreen = () => {
  const theme = useTheme();
  const route = useRoute<HealthHistoryRouteProp>();
  const navigation = useNavigation<HealthHistoryNavigationProp>();
  const { user } = useAuthStore();
  const { petId } = route.params;
  
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [activeMedications, setActiveMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [visitsList, medicationsList] = await Promise.all([
        getPetVisits(user.uid, petId),
        getActiveMedications(user.uid, petId),
      ]);
      setVisits(visitsList);
      setActiveMedications(medicationsList);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar visitas cuando la pantalla gana foco (después de crear/editar)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        setLoading(true);
        loadData();
      }
    }, [user, petId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (visitId: string, visitDate: string) => {
    Alert.alert(
      'Eliminar Visita',
      `¿Estás seguro de eliminar la visita del ${visitDate}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await deleteVisit(user.uid, petId, visitId);
              setVisits(visits.filter((v) => v.id !== visitId));
              Alert.alert('Eliminado', 'Visita eliminada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la visita');
            }
          },
        },
      ]
    );
  };

  const renderVisitCard = ({ item }: { item: VetVisit }) => {
    const visitDate = item.date.toDate().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return (
      <Card style={styles.visitCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Icon
              source="hospital-box"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.headerInfo}>
              <Text style={[styles.visitDate, { color: theme.colors.onSurface }]}>{visitDate}</Text>
              {item.clinicName && (
                <Text style={[styles.clinicName, { color: theme.colors.onSurfaceVariant }]}>{item.clinicName}</Text>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddVisit', { petId, visitId: item.id })}
              style={styles.editButton}
            >
              <Icon
                source="pencil"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, visitDate)}
              style={styles.deleteButton}
            >
              <Icon
                source="delete-outline"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Motivo:</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.reason}</Text>
          </View>

          {item.diagnosis && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Diagnóstico:</Text>
              <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.diagnosis}</Text>
            </View>
          )}

          {item.vetName && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Veterinario:</Text>
              <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.vetName}</Text>
            </View>
          )}

          {item.attachmentUrl && (
            <TouchableOpacity
              style={[styles.attachmentButton, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => {
                // TODO: Abrir imagen en modal o navegador
                Alert.alert('Receta', 'Ver imagen (próximamente)');
              }}
            >
              <Icon
                source="paperclip"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.attachmentText, { color: theme.colors.primary }]}>Ver receta adjunta</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon
        source="stethoscope"
        size={80}
        color={theme.colors.onSurfaceVariant}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Sin historial médico</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Pulsa el botón + para añadir la primera visita veterinaria
      </Text>
    </View>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  // Componente de accesos rápidos
  const QuickAccessSection = () => (
    <View style={styles.quickAccessContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Gestión de Salud</Text>
      <View style={styles.quickAccessGrid}>
        {/* Vacunas */}
        <TouchableOpacity
          style={[styles.quickAccessCard, { backgroundColor: theme.colors.secondaryContainer }]}
          onPress={() => navigation.navigate('Vaccines', { petId })}
        >
          <Icon source="needle" size={32} color={theme.colors.onSecondaryContainer} />
          <Text style={[styles.quickAccessLabel, { color: theme.colors.onSecondaryContainer }]}>Vacunas</Text>
        </TouchableOpacity>

        {/* Medicaciones */}
        <TouchableOpacity
          style={[styles.quickAccessCard, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => navigation.navigate('Medications', { petId })}
        >
          <View style={styles.quickAccessBadgeContainer}>
            <Icon source="pill" size={32} color={theme.colors.onPrimaryContainer} />
            {activeMedications.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                <Text style={[styles.badgeText, { color: theme.colors.onError }]}>
                  {activeMedications.length}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.quickAccessLabel, { color: theme.colors.onPrimaryContainer }]}>Medicaciones</Text>
          {activeMedications.length > 0 && (
            <Text style={[styles.quickAccessSubLabel, { color: theme.colors.onPrimaryContainer }]}>
              {activeMedications.length} activa{activeMedications.length > 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={visits}
        renderItem={renderVisitCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={QuickAccessSection}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing || false}
        onRefresh={handleRefresh}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddVisit', { petId })}
        color={theme.colors.onPrimary}
        label="Nueva Visita"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  quickAccessContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAccessCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  quickAccessBadgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickAccessLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  quickAccessSubLabel: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  visitCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  clinicName: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    padding: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  cardBody: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
  },
  value: {
    fontSize: 16,
    flex: 1,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
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
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
});

export default HealthHistoryScreen;
