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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { VetVisit } from '../types';

// Colección de visitas para una mascota
const getVisitsCollection = (userId: string, petId: string) => {
  return collection(db, 'users', userId, 'pets', petId, 'visits');
};

// Obtener todas las visitas de una mascota
export const getPetVisits = async (userId: string, petId: string): Promise<VetVisit[]> => {
  console.log('📡 getPetVisits: Consultando visitas para petId:', petId);
  const visitsCol = getVisitsCollection(userId, petId);
  const q = query(visitsCol, orderBy('date', 'desc'));
  
  const startTime = Date.now();
  const snapshot = await getDocs(q);
  const endTime = Date.now();
  
  console.log(`📡 getPetVisits: Respondió en ${endTime - startTime}ms con ${snapshot.docs.length} visitas`);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as VetVisit[];
};

// Obtener una visita por ID
export const getVisit = async (
  userId: string,
  petId: string,
  visitId: string
): Promise<VetVisit | null> => {
  const visitDoc = doc(db, 'users', userId, 'pets', petId, 'visits', visitId);
  const snapshot = await getDoc(visitDoc);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as VetVisit;
};

// Crear una nueva visita
export const createVisit = async (
  userId: string,
  petId: string,
  visitData: Omit<VetVisit, 'id' | 'petId' | 'userId' | 'createdAt'>
): Promise<string> => {
  console.log('📝 createVisit: Creando visita para petId:', petId);
  const visitsCol = getVisitsCollection(userId, petId);
  
  const docRef = await addDoc(visitsCol, {
    ...visitData,
    petId,
    userId,
    createdAt: Timestamp.now(),
  });
  
  console.log('✅ createVisit: Visita creada con ID:', docRef.id);
  return docRef.id;
};

// Actualizar una visita
export const updateVisit = async (
  userId: string,
  petId: string,
  visitId: string,
  updates: Partial<VetVisit>
): Promise<void> => {
  const visitDoc = doc(db, 'users', userId, 'pets', petId, 'visits', visitId);
  await updateDoc(visitDoc, updates);
  console.log('✅ updateVisit: Visita actualizada');
};

// Eliminar una visita
export const deleteVisit = async (
  userId: string,
  petId: string,
  visitId: string
): Promise<void> => {
  const visitDoc = doc(db, 'users', userId, 'pets', petId, 'visits', visitId);
  await deleteDoc(visitDoc);
  console.log('✅ deleteVisit: Visita eliminada');
};
