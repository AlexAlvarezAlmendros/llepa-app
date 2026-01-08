import { orderBy, Timestamp } from 'firebase/firestore';
import { TrainingTrick, TrainingLevel } from '../types';
import {
  getPetSubcollectionDocs,
  createPetSubcollectionDoc,
  updatePetSubcollectionDoc,
  deletePetSubcollectionDoc,
} from '../utils/firestoreHelpers';
import { logger } from '../utils/logger';

const COLLECTION_NAME = 'training';

// Obtener todos los trucos de entrenamiento de una mascota
export const getPetTraining = async (userId: string, petId: string): Promise<TrainingTrick[]> => {
  logger.info('🎓 Obteniendo trucos de entrenamiento', { userId, petId });

  const tricks = await getPetSubcollectionDocs<TrainingTrick>(
    userId,
    petId,
    COLLECTION_NAME,
    [orderBy('createdAt', 'desc')]
  );

  logger.success('✅ Trucos obtenidos', { count: tricks.length });
  return tricks;
};

// Obtener un truco por ID
export const getTrainingTrick = async (
  userId: string,
  petId: string,
  trickId: string
): Promise<TrainingTrick | null> => {
  const tricks = await getPetSubcollectionDocs<TrainingTrick>(
    userId,
    petId,
    COLLECTION_NAME
  );

  const trick = tricks.find(t => t.id === trickId);
  return trick || null;
};

// Crear un nuevo truco de entrenamiento
export const createTrainingTrick = async (
  userId: string,
  petId: string,
  trickData: Omit<TrainingTrick, 'id' | 'petId' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<TrainingTrick> => {
  logger.info('🎓 Creando nuevo truco de entrenamiento', { userId, petId, name: trickData.name });

  const now = Timestamp.now();
  const dataToCreate = {
    ...trickData,
    petId,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const id = await createPetSubcollectionDoc(userId, petId, COLLECTION_NAME, dataToCreate);

  logger.success('✅ Truco creado', { trickId: id });

  return {
    ...dataToCreate,
    id,
  } as TrainingTrick;
};

// Actualizar un truco de entrenamiento
export const updateTrainingTrick = async (
  userId: string,
  petId: string,
  trickId: string,
  updates: Partial<Omit<TrainingTrick, 'id' | 'petId' | 'userId' | 'createdAt'>>
): Promise<void> => {
  logger.info('🎓 Actualizando truco', { userId, petId, trickId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, trickId, {
    ...updates,
    updatedAt: Timestamp.now(),
  });

  logger.success('✅ Truco actualizado');
};

// Actualizar nivel de un truco
export const updateTrainingLevel = async (
  userId: string,
  petId: string,
  trickId: string,
  newLevel: TrainingLevel
): Promise<void> => {
  logger.info('🎓 Actualizando nivel de truco', { userId, petId, trickId, newLevel });

  const now = Timestamp.now();
  const updates: Partial<TrainingTrick> = {
    level: newLevel,
    updatedAt: now,
  };

  // Añadir timestamps según el nivel
  if (newLevel === 'LEARNED') {
    updates.learnedAt = now;
  } else if (newLevel === 'CONSOLIDATED') {
    updates.consolidatedAt = now;
  }

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, trickId, updates);

  logger.success('✅ Nivel de truco actualizado');
};

// Eliminar un truco
export const deleteTrainingTrick = async (
  userId: string,
  petId: string,
  trickId: string
): Promise<void> => {
  logger.info('🎓 Eliminando truco', { userId, petId, trickId });

  await deletePetSubcollectionDoc(userId, petId, COLLECTION_NAME, trickId);

  logger.success('✅ Truco eliminado');
};

// Obtener estadísticas de entrenamiento
export const getTrainingStats = async (
  userId: string,
  petId: string
): Promise<{ total: number; inProgress: number; learned: number; consolidated: number }> => {
  const tricks = await getPetTraining(userId, petId);

  return {
    total: tricks.length,
    inProgress: tricks.filter(t => t.level === 'IN_PROGRESS').length,
    learned: tricks.filter(t => t.level === 'LEARNED').length,
    consolidated: tricks.filter(t => t.level === 'CONSOLIDATED').length,
  };
};
