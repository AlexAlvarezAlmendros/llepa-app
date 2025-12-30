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
    dailyAmount: number; // en gramos
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
export type ReminderType = 'MEDICATION' | 'VET_APPOINTMENT' | 'HYGIENE';

export interface Reminder {
  id: string;
  userId: string;
  petId: string;
  title: string;
  type: ReminderType;
  scheduledAt: Timestamp;
  completed: boolean;
  notificationId?: string; // ID de la notificación de Expo
  frequency?: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  notes?: string;
  createdAt: Timestamp;
}

// Estado de navegación
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
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
