import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chip, Divider, List, IconButton, useTheme, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { spacing } from '../../constants/theme';
import { Card, Loading, FeedingSection } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { PetsStackParamList } from '../../types';
import { calculateAge } from '../../utils/dateUtils';
import { useDialog } from '../../contexts/DialogContext';
import { createReminder, getUserReminders, deleteReminder, updateReminder } from '../../services/reminderService';

type PetDetailRouteProp = RouteProp<PetsStackParamList, 'PetDetail'>;
type PetDetailNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'PetDetail'>;

const PetDetailScreen = () => {
  const theme = useTheme();
  const route = useRoute<PetDetailRouteProp>();
  const navigation = useNavigation<PetDetailNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { pets, removePet, updateExistingPet } = usePetStore();
  const { showConfirm, showSuccess, showError } = useDialog();
  
  const { petId } = route.params;
  const pet = pets.find((p) => p.id === petId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pet) {
      navigation.goBack();
    }
  }, [pet]);

  if (!pet) {
    return <Loading fullScreen />;
  }

  const age = pet.birthDate ? calculateAge(pet.birthDate.toDate()) : null;

  /**
   * Actualiza el recordatorio de comida cuando se registra una nueva compra
   */
  const updateFoodReminder = async (newPurchaseDate: Timestamp) => {
    if (!user || !pet.food?.alertDays || !pet.food?.purchaseAmount || !pet.food?.dailyAmount) return;

    try {
      // Buscar recordatorio existente
      const existingReminders = await getUserReminders(user.uid);
      const existingFoodReminder = existingReminders.find(
        r => r.petId === pet.id && r.type === 'FOOD' && r.title.includes('Comprar comida')
      );

      // Calcular nueva fecha de alerta
      const totalDays = Math.floor(pet.food.purchaseAmount / pet.food.dailyAmount);
      const alertDate = new Date(newPurchaseDate.toDate());
      alertDate.setDate(alertDate.getDate() + totalDays - pet.food.alertDays);
      alertDate.setHours(10, 0, 0, 0);

      const reminderData = {
        petId: pet.id,
        title: `🛒 Comprar comida para ${pet.name}`,
        type: 'FOOD' as const,
        scheduledAt: Timestamp.fromDate(alertDate),
        completed: false,
        frequency: 'ONCE' as const,
        notes: `Quedan aproximadamente ${pet.food.alertDays} días de comida. Marca: ${pet.food.brand || 'No especificada'}`,
      };

      if (existingFoodReminder) {
        await updateReminder(user.uid, existingFoodReminder.id, {
          scheduledAt: reminderData.scheduledAt,
          notes: reminderData.notes,
          completed: false,
        });
      } else {
        await createReminder(user.uid, reminderData);
      }
    } catch (error) {
      console.error('Error actualizando recordatorio de comida:', error);
    }
  };

  const handleResetPurchase = () => {
    showConfirm(
      'Nueva compra',
      '¿Has comprado un nuevo paquete de comida?',
      async () => {
        if (!user || !pet.food) return;
        try {
          setLoading(true);
          const newPurchaseDate = Timestamp.now();
          await updateExistingPet(user.uid, pet.id, {
            food: {
              ...pet.food,
              lastPurchaseDate: newPurchaseDate,
            },
          });
          
          // Actualizar el recordatorio de comida con la nueva fecha
          await updateFoodReminder(newPurchaseDate);
          
          showSuccess('¡Listo!', 'Se ha registrado la nueva compra y actualizado el recordatorio');
        } catch (error) {
          console.error('Error al reiniciar compra:', error);
          showError('Error', 'No se pudo registrar la compra');
        } finally {
          setLoading(false);
        }
      },
      undefined,
      'Sí, reiniciar',
      'Cancelar'
    );
  };

  const getSpeciesIcon = (species: string) => {
    switch (species) {
      case 'Perro':
        return 'dog';
      case 'Gato':
        return 'cat';
      default:
        return 'paw';
    }
  };

  const getBreedIcon = (species: string) => {
    switch (species) {
      case 'Perro':
        return 'dog-side';
      case 'Gato':
        return 'cat';
      default:
        return 'dna';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con Foto */}
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + spacing.md }]}
            onPress={() => navigation.goBack()}
          >
            <Icon
              source="arrow-left"
              size={24}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { top: insets.top + spacing.md }]}
            onPress={() => navigation.navigate('EditPet', { petId: pet.id })}
          >
            <Icon
              source="pencil"
              size={24}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>

          {pet.photoUrl ? (
            <Image source={{ uri: pet.photoUrl }} style={[styles.heroImage, { borderColor: theme.colors.surface }]} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder, { borderColor: theme.colors.surface, backgroundColor: theme.colors.primaryContainer }]}>
              <Icon
                source={getSpeciesIcon(pet.species)}
                size={80}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={[styles.petName, { color: theme.colors.onPrimary }]}>{pet.name}</Text>
            <View style={styles.chipsRow}>
              <Chip
                icon={getSpeciesIcon(pet.species)}
                mode="flat"
                style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.3)' }]}
                textStyle={[styles.chipText, { color: theme.colors.onPrimary }]}
              >
                {pet.species}
              </Chip>
              {age && (
                <Chip mode="flat" style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.3)' }]} textStyle={[styles.chipText, { color: theme.colors.onPrimary }]}>
                  {age}
                </Chip>
              )}
            </View>
          </View>
        </View>

        {/* Información Básica */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Información Básica</Text>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon
              source={getBreedIcon(pet.species)}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Raza:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {pet.breed || 'No especificada'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon
              source="calendar"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Nacimiento:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {pet.birthDate?.toDate().toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {pet.weight && (
            <View style={styles.infoRow}>
              <Icon
                source="weight-kilogram"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Peso:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{pet.weight} kg</Text>
            </View>
          )}

          {pet.chipNumber && (
            <View style={styles.infoRow}>
              <Icon
                source="chip"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Microchip:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{pet.chipNumber}</Text>
            </View>
          )}
        </Card>

        {/* Sección Alimentación */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Alimentación</Text>
          <Divider style={styles.divider} />
          <FeedingSection food={pet.food} onResetPurchase={handleResetPurchase} />
        </Card>

        {/* Sección Salud */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Historial Médico</Text>
          <Divider style={styles.divider} />
          
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('HealthHistory', { petId: pet.id })}
          >
            <View style={styles.listItemContent}>
              <Icon
                source="hospital-box"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: theme.colors.onSurface }]}>Visitas Veterinarias</Text>
                <Text style={[styles.listDescription, { color: theme.colors.onSurfaceVariant }]}>Ver historial completo</Text>
              </View>
              <Icon
                source="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('Vaccines', { petId: pet.id })}
          >
            <View style={styles.listItemContent}>
              <Icon
                source="needle"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: theme.colors.onSurface }]}>Vacunas</Text>
                <Text style={[styles.listDescription, { color: theme.colors.onSurfaceVariant }]}>Gestionar calendario de vacunas</Text>
              </View>
              <Icon
                source="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  header: {
    paddingBottom: spacing.xl,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: 'center',
    marginTop: spacing.xl * 2,
    borderWidth: 4,
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  petName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
  },
  chipText: {
  },
  section: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  divider: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    flex: 2,
  },
  listItem: {
    paddingVertical: spacing.sm,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  listIcon: {
    marginRight: spacing.md,
  },
  listTextContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  listDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default PetDetailScreen;
