import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { TextInput, SegmentedButtons, Menu, useTheme, Icon } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { spacing } from '../../constants/theme';
import { Button, Input } from '../../components/ui';
import { petSchema } from '../../utils/validation';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useImagePicker } from '../../hooks';
import { PetsStackParamList } from '../../types';
import { z } from 'zod';
import { useDialog } from '../../contexts/DialogContext';
import { uploadImageToImgbb, generateImageName } from '../../services/imgbbService';

type AddPetNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'AddPet'>;

type PetFormData = z.infer<typeof petSchema>;

const AddPetScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<AddPetNavigationProp>();
  const { user } = useAuthStore();
  const { addPet } = usePetStore();
  const { showDialog, showSuccess, showError, hideDialog } = useDialog();
  
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { imageUri: photoUri, pickImage, takePhoto } = useImagePicker();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PetFormData>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: '',
      species: 'Perro',
      breed: '',
      birthDate: new Date(),
      weight: undefined,
      chipNumber: '',
    },
  });

  const birthDate = watch('birthDate');
  const species = watch('species');

  const showImageOptions = () => {
    showDialog({
      title: 'Foto de Perfil',
      message: 'Elige una opción',
      type: 'info',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: hideDialog },
        { text: 'Tomar foto', onPress: () => { hideDialog(); takePhoto(); } },
        { text: 'Elegir de galería', onPress: () => { hideDialog(); pickImage(); } },
      ],
    });
  };

  const onSubmit = async (data: PetFormData) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Subir foto a imgbb si existe
      let photoUrl: string | undefined;
      if (photoUri) {
        try {
          photoUrl = await uploadImageToImgbb(photoUri, generateImageName('pet'));
        } catch (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          // Continuar sin foto si falla la subida
        }
      }

      // Convertir Date a Timestamp de Firestore
      const petData = {
        ...data,
        birthDate: Timestamp.fromDate(data.birthDate),
        photoUrl,
        gender: 'Macho' as const, // Por ahora fijo, después añadiremos selector
      };

      await addPet(user.uid, petData);

      showSuccess('¡Éxito!', 'Mascota añadida correctamente', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error añadiendo mascota:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      showError('Error', 'No se pudo añadir la mascota. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('birthDate', selectedDate);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto de Perfil */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={showImageOptions}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}>
                <Icon
                  source="camera-plus"
                  size={40}
                  color={theme.colors.primary}
                />
                <Text style={[styles.photoText, { color: theme.colors.primary }]}>Añadir Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Nombre */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nombre *"
                value={value}
                onChangeText={onChange}
                placeholder="Rex, Luna, Michi..."
                error={errors.name?.message}
                left={<TextInput.Icon icon="card-account-details" />}
              />
            )}
          />

          {/* Especie */}
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Especie *</Text>
          <Controller
            control={control}
            name="species"
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  {
                    value: 'Perro',
                    label: 'Perro',
                    icon: 'dog',
                  },
                  {
                    value: 'Gato',
                    label: 'Gato',
                    icon: 'cat',
                  },
                  {
                    value: 'Exótico',
                    label: 'Otro',
                    icon: 'paw',
                  },
                ]}
                style={styles.segmentedButtons}
              />
            )}
          />
          {errors.species && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.species.message}</Text>
          )}

          {/* Raza */}
          <Controller
            control={control}
            name="breed"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Raza"
                value={value}
                onChangeText={onChange}
                placeholder="Opcional"
                left={<TextInput.Icon icon="dog-side" />}
              />
            )}
          />

          {/* Fecha de Nacimiento */}
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Fecha de Nacimiento *</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon
              source="calendar"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.dateText, { color: theme.colors.onSurface }]}>
              {birthDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Peso */}
          <Controller
            control={control}
            name="weight"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Peso (kg)"
                value={value?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  onChange(isNaN(num) ? undefined : num);
                }}
                placeholder="Opcional"
                keyboardType="decimal-pad"
                error={errors.weight?.message}
                left={<TextInput.Icon icon="weight-kilogram" />}
              />
            )}
          />

          {/* Número de Chip */}
          <Controller
            control={control}
            name="chipNumber"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Número de Microchip"
                value={value}
                onChangeText={onChange}
                placeholder="Opcional"
                keyboardType="numeric"
                left={<TextInput.Icon icon="chip" />}
              />
            )}
          />

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              Guardar Mascota
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              Cancelar
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 60,
  },
  photoText: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  segmentedButtons: {
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    marginTop: -spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dateIcon: {
    marginRight: spacing.sm,
  },
  dateText: {
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  submitButton: {
    marginBottom: spacing.sm,
  },
});

export default AddPetScreen;
