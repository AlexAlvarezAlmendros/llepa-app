import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Obtiene una referencia a una subcolección de mascota
 */
export const getPetSubcollection = (
  userId: string,
  petId: string,
  subcollectionName: string
) => {
  return collection(db, 'users', userId, 'pets', petId, subcollectionName);
};

/**
 * Obtiene documentos de una subcolección de mascota
 */
export const getPetSubcollectionDocs = async <T = DocumentData>(
  userId: string,
  petId: string,
  subcollectionName: string,
  constraints: QueryConstraint[] = []
): Promise<Array<T & { id: string }>> => {
  const collectionRef = getPetSubcollection(userId, petId, subcollectionName);
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as T & { id: string }));
};

/**
 * Crea un documento en una subcolección de mascota
 */
export const createPetSubcollectionDoc = async (
  userId: string,
  petId: string,
  subcollectionName: string,
  data: DocumentData
) => {
  const collectionRef = getPetSubcollection(userId, petId, subcollectionName);
  const docRef = await addDoc(collectionRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

/**
 * Actualiza un documento en una subcolección de mascota
 */
export const updatePetSubcollectionDoc = async (
  userId: string,
  petId: string,
  subcollectionName: string,
  docId: string,
  data: Partial<DocumentData>
) => {
  const docRef = doc(db, 'users', userId, 'pets', petId, subcollectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Elimina un documento de una subcolección de mascota
 */
export const deletePetSubcollectionDoc = async (
  userId: string,
  petId: string,
  subcollectionName: string,
  docId: string
) => {
  const docRef = doc(db, 'users', userId, 'pets', petId, subcollectionName, docId);
  await deleteDoc(docRef);
};

/**
 * Valida que el userId no esté vacío
 */
export const validateUserId = (userId: string | undefined): asserts userId is string => {
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }
};

/**
 * Valida que un ID no esté vacío
 */
export const validateId = (id: string | undefined, fieldName: string): asserts id is string => {
  if (!id) {
    throw new Error(`${fieldName} es requerido`);
  }
};
