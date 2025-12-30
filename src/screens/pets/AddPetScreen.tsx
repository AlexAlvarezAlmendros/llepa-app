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
  Alert,
} from 'react-native';
import { TextInput, SegmentedButtons, Menu } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { colors, typography, spacing } from '../../constants/theme';
import { Button, Input } from '../../components/ui';
import { petSchema } from '../../utils/validation';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { PetsStackParamList } from '../../types';
import { z } from 'zod';

type AddPetNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'AddPet'>;

type PetFormData = z.infer<typeof petSchema>;

const AddPetScreen = () => {
  const navigation = useNavigation<AddPetNavigationProp>();
  const { user } = useAuthStore();
  const { addPet } = usePetStore();
  
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu galería para seleccionar una foto'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu cámara para tomar una foto'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Foto de Perfil',
      'Elige una opción',
      [
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Elegir de galería', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const onSubmit = async (data: PetFormData) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // TODO: Subir foto a Firebase Storage si existe photoUri
      const photoUrl = photoUri || undefined;

      // Convertir Date a Timestamp de Firestore
      const petData = {
        ...data,
        birthDate: Timestamp.fromDate(data.birthDate),
        photoUrl,
        gender: 'Macho' as const, // Por ahora fijo, después añadiremos selector
      };

      await addPet(user.uid, petData);

      Alert.alert('¡Éxito!', 'Mascota añadida correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error añadiendo mascota:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'No se pudo añadir la mascota. Intenta de nuevo.');
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
      style={styles.container}
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
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons
                  name="camera-plus"
                  size={40}
                  color={colors.primary}
                />
                <Text style={styles.photoText}>Añadir Foto</Text>
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
          <Text style={styles.fieldLabel}>Especie *</Text>
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
            <Text style={styles.errorText}>{errors.species.message}</Text>
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
          <Text style={styles.fieldLabel}>Fecha de Nacimiento *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={colors.primary}
              style={styles.dateIcon}
            />
            <Text style={styles.dateText}>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  photoText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.button,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  segmentedButtons: {
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.textSecondary + '40',
  },
  dateIcon: {
    marginRight: spacing.sm,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
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
