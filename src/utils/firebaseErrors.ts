/**
 * Mapea códigos de error de Firebase a mensajes en español legibles
 */
export const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/invalid-email': 'El correo electrónico no es válido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
    'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión',
  };

  return errorMessages[errorCode] || 'Ocurrió un error. Intenta de nuevo';
};

/**
 * Mapea códigos de error de Firestore a mensajes en español
 */
export const getFirestoreErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'permission-denied': 'No tienes permisos para realizar esta acción',
    'not-found': 'El recurso solicitado no existe',
    'already-exists': 'Este recurso ya existe',
    'failed-precondition': 'No se cumplieron las condiciones previas',
    'aborted': 'Operación cancelada',
    'out-of-range': 'Valor fuera del rango permitido',
    'unimplemented': 'Operación no implementada',
    'internal': 'Error interno del servidor',
    'unavailable': 'Servicio temporalmente no disponible',
    'data-loss': 'Pérdida de datos irrecuperable',
    'unauthenticated': 'Debes iniciar sesión',
  };

  return errorMessages[errorCode] || 'Error al procesar la solicitud';
};

/**
 * Extrae el mensaje de error apropiado de cualquier error de Firebase
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return 'Error desconocido';

  // Error de Firebase Auth
  if (error.code?.startsWith('auth/')) {
    return getFirebaseAuthErrorMessage(error.code);
  }

  // Error de Firestore
  if (error.code && !error.code.startsWith('auth/')) {
    return getFirestoreErrorMessage(error.code);
  }

  // Error con mensaje personalizado
  if (error.message) {
    return error.message;
  }

  return 'Ocurrió un error inesperado';
};
