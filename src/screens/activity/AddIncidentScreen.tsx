import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Text, useTheme, SegmentedButtons, Chip, IconButton } from 'react-native-paper';
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
import { useImagePicker } from '../../hooks/useImagePicker';
import { PetsStackParamList, IncidentCategory, IncidentSeverity } from '../../types';
import {
  createIncident,
  updateIncident,
  getIncident,
} from '../../services/incidentService';
import { uploadImageToImgbb, generateImageName } from '../../services/imgbbService';

type AddIncidentRouteProp = RouteProp<PetsStackParamList, 'AddIncident'>;
type AddIncidentNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'AddIncident'>;

const schema = z.object({
  date: z.date(),
  category: z.enum(['DIGESTIVE', 'MOBILITY', 'SKIN', 'RESPIRATORY', 'BEHAVIOR', 'INJURY', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORY_OPTIONS = [
  { value: 'DIGESTIVE' as const, label: 'Digestivo', icon: 'stomach' },
  { value: 'MOBILITY' as const, label: 'Movilidad', icon: 'walk' },
  { value: 'SKIN' as const, label: 'Piel', icon: 'hand-back-left' },
  { value: 'RESPIRATORY' as const, label: 'Respiratorio', icon: 'lungs' },
  { value: 'BEHAVIOR' as const, label: 'Comportamiento', icon: 'head-question' },
  { value: 'INJURY' as const, label: 'Lesión', icon: 'bandage' },
  { value: 'OTHER' as const, label: 'Otro', icon: 'help-circle' },
];

const SEVERITY_BUTTONS = [
  { value: 'LOW', label: 'Leve' },
  { value: 'MEDIUM', label: 'Moderado' },
  { value: 'HIGH', label: 'Grave' },
];

const COMMON_SYMPTOMS: Record<IncidentCategory, string[]> = {
  DIGESTIVE: ['Vómitos', 'Diarrea', 'No come', 'Estreñimiento', 'Gases', 'Babeo excesivo'],
  MOBILITY: ['Cojera', 'Rigidez', 'No salta', 'Se queja al moverse', 'No quiere pasear'],
  SKIN: ['Rascado excesivo', 'Pérdida de pelo', 'Enrojecimiento', 'Bultos', 'Caspa', 'Heridas'],
  RESPIRATORY: ['Tos', 'Estornudos', 'Dificultad respirar', 'Ruidos al respirar', 'Moqueo'],
  BEHAVIOR: ['Apatía', 'Ansiedad', 'Agresividad', 'No duerme', 'Exceso de sed', 'Desorientación'],
  INJURY: ['Herida abierta', 'Cojera súbita', 'Hinchazón', 'Sangrado', 'Dolor al tocar'],
  OTHER: ['Fiebre', 'Temblores', 'Ojos rojos', 'Mal aliento', 'Cambio de peso'],
};

const QUICK_TITLES: Record<IncidentCategory, string[]> = {
  DIGESTIVE: ['Ha vomitado', 'Tiene diarrea', 'No quiere comer', 'Problemas estomacales'],
  MOBILITY: ['Cojea un poco', 'Le cuesta levantarse', 'No quiere pasear'],
  SKIN: ['Se rasca mucho', 'Tiene una calva', 'Tiene un bulto'],
  RESPIRATORY: ['Tose mucho', 'Tiene mocos', 'Respira raro'],
  BEHAVIOR: ['Está muy apático', 'Está nervioso', 'Actúa raro'],
  INJURY: ['Se ha hecho una herida', 'Se ha golpeado', 'Tiene dolor'],
  OTHER: ['Algo no está bien', 'Comportamiento inusual'],
};

const AddIncidentScreen = () => {
  const theme = useTheme();
  const route = useRoute<AddIncidentRouteProp>();
  const navigation = useNavigation<AddIncidentNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { showSuccess, showError } = useDialog();
  const { imageUri: pickedImageUri, pickImage, takePhoto, clearImage } = useImagePicker();

  const { petId, incidentId } = route.params;
  const pet = pets.find((p) => p.id === petId);
  const isEditing = !!incidentId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

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
      category: 'DIGESTIVE',
      severity: 'LOW',
      title: '',
      description: '',
      symptoms: [],
    },
  });

  const selectedCategory = watch('category') as IncidentCategory;

  useEffect(() => {
    if (isEditing && user) {
      loadIncident();
    }
  }, [isEditing, user]);

  const loadIncident = async () => {
    if (!user || !incidentId) return;
    try {
      const incident = await getIncident(user.uid, petId, incidentId);
      if (incident) {
        setValue('date', incident.date.toDate());
        setValue('category', incident.category);
        setValue('severity', incident.severity);
        setValue('title', incident.title);
        setValue('description', incident.description || '');
        setSelectedSymptoms(incident.symptoms || []);
        if (incident.photoUrl) {
          setExistingPhotoUrl(incident.photoUrl);
        }
      }
    } catch (error) {
      showError('Error', 'No se pudo cargar el incidente');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  // Sincronizar con el hook de imagePicker
  useEffect(() => {
    if (pickedImageUri) {
      setPhotoUri(pickedImageUri);
      setExistingPhotoUrl(null);
    }
  }, [pickedImageUri]);

  const handlePickImage = async () => {
    await pickImage();
  };

  const handleTakePhoto = async () => {
    await takePhoto();
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setLoading(true);
    try {
      let photoUrl = existingPhotoUrl || undefined;

      // Subir foto a imgbb si hay una nueva
      if (photoUri) {
        try {
          photoUrl = await uploadImageToImgbb(photoUri, generateImageName('incident'));
        } catch (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          // Continuar sin foto si falla la subida
        }
      }

      const incidentData = {
        date: Timestamp.fromDate(data.date),
        category: data.category as IncidentCategory,
        severity: data.severity as IncidentSeverity,
        title: data.title,
        description: data.description,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
        resolved: false,
        photoUrl,
      };

      if (isEditing && incidentId) {
        await updateIncident(user.uid, petId, incidentId, incidentData);
        showSuccess('Actualizado', 'El incidente se ha actualizado correctamente');
      } else {
        await createIncident(user.uid, petId, incidentData);
        showSuccess('Registrado', 'El incidente se ha registrado. ¡Esperamos que se mejore pronto!');
      }
      navigation.goBack();
    } catch (error) {
      showError('Error', isEditing ? 'No se pudo actualizar' : 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <Loading fullScreen />;
  }

  const currentPhotoUri = photoUri || existingPhotoUrl;

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
        {/* Fecha */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            ¿Cuándo ocurrió?
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

        {/* Categoría */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            ¿Qué tipo de problema?
          </Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { value, onChange } }) => (
              <TypeSelector
                items={CATEGORY_OPTIONS}
                value={value}
                onValueChange={(newValue: IncidentCategory) => {
                  onChange(newValue);
                  setSelectedSymptoms([]); // Limpiar síntomas al cambiar categoría
                }}
                columns={2}
              />
            )}
          />
        </Card>

        {/* Severidad */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            ¿Qué tan grave es?
          </Text>
          <Controller
            control={control}
            name="severity"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={SEVERITY_BUTTONS}
                style={styles.segmentedButtons}
              />
            )}
          />
        </Card>

        {/* Título */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Describe brevemente
          </Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Título"
                value={value}
                onChangeText={onChange}
                placeholder="Ej: Hoy ha vomitado"
                error={errors.title?.message}
              />
            )}
          />
          
          {/* Sugerencias rápidas */}
          <Text style={[styles.suggestionsLabel, { color: theme.colors.onSurfaceVariant }]}>
            Sugerencias:
          </Text>
          <View style={styles.suggestionsRow}>
            {QUICK_TITLES[selectedCategory].map((title) => (
              <Button
                key={title}
                mode="outlined"
                onPress={() => setValue('title', title)}
                style={styles.suggestionChip}
              >
                {title}
              </Button>
            ))}
          </View>
        </Card>

        {/* Síntomas */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Síntomas observados
          </Text>
          <View style={styles.symptomsGrid}>
            {COMMON_SYMPTOMS[selectedCategory].map((symptom) => (
              <Chip
                key={symptom}
                mode={selectedSymptoms.includes(symptom) ? 'flat' : 'outlined'}
                selected={selectedSymptoms.includes(symptom)}
                onPress={() => toggleSymptom(symptom)}
                style={styles.symptomChip}
              >
                {symptom}
              </Chip>
            ))}
          </View>
        </Card>

        {/* Descripción */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Detalles adicionales (opcional)
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Descripción"
                value={value || ''}
                onChangeText={onChange}
                placeholder="¿Algo más que quieras anotar?"
                multiline
                numberOfLines={4}
              />
            )}
          />
        </Card>

        {/* Foto */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Foto (opcional)
          </Text>
          <Text style={[styles.photoHint, { color: theme.colors.onSurfaceVariant }]}>
            Una foto puede ayudar a tu veterinario
          </Text>
          
          {currentPhotoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: currentPhotoUri }} style={styles.photo} />
              <IconButton
                icon="close"
                mode="contained"
                size={20}
                style={styles.removePhotoButton}
                onPress={() => {
                  setPhotoUri(null);
                  setExistingPhotoUrl(null);
                }}
              />
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleTakePhoto}
                style={styles.photoButton}
              >
                Cámara
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={handlePickImage}
                style={styles.photoButton}
              >
                Galería
              </Button>
            </View>
          )}
        </Card>

        {/* Botón guardar */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          {isEditing ? 'Actualizar' : 'Registrar incidente'}
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
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  suggestionsLabel: {
    fontSize: 12,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  symptomChip: {
    marginBottom: spacing.xs,
  },
  photoHint: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoButton: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});

export default AddIncidentScreen;
