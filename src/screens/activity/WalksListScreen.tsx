import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Text,
  useTheme,
  FAB,
  Icon,
} from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useDialog } from '../../contexts/DialogContext';
import { PetsStackParamList, Walk, WalkType, RouteCoordinate } from '../../types';
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

// Estilo de mapa oscuro para las miniaturas
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

// Componente de mini mapa para mostrar la ruta
const MiniRouteMap = ({ 
  coordinates, 
  primaryColor 
}: { 
  coordinates: RouteCoordinate[]; 
  primaryColor: string;
}) => {
  // Protección contra datos inválidos
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) return null;
  
  // Verificar que las coordenadas sean válidas
  const validCoordinates = coordinates.filter(
    coord => coord && 
    typeof coord.latitude === 'number' && 
    typeof coord.longitude === 'number' &&
    !isNaN(coord.latitude) && 
    !isNaN(coord.longitude)
  );
  
  if (validCoordinates.length < 2) return null;

  // Calcular la región para centrar el mapa usando coordenadas válidas
  let minLat = validCoordinates[0].latitude;
  let maxLat = validCoordinates[0].latitude;
  let minLng = validCoordinates[0].longitude;
  let maxLng = validCoordinates[0].longitude;

  validCoordinates.forEach((coord) => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const deltaLat = Math.max((maxLat - minLat) * 1.1, 0.0008);
  const deltaLng = Math.max((maxLng - minLng) * 1.1, 0.0008);

  return (
    <View style={miniMapStyles.container}>
      <MapView
        style={miniMapStyles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={darkMapStyle}
        userInterfaceStyle="dark"
        region={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: deltaLat,
          longitudeDelta: deltaLng,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsIndoors={false}
        showsTraffic={false}
        showsBuildings={false}
        showsPointsOfInterest={false}
      >
        <Polyline
          coordinates={validCoordinates}
          strokeColor={primaryColor}
          strokeWidth={3}
        />
        {/* Marcador de inicio */}
        <Marker
          coordinate={validCoordinates[0]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[miniMapStyles.marker, { backgroundColor: '#10B981' }]} />
        </Marker>
        {/* Marcador de fin */}
        <Marker
          coordinate={validCoordinates[validCoordinates.length - 1]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[miniMapStyles.marker, { backgroundColor: '#EF4444' }]} />
        </Marker>
      </MapView>
      {/* Overlay para hacer tap en toda el área */}
      <View style={miniMapStyles.overlay}>
        <View style={miniMapStyles.tapHint}>
          <Icon source="map-search" size={16} color="#FFFFFF" />
          <Text style={miniMapStyles.tapHintText}>Ver ruta</Text>
        </View>
      </View>
    </View>
  );
};

const miniMapStyles = StyleSheet.create({
  container: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  tapHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

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
    const hasRoute = item.routeCoordinates && item.routeCoordinates.length > 0;
    
    // Obtener nombres de acompañantes
    const getCompanionNames = () => {
      if (!item.companionPetIds || item.companionPetIds.length === 0) return null;
      
      // Si es un paseo de acompañante, mostrar la mascota principal
      if (item.isCompanionWalk && item.originalPetId) {
        const originalPet = pets.find(p => p.id === item.originalPetId);
        const otherCompanions = item.companionPetIds
          .filter(id => id !== petId)
          .map(id => pets.find(p => p.id === id)?.name)
          .filter(Boolean);
        
        if (originalPet) {
          const allNames = [originalPet.name, ...otherCompanions];
          return allNames.join(', ');
        }
      }
      
      // Si es el paseo principal, mostrar acompañantes
      const names = item.companionPetIds
        .map(id => pets.find(p => p.id === id)?.name)
        .filter(Boolean);
      return names.join(', ');
    };
    
    const companionNames = getCompanionNames();

    return (
      <Card style={styles.walkCard}>
        <TouchableOpacity
          onPress={() => hasRoute 
            ? navigation.navigate('RouteView', { petId, walkId: item.id })
            : navigation.navigate('AddWalk', { petId, walkId: item.id })
          }
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
              <View style={styles.walkTitleRow}>
                <Text style={[styles.walkType, { color: theme.colors.onSurface }]}>
                  {WALK_TYPE_LABELS[item.type]}
                </Text>
                {hasRoute && (
                  <View style={[styles.routeBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
                    <Icon source="map-marker-path" size={12} color={theme.colors.onTertiaryContainer} />
                    <Text style={[styles.routeBadgeText, { color: theme.colors.onTertiaryContainer }]}>
                      Ruta
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.walkDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(item.date.toDate())}
              </Text>
            </View>
            {moodInfo && (
              <Icon source={moodInfo.icon} size={24} color={moodInfo.color} />
            )}
          </View>

          {/* Acompañantes */}
          {companionNames && (
            <View style={[styles.companionRow, { backgroundColor: theme.colors.primaryContainer }]}>
              <Icon source="account-group" size={16} color={theme.colors.onPrimaryContainer} />
              <Text style={[styles.companionText, { color: theme.colors.onPrimaryContainer }]}>
                {item.isCompanionWalk ? 'Paseó con' : 'Con'}: {companionNames}
              </Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="clock-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.statBoxText, { color: theme.colors.onSurface }]}>
                {formatDuration(item.durationMinutes)}
              </Text>
            </View>
            {item.distanceKm && (
              <View style={[styles.statBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Icon source="map-marker-distance" size={16} color={theme.colors.secondary} />
                <Text style={[styles.statBoxText, { color: theme.colors.onSurface }]}>
                  {item.distanceKm.toFixed(1)} km
                </Text>
              </View>
            )}
            {item.steps && (
              <View style={[styles.statBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Icon source="shoe-print" size={16} color={theme.colors.tertiary} />
                <Text style={[styles.statBoxText, { color: theme.colors.onSurface }]}>
                  {item.steps.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Mini mapa con la ruta */}
          {hasRoute && (
            <MiniRouteMap 
              coordinates={item.routeCoordinates!} 
              primaryColor={theme.colors.primary}
            />
          )}

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
  walkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  walkType: {
    fontSize: 16,
    fontWeight: '600',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 2,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  walkDate: {
    fontSize: 12,
    marginTop: 2,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  companionText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  statBoxText: {
    fontSize: 13,
    fontWeight: '500',
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
