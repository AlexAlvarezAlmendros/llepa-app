// Tipos de datos de la aplicación

import { Timestamp } from 'firebase/firestore';

// Usuario
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
}

// Mascota
export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: 'Perro' | 'Gato' | 'Exótico';
  breed?: string;
  gender?: 'Macho' | 'Hembra';
  birthDate: Timestamp;
  weight?: number;
  photoUrl?: string;
  chipNumber?: string;
  // Datos operativos
  food?: {
    brand: string;
    type?: 'Pienso' | 'Húmedo' | 'Natural' | 'Mixto'; // tipo de comida
    purchaseAmount: number; // cantidad que se compra en gramos (ej: 2000g = 2kg)
    dailyAmount: number; // cantidad diaria en gramos
    lastPurchaseDate?: Timestamp; // fecha de la última compra
    alertDays?: number; // días restantes para activar alerta de compra (ej: 5 = avisar cuando queden 5 días)
  };
  insurance?: {
    policyNumber: string;
    emergencyPhone: string;
  };
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Visita veterinaria
export interface VetVisit {
  id: string;
  petId: string;
  userId: string;
  date: Timestamp;
  reason: string;
  diagnosis?: string;
  vetName?: string;
  clinicName?: string;
  attachmentUrl?: string; // URL de la foto de la receta
  createdAt: Timestamp;
}

// Vacuna
export interface Vaccine {
  id: string;
  petId: string;
  userId: string;
  name: string;
  administeredDate: Timestamp;
  nextDoseDate?: Timestamp;
  createdAt: Timestamp;
}

// Recordatorio
export type ReminderType = 'MEDICATION' | 'HYGIENE' | 'FOOD' | 'OTHER';

export interface Reminder {
  id: string;
  userId: string;
  petId: string;
  title: string;
  type: ReminderType;
  scheduledAt: Timestamp;
  completed: boolean;
  completedDates?: string[]; // Array de fechas completadas (formato YYYY-MM-DD) para recordatorios recurrentes
  notificationId?: string; // ID de la notificación de Expo
  frequency?: 'ONCE' | 'DAILY' | 'EVERY_TWO_DAYS' | 'EVERY_THREE_DAYS' | 'WEEKLY' | 'MONTHLY';
  notes?: string;
  createdAt: Timestamp;
}

// Estado de navegación
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  AddReminder: { reminderId?: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Pets: undefined;
  Settings: undefined;
};

export type PetsStackParamList = {
  PetsList: undefined;
  PetDetail: { petId: string };
  AddPet: undefined;
  EditPet: { petId: string };
  HealthHistory: { petId: string };
  AddVisit: { petId: string; visitId?: string };
  Vaccines: { petId: string };
  AddVaccine: { petId: string };
};
