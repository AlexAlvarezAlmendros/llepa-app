import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { VetVisit } from '../types';
import {
  getPetSubcollectionDocs,
  createPetSubcollectionDoc,
  updatePetSubcollectionDoc,
  deletePetSubcollectionDoc,
  validateUserId,
  validateId,
} from '../utils/firestoreHelpers';
import { logger } from '../utils/logger';

const COLLECTION_NAME = 'visits';

// Obtener todas las visitas de una mascota
export const getPetVisits = async (userId: string, petId: string): Promise<VetVisit[]> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');

  logger.info('🏥 Obteniendo visitas veterinarias', { userId, petId });

  const visits = await getPetSubcollectionDocs<VetVisit>(
    userId,
    petId,
    COLLECTION_NAME,
    [orderBy('date', 'desc')]
  );

  logger.success('✅ Visitas obtenidas', { count: visits.length });
  return visits;
};

// Obtener todas las visitas de todas las mascotas del usuario
export const getUserVisits = async (userId: string): Promise<VetVisit[]> => {
  validateUserId(userId);

  logger.info('🏥 Obteniendo todas las visitas del usuario', { userId });

  try {
    // Obtener todas las mascotas del usuario
    const petsCol = collection(db, 'users', userId, 'pets');
    const petsSnapshot = await getDocs(petsCol);

    const allVisits: VetVisit[] = [];

    // Para cada mascota, obtener sus visitas
    for (const petDoc of petsSnapshot.docs) {
      const petId = petDoc.id;
      const petVisits = await getPetSubcollectionDocs<VetVisit>(
        userId,
        petId,
        COLLECTION_NAME
      );
      allVisits.push(...petVisits);
    }

    // Ordenar por fecha descendente
    allVisits.sort((a, b) => b.date.toMillis() - a.date.toMillis());

    logger.success('✅ Todas las visitas obtenidas', { count: allVisits.length });
    return allVisits;
  } catch (error) {
    logger.error('Error al obtener visitas del usuario', error);
    throw error;
  }
};

// Obtener una visita por ID
export const getVisit = async (
  userId: string,
  petId: string,
  visitId: string
): Promise<VetVisit | null> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');
  validateId(visitId, 'Visit ID');

  const visits = await getPetSubcollectionDocs<VetVisit>(
    userId,
    petId,
    COLLECTION_NAME
  );

  const visit = visits.find(v => v.id === visitId);
  return visit || null;
};

// Crear una nueva visita
export const createVisit = async (
  userId: string,
  petId: string,
  visitData: Omit<VetVisit, 'id' | 'petId' | 'userId' | 'createdAt'>
): Promise<VetVisit> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');

  logger.info('➕ Creando visita veterinaria', { userId, petId, reason: visitData.reason });

  const data = {
    ...visitData,
    petId,
    userId,
  };

  const visitId = await createPetSubcollectionDoc(userId, petId, COLLECTION_NAME, data);

  logger.success('✅ Visita creada', { visitId });

  return {
    id: visitId,
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as VetVisit;
};

// Actualizar una visita
export const updateVisit = async (
  userId: string,
  petId: string,
  visitId: string,
  updates: Partial<VetVisit>
): Promise<void> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');
  validateId(visitId, 'Visit ID');

  logger.info('✏️ Actualizando visita', { visitId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, visitId, updates);

  logger.success('✅ Visita actualizada', { visitId });
};

// Eliminar una visita
export const deleteVisit = async (
  userId: string,
  petId: string,
  visitId: string
): Promise<void> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');
  validateId(visitId, 'Visit ID');

  logger.info('🗑️ Eliminando visita', { visitId });

  await deletePetSubcollectionDoc(userId, petId, COLLECTION_NAME, visitId);

  logger.success('✅ Visita eliminada', { visitId });
};
