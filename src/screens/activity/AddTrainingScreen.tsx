import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, useTheme, SegmentedButtons } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { spacing } from '../../constants/theme';
import { Button, Card, Loading, Input } from '../../components/ui';
import { TypeSelector } from '../../components/forms';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useDialog } from '../../contexts/DialogContext';
import { PetsStackParamList, TrainingLevel, TrickCategory } from '../../types';
import {
  createTrainingTrick,
  updateTrainingTrick,
  getTrainingTrick,
} from '../../services/trainingService';

type AddTrainingRouteProp = RouteProp<PetsStackParamList, 'AddTraining'>;
type AddTrainingNavigationProp = NativeStackNavigationProp<PetsStackParamList, 'AddTraining'>;

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  category: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FUN']),
  level: z.enum(['IN_PROGRESS', 'LEARNED', 'CONSOLIDATED']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORY_OPTIONS = [
  { value: 'BASIC' as const, label: 'Básico', icon: 'star-outline' },
  { value: 'INTERMEDIATE' as const, label: 'Intermedio', icon: 'star-half-full' },
  { value: 'ADVANCED' as const, label: 'Avanzado', icon: 'star' },
  { value: 'FUN' as const, label: 'Divertido', icon: 'party-popper' },
];

const LEVEL_BUTTONS = [
  { value: 'IN_PROGRESS', label: 'En proceso' },
  { value: 'LEARNED', label: 'Aprendido' },
  { value: 'CONSOLIDATED', label: 'Consolidado' },
];

const SUGGESTED_TRICKS: Record<TrickCategory, string[]> = {
  BASIC: ['Sentado', 'Quieto', 'Ven aquí', 'No', 'Junto'],
  INTERMEDIATE: ['Túmbate', 'Dame la pata', 'Otra pata', 'Gira', 'Espera'],
  ADVANCED: ['Rueda', 'Hazte el muerto', 'Saluda', 'Atrás', 'Slalom'],
  FUN: ['Ladra', 'Beso', 'Reverencia', 'Salta', 'Coge'],
};

const AddTrainingScreen = () => {
  const theme = useTheme();
  const route = useRoute<AddTrainingRouteProp>();
  const navigation = useNavigation<AddTrainingNavigationProp>();
  const { user } = useAuthStore();
  const { pets } = usePetStore();
  const { showSuccess, showError } = useDialog();

  const { petId, trickId } = route.params;
  const pet = pets.find((p) => p.id === petId);
  const isEditing = !!trickId;

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
      name: '',
      category: 'BASIC',
      level: 'IN_PROGRESS',
      notes: '',
    },
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    if (isEditing && user) {
      loadTrick();
    }
  }, [isEditing, user]);

  const loadTrick = async () => {
    if (!user || !trickId) return;
    try {
      const trick = await getTrainingTrick(user.uid, petId, trickId);
      if (trick) {
        setValue('name', trick.name);
        setValue('category', trick.category);
        setValue('level', trick.level);
        setValue('notes', trick.notes || '');
      }
    } catch (error) {
      showError('Error', 'No se pudo cargar el truco');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setLoading(true);
    try {
      if (isEditing && trickId) {
        await updateTrainingTrick(user.uid, petId, trickId, {
          name: data.name,
          category: data.category,
          level: data.level,
          notes: data.notes,
        });
        showSuccess('Actualizado', 'El truco se ha actualizado correctamente');
      } else {
        await createTrainingTrick(user.uid, petId, {
          name: data.name,
          category: data.category,
          level: data.level,
          notes: data.notes,
          startedAt: Timestamp.now(),
        });
        showSuccess('¡Genial!', `Has empezado a entrenar "${data.name}" con ${pet?.name}`);
      }
      navigation.goBack();
    } catch (error) {
      showError('Error', isEditing ? 'No se pudo actualizar el truco' : 'No se pudo crear el truco');
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
        {/* Categoría */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Categoría
          </Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { value, onChange } }) => (
              <TypeSelector
                items={CATEGORY_OPTIONS}
                value={value}
                onValueChange={onChange}
                columns={2}
              />
            )}
          />
        </Card>

        {/* Nombre del truco */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Nombre del truco
          </Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Nombre"
                value={value}
                onChangeText={onChange}
                placeholder="Ej: Sentado, Dame la pata..."
                error={errors.name?.message}
              />
            )}
          />
          
          {/* Sugerencias rápidas */}
          <Text style={[styles.suggestionsLabel, { color: theme.colors.onSurfaceVariant }]}>
            Sugerencias:
          </Text>
          <View style={styles.suggestionsRow}>
            {SUGGESTED_TRICKS[selectedCategory as TrickCategory].map((trick) => (
              <Button
                key={trick}
                mode="outlined"
                onPress={() => setValue('name', trick)}
                style={styles.suggestionChip}
              >
                {trick}
              </Button>
            ))}
          </View>
        </Card>

        {/* Nivel */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Nivel de dominio
          </Text>
          <Controller
            control={control}
            name="level"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={LEVEL_BUTTONS}
                style={styles.segmentedButtons}
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
                placeholder="Consejos, observaciones..."
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
          {isEditing ? 'Actualizar' : 'Añadir truco'}
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
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});

export default AddTrainingScreen;
