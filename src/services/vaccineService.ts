import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Vaccine } from '../types';

// Obtener la colección de vacunas de una mascota
const getVaccinesCollection = (userId: string, petId: string) => {
  return collection(db, 'users', userId, 'pets', petId, 'vaccines');
};

// Obtener todas las vacunas de una mascota
export const getPetVaccines = async (
  userId: string,
  petId: string
): Promise<Vaccine[]> => {
  const startTime = Date.now();
  console.log('🔄 getPetVaccines: Cargando vacunas...');
  
  const vaccinesCol = getVaccinesCollection(userId, petId);
  const q = query(vaccinesCol, orderBy('administeredDate', 'desc'));
  const snapshot = await getDocs(q);
  
  const vaccines: Vaccine[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Vaccine));
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ getPetVaccines: ${vaccines.length} vacunas cargadas en ${elapsed}ms`);
  
  return vaccines;
};

// Obtener vacunas que vencen pronto (próximos 30 días)
export const getUpcomingVaccines = async (
  userId: string,
  petId: string,
  daysAhead: number = 30
): Promise<Vaccine[]> => {
  console.log(`🔄 getUpcomingVaccines: Buscando vacunas próximas (${daysAhead} días)...`);
  
  const vaccinesCol = getVaccinesCollection(userId, petId);
  const now = Timestamp.now();
  const futureDate = Timestamp.fromDate(
    new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  );
  
  const q = query(
    vaccinesCol,
    where('nextDoseDate', '>=', now),
    where('nextDoseDate', '<=', futureDate),
    orderBy('nextDoseDate', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const vaccines: Vaccine[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Vaccine));
  
  console.log(`✅ getUpcomingVaccines: ${vaccines.length} vacunas próximas`);
  return vaccines;
};

// Obtener vacunas vencidas
export const getExpiredVaccines = async (
  userId: string,
  petId: string
): Promise<Vaccine[]> => {
  console.log('🔄 getExpiredVaccines: Buscando vacunas vencidas...');
  
  const vaccinesCol = getVaccinesCollection(userId, petId);
  const now = Timestamp.now();
  
  const q = query(
    vaccinesCol,
    where('nextDoseDate', '<', now),
    orderBy('nextDoseDate', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const vaccines: Vaccine[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Vaccine));
  
  console.log(`⚠️ getExpiredVaccines: ${vaccines.length} vacunas vencidas`);
  return vaccines;
};

// Obtener una vacuna específica
export const getVaccine = async (
  userId: string,
  petId: string,
  vaccineId: string
): Promise<Vaccine | null> => {
  const vaccineDoc = doc(db, 'users', userId, 'pets', petId, 'vaccines', vaccineId);
  const snapshot = await getDoc(vaccineDoc);
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Vaccine;
  }
  
  return null;
};

// Crear una nueva vacuna
export const createVaccine = async (
  userId: string,
  petId: string,
  vaccineData: Omit<Vaccine, 'id' | 'userId' | 'petId' | 'createdAt'>
): Promise<string> => {
  console.log('🔄 createVaccine: Creando vacuna...');
  
  const vaccinesCol = getVaccinesCollection(userId, petId);
  const docRef = await addDoc(vaccinesCol, {
    ...vaccineData,
    userId,
    petId,
    createdAt: Timestamp.now(),
  });
  
  console.log('✅ createVaccine: Vacuna creada con ID:', docRef.id);
  return docRef.id;
};

// Actualizar una vacuna
export const updateVaccine = async (
  userId: string,
  petId: string,
  vaccineId: string,
  updates: Partial<Vaccine>
): Promise<void> => {
  const vaccineDoc = doc(db, 'users', userId, 'pets', petId, 'vaccines', vaccineId);
  await updateDoc(vaccineDoc, updates);
  console.log('✅ updateVaccine: Vacuna actualizada');
};

// Eliminar una vacuna
export const deleteVaccine = async (
  userId: string,
  petId: string,
  vaccineId: string
): Promise<void> => {
  const vaccineDoc = doc(db, 'users', userId, 'pets', petId, 'vaccines', vaccineId);
  await deleteDoc(vaccineDoc);
  console.log('✅ deleteVaccine: Vacuna eliminada');
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
