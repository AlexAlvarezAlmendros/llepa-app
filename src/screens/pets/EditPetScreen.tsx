import React, { useState, useEffect } from 'react';
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
import { TextInput, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { colors, typography, spacing } from '../../constants/theme';
import { Button, Input, Loading } from '../../components/ui';
import { petSchema } from '../../utils/validation';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { PetsStackParamList } from '../../types';
import { z } from 'zod';
import { StackActions } from '@react-navigation/native';

type EditPetRouteProp = RouteProp<PetsStackParamList, 'EditPet'>;
type EditPetNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'EditPet'>;

type PetFormData = z.infer<typeof petSchema>;

const EditPetScreen = () => {
  const navigation = useNavigation<EditPetNavigationProp>();
  const route = useRoute<EditPetRouteProp>();
  const { user } = useAuthStore();
  const { pets, updateExistingPet, removePet } = usePetStore();
  
  const { petId } = route.params;
  const pet = pets.find((p) => p.id === petId);
  
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(pet?.photoUrl || null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PetFormData>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: pet?.name || '',
      species: pet?.species || 'Perro',
      breed: pet?.breed || '',
      birthDate: pet?.birthDate?.toDate() || new Date(),
      weight: pet?.weight || undefined,
      chipNumber: pet?.chipNumber || '',
    },
  });

  const birthDate = watch('birthDate');

  useEffect(() => {
    if (!pet) {
      Alert.alert('Error', 'Mascota no encontrada', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [pet]);

  if (!pet) {
    return <Loading fullScreen />;
  }

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
        photoUri && { text: 'Eliminar foto', onPress: () => setPhotoUri(null), style: 'destructive' },
        { text: 'Cancelar', style: 'cancel' },
      ].filter(Boolean) as any
    );
  };

  const onSubmit = async (data: PetFormData) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // TODO: Subir nueva foto a Firebase Storage si cambió photoUri
      const photoUrl = photoUri || undefined;

      // Convertir Date a Timestamp de Firestore
      const updates = {
        ...data,
        birthDate: Timestamp.fromDate(data.birthDate),
        photoUrl,
      };

      await updateExistingPet(user.uid, pet.id, updates);

      Alert.alert('¡Éxito!', 'Mascota actualizada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error actualizando mascota:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'No se pudo actualizar la mascota. Intenta de nuevo.');
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

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Mascota',
      `¿Estás seguro de que deseas eliminar a ${pet.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              setLoading(true);
              await removePet(user.uid, pet.id);
              Alert.alert('Eliminado', 'Mascota eliminada correctamente', [
                { 
                  text: 'OK', 
                  onPress: () => {
                    // Navegar a la lista de mascotas eliminando todas las pantallas intermedias
                    navigation.dispatch(
                      StackActions.replace('PetsList')
                    );
                  }
                },
              ]);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la mascota');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
                <Text style={styles.photoText}>Cambiar Foto</Text>
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
              Guardar Cambios
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            {/* Botón Eliminar */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="delete"
                size={20}
                color={colors.error}
              />
              <Text style={styles.deleteText}>Eliminar Mascota</Text>
            </TouchableOpacity>
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.background,
  },
  deleteText: {
    ...typography.button,
    color: colors.error,
    marginLeft: spacing.sm,
  },
});

export default EditPetScreen;
