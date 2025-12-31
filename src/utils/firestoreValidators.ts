import { Timestamp } from 'firebase/firestore';

/**
 * Verifica si un valor es un Timestamp de Firestore
 */
export const isTimestamp = (value: any): value is Timestamp => {
  return value instanceof Timestamp || 
    (value && typeof value.toDate === 'function' && typeof value.seconds === 'number');
};

/**
 * Convierte un valor a Date de forma segura
 * Maneja Timestamp de Firestore, Date, string ISO y números (milisegundos)
 */
export const toDate = (value: any): Date | null => {
  if (!value) return null;

  // Ya es un Date
  if (value instanceof Date) {
    return value;
  }

  // Es un Timestamp de Firestore
  if (isTimestamp(value)) {
    return value.toDate();
  }

  // Es una string ISO
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  // Es un número (milisegundos)
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

/**
 * Convierte un Date a Timestamp de Firestore
 */
export const toTimestamp = (date: Date | null | undefined): Timestamp | null => {
  if (!date || !(date instanceof Date)) return null;
  return Timestamp.fromDate(date);
};

/**
 * Valida que un timestamp no sea nulo y lo convierte a Date
 */
export const requireDate = (value: any, fieldName: string): Date => {
  const date = toDate(value);
  if (!date) {
    throw new Error(`${fieldName} debe ser una fecha válida`);
  }
  return date;
};

/**
 * Verifica si una fecha está en el pasado
 */
export const isPastDate = (date: Date | Timestamp): boolean => {
  const dateObj = isTimestamp(date) ? date.toDate() : date;
  return dateObj.getTime() < Date.now();
};

/**
 * Verifica si una fecha está en el futuro
 */
export const isFutureDate = (date: Date | Timestamp): boolean => {
  const dateObj = isTimestamp(date) ? date.toDate() : date;
  return dateObj.getTime() > Date.now();
};

/**
 * Compara dos fechas (retorna -1 si a < b, 0 si son iguales, 1 si a > b)
 */
export const compareDates = (a: Date | Timestamp, b: Date | Timestamp): number => {
  const dateA = isTimestamp(a) ? a.toDate() : a;
  const dateB = isTimestamp(b) ? b.toDate() : b;
  
  const timeA = dateA.getTime();
  const timeB = dateB.getTime();
  
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;
  return 0;
};
