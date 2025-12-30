import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { FAB, Searchbar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { Pet, PetsStackParamList } from '../../types';
import { calculateAge } from '../../utils/dateUtils';

type PetsListNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'PetsList'>;

const PetsListScreen = () => {
  const navigation = useNavigation<PetsListNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { pets, loading, fetchPets } = usePetStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Cargar mascotas solo cuando la pantalla está enfocada y es la primera vez
  useFocusEffect(
    useCallback(() => {
      if (user && isInitialLoad && pets.length === 0) {
        fetchPets(user.uid).finally(() => setIsInitialLoad(false));
      }
    }, [user, isInitialLoad, pets.length])
  );

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPets(pets);
    } else {
      const filtered = pets.filter((pet) =>
        pet.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPets(filtered);
    }
  }, [searchQuery, pets]);

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

  const renderPetCard = ({ item }: { item: Pet }) => {
    const age = item.birthDate ? calculateAge(item.birthDate.toDate()) : null;

    return (
      <Card
        style={styles.petCard}
        onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
      >
        <View style={styles.cardContent}>
          {/* Avatar / Foto */}
          <View style={styles.avatarContainer}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons
                  name={getSpeciesIcon(item.species)}
                  size={40}
                  color={colors.primary}
                />
              </View>
            )}
          </View>

          {/* Información */}
          <View style={styles.infoContainer}>
            <Text style={styles.petName}>{item.name}</Text>
            <View style={styles.detailsRow}>
              <Chip
                icon={getSpeciesIcon(item.species)}
                mode="flat"
                style={styles.chip}
                textStyle={styles.chipText}
                compact
              >
                {item.species}
              </Chip>
              {age && (
                <Text style={styles.ageText}>{age}</Text>
              )}
            </View>
            {item.breed && (
              <Text style={styles.breedText}>{item.breed}</Text>
            )}
          </View>

          {/* Icono de navegación */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.textSecondary}
          />
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="paw-off"
        size={80}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>No tienes mascotas aún</Text>
      <Text style={styles.emptySubtitle}>
        Pulsa el botón + para añadir tu primera mascota
      </Text>
    </View>
  );

  const renderSearchEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="magnify"
        size={80}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>No se encontraron mascotas</Text>
      <Text style={styles.emptySubtitle}>
        Intenta con otro nombre
      </Text>
    </View>
  );

  if (loading && pets.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Mis Mascotas 🐾</Text>
        <Text style={styles.headerSubtitle}>
          {pets.length} {pets.length === 1 ? 'mascota' : 'mascotas'}
        </Text>
      </View>

      {/* Buscador */}
      {pets.length > 0 && (
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar mascota..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            iconColor={colors.primary}
          />
        </View>
      )}

      {/* Lista de mascotas */}
      <FlatList
        data={filteredPets}
        renderItem={renderPetCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          searchQuery ? renderSearchEmptyState() : renderEmptyState()
        }
        refreshing={loading || false}
        onRefresh={() => user && fetchPets(user.uid)}
      />

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddPet')}
        color={colors.surface}
        label="Añadir"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchbar: {
    backgroundColor: colors.surface,
    elevation: 2,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  petCard: {
    marginBottom: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  petName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chip: {
    backgroundColor: colors.primary + '15',
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    marginVertical: 0,
    paddingVertical: 0,
  },
  ageText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  breedText: {
    ...typography.caption,
    color: colors.textSecondary,
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

export default PetsListScreen;
