/**
 * Servicio de Medicaciones
 * 
 * Gestiona CRUD de medicaciones en Firestore:
 * - Path: users/{userId}/pets/{petId}/medications/{medicationId}
 */

import {
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { Medication, MedicationFrequency } from '../types';
import {
  getPetSubcollectionDocs,
  createPetSubcollectionDoc,
  updatePetSubcollectionDoc,
  deletePetSubcollectionDoc,
} from '../utils/firestoreHelpers';
import { logger } from '../utils/logger';

const COLLECTION_NAME = 'medications';

/**
 * Obtener todas las medicaciones de una mascota
 */
export const getPetMedications = async (
  userId: string,
  petId: string
): Promise<Medication[]> => {
  const startTime = Date.now();
  logger.info('💊 Obteniendo medicaciones', { userId, petId });

  const medications = await getPetSubcollectionDocs<Medication>(
    userId,
    petId,
    COLLECTION_NAME,
    [orderBy('startDate', 'desc')]
  );

  const elapsed = Date.now() - startTime;
  logger.success(`✅ Medicaciones obtenidas en ${elapsed}ms`, { count: medications.length });

  return medications;
};

/**
 * Obtener medicaciones activas de una mascota
 * Nota: El filtrado y ordenamiento se hace en cliente para evitar índices compuestos
 */
export const getActiveMedications = async (
  userId: string,
  petId: string
): Promise<Medication[]> => {
  logger.info('💊 Obteniendo medicaciones activas', { userId, petId });

  // Obtenemos todas y filtramos en cliente para evitar índice compuesto
  const allMedications = await getPetSubcollectionDocs<Medication>(
    userId,
    petId,
    COLLECTION_NAME
  );

  // Filtrar activas y ordenar por fecha de inicio descendente
  const activeMedications = allMedications
    .filter(m => m.active === true)
    .sort((a, b) => {
      const dateA = a.startDate?.toDate?.() || new Date(0);
      const dateB = b.startDate?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // descendente
    });

  logger.success('✅ Medicaciones activas obtenidas', { count: activeMedications.length });
  return activeMedications;
};

/**
 * Obtener una medicación específica
 */
export const getMedication = async (
  userId: string,
  petId: string,
  medicationId: string
): Promise<Medication | null> => {
  const medications = await getPetSubcollectionDocs<Medication>(
    userId,
    petId,
    COLLECTION_NAME
  );

  const medication = medications.find(m => m.id === medicationId);
  return medication || null;
};

/**
 * Crear una nueva medicación
 */
export const createMedication = async (
  userId: string,
  petId: string,
  medicationData: Omit<Medication, 'id' | 'userId' | 'petId' | 'createdAt' | 'updatedAt'>
): Promise<Medication> => {
  logger.info('💊 Creando medicación', { userId, petId, name: medicationData.name });

  const data = {
    ...medicationData,
    userId,
    petId,
  };

  const medicationId = await createPetSubcollectionDoc(userId, petId, COLLECTION_NAME, data);
  
  logger.success('✅ Medicación creada', { medicationId });

  return {
    id: medicationId,
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Medication;
};

/**
 * Actualizar una medicación
 */
export const updateMedication = async (
  userId: string,
  petId: string,
  medicationId: string,
  updates: Partial<Medication>
): Promise<void> => {
  logger.info('✏️ Actualizando medicación', { medicationId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, medicationId, {
    ...updates,
    updatedAt: Timestamp.now(),
  });

  logger.success('✅ Medicación actualizada', { medicationId });
};

/**
 * Eliminar una medicación
 */
export const deleteMedication = async (
  userId: string,
  petId: string,
  medicationId: string
): Promise<void> => {
  logger.info('🗑️ Eliminando medicación', { medicationId });

  await deletePetSubcollectionDoc(userId, petId, COLLECTION_NAME, medicationId);

  logger.success('✅ Medicación eliminada', { medicationId });
};

/**
 * Marcar medicación como finalizada (desactivar)
 */
export const finishMedication = async (
  userId: string,
  petId: string,
  medicationId: string
): Promise<void> => {
  logger.info('✅ Finalizando medicación', { medicationId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, medicationId, {
    active: false,
    endDate: Timestamp.now(),
    reminderId: null, // Limpiar referencia al recordatorio
    updatedAt: Timestamp.now(),
  });

  logger.success('✅ Medicación finalizada', { medicationId });
};

/**
 * Obtiene la etiqueta legible de un tipo de medicación
 */
export const getMedicationTypeLabel = (type: string): string => {
  const types: Record<string, string> = {
    'ANALGESIC': 'Analgésico',
    'ANTIBIOTIC': 'Antibiótico',
    'ANTIPARASITIC': 'Antiparasitario',
    'ANTIINFLAMMATORY': 'Antiinflamatorio',
    'VITAMIN': 'Vitamina/Suplemento',
    'OTHER': 'Otro',
  };
  return types[type] || type;
};

/**
 * Obtiene la etiqueta legible de una frecuencia
 */
export const getMedicationFrequencyLabel = (frequency: MedicationFrequency): string => {
  const frequencies: Record<MedicationFrequency, string> = {
    'EVERY_8_HOURS': 'Cada 8 horas',
    'EVERY_12_HOURS': 'Cada 12 horas',
    'DAILY': 'Una vez al día',
    'EVERY_TWO_DAYS': 'Cada 2 días',
    'WEEKLY': 'Semanal',
  };
  return frequencies[frequency] || frequency;
};

/**
 * Convierte la frecuencia de medicación a frecuencia de recordatorio
 */
export const medicationFrequencyToReminderFrequency = (
  frequency: MedicationFrequency
): 'EVERY_8_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'EVERY_TWO_DAYS' | 'WEEKLY' => {
  switch (frequency) {
    case 'EVERY_8_HOURS':
      return 'EVERY_8_HOURS';
    case 'EVERY_12_HOURS':
      return 'EVERY_12_HOURS';
    case 'DAILY':
      return 'DAILY';
    case 'EVERY_TWO_DAYS':
      return 'EVERY_TWO_DAYS';
    case 'WEEKLY':
      return 'WEEKLY';
    default:
      return 'DAILY';
  }
};

/**
 * Obtiene el icono según el tipo de medicación
 */
export const getMedicationTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    'ANALGESIC': 'pill',
    'ANTIBIOTIC': 'bacteria',
    'ANTIPARASITIC': 'bug',
    'ANTIINFLAMMATORY': 'medical-bag',
    'VITAMIN': 'leaf',
    'OTHER': 'pill',
  };
  return icons[type] || 'pill';
};
