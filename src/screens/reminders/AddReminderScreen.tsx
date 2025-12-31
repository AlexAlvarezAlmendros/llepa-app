/**
 * Pantalla: Añadir/Editar Recordatorio
 * 
 * Formulario completo para crear o editar un recordatorio:
 * - Selección de mascota
 * - Tipo de recordatorio (medicación, cita, higiene)
 * - Fecha y hora
 * - Frecuencia (una vez, diaria, semanal, mensual)
 * - Notificación local programada
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  TextInput,
  Button,
  RadioButton,
  Text,
  SegmentedButtons,
  Chip,
  Divider,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { createReminder, updateReminder, getReminder } from '../../services/reminderService';
import {
  scheduleNotification,
  scheduleRecurringNotification,
  cancelNotification,
  requestNotificationPermissions,
} from '../../services/notificationService';
import { RootStackParamList, ReminderType } from '../../types';
import { colors, spacing } from '../../constants/theme';

type AddReminderScreenProp = NativeStackNavigationProp<RootStackParamList>;
type AddReminderRouteProp = RouteProp<RootStackParamList, 'AddReminder'>;

const REMINDER_TYPES: { value: ReminderType; label: string; icon: string }[] = [
  { value: 'MEDICATION', label: 'Medicación', icon: 'pill' },
  { value: 'HYGIENE', label: 'Higiene', icon: 'shower' },
  { value: 'FOOD', label: 'Alimentación', icon: 'food-drumstick' },
  { value: 'OTHER', label: 'Otros', icon: 'dots-horizontal' },
];

const FREQUENCIES = [
  { value: 'ONCE', label: 'Una vez' },
  { value: 'DAILY', label: 'Diaria' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
];

export default function AddReminderScreen() {
  const navigation = useNavigation<AddReminderScreenProp>();
  const route = useRoute<AddReminderRouteProp>();
  const { reminderId } = route.params || {};

  const user = useAuthStore((state) => state.user);
  const pets = usePetStore((state) => state.pets);
  const fetchPets = usePetStore((state) => state.fetchPets);

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Datos del formulario
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReminderType>('MEDICATION');
  const [frequency, setFrequency] = useState<'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('ONCE');
  const [notes, setNotes] = useState('');

  // Fecha y hora
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Notificación
  const [notificationId, setNotificationId] = useState<string | undefined>();

  // Cargar mascotas al montar el componente
  useEffect(() => {
    if (user) {
      fetchPets(user.uid);
    }
  }, [user]);

  // Seleccionar la primera mascota por defecto si no está editando
  useEffect(() => {
    if (!reminderId && pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, reminderId, selectedPetId]);

  useEffect(() => {
    if (reminderId && user) {
      loadReminder();
    }
  }, [reminderId, user]);

  const loadReminder = async () => {
    if (!user || !reminderId) return;

    try {
      setLoading(true);
      const reminder = await getReminder(user.uid, reminderId);

      if (reminder) {
        setIsEditing(true);
        setSelectedPetId(reminder.petId);
        setTitle(reminder.title);
        setType(reminder.type);
        setFrequency(reminder.frequency || 'ONCE');
        setNotes(reminder.notes || '');
        setSelectedDate(reminder.scheduledAt.toDate());
        setNotificationId(reminder.notificationId);
      }
    } catch (error: any) {
      console.error('Error al cargar recordatorio:', error);
      Alert.alert('Error', 'No se pudo cargar el recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate((prev) => {
        const newDate = new Date(prev);
        newDate.setFullYear(date.getFullYear());
        newDate.setMonth(date.getMonth());
        newDate.setDate(date.getDate());
        return newDate;
      });
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedDate((prev) => {
        const newDate = new Date(prev);
        newDate.setHours(time.getHours());
        newDate.setMinutes(time.getMinutes());
        return newDate;
      });
    }
  };

  const handleSave = async () => {
    // Validaciones
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    if (!selectedPetId) {
      Alert.alert('Error', 'Selecciona una mascota');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Ingresa un título para el recordatorio');
      return;
    }

    if (selectedDate < new Date() && !isEditing) {
      Alert.alert('Error', 'La fecha debe ser futura');
      return;
    }

    try {
      setLoading(true);

      // Solicitar permisos de notificaciones
      const hasPermissions = await requestNotificationPermissions();
      if (!hasPermissions) {
        Alert.alert(
          'Permisos denegados',
          'No se podrán enviar notificaciones. ¿Continuar sin notificaciones?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => saveWithoutNotification() },
          ]
        );
        return;
      }

      // Programar notificación
      let newNotificationId: string | undefined;

      const selectedPet = pets.find((p) => p.id === selectedPetId);
      const petName = selectedPet?.name || 'tu mascota';

      if (frequency === 'ONCE') {
        newNotificationId = await scheduleNotification(
          title,
          `Recordatorio para ${petName}`,
          selectedDate,
          { reminderId: reminderId || 'new', petId: selectedPetId }
        );
      } else {
        newNotificationId = await scheduleRecurringNotification(
          title,
          `Recordatorio para ${petName}`,
          frequency,
          selectedDate.getHours(),
          selectedDate.getMinutes(),
          { reminderId: reminderId || 'new', petId: selectedPetId }
        );
      }

      // Cancelar notificación anterior si existe
      if (isEditing && notificationId) {
        await cancelNotification(notificationId);
      }

      // Guardar en Firestore
      const reminderData = {
        petId: selectedPetId,
        title: title.trim(),
        type,
        frequency,
        scheduledAt: Timestamp.fromDate(selectedDate),
        completed: false,
        notificationId: newNotificationId,
        ...(notes.trim() && { notes: notes.trim() }),
      };

      if (isEditing && reminderId) {
        await updateReminder(user.uid, reminderId, reminderData);
        Alert.alert('Éxito', 'Recordatorio actualizado');
      } else {
        await createReminder(user.uid, reminderData);
        Alert.alert('Éxito', 'Recordatorio creado');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error al guardar recordatorio:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const saveWithoutNotification = async () => {
    if (!user || !selectedPetId || !title.trim()) return;

    try {
      setLoading(true);

      const reminderData = {
        petId: selectedPetId,
        title: title.trim(),
        type,
        frequency,
        scheduledAt: Timestamp.fromDate(selectedDate),
        completed: false,
        ...(notes.trim() && { notes: notes.trim() }),
      };

      if (isEditing && reminderId) {
        await updateReminder(user.uid, reminderId, reminderData);
        Alert.alert('Éxito', 'Recordatorio actualizado');
      } else {
        await createReminder(user.uid, reminderData);
        Alert.alert('Éxito', 'Recordatorio creado (sin notificación)');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error al guardar recordatorio:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Selección de Mascota */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            ¿Para quién es el recordatorio?
          </Text>
          {pets.length === 0 ? (
            <Text style={styles.emptyText}>
              No tienes mascotas registradas. Añade una mascota primero.
            </Text>
          ) : (
            <View style={styles.chipsContainer}>
              {pets.map((pet) => (
                <Chip
                  key={pet.id}
                  selected={selectedPetId === pet.id}
                  onPress={() => setSelectedPetId(pet.id)}
                  style={styles.chip}
                >
                  {pet.name}
                </Chip>
              ))}
            </View>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Título */}
        <View style={styles.section}>
          <TextInput
            label="Título del recordatorio *"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            placeholder="Ej: Pastilla antiparasitaria"
            maxLength={100}
          />
        </View>

        {/* Tipo */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tipo de recordatorio
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={(value) => setType(value as ReminderType)}
            buttons={REMINDER_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Fecha y Hora */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            ¿Cuándo?
          </Text>

          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            icon="calendar"
            style={styles.dateButton}
            contentStyle={styles.dateButtonContent}
          >
            {formatDate(selectedDate)}
          </Button>

          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            icon="clock-outline"
            style={styles.dateButton}
            contentStyle={styles.dateButtonContent}
          >
            {formatTime(selectedDate)}
          </Button>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Frecuencia */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Frecuencia
          </Text>
          <RadioButton.Group value={frequency} onValueChange={(value) => setFrequency(value as any)}>
            {FREQUENCIES.map((freq) => (
              <RadioButton.Item
                key={freq.value}
                label={freq.label}
                value={freq.value}
                mode="android"
              />
            ))}
          </RadioButton.Group>
        </View>

        <Divider style={styles.divider} />

        {/* Notas */}
        <View style={styles.section}>
          <TextInput
            label="Notas (opcional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            placeholder="Detalles adicionales..."
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Botón Guardar */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading || !selectedPetId || !title.trim()}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          {isEditing ? 'Actualizar Recordatorio' : 'Crear Recordatorio'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  divider: {
    marginVertical: spacing.md,
  },
  dateButton: {
    marginBottom: spacing.sm,
  },
  dateButtonContent: {
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  saveButtonContent: {
    paddingVertical: spacing.xs,
  },
});
