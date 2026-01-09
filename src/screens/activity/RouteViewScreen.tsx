import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, useTheme, IconButton, FAB } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { spacing } from '../../constants/theme';
import { Card, Loading } from '../../components/ui';
import { PetsStackParamList, Walk, RouteCoordinate } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { getWalk } from '../../services/walkService';
import { formatDate } from '../../utils/dateUtils';

type RouteViewRouteProp = RouteProp<PetsStackParamList, 'RouteView'>;
type RouteViewNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'RouteView'>;

const { width, height } = Dimensions.get('window');

// Estilo de mapa oscuro
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

const RouteViewScreen = () => {
  const theme = useTheme();
  const route = useRoute<RouteViewRouteProp>();
  const navigation = useNavigation<RouteViewNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { petId, walkId } = route.params;
  const pet = pets.find((p) => p.id === petId);

  const mapRef = useRef<MapView>(null);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<RouteCoordinate | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadWalk();
  }, []);

  useEffect(() => {
    if (isFollowing) {
      startLocationTracking();
    }
    return () => {
      // Cleanup location subscription would go here
    };
  }, [isFollowing]);

  const loadWalk = async () => {
    if (!user) return;
    try {
      const walkData = await getWalk(user.uid, petId, walkId);
      setWalk(walkData);
      
      // Centrar el mapa en la ruta
      if (walkData?.routeCoordinates && walkData.routeCoordinates.length > 0) {
        setTimeout(() => {
          fitMapToRoute(walkData.routeCoordinates!);
        }, 500);
      }
    } catch (error) {
      console.error('Error loading walk:', error);
    } finally {
      setLoading(false);
    }
  };

  const fitMapToRoute = (coordinates: RouteCoordinate[]) => {
    if (coordinates.length === 0) return;
    
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
      animated: true,
    });
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setIsFollowing(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setCurrentLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    // Suscribirse a actualizaciones de ubicación
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (location) => {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );
  };

  const getRegionForRoute = (coordinates: RouteCoordinate[]) => {
    if (coordinates.length === 0) return null;

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach((coord) => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.5;
    const deltaLng = (maxLng - minLng) * 1.5;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(deltaLat, 0.01),
      longitudeDelta: Math.max(deltaLng, 0.01),
    };
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!walk || !walk.routeCoordinates || walk.routeCoordinates.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            Este paseo no tiene ruta guardada
          </Text>
        </View>
      </View>
    );
  }

  const initialRegion = getRegionForRoute(walk.routeCoordinates);
  const startPoint = walk.routeCoordinates[0];
  const endPoint = walk.routeCoordinates[walk.routeCoordinates.length - 1];

  return (
    <View style={styles.container}>
      {/* Mapa con la ruta */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={darkMapStyle}
        userInterfaceStyle="dark"
        initialRegion={initialRegion || undefined}
        showsUserLocation={isFollowing}
        showsMyLocationButton={false}
      >
        {/* Ruta del paseo */}
        <Polyline
          coordinates={walk.routeCoordinates}
          strokeColor={theme.colors.primary}
          strokeWidth={4}
        />

        {/* Marcador de inicio */}
        <Marker
          coordinate={startPoint}
          title="Inicio"
          pinColor="#10B981"
        />

        {/* Marcador de fin */}
        <Marker
          coordinate={endPoint}
          title="Fin"
          pinColor="#EF4444"
        />

        {/* Ubicación actual si está siguiendo */}
        {isFollowing && currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Tu ubicación"
          >
            <View style={[styles.currentLocationMarker, { backgroundColor: theme.colors.tertiary }]}>
              <View style={[styles.currentLocationInner, { backgroundColor: theme.colors.onTertiary }]} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Panel de información */}
      <View style={[styles.infoPanel, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.infoPanelHeader}>
          <Text style={[styles.infoPanelTitle, { color: theme.colors.onSurface }]}>
            🗺️ Ruta de {pet?.name}
          </Text>
          <Text style={[styles.infoPanelDate, { color: theme.colors.onSurfaceVariant }]}>
            {formatDate(walk.date.toDate())}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.statValue, { color: theme.colors.onPrimaryContainer }]}>
              {formatDuration(walk.durationMinutes)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onPrimaryContainer }]}>
              Duración
            </Text>
          </View>

          {walk.distanceKm && (
            <View style={[styles.statBox, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text style={[styles.statValue, { color: theme.colors.onSecondaryContainer }]}>
                {walk.distanceKm.toFixed(2)} km
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSecondaryContainer }]}>
                Distancia
              </Text>
            </View>
          )}

          {walk.steps && (
            <View style={[styles.statBox, { backgroundColor: theme.colors.tertiaryContainer }]}>
              <Text style={[styles.statValue, { color: theme.colors.onTertiaryContainer }]}>
                {walk.steps.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onTertiaryContainer }]}>
                Pasos
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.routePoints, { color: theme.colors.onSurfaceVariant }]}>
          📍 {walk.routeCoordinates.length} puntos registrados
        </Text>
      </View>

      {/* Botón para centrar en la ruta */}
      <IconButton
        icon="crosshairs-gps"
        mode="contained"
        size={24}
        containerColor={theme.colors.surface}
        iconColor={theme.colors.primary}
        style={styles.centerButton}
        onPress={() => fitMapToRoute(walk.routeCoordinates!)}
      />

      {/* FAB para rehacer la ruta */}
      <FAB
        icon={isFollowing ? 'stop' : 'navigation'}
        label={isFollowing ? 'Dejar de seguir' : 'Rehacer ruta'}
        style={[styles.fab, { backgroundColor: isFollowing ? theme.colors.error : theme.colors.primary }]}
        color={isFollowing ? theme.colors.onError : theme.colors.onPrimary}
        onPress={() => setIsFollowing(!isFollowing)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  infoPanelHeader: {
    marginBottom: spacing.md,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoPanelDate: {
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  routePoints: {
    fontSize: 12,
    textAlign: 'center',
  },
  centerButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
  },
  currentLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default RouteViewScreen;
