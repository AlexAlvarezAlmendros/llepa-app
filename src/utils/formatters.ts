/**
 * Formatea un número como moneda en euros
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

/**
 * Formatea el peso con la unidad adecuada
 */
export const formatWeight = (weight: number, unit: 'kg' | 'g' = 'kg'): string => {
  if (unit === 'kg') {
    return `${weight.toFixed(1)} kg`;
  }
  return `${weight.toFixed(0)} g`;
};

/**
 * Formatea una cantidad de comida
 */
export const formatFoodAmount = (amount: number, unit: 'g' | 'ml' = 'g'): string => {
  return `${amount} ${unit}`;
};

/**
 * Formatea un número de teléfono español
 */
export const formatPhoneNumber = (phone: string): string => {
  // Eliminar espacios y caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Formato: +34 XXX XX XX XX o XXX XX XX XX
  if (cleaned.startsWith('34') && cleaned.length === 11) {
    return `+34 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  } else if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

/**
 * Capitaliza la primera letra de un texto
 */
export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Formatea texto de múltiples líneas truncando si es necesario
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};
