import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { colors, typography, spacing } from '../../constants/theme';
import { Loading } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { createVisit, getVisit, updateVisit } from '../../services/vetVisitService';
import { PetsStackParamList } from '../../types';

type AddVisitRouteProp = RouteProp<PetsStackParamList, 'AddVisit'>;
type AddVisitNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'AddVisit'>;

const visitSchema = z.object({
  date: z.date({
    required_error: 'La fecha es requerida',
  }),
  reason: z.string().min(1, 'El motivo es requerido'),
  clinicName: z.string().min(1, 'La clínica veterinaria es requerida'),
  diagnosis: z.string().optional(),
  vetName: z.string().optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

const AddVisitScreen = () => {
  const route = useRoute<AddVisitRouteProp>();
  const navigation = useNavigation<AddVisitNavigationProp>();
  const { user } = useAuthStore();
  const { petId, visitId } = route.params;
  const isEditing = !!visitId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      date: new Date(),
      reason: '',
      diagnosis: '',
      vetName: '',
      clinicName: '',
    },
  });

  const selectedDate = watch('date');

  // Cargar datos de la visita si estamos editando
  useEffect(() => {
    const loadVisit = async () => {
      if (!user || !visitId) return;
      
      try {
        const visit = await getVisit(user.uid, petId, visitId);
        if (visit) {
          reset({
            date: visit.date.toDate(),
            reason: visit.reason,
            diagnosis: visit.diagnosis || '',
            vetName: visit.vetName || '',
            clinicName: visit.clinicName || '',
          });
          
          if (visit.attachmentUrl) {
            setExistingImageUrl(visit.attachmentUrl);
          }
        }
      } catch (error) {
        console.error('Error cargando visita:', error);
        Alert.alert('Error', 'No se pudo cargar la visita');
      } finally {
        setInitialLoading(false);
      }
    };

    loadVisit();
  }, [user, petId, visitId]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesitan permisos para acceder a la galería'
        );
        return false;
      }
    }
    return true;
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo cargar la imagen');
    }
  };

  const handleImageOptions = () => {
    Alert.alert(
      'Foto de la Receta',
      '¿De dónde quieres obtener la foto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Tomar Foto',
          onPress: () => handlePickImage('camera'),
        },
        {
          text: 'Galería',
          onPress: () => handlePickImage('gallery'),
        },
      ],
      { cancelable: true }
    );
  };

  const onSubmit = async (data: VisitFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      let attachmentUrl: string | undefined = undefined;

      // Guardar URI local de la imagen (sin subir a Firebase Storage)
      if (imageUri) {
        attachmentUrl = imageUri;
        console.log('📸 Guardando referencia de imagen local:', attachmentUrl);
      } else if (existingImageUrl) {
        // Mantener la imagen existente si no se seleccionó una nueva
        attachmentUrl = existingImageUrl;
      }

      // Preparar datos - solo incluir campos con valor
      const visitData: any = {
        date: Timestamp.fromDate(data.date),
        reason: data.reason,
        clinicName: data.clinicName,
      };

      // Añadir campos opcionales solo si tienen valor
      if (data.diagnosis && data.diagnosis.trim()) {
        visitData.diagnosis = data.diagnosis;
      }
      if (data.vetName && data.vetName.trim()) {
        visitData.vetName = data.vetName;
      }
      if (attachmentUrl) {
        visitData.attachmentUrl = attachmentUrl;
      }

      if (isEditing && visitId) {
        // Actualizar visita existente
        await updateVisit(user.uid, petId, visitId, visitData);
        Alert.alert('¡Visita actualizada!', 'La visita se ha actualizado correctamente', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Crear nueva visita
        await createVisit(user.uid, petId, visitData);
        Alert.alert('¡Visita guardada!', 'La visita se ha registrado correctamente', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error al guardar visita:', error);
      Alert.alert('Error', 'No se pudo guardar la visita. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || initialLoading) {
    return <Loading fullScreen message={isEditing ? "Cargando visita..." : "Guardando visita..."} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>
        {isEditing ? 'Editar Visita' : 'Información de la Visita'}
      </Text>

      {/* Fecha */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Fecha de la visita *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) {
                setValue('date', date);
              }
            }}
          />
        )}
        {errors.date && (
          <Text style={styles.errorText}>{errors.date.message}</Text>
        )}
      </View>

      {/* Motivo */}
      <Controller
        control={control}
        name="reason"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Motivo de la visita *"
            mode="outlined"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.reason}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            placeholder="ej. Revisión anual, Cojera, Gastroenteritis..."
          />
        )}
      />
      {errors.reason && (
        <Text style={styles.errorText}>{errors.reason.message}</Text>
      )}

      {/* Clínica */}
      <Controller
        control={control}
        name="clinicName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Clínica Veterinaria *"
            mode="outlined"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.clinicName}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            placeholder="ej. Clínica San Antón"
          />
        )}
      />
      {errors.clinicName && (
        <Text style={styles.errorText}>{errors.clinicName.message}</Text>
      )}

      {/* Veterinario */}
      <Controller
        control={control}
        name="vetName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Nombre del Veterinario"
            mode="outlined"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            placeholder="ej. Dr. García"
          />
        )}
      />

      {/* Diagnóstico */}
      <Controller
        control={control}
        name="diagnosis"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Diagnóstico y Tratamiento"
            mode="outlined"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textArea]}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            placeholder="Describe el diagnóstico y el tratamiento recetado..."
          />
        )}
      />

      {/* Foto de Receta */}
      <Text style={styles.sectionTitle}>Foto de la Receta</Text>
      <TouchableOpacity
        style={styles.imagePickerButton}
        onPress={handleImageOptions}
      >
        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImageUri(null)}
            >
              <MaterialCommunityIcons name="close-circle" size={28} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : existingImageUrl ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: existingImageUrl }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={handleImageOptions}
            >
              <MaterialCommunityIcons name="pencil" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyImageContainer}>
            <MaterialCommunityIcons
              name="camera-plus"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.imagePickerText}>
              Subir foto de la receta
            </Text>
            <Text style={styles.imagePickerSubtext}>
              Opcional
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Botón Guardar */}
      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        labelStyle={styles.submitButtonLabel}
        disabled={loading}
      >
        {isEditing ? 'Actualizar Visita' : 'Guardar Visita'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.button,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 100,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  imagePickerButton: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyImageContainer: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  imagePickerText: {
    ...typography.button,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  imagePickerSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: spacing.sm,
  },
  submitButtonLabel: {
    ...typography.button,
    fontSize: 16,
  },
});

export default AddVisitScreen;
