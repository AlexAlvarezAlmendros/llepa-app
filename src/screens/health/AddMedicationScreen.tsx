/**
 * Pantalla: Añadir/Editar Medicación
 * 
 * Formulario para crear o editar una medicación:
 * - Nombre del medicamento
 * - Tipo (analgésico, antibiótico, etc.)
 * - Dosis
 * - Frecuencia
 * - Fecha de inicio
 * - Notas opcionales
 * 
 * Al guardar, crea automáticamente un recordatorio recurrente.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Text,
  SegmentedButtons,
  useTheme,
  Icon,
  RadioButton,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import {
  createMedication,
  updateMedication,
  getMedication,
  medicationFrequencyToReminderFrequency,
} from '../../services/medicationService';
import { createReminder, updateMedicationReminder, deleteReminder } from '../../services/reminderService';
import { PetsStackParamList, MedicationType, MedicationFrequency } from '../../types';
import { spacing } from '../../constants/theme';
import { Button, Input, Loading } from '../../components/ui';
import { TypeSelector } from '../../components/forms';
import { useDialog } from '../../contexts/DialogContext';

type AddMedicationScreenProp = NativeStackNavigationProp<PetsStackParamList, 'AddMedication'>;
type AddMedicationRouteProp = RouteProp<PetsStackParamList, 'AddMedication'>;

const MEDICATION_TYPES: { value: MedicationType; label: string; icon: string }[] = [
  { value: 'ANALGESIC', label: 'Analgésico', icon: 'pill' },
  { value: 'ANTIBIOTIC', label: 'Antibiótico', icon: 'bacteria' },
  { value: 'ANTIPARASITIC', label: 'Antiparasitario', icon: 'bug' },
  { value: 'ANTIINFLAMMATORY', label: 'Antiinflamatorio', icon: 'medical-bag' },
  { value: 'VITAMIN', label: 'Vitamina', icon: 'leaf' },
  { value: 'OTHER', label: 'Otro', icon: 'dots-horizontal' },
];

const FREQUENCIES: { value: MedicationFrequency; label: string }[] = [
  { value: 'EVERY_8_HOURS', label: 'Cada 8 horas' },
  { value: 'EVERY_12_HOURS', label: 'Cada 12 horas' },
  { value: 'DAILY', label: 'Una vez al día' },
  { value: 'EVERY_TWO_DAYS', label: 'Cada 2 días' },
  { value: 'WEEKLY', label: 'Semanal' },
];

export default function AddMedicationScreen() {
  const theme = useTheme();
  const navigation = useNavigation<AddMedicationScreenProp>();
  const route = useRoute<AddMedicationRouteProp>();
  const { showError, showSuccess } = useDialog();
  const { petId, medicationId } = route.params;

  const user = useAuthStore((state) => state.user);
  const pets = usePetStore((state) => state.pets);
  const pet = pets.find(p => p.id === petId);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!medicationId);
  const [isEditing, setIsEditing] = useState(false);

  // Datos del formulario
  const [name, setName] = useState('');
  const [type, setType] = useState<MedicationType>('ANTIBIOTIC');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('DAILY');
  const [startDate, setStartDate] = useState(new Date());
  const [durationDays, setDurationDays] = useState('0'); // 0 = indefinido
  const [notes, setNotes] = useState('');
  const [existingReminderId, setExistingReminderId] = useState<string | undefined>();

  // DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Cargar medicación existente si estamos editando
  useEffect(() => {
    if (medicationId && user) {
      loadMedication();
    }
  }, [medicationId, user]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Editar Medicación' : 'Nueva Medicación',
    });
  }, [isEditing, navigation]);

  const loadMedication = async () => {
    if (!user || !medicationId) return;

    try {
      setLoadingData(true);
      const medication = await getMedication(user.uid, petId, medicationId);

      if (medication) {
        setIsEditing(true);
        setName(medication.name);
        setType(medication.type);
        setDose(medication.dose);
        setFrequency(medication.frequency);
        setStartDate(medication.startDate.toDate());
        setDurationDays(String(medication.durationDays ?? 0));
        setNotes(medication.notes || '');
        setExistingReminderId(medication.reminderId);
      }
    } catch (error) {
      console.error('Error al cargar medicación:', error);
      showError('Error', 'No se pudo cargar la medicación');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setStartDate((prev) => {
        const newDate = new Date(prev);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return newDate;
      });
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      setStartDate((prev) => {
        const newDate = new Date(prev);
        newDate.setHours(date.getHours(), date.getMinutes());
        return newDate;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showError('Campo requerido', 'Introduce el nombre del medicamento');
      return false;
    }
    if (!dose.trim()) {
      showError('Campo requerido', 'Introduce la dosis del medicamento');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    try {
      setLoading(true);

      // Calcular fecha de fin si hay duración definida
      // El día de inicio cuenta como día 1, por eso restamos 1
      const durationDaysNum = parseInt(durationDays, 10) || 0;
      let endDate: Timestamp | undefined;
      if (durationDaysNum > 0) {
        const endDateCalc = new Date(startDate);
        endDateCalc.setDate(endDateCalc.getDate() + durationDaysNum - 1);
        endDate = Timestamp.fromDate(endDateCalc);
      }

      const medicationData = {
        name: name.trim(),
        type,
        dose: dose.trim(),
        frequency,
        startDate: Timestamp.fromDate(startDate),
        durationDays: durationDaysNum,
        endDate,
        notes: notes.trim() || undefined,
        active: true,
      };

      // Crear/actualizar el recordatorio
      const reminderFrequency = medicationFrequencyToReminderFrequency(frequency);
      const reminderTitle = `💊 ${name} - ${dose}`;

      const reminderData = {
        petId,
        title: reminderTitle,
        type: 'MEDICATION' as const,
        scheduledAt: Timestamp.fromDate(startDate),
        completed: false,
        frequency: reminderFrequency,
        endDate, // Fecha de fin del recordatorio (undefined si es indefinido)
        notes: notes.trim() || undefined, // Usar las mismas notas de la medicación
      };

      let reminderId = existingReminderId;

      if (isEditing && medicationId) {
        // Actualizar medicación existente
        if (existingReminderId) {
          // Actualizar recordatorio existente
          // Limpiar completedDates cuando cambia la frecuencia o fecha de inicio
          // ya que las instancias antiguas ya no aplican
          await updateMedicationReminder(user.uid, existingReminderId, {
            title: reminderTitle,
            scheduledAt: reminderData.scheduledAt,
            frequency: reminderFrequency,
            endDate, // undefined elimina el campo, Timestamp lo actualiza
            notes: reminderData.notes,
            completed: false,
            completedDates: [], // Reiniciar el historial de completados
          });
        } else {
          // Crear nuevo recordatorio si no existía
          reminderId = await createReminder(user.uid, reminderData);
        }

        await updateMedication(user.uid, petId, medicationId, {
          ...medicationData,
          reminderId,
        });

        showSuccess('¡Actualizado!', 'Medicación actualizada correctamente', () => {
          navigation.goBack();
        });
      } else {
        // Crear nuevo recordatorio
        reminderId = await createReminder(user.uid, reminderData);

        // Crear nueva medicación con el ID del recordatorio
        await createMedication(user.uid, petId, {
          ...medicationData,
          reminderId,
        });

        showSuccess('¡Creado!', 'Medicación registrada y recordatorio configurado', () => {
          navigation.goBack();
        });
      }
    } catch (error) {
      console.error('Error guardando medicación:', error);
      showError('Error', 'No se pudo guardar la medicación');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <Loading fullScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info de la mascota */}
        {pet && (
          <View style={[styles.petInfo, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="paw" size={20} color={theme.colors.onPrimaryContainer} />
            <Text style={[styles.petName, { color: theme.colors.onPrimaryContainer }]}>
              Medicación para {pet.name}
            </Text>
          </View>
        )}

        {/* Nombre del medicamento */}
        <Input
          label="Nombre del medicamento *"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Amoxicilina, Meloxicam..."
          left={<TextInput.Icon icon="pill" />}
        />

        {/* Tipo de medicamento */}
        <TypeSelector
          items={MEDICATION_TYPES}
          value={type}
          onValueChange={setType}
          label="Tipo de medicamento *"
          columns={3}
        />

        {/* Dosis */}
        <Input
          label="Dosis *"
          value={dose}
          onChangeText={setDose}
          placeholder="Ej: 500mg, 1 comprimido, 5ml..."
          left={<TextInput.Icon icon="needle" />}
        />

        {/* Frecuencia */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
          Frecuencia *
        </Text>
        <RadioButton.Group onValueChange={(value) => setFrequency(value as MedicationFrequency)} value={frequency}>
          {FREQUENCIES.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.radioRow,
                { backgroundColor: frequency === item.value ? theme.colors.primaryContainer : 'transparent' }
              ]}
              onPress={() => setFrequency(item.value)}
            >
              <RadioButton value={item.value} />
              <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </RadioButton.Group>

        {/* Fecha y hora de inicio */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
          Fecha y hora de inicio *
        </Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.colors.surfaceVariant, flex: 1 }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon source="calendar" size={20} color={theme.colors.primary} />
            <Text style={[styles.dateText, { color: theme.colors.onSurface }]}>
              {startDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Icon source="clock-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.dateText, { color: theme.colors.onSurface }]}>
              {startDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* Duración del tratamiento */}
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
          Duración del tratamiento
        </Text>
        <View style={styles.durationRow}>
          <TextInput
            mode="outlined"
            value={durationDays}
            onChangeText={(text) => setDurationDays(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            style={styles.durationInput}
            left={<TextInput.Icon icon="calendar-range" />}
          />
          <Text style={[styles.durationLabel, { color: theme.colors.onSurface }]}>
            días
          </Text>
        </View>
        <Text style={[styles.durationHint, { color: theme.colors.onSurfaceVariant }]}>
          Introduce 0 para tratamiento indefinido/continuo
        </Text>

        {/* Notas */}
        <Input
          label="Notas adicionales"
          value={notes}
          onChangeText={setNotes}
          placeholder="Instrucciones especiales, con comida, etc..."
          multiline
          numberOfLines={3}
          left={<TextInput.Icon icon="note-text" />}
        />

        {/* Info recordatorio */}
        <View style={[styles.reminderInfo, { backgroundColor: theme.colors.secondaryContainer }]}>
          <Icon source="bell-ring" size={20} color={theme.colors.onSecondaryContainer} />
          <Text style={[styles.reminderInfoText, { color: theme.colors.onSecondaryContainer }]}>
            Se creará un recordatorio automático para avisarte de cada toma según la frecuencia seleccionada.
          </Text>
        </View>

        {/* Botones */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          >
            {isEditing ? 'Guardar Cambios' : 'Registrar Medicación'}
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            Cancelar
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: 4,
  },
  radioLabel: {
    fontSize: 15,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 15,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  durationInput: {
    width: 100,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  durationHint: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  reminderInfoText: {
    fontSize: 13,
    flex: 1,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  saveButton: {
    marginBottom: spacing.sm,
  },
});
