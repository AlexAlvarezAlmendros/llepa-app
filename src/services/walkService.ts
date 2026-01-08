import { orderBy, Timestamp, where } from 'firebase/firestore';
import { Walk } from '../types';
import {
  getPetSubcollectionDocs,
  createPetSubcollectionDoc,
  updatePetSubcollectionDoc,
  deletePetSubcollectionDoc,
} from '../utils/firestoreHelpers';
import { logger } from '../utils/logger';

const COLLECTION_NAME = 'walks';

// Obtener todos los paseos de una mascota
export const getPetWalks = async (userId: string, petId: string): Promise<Walk[]> => {
  logger.info('🚶 Obteniendo paseos', { userId, petId });

  const walks = await getPetSubcollectionDocs<Walk>(
    userId,
    petId,
    COLLECTION_NAME,
    [orderBy('date', 'desc')]
  );

  logger.success('✅ Paseos obtenidos', { count: walks.length });
  return walks;
};

// Obtener paseos de una mascota en un rango de fechas
export const getPetWalksByDateRange = async (
  userId: string,
  petId: string,
  startDate: Date,
  endDate: Date
): Promise<Walk[]> => {
  logger.info('🚶 Obteniendo paseos por rango de fechas', { userId, petId, startDate, endDate });

  const walks = await getPetSubcollectionDocs<Walk>(
    userId,
    petId,
    COLLECTION_NAME,
    [
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    ]
  );

  logger.success('✅ Paseos por rango obtenidos', { count: walks.length });
  return walks;
};

// Obtener un paseo por ID
export const getWalk = async (
  userId: string,
  petId: string,
  walkId: string
): Promise<Walk | null> => {
  const walks = await getPetSubcollectionDocs<Walk>(
    userId,
    petId,
    COLLECTION_NAME
  );

  const walk = walks.find(w => w.id === walkId);
  return walk || null;
};

// Crear un nuevo paseo
export const createWalk = async (
  userId: string,
  petId: string,
  walkData: Omit<Walk, 'id' | 'petId' | 'userId' | 'createdAt'>
): Promise<Walk> => {
  logger.info('🚶 Registrando nuevo paseo', { userId, petId, type: walkData.type });

  const now = Timestamp.now();
  const dataToCreate = {
    ...walkData,
    petId,
    userId,
    createdAt: now,
  };

  const id = await createPetSubcollectionDoc(userId, petId, COLLECTION_NAME, dataToCreate);

  logger.success('✅ Paseo registrado', { walkId: id });

  return {
    ...dataToCreate,
    id,
  } as Walk;
};

// Actualizar un paseo
export const updateWalk = async (
  userId: string,
  petId: string,
  walkId: string,
  updates: Partial<Omit<Walk, 'id' | 'petId' | 'userId' | 'createdAt'>>
): Promise<void> => {
  logger.info('🚶 Actualizando paseo', { userId, petId, walkId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, walkId, updates);

  logger.success('✅ Paseo actualizado');
};

// Eliminar un paseo
export const deleteWalk = async (
  userId: string,
  petId: string,
  walkId: string
): Promise<void> => {
  logger.info('🚶 Eliminando paseo', { userId, petId, walkId });

  await deletePetSubcollectionDoc(userId, petId, COLLECTION_NAME, walkId);

  logger.success('✅ Paseo eliminado');
};

// Obtener estadísticas de paseos
export const getWalkStats = async (
  userId: string,
  petId: string,
  days: number = 7
): Promise<{
  totalWalks: number;
  totalMinutes: number;
  totalDistance: number;
  averageMinutes: number;
  walksByDay: { date: string; count: number; minutes: number }[];
}> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const walks = await getPetWalksByDateRange(userId, petId, startDate, endDate);

  const totalMinutes = walks.reduce((sum, w) => sum + w.durationMinutes, 0);
  const totalDistance = walks.reduce((sum, w) => sum + (w.distanceKm || 0), 0);

  // Agrupar por día
  const walksByDayMap = new Map<string, { count: number; minutes: number }>();
  
  walks.forEach(walk => {
    const dateKey = walk.date.toDate().toISOString().split('T')[0];
    const existing = walksByDayMap.get(dateKey) || { count: 0, minutes: 0 };
    walksByDayMap.set(dateKey, {
      count: existing.count + 1,
      minutes: existing.minutes + walk.durationMinutes,
    });
  });

  const walksByDay = Array.from(walksByDayMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    minutes: data.minutes,
  }));

  return {
    totalWalks: walks.length,
    totalMinutes,
    totalDistance,
    averageMinutes: walks.length > 0 ? Math.round(totalMinutes / walks.length) : 0,
    walksByDay,
  };
};

// Obtener paseos de hoy
export const getTodayWalks = async (userId: string, petId: string): Promise<Walk[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return getPetWalksByDateRange(userId, petId, today, endOfDay);
};
