/**
 * Pantalla: Lista de Medicaciones
 * 
 * Muestra todas las medicaciones de una mascota,
 * diferenciando entre tratamientos activos e históricos.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FAB, Chip, useTheme, Icon, SegmentedButtons } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import {
  getPetMedications,
  deleteMedication,
  finishMedication,
  getMedicationTypeLabel,
  getMedicationFrequencyLabel,
  getMedicationTypeIcon,
} from '../../services/medicationService';
import { deleteReminder, getReminder } from '../../services/reminderService';
import { cancelNotification } from '../../services/notificationService';
import { Medication, PetsStackParamList } from '../../types';
import { useDialog } from '../../contexts/DialogContext';

type MedicationsRouteProp = RouteProp<PetsStackParamList, 'Medications'>;
type MedicationsNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'Medications'>;

const MedicationsScreen = () => {
  const theme = useTheme();
  const route = useRoute<MedicationsRouteProp>();
  const navigation = useNavigation<MedicationsNavigationProp>();
  const { user } = useAuthStore();
  const { showDestructiveConfirm, showConfirm, showSuccess, showError } = useDialog();
  const { petId } = route.params;
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const loadMedications = async () => {
    if (!user) return;
    
    try {
      const medicationsList = await getPetMedications(user.uid, petId);
      setMedications(medicationsList);
    } catch (error) {
      console.error('Error cargando medicaciones:', error);
      showError('Error', 'No se pudieron cargar las medicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setLoading(true);
        loadMedications();
      }
    }, [user, petId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadMedications();
  };

  const handleDelete = (medication: Medication) => {
    showDestructiveConfirm(
      'Eliminar Medicación',
      `¿Estás seguro de eliminar ${medication.name}? También se eliminará el recordatorio asociado.`,
      async () => {
        if (!user) return;
        try {
          // Eliminar recordatorio y cancelar notificaciones asociadas
          if (medication.reminderId) {
            try {
              // Obtener el recordatorio para cancelar la notificación
              const reminder = await getReminder(user.uid, medication.reminderId);
              if (reminder?.notificationId) {
                await cancelNotification(reminder.notificationId);
              }
              await deleteReminder(user.uid, medication.reminderId);
            } catch (e) {
              console.log('Recordatorio ya eliminado o no existe');
            }
          }
          
          await deleteMedication(user.uid, petId, medication.id);
          setMedications(medications.filter((m) => m.id !== medication.id));
          showSuccess('Eliminado', 'Medicación y recordatorios eliminados correctamente');
        } catch (error) {
          showError('Error', 'No se pudo eliminar la medicación');
        }
      }
    );
  };

  const handleFinish = (medication: Medication) => {
    showConfirm(
      'Finalizar Tratamiento',
      `¿Has terminado el tratamiento de ${medication.name}? Se eliminarán los recordatorios asociados.`,
      async () => {
        if (!user) return;
        try {
          // Eliminar recordatorio y cancelar notificaciones asociadas
          if (medication.reminderId) {
            try {
              // Obtener el recordatorio para cancelar la notificación
              const reminder = await getReminder(user.uid, medication.reminderId);
              if (reminder?.notificationId) {
                await cancelNotification(reminder.notificationId);
              }
              await deleteReminder(user.uid, medication.reminderId);
            } catch (e) {
              console.log('Recordatorio ya eliminado o no existe');
            }
          }
          
          await finishMedication(user.uid, petId, medication.id);
          
          // Actualizar estado local
          setMedications(medications.map((m) =>
            m.id === medication.id ? { ...m, active: false, reminderId: undefined } : m
          ));
          
          showSuccess('Finalizado', 'Tratamiento finalizado y recordatorios eliminados');
        } catch (error) {
          showError('Error', 'No se pudo finalizar el tratamiento');
        }
      },
      undefined,
      'Finalizar',
      'Cancelar'
    );
  };

  const filteredMedications = filter === 'active'
    ? medications.filter(m => m.active)
    : medications;

  const renderMedicationCard = ({ item }: { item: Medication }) => {
    const startDate = item.startDate.toDate().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return (
      <Card style={styles.medicationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: item.active ? theme.colors.primaryContainer : theme.colors.surfaceVariant }]}>
              <Icon
                source={getMedicationTypeIcon(item.type)}
                size={24}
                color={item.active ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[
                styles.medicationName,
                { color: theme.colors.onSurface },
                !item.active && styles.inactiveText
              ]}>
                {item.name}
              </Text>
              <Text style={[styles.medicationType, { color: theme.colors.onSurfaceVariant }]}>
                {getMedicationTypeLabel(item.type)}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: item.active ? theme.colors.primaryContainer : theme.colors.surfaceVariant }
              ]}
              textStyle={{
                color: item.active ? theme.colors.primary : theme.colors.onSurfaceVariant,
                fontSize: 11,
                lineHeight: 14,
                marginVertical: 0,
              }}
              compact
            >
              {item.active ? 'Activo' : 'Finalizado'}
            </Chip>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Dosis */}
          <View style={styles.infoRow}>
            <Icon source="needle" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Dosis:</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.dose}</Text>
          </View>

          {/* Frecuencia */}
          <View style={styles.infoRow}>
            <Icon source="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Frecuencia:</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>
              {getMedicationFrequencyLabel(item.frequency)}
            </Text>
          </View>

          {/* Fecha inicio */}
          <View style={styles.infoRow}>
            <Icon source="calendar-start" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Inicio:</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>{startDate}</Text>
          </View>

          {/* Duración */}
          <View style={styles.infoRow}>
            <Icon source="calendar-range" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Duración:</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>
              {item.durationDays === 0 ? 'Indefinido' : `${item.durationDays} días`}
            </Text>
          </View>

          {/* Días restantes (solo si tiene duración definida y está activo) */}
          {item.active && item.durationDays > 0 && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = item.startDate.toDate();
            start.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - start.getTime();
            const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.max(0, item.durationDays - daysPassed);
            const isOverdue = daysRemaining === 0 && daysPassed >= item.durationDays;
            
            return (
              <View style={styles.infoRow}>
                <Icon 
                  source={isOverdue ? "alert-circle" : "timer-sand"} 
                  size={16} 
                  color={isOverdue ? theme.colors.error : theme.colors.primary} 
                />
                <Text style={[styles.label, { color: isOverdue ? theme.colors.error : theme.colors.onSurfaceVariant }]}>
                  {isOverdue ? 'Estado:' : 'Restantes:'}
                </Text>
                <Text style={[styles.value, { color: isOverdue ? theme.colors.error : theme.colors.primary, fontWeight: '600' }]}>
                  {isOverdue ? 'Tratamiento finalizado' : `${daysRemaining} días`}
                </Text>
              </View>
            );
          })()}

          {/* Notas */}
          {item.notes && (
            <View style={styles.notesRow}>
              <Icon source="note-text" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.notes, { color: theme.colors.onSurfaceVariant }]}>{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Acciones */}
        <View style={[styles.cardActions, { borderTopColor: theme.colors.outlineVariant }]}>
          {item.active && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleFinish(item)}
            >
              <Icon source="check-circle" size={18} color={theme.colors.secondary} />
              <Text style={[styles.actionText, { color: theme.colors.secondary }]}>Finalizar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddMedication', { petId, medicationId: item.id })}
          >
            <Icon source="pencil" size={18} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Icon source="delete" size={18} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon
        source="pill"
        size={80}
        color={theme.colors.onSurfaceVariant}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        {filter === 'active' ? 'Sin tratamientos activos' : 'Sin medicaciones registradas'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {filter === 'active' 
          ? 'Pulsa el botón + para añadir un nuevo tratamiento'
          : 'Pulsa el botón + para registrar la primera medicación'}
      </Text>
    </View>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Filtro */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as 'active' | 'all')}
          buttons={[
            { value: 'active', label: 'Activos', icon: 'pill' },
            { value: 'all', label: 'Todos', icon: 'history' },
          ]}
        />
      </View>

      <FlatList
        data={filteredMedications}
        renderItem={renderMedicationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddMedication', { petId })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  medicationCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inactiveText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  medicationType: {
    fontSize: 13,
    marginTop: 2,
  },
  statusChip: {
    paddingVertical: 2,
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    minWidth: 70,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  notes: {
    fontSize: 13,
    flex: 1,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
});

export default MedicationsScreen;
