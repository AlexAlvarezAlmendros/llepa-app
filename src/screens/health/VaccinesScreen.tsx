import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FAB, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { getPetVaccines, deleteVaccine, getVaccineStatus } from '../../services/vaccineService';
import { Vaccine, PetsStackParamList } from '../../types';

type VaccinesRouteProp = RouteProp<PetsStackParamList, 'Vaccines'>;
type VaccinesNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'Vaccines'>;

const VaccinesScreen = () => {
  const route = useRoute<VaccinesRouteProp>();
  const navigation = useNavigation<VaccinesNavigationProp>();
  const { user } = useAuthStore();
  const { petId } = route.params;
  
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVaccines = async () => {
    if (!user) return;
    
    try {
      const vaccinesList = await getPetVaccines(user.uid, petId);
      setVaccines(vaccinesList);
    } catch (error) {
      console.error('Error cargando vacunas:', error);
      Alert.alert('Error', 'No se pudieron cargar las vacunas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar vacunas cuando la pantalla gana foco (después de crear/editar)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        setLoading(true);
        loadVaccines();
      }
    }, [user, petId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadVaccines();
  };

  const handleDelete = (vaccineId: string, vaccineName: string) => {
    Alert.alert(
      'Eliminar Vacuna',
      `¿Estás seguro de eliminar ${vaccineName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await deleteVaccine(user.uid, petId, vaccineId);
              setVaccines(vaccines.filter((v) => v.id !== vaccineId));
              Alert.alert('Eliminado', 'Vacuna eliminada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la vacuna');
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (status: 'valid' | 'upcoming' | 'expired') => {
    switch (status) {
      case 'valid':
        return {
          label: 'Vigente',
          color: colors.success,
          icon: 'check-circle' as const,
        };
      case 'upcoming':
        return {
          label: 'Próxima',
          color: '#F59E0B',
          icon: 'alert-circle' as const,
        };
      case 'expired':
        return {
          label: 'Vencida',
          color: colors.error,
          icon: 'close-circle' as const,
        };
    }
  };

  const renderVaccineCard = ({ item }: { item: Vaccine }) => {
    const administeredDate = item.administeredDate.toDate().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const status = getVaccineStatus(item);
    const statusInfo = getStatusInfo(status);

    return (
      <Card style={styles.vaccineCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="needle"
              size={24}
              color={colors.primary}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.vaccineName}>{item.name}</Text>
              <Text style={styles.vaccineDate}>{administeredDate}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Chip
              icon={statusInfo.icon}
              style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
              textStyle={{ color: statusInfo.color, fontSize: 12, marginVertical: 0, paddingVertical: 0 }}
              compact
            >
              {statusInfo.label}
            </Chip>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        {item.nextDoseDate && (
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.label}>Próxima dosis:</Text>
              <Text style={[styles.value, { color: statusInfo.color }]}>
                {item.nextDoseDate.toDate().toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="needle"
        size={80}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>Sin vacunas registradas</Text>
      <Text style={styles.emptySubtitle}>
        Pulsa el botón + para añadir la primera vacuna
      </Text>
    </View>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vaccines}
        renderItem={renderVaccineCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing || false}
        onRefresh={handleRefresh}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddVaccine', { petId })}
        color={colors.surface}
        label="Nueva Vacuna"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  vaccineCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
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
  vaccineName: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 16,
  },
  vaccineDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusChip: {
  },
  deleteButton: {
    padding: spacing.xs,
  },
  cardBody: {
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.button,
    fontSize: 13,
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
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});

export default VaccinesScreen;
