import { orderBy, Timestamp, where } from 'firebase/firestore';
import { HealthIncident } from '../types';
import {
  getPetSubcollectionDocs,
  createPetSubcollectionDoc,
  updatePetSubcollectionDoc,
  deletePetSubcollectionDoc,
} from '../utils/firestoreHelpers';
import { logger } from '../utils/logger';

const COLLECTION_NAME = 'incidents';

// Obtener todos los incidentes de una mascota
export const getPetIncidents = async (userId: string, petId: string): Promise<HealthIncident[]> => {
  logger.info('⚠️ Obteniendo incidentes de salud', { userId, petId });

  const incidents = await getPetSubcollectionDocs<HealthIncident>(
    userId,
    petId,
    COLLECTION_NAME,
    [orderBy('date', 'desc')]
  );

  logger.success('✅ Incidentes obtenidos', { count: incidents.length });
  return incidents;
};

// Obtener incidentes no resueltos
export const getUnresolvedIncidents = async (
  userId: string,
  petId: string
): Promise<HealthIncident[]> => {
  logger.info('⚠️ Obteniendo incidentes no resueltos', { userId, petId });

  const incidents = await getPetSubcollectionDocs<HealthIncident>(
    userId,
    petId,
    COLLECTION_NAME,
    [
      where('resolved', '==', false),
      orderBy('date', 'desc')
    ]
  );

  logger.success('✅ Incidentes no resueltos obtenidos', { count: incidents.length });
  return incidents;
};

// Obtener un incidente por ID
export const getIncident = async (
  userId: string,
  petId: string,
  incidentId: string
): Promise<HealthIncident | null> => {
  const incidents = await getPetSubcollectionDocs<HealthIncident>(
    userId,
    petId,
    COLLECTION_NAME
  );

  const incident = incidents.find(i => i.id === incidentId);
  return incident || null;
};

// Crear un nuevo incidente
export const createIncident = async (
  userId: string,
  petId: string,
  incidentData: Omit<HealthIncident, 'id' | 'petId' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<HealthIncident> => {
  logger.info('⚠️ Registrando nuevo incidente', { userId, petId, title: incidentData.title });

  const now = Timestamp.now();
  const dataToCreate = {
    ...incidentData,
    petId,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const id = await createPetSubcollectionDoc(userId, petId, COLLECTION_NAME, dataToCreate);

  logger.success('✅ Incidente registrado', { incidentId: id });

  return {
    ...dataToCreate,
    id,
  } as HealthIncident;
};

// Actualizar un incidente
export const updateIncident = async (
  userId: string,
  petId: string,
  incidentId: string,
  updates: Partial<Omit<HealthIncident, 'id' | 'petId' | 'userId' | 'createdAt'>>
): Promise<void> => {
  logger.info('⚠️ Actualizando incidente', { userId, petId, incidentId });

  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, incidentId, {
    ...updates,
    updatedAt: Timestamp.now(),
  });

  logger.success('✅ Incidente actualizado');
};

// Marcar incidente como resuelto
export const resolveIncident = async (
  userId: string,
  petId: string,
  incidentId: string,
  resolvedNotes?: string,
  vetVisitId?: string
): Promise<void> => {
  logger.info('⚠️ Marcando incidente como resuelto', { userId, petId, incidentId });

  const now = Timestamp.now();
  await updatePetSubcollectionDoc(userId, petId, COLLECTION_NAME, incidentId, {
    resolved: true,
    resolvedAt: now,
    resolvedNotes,
    vetVisitId,
    updatedAt: now,
  });

  logger.success('✅ Incidente marcado como resuelto');
};

// Eliminar un incidente
export const deleteIncident = async (
  userId: string,
  petId: string,
  incidentId: string
): Promise<void> => {
  logger.info('⚠️ Eliminando incidente', { userId, petId, incidentId });

  await deletePetSubcollectionDoc(userId, petId, COLLECTION_NAME, incidentId);

  logger.success('✅ Incidente eliminado');
};

// Obtener estadísticas de incidentes
export const getIncidentStats = async (
  userId: string,
  petId: string
): Promise<{
  total: number;
  resolved: number;
  unresolved: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}> => {
  const incidents = await getPetIncidents(userId, petId);

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  incidents.forEach(incident => {
    // Contar por categoría
    byCategory[incident.category] = (byCategory[incident.category] || 0) + 1;
    // Contar por severidad
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
  });

  return {
    total: incidents.length,
    resolved: incidents.filter(i => i.resolved).length,
    unresolved: incidents.filter(i => !i.resolved).length,
    byCategory,
    bySeverity,
  };
};

// Obtener incidentes recientes (últimos 30 días)
export const getRecentIncidents = async (
  userId: string,
  petId: string,
  days: number = 30
): Promise<HealthIncident[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const incidents = await getPetSubcollectionDocs<HealthIncident>(
    userId,
    petId,
    COLLECTION_NAME,
    [
      where('date', '>=', Timestamp.fromDate(startDate)),
      orderBy('date', 'desc')
    ]
  );

  return incidents;
};
