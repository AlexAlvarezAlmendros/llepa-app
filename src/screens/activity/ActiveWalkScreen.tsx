import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import { Text, useTheme, IconButton, Portal, Modal, Button as PaperButton } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { spacing } from '../../constants/theme';
import { PetsStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';

type ActiveWalkRouteProp = RouteProp<PetsStackParamList, 'ActiveWalk'>;
type ActiveWalkNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'ActiveWalk'>;

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01; // Zoom más alejado para ver el área
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Estilo de mapa oscuro para Google Maps
const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#212121' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1b1b1b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#373737' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#4e4e4e' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }],
  },
];

const ActiveWalkScreen = () => {
  const theme = useTheme();
  const route = useRoute<ActiveWalkRouteProp>();
  const navigation = useNavigation<ActiveWalkNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { petId } = route.params;
  const pet = pets.find((p) => p.id === petId);

  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const pedometerSubscription = useRef<Pedometer.Subscription | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Estados
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  
  // Datos del paseo
  const [routeCoordinates, setRouteCoordinates] = useState<LocationPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [steps, setSteps] = useState(0);
  const [stepsBeforePause, setStepsBeforePause] = useState(0); // Pasos acumulados antes de pausar
  const [distance, setDistance] = useState(0); // en metros
  const [elapsedTime, setElapsedTime] = useState(0); // en segundos
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Permisos y setup inicial
  useEffect(() => {
    const setupLocation = async () => {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu ubicación para rastrear el paseo',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Obtener ubicación inicial
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      };
      
      setCurrentLocation(newLocation);
      setIsLoadingLocation(false);
    };

    setupLocation();

    // Cleanup al desmontar
    return () => {
      stopAllTracking();
    };
  }, []);

  // Manejar estado de la app (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isTracking, isPaused]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App volvió al foreground
      if (isTracking && !isPaused) {
        // Reconectar tracking si estaba activo
      }
    }
    appState.current = nextAppState;
  };

  // Calcular distancia entre dos puntos (fórmula Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Iniciar tracking
  const startTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);
    setStartTime(new Date());

    // Iniciar timer
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Iniciar tracking de ubicación
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000, // Cada 2 segundos
        distanceInterval: 5, // O cada 5 metros
      },
      (location) => {
        const newPoint: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        setCurrentLocation(newPoint);
        
        setRouteCoordinates((prev) => {
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const dist = calculateDistance(
              lastPoint.latitude,
              lastPoint.longitude,
              newPoint.latitude,
              newPoint.longitude
            );
            // Solo añadir si hay movimiento significativo (más de 2 metros)
            if (dist > 2) {
              setDistance((prevDist) => prevDist + dist);
              return [...prev, newPoint];
            }
            return prev;
          }
          return [newPoint];
        });

        // Centrar mapa en ubicación actual
        mapRef.current?.animateToRegion({
          ...newPoint,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      }
    );

    // Iniciar podómetro si está disponible
    const isPedometerAvailable = await Pedometer.isAvailableAsync();
    if (isPedometerAvailable) {
      // watchStepCount devuelve pasos desde que se inicia la suscripción
      // así que simplemente mostramos esos pasos directamente
      pedometerSubscription.current = Pedometer.watchStepCount((result) => {
        // result.steps son los pasos desde que se inició el watch
        setSteps(result.steps);
      });
    }
  };

  // Pausar tracking
  const pauseTracking = () => {
    setIsPaused(true);
    
    // Guardar los pasos actuales antes de pausar
    setStepsBeforePause((prev) => prev + steps);
    setSteps(0); // Resetear para el próximo watchStepCount
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    locationSubscription.current?.remove();
    locationSubscription.current = null;
    
    // Detener podómetro al pausar
    pedometerSubscription.current?.remove();
    pedometerSubscription.current = null;
  };

  // Reanudar tracking
  const resumeTracking = async () => {
    setIsPaused(false);

    // Reiniciar timer
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    
    // Reiniciar podómetro
    const isPedometerAvailable = await Pedometer.isAvailableAsync();
    if (isPedometerAvailable) {
      pedometerSubscription.current = Pedometer.watchStepCount((result) => {
        setSteps(result.steps);
      });
    }

    // Reiniciar tracking de ubicación
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => {
        const newPoint: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        setCurrentLocation(newPoint);
        
        setRouteCoordinates((prev) => {
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const dist = calculateDistance(
              lastPoint.latitude,
              lastPoint.longitude,
              newPoint.latitude,
              newPoint.longitude
            );
            if (dist > 2) {
              setDistance((prevDist) => prevDist + dist);
              return [...prev, newPoint];
            }
            return prev;
          }
          return [...prev, newPoint];
        });

        mapRef.current?.animateToRegion({
          ...newPoint,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      }
    );
  };

  // Detener todo el tracking
  const stopAllTracking = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    
    pedometerSubscription.current?.remove();
    pedometerSubscription.current = null;
  };

  // Finalizar paseo
  const finishWalk = () => {
    stopAllTracking();
    
    // Navegar a AddWalk con los datos del tracking
    navigation.replace('AddWalk', {
      petId,
      trackingData: {
        routeCoordinates: routeCoordinates.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
        steps: steps + stepsBeforePause, // Total de pasos incluyendo pausas
        distanceKm: distance / 1000,
        durationMinutes: Math.round(elapsedTime / 60),
        startTime: startTime?.toISOString(),
      },
    });
  };

  // Cancelar paseo
  const cancelWalk = () => {
    stopAllTracking();
    navigation.goBack();
  };

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear distancia
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  return (
    <View style={styles.container}>
      {/* Loading mientras se obtiene ubicación */}
      {isLoadingLocation ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.loadingIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={styles.loadingEmoji}>📍</Text>
            </View>
            <Text style={[styles.loadingTitle, { color: theme.colors.onSurface }]}>
              Preparando el paseo
            </Text>
            <Text style={[styles.loadingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Obteniendo tu ubicación GPS...
            </Text>
            <ActivityIndicator 
              size="large" 
              color={theme.colors.primary} 
              style={styles.loadingSpinner}
            />
            <Text style={[styles.loadingHint, { color: theme.colors.onSurfaceVariant }]}>
              🐾 Paseando con {pet?.name}
            </Text>
          </View>
        </View>
      ) : (
        /* Mapa */
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={darkMapStyle}
          userInterfaceStyle="dark"
          region={
            currentLocation
              ? {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: LATITUDE_DELTA,
                  longitudeDelta: LONGITUDE_DELTA,
                }
              : undefined
          }
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={false}
          scrollEnabled={!isTracking || isPaused}
          zoomEnabled={!isTracking || isPaused}
        >
          {/* Ruta del paseo */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
            />
          )}
          
          {/* Marcador de inicio */}
          {routeCoordinates.length > 0 && (
            <Marker
              coordinate={routeCoordinates[0]}
              title="Inicio"
              pinColor="#10B981"
            />
          )}
        </MapView>
      )}

      {/* HUD - Panel de información */}
      <View style={[styles.hudContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.hudRow}>
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, { color: theme.colors.onSurfaceVariant }]}>
              Tiempo
            </Text>
            <Text style={[styles.hudValue, { color: theme.colors.onSurface }]}>
              {formatTime(elapsedTime)}
            </Text>
          </View>
          
          <View style={[styles.hudDivider, { backgroundColor: theme.colors.outlineVariant }]} />
          
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, { color: theme.colors.onSurfaceVariant }]}>
              Distancia
            </Text>
            <Text style={[styles.hudValue, { color: theme.colors.onSurface }]}>
              {formatDistance(distance)}
            </Text>
          </View>
          
          <View style={[styles.hudDivider, { backgroundColor: theme.colors.outlineVariant }]} />
          
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, { color: theme.colors.onSurfaceVariant }]}>
              Pasos
            </Text>
            <Text style={[styles.hudValue, { color: theme.colors.onSurface }]}>
              {(steps + stepsBeforePause).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Info de mascota */}
        <View style={[styles.petInfo, { borderTopColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.petName, { color: theme.colors.primary }]}>
            🐾 Paseando con {pet?.name}
          </Text>
        </View>
      </View>

      {/* Controles */}
      <View style={[styles.controlsContainer, { backgroundColor: theme.colors.surface }]}>
        {!isTracking ? (
          // Botón de iniciar
          <IconButton
            icon="play"
            mode="contained"
            size={48}
            iconColor={theme.colors.onPrimary}
            containerColor={theme.colors.primary}
            onPress={startTracking}
            style={styles.mainButton}
          />
        ) : (
          <View style={styles.trackingControls}>
            {/* Botón de cancelar */}
            <IconButton
              icon="close"
              mode="contained"
              size={32}
              iconColor={theme.colors.onErrorContainer}
              containerColor={theme.colors.errorContainer}
              onPress={() => setShowConfirmModal(true)}
            />
            
            {/* Botón de pausar/reanudar */}
            <IconButton
              icon={isPaused ? 'play' : 'pause'}
              mode="contained"
              size={48}
              iconColor={theme.colors.onPrimary}
              containerColor={isPaused ? theme.colors.primary : theme.colors.secondary}
              onPress={isPaused ? resumeTracking : pauseTracking}
              style={styles.mainButton}
            />
            
            {/* Botón de finalizar */}
            <IconButton
              icon="stop"
              mode="contained"
              size={32}
              iconColor={theme.colors.onTertiaryContainer}
              containerColor={theme.colors.tertiaryContainer}
              onPress={finishWalk}
              disabled={elapsedTime < 10} // Mínimo 10 segundos
            />
          </View>
        )}
        
        {!isTracking && (
          <Text style={[styles.startHint, { color: theme.colors.onSurfaceVariant }]}>
            Pulsa play para iniciar el paseo
          </Text>
        )}
        
        {isTracking && isPaused && (
          <Text style={[styles.pausedText, { color: theme.colors.secondary }]}>
            ⏸️ Paseo en pausa
          </Text>
        )}
      </View>

      {/* Modal de confirmación para cancelar */}
      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => setShowConfirmModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            ¿Cancelar paseo?
          </Text>
          <Text style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}>
            Se perderán todos los datos del paseo actual.
          </Text>
          <View style={styles.modalButtons}>
            <PaperButton
              mode="outlined"
              onPress={() => setShowConfirmModal(false)}
              style={styles.modalButton}
            >
              Continuar
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={cancelWalk}
              buttonColor={theme.colors.error}
              style={styles.modalButton}
            >
              Cancelar paseo
            </PaperButton>
          </View>
        </Modal>
      </Portal>
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
  hudContainer: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  hudItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  hudValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  hudDivider: {
    width: 1,
    height: 40,
  },
  petInfo: {
    borderTopWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  petName: {
    fontSize: 14,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mainButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  trackingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  startHint: {
    marginTop: spacing.sm,
    fontSize: 14,
  },
  pausedText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loadingEmoji: {
    fontSize: 36,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loadingSpinner: {
    marginVertical: spacing.lg,
  },
  loadingHint: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ActiveWalkScreen;
