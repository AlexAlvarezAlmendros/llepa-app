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

// Medicación
export type MedicationType = 'ANALGESIC' | 'ANTIBIOTIC' | 'ANTIPARASITIC' | 'ANTIINFLAMMATORY' | 'VITAMIN' | 'OTHER';
export type MedicationFrequency = 'EVERY_8_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'EVERY_TWO_DAYS' | 'WEEKLY';

// ============ GAMIFICACIÓN: Entrenamiento, Paseos e Incidentes ============

// Entrenamiento - Trucos/Comandos
export type TrainingLevel = 'IN_PROGRESS' | 'LEARNED' | 'CONSOLIDATED';
export type TrickCategory = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'FUN';

export interface TrainingTrick {
  id: string;
  petId: string;
  userId: string;
  name: string; // Ej: "Sentado", "Quieto", "Llamada", "Dame la pata"
  category: TrickCategory;
  level: TrainingLevel;
  notes?: string;
  startedAt: Timestamp; // Cuando empezó a entrenar este truco
  learnedAt?: Timestamp; // Cuando pasó a "Aprendido"
  consolidatedAt?: Timestamp; // Cuando pasó a "Consolidado"
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Paseos/Actividad
export type WalkType = 'SHORT' | 'MEDIUM' | 'LONG' | 'HIKE' | 'RUN' | 'PLAY';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface WalkTrackingData {
  routeCoordinates: RouteCoordinate[];
  steps: number;
  distanceKm: number;
  durationMinutes: number;
  startTime?: string;
}

export interface Walk {
  id: string;
  petId: string;
  userId: string;
  date: Timestamp;
  type: WalkType;
  durationMinutes: number; // Duración en minutos
  distanceKm?: number; // Distancia en km (opcional, si usa podómetro)
  steps?: number; // Pasos (opcional, si integra con podómetro)
  routeCoordinates?: RouteCoordinate[]; // Ruta del paseo (GPS)
  companionPetIds?: string[]; // IDs de mascotas acompañantes
  isCompanionWalk?: boolean; // true si este registro es una copia para un acompañante
  originalPetId?: string; // ID de la mascota principal (solo si isCompanionWalk = true)
  notes?: string;
  mood?: 'HAPPY' | 'NORMAL' | 'TIRED' | 'EXCITED'; // Estado de ánimo durante el paseo
  weather?: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'COLD' | 'HOT';
  createdAt: Timestamp;
}

// Incidentes de Salud
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type IncidentCategory = 
  | 'DIGESTIVE'      // Diarrea, vómitos, no come
  | 'MOBILITY'       // Cojea, no se mueve
  | 'SKIN'           // Rascado excesivo, pérdida de pelo
  | 'RESPIRATORY'    // Tos, estornudos
  | 'BEHAVIOR'       // Cambios de comportamiento, ansiedad
  | 'INJURY'         // Heridas, golpes
  | 'OTHER';

export interface HealthIncident {
  id: string;
  petId: string;
  userId: string;
  date: Timestamp;
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string; // Ej: "Hoy ha tenido diarrea"
  description?: string;
  symptoms?: string[]; // Lista de síntomas observados
  resolved: boolean;
  resolvedAt?: Timestamp;
  resolvedNotes?: string; // Notas de cómo se resolvió
  vetVisitId?: string; // Referencia a visita veterinaria si aplicable
  photoUrl?: string; // Foto del incidente si es relevante
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Medication {
  id: string;
  petId: string;
  userId: string;
  name: string;
  type: MedicationType;
  dose: string; // ej: "500mg", "1 comprimido", "5ml"
  frequency: MedicationFrequency;
  startDate: Timestamp;
  durationDays: number; // duración en días del tratamiento (0 = indefinido)
  endDate?: Timestamp; // fecha fin del tratamiento (calculada automáticamente)
  notes?: string;
  active: boolean; // si el tratamiento está activo
  reminderId?: string; // ID del recordatorio asociado
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Recordatorio
// Tipos automáticos (generados desde otros formularios): MEDICATION, VET_APPOINTMENT, VACCINE, ANTIPARASITIC
// Tipos manuales (creados desde el formulario de recordatorios): HYGIENE, GROOMING, FOOD, WALK, TRAINING, OTHER
export type ReminderType = 
  | 'MEDICATION'      // Medicación (automático)
  | 'VET_APPOINTMENT' // Cita veterinaria (automático)
  | 'VACCINE'         // Vacuna (automático)
  | 'ANTIPARASITIC'   // Antiparasitario (automático)
  | 'HYGIENE'         // Higiene (baño, corte uñas, limpieza orejas)
  | 'GROOMING'        // Peluquería
  | 'FOOD'            // Alimentación
  | 'WALK'            // Paseo
  | 'TRAINING'        // Entrenamiento
  | 'OTHER';          // Otros

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
  frequency?: 'ONCE' | 'EVERY_8_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'EVERY_TWO_DAYS' | 'EVERY_THREE_DAYS' | 'WEEKLY' | 'MONTHLY';
  endDate?: Timestamp; // Fecha de fin para recordatorios con duración limitada
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
  Medications: { petId: string };
  AddMedication: { petId: string; medicationId?: string };
  // Gamificación: Entrenamiento
  TrainingList: { petId: string };
  AddTraining: { petId: string; trickId?: string };
  // Gamificación: Paseos
  WalksList: { petId: string };
  ActiveWalk: { petId: string }; // Pantalla de tracking en tiempo real
  AddWalk: { petId: string; walkId?: string; trackingData?: WalkTrackingData };
  RouteView: { petId: string; walkId: string }; // Ver y rehacer ruta
  // Gamificación: Incidentes
  IncidentsList: { petId: string };
  AddIncident: { petId: string; incidentId?: string };
};
