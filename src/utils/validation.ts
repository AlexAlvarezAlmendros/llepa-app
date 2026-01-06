import { z } from 'zod';

// Schema de validación para registro de usuario
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Schema de validación para login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Schema de validación para mascota
export const petSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  species: z.enum(['Perro', 'Gato', 'Exótico']),
  breed: z.string().optional(),
  birthDate: z.date({ message: 'La fecha de nacimiento es requerida' }),
  weight: z.number().positive('El peso debe ser positivo').optional(),
  chipNumber: z.string().optional(),
  // Campos de alimentación
  foodBrand: z.string().optional(),
  foodType: z.enum(['Pienso', 'Húmedo', 'Natural', 'Mixto']).optional(),
  foodPurchaseAmount: z.number().positive('La cantidad debe ser positiva').optional(),
  foodDailyAmount: z.number().positive('La cantidad debe ser positiva').optional(),
  foodAlertDays: z.number().int().min(1, 'Mínimo 1 día').max(30, 'Máximo 30 días').optional(),
});

// Schema de validación para visita veterinaria
export const vetVisitSchema = z.object({
  reason: z.string().min(1, 'El motivo es requerido'),
  diagnosis: z.string().optional(),
  vetName: z.string().optional(),
  clinicName: z.string().optional(),
  date: z.date({ message: 'La fecha es requerida' }),
});

// Schema de validación para recordatorio
export const reminderSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  type: z.enum(['MEDICATION', 'VET_APPOINTMENT', 'HYGIENE']),
  scheduledAt: z.date({ message: 'La fecha es requerida' }),
  notes: z.string().optional(),
});
