// Especies de mascotas disponibles
export const PET_SPECIES = ['Perro', 'Gato', 'Exótico'] as const;

// Tipos de recordatorios
export const REMINDER_TYPES = {
  MEDICATION: 'Medicación',
  VET_APPOINTMENT: 'Cita Veterinaria',
  HYGIENE: 'Higiene/Cuidados',
  OTHER: 'Otros',
} as const;

// Frecuencias de recordatorios
export const REMINDER_FREQUENCIES = {
  ONCE: 'Una vez',
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
} as const;

// Estados de vacunación
export const VACCINE_STATUS = {
  VALID: 'Vigente',
  EXPIRED: 'Vencida',
  UPCOMING: 'Próxima',
} as const;

// Rutas de navegación
export const ROUTES = {
  // Auth
  AUTH: 'Auth',
  LOGIN: 'Login',
  REGISTER: 'Register',
  
  // Main
  MAIN: 'Main',
  TODAY: 'Today',
  PETS: 'Pets',
  SETTINGS: 'Settings',
  
  // Pets
  PETS_LIST: 'PetsList',
  PET_DETAIL: 'PetDetail',
  ADD_PET: 'AddPet',
  EDIT_PET: 'EditPet',
  
  // Health
  HEALTH_HISTORY: 'HealthHistory',
  ADD_VISIT: 'AddVisit',
} as const;

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NETWORK: 'No hay conexión a internet',
  AUTH_FAILED: 'Error de autenticación',
  PERMISSION_DENIED: 'Permiso denegado',
  UNKNOWN: 'Ha ocurrido un error inesperado',
  CAMERA_PERMISSION: 'Necesitas dar permiso para usar la cámara',
  STORAGE_PERMISSION: 'Necesitas dar permiso para acceder a las fotos',
} as const;
