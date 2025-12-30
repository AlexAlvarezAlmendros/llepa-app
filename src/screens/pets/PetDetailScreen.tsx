import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chip, Divider, List, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { PetsStackParamList } from '../../types';
import { calculateAge } from '../../utils/dateUtils';

type PetDetailRouteProp = RouteProp<PetsStackParamList, 'PetDetail'>;
type PetDetailNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'PetDetail'>;

const PetDetailScreen = () => {
  const route = useRoute<PetDetailRouteProp>();
  const navigation = useNavigation<PetDetailNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { pets, removePet } = usePetStore();
  
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con Foto */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + spacing.md }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.surface}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { top: insets.top + spacing.md }]}
            onPress={() => navigation.navigate('EditPet', { petId: pet.id })}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={24}
              color={colors.surface}
            />
          </TouchableOpacity>

          {pet.photoUrl ? (
            <Image source={{ uri: pet.photoUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <MaterialCommunityIcons
                name={getSpeciesIcon(pet.species)}
                size={80}
                color={colors.surface}
              />
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.petName}>{pet.name}</Text>
            <View style={styles.chipsRow}>
              <Chip
                icon={getSpeciesIcon(pet.species)}
                mode="flat"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {pet.species}
              </Chip>
              {age && (
                <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
                  {age}
                </Chip>
              )}
            </View>
          </View>
        </View>

        {/* Información Básica */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name={getBreedIcon(pet.species)}
              size={20}
              color={colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoLabel}>Raza:</Text>
            <Text style={styles.infoValue}>
              {pet.breed || 'No especificada'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoLabel}>Nacimiento:</Text>
            <Text style={styles.infoValue}>
              {pet.birthDate?.toDate().toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {pet.weight && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="weight-kilogram"
                size={20}
                color={colors.textSecondary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoLabel}>Peso:</Text>
              <Text style={styles.infoValue}>{pet.weight} kg</Text>
            </View>
          )}

          {pet.chipNumber && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="chip"
                size={20}
                color={colors.textSecondary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoLabel}>Microchip:</Text>
              <Text style={styles.infoValue}>{pet.chipNumber}</Text>
            </View>
          )}
        </Card>

        {/* Sección Salud */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Historial Médico</Text>
          <Divider style={styles.divider} />
          
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('HealthHistory', { petId: pet.id })}
          >
            <View style={styles.listItemContent}>
              <MaterialCommunityIcons
                name="hospital-box"
                size={24}
                color={colors.primary}
                style={styles.listIcon}
              />
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Visitas Veterinarias</Text>
                <Text style={styles.listDescription}>Ver historial completo</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('Vaccines', { petId: pet.id })}
          >
            <View style={styles.listItemContent}>
              <MaterialCommunityIcons
                name="needle"
                size={24}
                color={colors.primary}
                style={styles.listIcon}
              />
              <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>Vacunas</Text>
                <Text style={styles.listDescription}>Gestionar calendario de vacunas</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.textSecondary}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  header: {
    backgroundColor: colors.primary,
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
    borderColor: colors.surface,
  },
  heroPlaceholder: {
    backgroundColor: colors.primary + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  petName: {
    ...typography.h1,
    color: colors.surface,
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  chipText: {
    color: colors.surface,
  },
  section: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  divider: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  infoLabel: {
    ...typography.button,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 2,
  },
  listItem: {
    paddingVertical: spacing.sm,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  listIcon: {
    marginRight: spacing.md,
  },
  listTextContainer: {
    flex: 1,
  },
  listTitle: {
    ...typography.button,
    color: colors.textPrimary,
    fontSize: 16,
  },
  listDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default PetDetailScreen;
