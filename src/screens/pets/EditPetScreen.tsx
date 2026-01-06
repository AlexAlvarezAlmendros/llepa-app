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
} from 'react-native';
import { TextInput, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Timestamp } from 'firebase/firestore';
import { useTheme, Icon } from 'react-native-paper';
import { spacing } from '../../constants/theme';
import { Button, Input, Loading } from '../../components/ui';
import { petSchema } from '../../utils/validation';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { PetsStackParamList } from '../../types';
import { z } from 'zod';
import { StackActions } from '@react-navigation/native';
import { useDialog } from '../../contexts/DialogContext';
import { createReminder, getUserReminders, deleteReminder, updateReminder } from '../../services/reminderService';

type EditPetRouteProp = RouteProp<PetsStackParamList, 'EditPet'>;
type EditPetNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'EditPet'>;

type PetFormData = z.infer<typeof petSchema>;

const EditPetScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EditPetNavigationProp>();
  const route = useRoute<EditPetRouteProp>();
  const { user } = useAuthStore();
  const { pets, updateExistingPet, removePet } = usePetStore();
  const { showDialog, showError, showSuccess, showDestructiveConfirm } = useDialog();
  
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
      // Campos de alimentación
      foodBrand: pet?.food?.brand || '',
      foodType: pet?.food?.type || undefined,
      foodPurchaseAmount: pet?.food?.purchaseAmount || undefined,
      foodDailyAmount: pet?.food?.dailyAmount || undefined,
      foodAlertDays: pet?.food?.alertDays || undefined,
    },
  });

  const birthDate = watch('birthDate');

  useEffect(() => {
    if (!pet) {
      showError('Error', 'Mascota no encontrada', () => navigation.goBack());
    }
  }, [pet]);

  if (!pet) {
    return <Loading fullScreen />;
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showError(
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
      showError(
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
    const buttons = [
      { text: 'Cancelar', style: 'cancel' as const, onPress: () => {} },
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Elegir de galería', onPress: pickImage },
    ];
    
    if (photoUri) {
      buttons.push({ text: 'Eliminar foto', style: 'destructive' as const, onPress: () => setPhotoUri(null) });
    }
    
    showDialog({
      title: 'Foto de Perfil',
      message: 'Elige una opción',
      type: 'info',
      buttons,
    });
  };

  /**
   * Calcula la fecha en la que se debe crear el recordatorio de compra de comida
   * basándose en la fecha de última compra, cantidad del paquete, ración diaria y días de alerta
   * Si no hay fecha de última compra, usa la fecha actual como referencia
   */
  const calculateFoodAlertDate = (
    lastPurchaseDate: Timestamp | undefined,
    purchaseAmount: number,
    dailyAmount: number,
    alertDays: number
  ): Date | null => {
    if (dailyAmount <= 0 || purchaseAmount <= 0) return null;
    
    const totalDays = Math.floor(purchaseAmount / dailyAmount);
    // Si no hay fecha de compra, usar la fecha actual como referencia
    const purchaseDate = lastPurchaseDate ? lastPurchaseDate.toDate() : new Date();
    const alertDate = new Date(purchaseDate);
    alertDate.setDate(alertDate.getDate() + totalDays - alertDays);
    
    // Si la fecha de alerta ya pasó, programar para mañana
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (alertDate < today) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // A las 10:00
      return tomorrow;
    }
    
    alertDate.setHours(10, 0, 0, 0); // Notificar a las 10:00
    return alertDate;
  };

  /**
   * Gestiona el recordatorio de comida: crea, actualiza o elimina según configuración
   */
  const manageFoodReminder = async (
    userId: string,
    petId: string,
    petName: string,
    food: typeof updates.food
  ) => {
    try {
      // Buscar si ya existe un recordatorio de comida para esta mascota
      const existingReminders = await getUserReminders(userId);
      const existingFoodReminder = existingReminders.find(
        r => r.petId === petId && r.type === 'FOOD' && r.title.includes('Comprar comida')
      );

      // Si no hay alertDays configurado o no hay datos de comida, eliminar recordatorio existente
      if (!food?.alertDays || !food?.purchaseAmount || !food?.dailyAmount) {
        if (existingFoodReminder) {
          await deleteReminder(userId, existingFoodReminder.id);
        }
        return;
      }

      const alertDate = calculateFoodAlertDate(
        food.lastPurchaseDate || pet.food?.lastPurchaseDate,
        food.purchaseAmount,
        food.dailyAmount,
        food.alertDays
      );

      if (!alertDate) {
        // No se pudo calcular la fecha (cantidad/ración inválida)
        if (existingFoodReminder) {
          await deleteReminder(userId, existingFoodReminder.id);
        }
        return;
      }

      const reminderData = {
        petId,
        title: `🛒 Comprar comida para ${petName}`,
        type: 'FOOD' as const,
        scheduledAt: Timestamp.fromDate(alertDate),
        completed: false,
        frequency: 'ONCE' as const,
        notes: `Quedan aproximadamente ${food.alertDays} días de comida. Marca: ${food.brand || 'No especificada'}`,
      };

      if (existingFoodReminder) {
        // Actualizar recordatorio existente
        await updateReminder(userId, existingFoodReminder.id, {
          scheduledAt: reminderData.scheduledAt,
          notes: reminderData.notes,
          completed: false, // Resetear si estaba completado
        });
      } else {
        // Crear nuevo recordatorio
        await createReminder(userId, reminderData);
      }
    } catch (error) {
      console.error('Error gestionando recordatorio de comida:', error);
      // No lanzamos el error para no bloquear la actualización de la mascota
    }
  };

  const onSubmit = async (data: PetFormData) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // TODO: Subir nueva foto a Firebase Storage si cambió photoUri
      const photoUrl = photoUri || undefined;

      // Construir objeto food solo si hay datos de alimentación
      const food = data.foodBrand || data.foodType || data.foodPurchaseAmount || data.foodDailyAmount
        ? {
            brand: data.foodBrand || '',
            type: data.foodType,
            purchaseAmount: data.foodPurchaseAmount || 0,
            dailyAmount: data.foodDailyAmount || 0,
            alertDays: data.foodAlertDays,
            lastPurchaseDate: pet.food?.lastPurchaseDate, // Mantener la fecha de compra existente
          }
        : undefined;

      // Convertir Date a Timestamp de Firestore
      const updates = {
        name: data.name,
        species: data.species,
        breed: data.breed,
        birthDate: Timestamp.fromDate(data.birthDate),
        weight: data.weight,
        chipNumber: data.chipNumber,
        photoUrl,
        food,
      };

      await updateExistingPet(user.uid, pet.id, updates);
      
      // Gestionar recordatorio de comida si está configurado
      await manageFoodReminder(user.uid, pet.id, data.name, food);

      showSuccess('¡Éxito!', 'Mascota actualizada correctamente', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error actualizando mascota:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      showError('Error', 'No se pudo actualizar la mascota. Intenta de nuevo.');
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
    showDestructiveConfirm(
      'Eliminar Mascota',
      `¿Estás seguro de que deseas eliminar a ${pet.name}? Esta acción no se puede deshacer.`,
      async () => {
        if (!user) return;
        try {
          setLoading(true);
          await removePet(user.uid, pet.id);
          showSuccess('Eliminado', 'Mascota eliminada correctamente', () => {
            navigation.dispatch(StackActions.replace('PetsList'));
          });
        } catch (error) {
          showError('Error', 'No se pudo eliminar la mascota');
        } finally {
          setLoading(false);
        }
      },
      undefined,
      'Eliminar',
      'Cancelar'
    );
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
                <Text style={[styles.photoText, { color: theme.colors.primary }]}>Cambiar Foto</Text>
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

          {/* Sección Alimentación */}
          <View style={styles.sectionHeader}>
            <Icon source="food-drumstick" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Alimentación</Text>
          </View>

          {/* Marca de comida */}
          <Controller
            control={control}
            name="foodBrand"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Marca de comida"
                value={value}
                onChangeText={onChange}
                placeholder="Ej: Royal Canin, Purina..."
                left={<TextInput.Icon icon="food-drumstick" />}
              />
            )}
          />

          {/* Tipo de comida */}
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Tipo de comida</Text>
          <Controller
            control={control}
            name="foodType"
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value || ''}
                onValueChange={(val) => onChange(val || undefined)}
                buttons={[
                  { value: 'Pienso', label: 'Pienso' },
                  { value: 'Húmedo', label: 'Húmedo' },
                  { value: 'Natural', label: 'Natural' },
                  { value: 'Mixto', label: 'Mixto' },
                ]}
                style={styles.segmentedButtons}
              />
            )}
          />

          {/* Cantidad comprada (paquete) */}
          <Controller
            control={control}
            name="foodPurchaseAmount"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Cantidad del paquete (gramos)"
                value={value?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  onChange(isNaN(num) ? undefined : num);
                }}
                placeholder="Ej: 2000 (para 2kg)"
                keyboardType="decimal-pad"
                error={errors.foodPurchaseAmount?.message}
                left={<TextInput.Icon icon="package-variant" />}
              />
            )}
          />

          {/* Cantidad diaria */}
          <Controller
            control={control}
            name="foodDailyAmount"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Ración diaria (gramos)"
                value={value?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  onChange(isNaN(num) ? undefined : num);
                }}
                placeholder="Ej: 150"
                keyboardType="decimal-pad"
                error={errors.foodDailyAmount?.message}
                left={<TextInput.Icon icon="bowl-mix" />}
              />
            )}
          />

          {/* Alerta de comida */}
          <View style={[styles.alertSection, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <View style={styles.alertHeader}>
              <Icon source="bell-ring" size={20} color={theme.colors.primary} />
              <Text style={[styles.alertTitle, { color: theme.colors.onSurface }]}>
                Recordatorio de compra
              </Text>
            </View>
            <Text style={[styles.alertDescription, { color: theme.colors.onSurfaceVariant }]}>
              Configura cuántos días antes quieres recibir un aviso para comprar comida
            </Text>
            <Controller
              control={control}
              name="foodAlertDays"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Avisar cuando queden X días"
                  value={value?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    onChange(isNaN(num) ? undefined : num);
                  }}
                  placeholder="Ej: 5 (avisar 5 días antes)"
                  keyboardType="number-pad"
                  error={errors.foodAlertDays?.message}
                  left={<TextInput.Icon icon="calendar-alert" />}
                />
              )}
            />
            <Text style={[styles.alertHint, { color: theme.colors.onSurfaceVariant }]}>
              💡 Se creará un recordatorio automático cuando el paquete llegue a ese límite
            </Text>
          </View>

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
              style={[styles.deleteButton, { borderColor: theme.colors.error, backgroundColor: theme.colors.background }]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Icon
                source="delete"
                size={20}
                color={theme.colors.error}
              />
              <Text style={[styles.deleteText, { color: theme.colors.error }]}>Eliminar Mascota</Text>
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
    fontSize: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: spacing.xs,
  },
  alertSection: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertDescription: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  alertHint: {
    fontSize: 12,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
});

export default EditPetScreen;
