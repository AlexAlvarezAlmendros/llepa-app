import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, useTheme, SegmentedButtons, Banner, Icon } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { spacing } from '../../constants/theme';
import { Button, Card, Loading, Input } from '../../components/ui';
import { TypeSelector, DatePickerField } from '../../components/forms';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useDialog } from '../../contexts/DialogContext';
import { PetsStackParamList, WalkType, RouteCoordinate } from '../../types';
import {
  createWalk,
  updateWalk,
  getWalk,
} from '../../services/walkService';

type AddWalkRouteProp = RouteProp<PetsStackParamList, 'AddWalk'>;
type AddWalkNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'AddWalk'>;

const schema = z.object({
  date: z.date(),
  type: z.enum(['SHORT', 'MEDIUM', 'LONG', 'HIKE', 'RUN', 'PLAY']),
  durationMinutes: z.number().min(1, 'La duración debe ser mayor a 0'),
  distanceKm: z.number().optional(),
  steps: z.number().optional(),
  mood: z.enum(['HAPPY', 'NORMAL', 'TIRED', 'EXCITED']).optional(),
  weather: z.enum(['SUNNY', 'CLOUDY', 'RAINY', 'COLD', 'HOT']).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const WALK_TYPE_OPTIONS = [
  { value: 'SHORT' as const, label: 'Corto', icon: 'walk' },
  { value: 'MEDIUM' as const, label: 'Medio', icon: 'hiking' },
  { value: 'LONG' as const, label: 'Largo', icon: 'map-marker-distance' },
  { value: 'HIKE' as const, label: 'Excursión', icon: 'terrain' },
  { value: 'RUN' as const, label: 'Carrera', icon: 'run-fast' },
  { value: 'PLAY' as const, label: 'Juego', icon: 'dog' },
];

const MOOD_BUTTONS = [
  { value: 'HAPPY', label: '😊', icon: 'emoticon-happy' },
  { value: 'NORMAL', label: '😐', icon: 'emoticon-neutral' },
  { value: 'TIRED', label: '😫', icon: 'emoticon-sad' },
  { value: 'EXCITED', label: '🤩', icon: 'emoticon-excited' },
];

const WEATHER_OPTIONS = [
  { value: 'SUNNY' as const, label: 'Sol', icon: 'weather-sunny' },
  { value: 'CLOUDY' as const, label: 'Nubes', icon: 'weather-cloudy' },
  { value: 'RAINY' as const, label: 'Lluvia', icon: 'weather-rainy' },
  { value: 'COLD' as const, label: 'Frío', icon: 'snowflake' },
  { value: 'HOT' as const, label: 'Calor', icon: 'weather-sunny-alert' },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

const AddWalkScreen = () => {
  const theme = useTheme();
  const route = useRoute<AddWalkRouteProp>();
  const navigation = useNavigation<AddWalkNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { showSuccess, showError } = useDialog();

  const { petId, walkId, trackingData } = route.params;
  const pet = pets.find((p) => p.id === petId);
  const isEditing = !!walkId;
  const isFromTracking = !!trackingData;

  // Estado para guardar la ruta del tracking
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date(),
      type: 'MEDIUM',
      durationMinutes: 30,
      mood: undefined,
      weather: undefined,
      notes: '',
    },
  });

  const durationMinutes = watch('durationMinutes');

  useEffect(() => {
    if (isEditing && user) {
      loadWalk();
    }
  }, [isEditing, user]);

  // Precargar datos del tracking
  useEffect(() => {
    if (trackingData) {
      // Guardar la ruta
      if (trackingData.routeCoordinates?.length > 0) {
        setRouteCoordinates(trackingData.routeCoordinates);
      }
      
      // Determinar tipo de paseo según duración
      let walkType: WalkType = 'MEDIUM';
      if (trackingData.durationMinutes <= 20) walkType = 'SHORT';
      else if (trackingData.durationMinutes >= 60) walkType = 'LONG';
      
      setValue('type', walkType);
      setValue('durationMinutes', trackingData.durationMinutes || 30);
      setValue('distanceKm', trackingData.distanceKm || undefined);
      setValue('steps', trackingData.steps || undefined);
      
      // Si tenemos hora de inicio, usarla
      if (trackingData.startTime) {
        setValue('date', new Date(trackingData.startTime));
      }
    }
  }, [trackingData]);

  const loadWalk = async () => {
    if (!user || !walkId) return;
    try {
      const walk = await getWalk(user.uid, petId, walkId);
      if (walk) {
        setValue('date', walk.date.toDate());
        setValue('type', walk.type);
        setValue('durationMinutes', walk.durationMinutes);
        setValue('distanceKm', walk.distanceKm);
        setValue('steps', walk.steps);
        setValue('mood', walk.mood);
        setValue('weather', walk.weather);
        setValue('notes', walk.notes || '');
      }
    } catch (error) {
      showError('Error', 'No se pudo cargar el paseo');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const walkData = {
        date: Timestamp.fromDate(data.date),
        type: data.type as WalkType,
        durationMinutes: data.durationMinutes,
        distanceKm: data.distanceKm,
        steps: data.steps,
        routeCoordinates: routeCoordinates.length > 0 ? routeCoordinates : undefined,
        mood: data.mood as any,
        weather: data.weather as any,
        notes: data.notes,
      };

      if (isEditing && walkId) {
        await updateWalk(user.uid, petId, walkId, walkData);
        showSuccess('Actualizado', 'El paseo se ha actualizado correctamente');
      } else {
        await createWalk(user.uid, petId, walkData);
        showSuccess('¡Genial!', `Paseo con ${pet?.name} registrado`);
      }
      navigation.goBack();
    } catch (error) {
      showError('Error', isEditing ? 'No se pudo actualizar el paseo' : 'No se pudo registrar el paseo');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <Loading fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner de tracking */}
        {isFromTracking && (
          <Banner
            visible={true}
            icon={({ size }) => (
              <Icon source="map-marker-check" size={size} color={theme.colors.primary} />
            )}
            style={styles.trackingBanner}
          >
            📍 Datos capturados automáticamente del tracking GPS.
            {routeCoordinates.length > 0 && ` Ruta guardada con ${routeCoordinates.length} puntos.`}
          </Banner>
        )}

        {/* Fecha */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Fecha del paseo
          </Text>
          <Controller
            control={control}
            name="date"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Fecha"
                value={value}
                onChange={onChange}
                mode="datetime"
              />
            )}
          />
        </Card>

        {/* Tipo de paseo */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Tipo de actividad
          </Text>
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <TypeSelector
                items={WALK_TYPE_OPTIONS}
                value={value}
                onValueChange={onChange}
                columns={3}
              />
            )}
          />
        </Card>

        {/* Duración */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Duración: {durationMinutes} minutos
          </Text>
          <View style={styles.durationPresetsRow}>
            {DURATION_PRESETS.map((preset) => (
              <Button
                key={preset}
                mode={durationMinutes === preset ? 'contained' : 'outlined'}
                onPress={() => setValue('durationMinutes', preset)}
                style={styles.presetButton}
              >
                {`${preset} min`}
              </Button>
            ))}
          </View>
          <Controller
            control={control}
            name="durationMinutes"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Duración personalizada (minutos)"
                value={value?.toString()}
                onChangeText={(text) => onChange(parseInt(text) || 0)}
                keyboardType="numeric"
                error={errors.durationMinutes?.message}
              />
            )}
          />
        </Card>

        {/* Distancia y pasos (opcionales) */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Datos adicionales (opcional)
          </Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                name="distanceKm"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Distancia (km)"
                    value={value?.toString() || ''}
                    onChangeText={(text) => onChange(parseFloat(text) || undefined)}
                    keyboardType="decimal-pad"
                    placeholder="Ej: 2.5"
                  />
                )}
              />
            </View>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                name="steps"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Pasos"
                    value={value?.toString() || ''}
                    onChangeText={(text) => onChange(parseInt(text) || undefined)}
                    keyboardType="numeric"
                    placeholder="Ej: 3000"
                  />
                )}
              />
            </View>
          </View>
        </Card>

        {/* Estado de ánimo */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            ¿Cómo estaba {pet?.name}?
          </Text>
          <Controller
            control={control}
            name="mood"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value || ''}
                onValueChange={onChange}
                buttons={MOOD_BUTTONS}
                style={styles.segmentedButtons}
              />
            )}
          />
        </Card>

        {/* Clima */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Clima (opcional)
          </Text>
          <Controller
            control={control}
            name="weather"
            render={({ field: { value, onChange } }) => (
              <TypeSelector
                items={WEATHER_OPTIONS}
                value={value || 'SUNNY'}
                onValueChange={onChange}
                columns={3}
              />
            )}
          />
        </Card>

        {/* Notas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Notas (opcional)
          </Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Notas"
                value={value || ''}
                onChangeText={onChange}
                placeholder="¿Algo especial durante el paseo?"
                multiline
                numberOfLines={3}
              />
            )}
          />
        </Card>

        {/* Botón guardar */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          {isEditing ? 'Actualizar' : 'Registrar paseo'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  trackingBanner: {
    marginBottom: spacing.md,
    borderRadius: 12,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  durationPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetButton: {
    minWidth: 70,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});

export default AddWalkScreen;
