/**
 * Servicio de Recordatorios
 * 
 * Gestiona CRUD de recordatorios en Firestore:
 * - Path: users/{userId}/reminders/{reminderId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Reminder } from '../types';

const COLLECTION_NAME = 'reminders';

/**
 * Crear un nuevo recordatorio
 */
export const createReminder = async (
  userId: string,
  reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt'>
): Promise<string> => {
  try {
    const userRemindersRef = collection(db, 'users', userId, COLLECTION_NAME);
    
    const newReminder = {
      ...reminderData,
      userId,
      completed: false,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(userRemindersRef, newReminder);
    return docRef.id;
  } catch (error: any) {

    throw new Error(`Error al crear recordatorio: ${error.message}`);
  }
};

/**
 * Obtener todos los recordatorios de un usuario
 */
export const getUserReminders = async (userId: string): Promise<Reminder[]> => {
  try {
    const userRemindersRef = collection(db, 'users', userId, COLLECTION_NAME);
    const q = query(
      userRemindersRef,
      orderBy('scheduledAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
  } catch (error: any) {

    throw new Error(`Error al obtener recordatorios: ${error.message}`);
  }
};

/**
 * Obtener recordatorios pendientes de un usuario (no completados)
 */
export const getPendingReminders = async (userId: string): Promise<Reminder[]> => {
  try {
    const userRemindersRef = collection(db, 'users', userId, COLLECTION_NAME);
    const q = query(
      userRemindersRef,
      where('completed', '==', false),
      orderBy('scheduledAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
  } catch (error: any) {

    throw new Error(`Error al obtener recordatorios pendientes: ${error.message}`);
  }
};

/**
 * Obtener recordatorios de hoy (pendientes y programados para hoy)
 */
export const getTodayReminders = async (userId: string): Promise<Reminder[]> => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const userRemindersRef = collection(db, 'users', userId, COLLECTION_NAME);
    const q = query(
      userRemindersRef,
      where('scheduledAt', '>=', Timestamp.fromDate(startOfDay)),
      where('scheduledAt', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('scheduledAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
  } catch (error: any) {

    throw new Error(`Error al obtener recordatorios de hoy: ${error.message}`);
  }
};

/**
 * Obtener recordatorios de una mascota específica
 */
export const getPetReminders = async (
  userId: string,
  petId: string
): Promise<Reminder[]> => {
  try {
    const userRemindersRef = collection(db, 'users', userId, COLLECTION_NAME);
    const q = query(
      userRemindersRef,
      where('petId', '==', petId),
      orderBy('scheduledAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
  } catch (error: any) {

    throw new Error(`Error al obtener recordatorios de mascota: ${error.message}`);
  }
};

/**
 * Obtener un recordatorio específico
 */
export const getReminder = async (
  userId: string,
  reminderId: string
): Promise<Reminder | null> => {
  try {
    const reminderRef = doc(db, 'users', userId, COLLECTION_NAME, reminderId);
    const docSnap = await getDoc(reminderRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Reminder;
    }
    
    return null;
  } catch (error: any) {

    throw new Error(`Error al obtener recordatorio: ${error.message}`);
  }
};

/**
 * Actualizar un recordatorio
 */
export const updateReminder = async (
  userId: string,
  reminderId: string,
  updates: Partial<Omit<Reminder, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const reminderRef = doc(db, 'users', userId, COLLECTION_NAME, reminderId);
    await updateDoc(reminderRef, updates);
  } catch (error: any) {

    throw new Error(`Error al actualizar recordatorio: ${error.message}`);
  }
};

/**
 * Actualizar un recordatorio de medicación (con soporte para eliminar endDate)
 */
export const updateMedicationReminder = async (
  userId: string,
  reminderId: string,
  updates: {
    title?: string;
    scheduledAt?: Timestamp;
    frequency?: Reminder['frequency'];
    endDate?: Timestamp; // undefined = eliminar el campo
    notes?: string;
    completed?: boolean;
    completedDates?: string[];
  }
): Promise<void> => {
  try {
    const reminderRef = doc(db, 'users', userId, COLLECTION_NAME, reminderId);
    
    // Construir el objeto de actualización
    const updateData: any = { ...updates };
    
    // Si endDate es undefined, usar deleteField() para eliminarlo
    if (updates.endDate === undefined) {
      updateData.endDate = deleteField();
    }
    
    await updateDoc(reminderRef, updateData);
  } catch (error: any) {

    throw new Error(`Error al actualizar recordatorio de medicación: ${error.message}`);
  }
};

/**
 * Marcar recordatorio como completado
 */
export const completeReminder = async (
  userId: string,
  reminderId: string
): Promise<void> => {
  try {
    const reminderRef = doc(db, 'users', userId, COLLECTION_NAME, reminderId);
    await updateDoc(reminderRef, {
      completed: true,
    });
  } catch (error: any) {

    throw new Error(`Error al completar recordatorio: ${error.message}`);
  }
};

/**
 * Eliminar un recordatorio
 */
export const deleteReminder = async (
  userId: string,
  reminderId: string
): Promise<void> => {
  try {
    const reminderRef = doc(db, 'users', userId, COLLECTION_NAME, reminderId);
    await deleteDoc(reminderRef);
  } catch (error: any) {

    throw new Error(`Error al eliminar recordatorio: ${error.message}`);
  }
};
