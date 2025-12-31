import {
  query,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import { Vaccine } from '../types';
import {
  getPetSubcollection,
  getPetSubcollectionDocs,
  createPetSubcollectionDoc,
  updatePetSubcollectionDoc,
  deletePetSubcollectionDoc,
  validateUserId,
  validateId,
} from '../utils/firestoreHelpers';
import { logger } from '../utils/logger';

const COLLECTION_NAME = 'vaccines';

// Obtener todas las vacunas de una mascota
export const getPetVaccines = async (
  userId: string,
  petId: string
): Promise<Vaccine[]> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');

  const startTime = Date.now();
  logger.info('📋 Obteniendo vacunas', { userId, petId });

  const vaccines = await getPetSubcollectionDocs<Vaccine>(
    userId,
    petId,
    COLLECTION_NAME,
    [orderBy('administeredDate', 'desc')]
  );

  const elapsed = Date.now() - startTime;
  logger.success(`✅ Vacunas obtenidas en ${elapsed}ms`, { count: vaccines.length });

  return vaccines;
};

// Obtener vacunas que vencen pronto (próximos 30 días)
export const getUpcomingVaccines = async (
  userId: string,
  petId: string,
  daysAhead: number = 30
): Promise<Vaccine[]> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');

  logger.info('📅 Obteniendo vacunas próximas', { userId, petId, daysAhead });

  const now = Timestamp.now();
  const futureDate = Timestamp.fromDate(
    new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  );

  const vaccines = await getPetSubcollectionDocs<Vaccine>(
    userId,
    petId,
    COLLECTION_NAME,
    [
      where('nextDoseDate', '>=', now),
      where('nextDoseDate', '<=', futureDate),
      orderBy('nextDoseDate', 'asc')
    ]
  );

  logger.success('✅ Vacunas próximas obtenidas', { count: vaccines.length });
  return vaccines;
};

// Obtener vacunas vencidas
export const getExpiredVaccines = async (
  userId: string,
  petId: string
): Promise<Vaccine[]> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');

  logger.info('⚠️ Obteniendo vacunas vencidas', { userId, petId });

  const now = Timestamp.now();

  const vaccines = await getPetSubcollectionDocs<Vaccine>(
    userId,
    petId,
    COLLECTION_NAME,
    [
      where('nextDoseDate', '<', now),
      orderBy('nextDoseDate', 'asc')
    ]
  );

  logger.success('✅ Vacunas vencidas obtenidas', { count: vaccines.length });
  return vaccines;
};

// Obtener una vacuna específica
export const getVaccine = async (
  userId: string,
  petId: string,
  vaccineId: string
): Promise<Vaccine | null> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');
  validateId(vaccineId, 'Vaccine ID');

  const vaccines = await getPetSubcollectionDocs<Vaccine>(
    userId,
    petId,
    COLLECTION_NAME
  );

  const vaccine = vaccines.find(v => v.id === vaccineId);
  return vaccine || null;
};

// Crear una nueva vacuna
export const createVaccine = async (
  userId: string,
  petId: string,
  vaccineData: Omit<Vaccine, 'id' | 'userId' | 'petId' | 'createdAt'>
): Promise<Vaccine> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');

  logger.info('💉 Creando vacuna', { userId, petId, name: vaccineData.name });

  const data = {
    ...vaccineData,
    userId,
    petId,
  };

  const vaccineId = await createPetSubcollectionDoc(userId, petId, COLLECTION_NAME, data);
  
  logger.success('✅ Vacuna creada', { vaccineId });

  return {
    id: vaccineId,
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Vaccine;
};

// Actualizar una vacuna
export const updateVaccine = async (
  userId: string,
  petId: string,
  vaccineId: string,
  updates: Partial<Vaccine>
): Promise<void> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');
  validateId(vaccineId, 'Vaccine ID');

  logger.info('✏️ Actualizando vacuna', { vaccineId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, vaccineId, updates);

  logger.success('✅ Vacuna actualizada', { vaccineId });
};

// Eliminar una vacuna
export const deleteVaccine = async (
  userId: string,
  petId: string,
  vaccineId: string
): Promise<void> => {
  validateUserId(userId);
  validateId(petId, 'Pet ID');
  validateId(vaccineId, 'Vaccine ID');

  logger.info('🗑️ Eliminando vacuna', { vaccineId });

  await deletePetSubcollectionDoc(userId, petId, COLLECTION_NAME, vaccineId);

  logger.success('✅ Vacuna eliminada', { vaccineId });
};

// Calcular el estado de una vacuna (vigente, próxima, vencida)
export const getVaccineStatus = (vaccine: Vaccine): 'valid' | 'upcoming' | 'expired' => {
  if (!vaccine.nextDoseDate) {
    return 'valid'; // Sin fecha de próxima dosis = no requiere revacunación
  }

  const now = Date.now();
  const nextDose = vaccine.nextDoseDate.toDate().getTime();
  const daysUntilNext = Math.floor((nextDose - now) / (1000 * 60 * 60 * 24));

  if (daysUntilNext < 0) {
    return 'expired'; // Vencida
  } else if (daysUntilNext <= 30) {
    return 'upcoming'; // Próxima a vencer (30 días o menos)
  } else {
    return 'valid'; // Vigente
  }
};
