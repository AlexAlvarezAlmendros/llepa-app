/**
 * Sistema de logging condicional según el entorno
 * En producción no se mostrarán logs, solo en desarrollo
 */

const isDev = __DEV__;

export const logger = {
  /**
   * Log informativo (solo en desarrollo)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log de error (siempre se muestra, pero formateado)
   */
  error: (context: string, error: any) => {
    if (isDev) {
      console.error(`[ERROR] ${context}:`, error);
    } else {
      // En producción, podríamos enviar a un servicio de analytics
      console.error(`[ERROR] ${context}`);
    }
  },

  /**
   * Log de advertencia (solo en desarrollo)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log de información de operación (solo en desarrollo)
   */
  info: (operation: string, data?: any) => {
    if (isDev) {
      if (data) {
        console.log(`ℹ️ ${operation}:`, data);
      } else {
        console.log(`ℹ️ ${operation}`);
      }
    }
  },

  /**
   * Log de éxito de operación (solo en desarrollo)
   */
  success: (operation: string, data?: any) => {
    if (isDev) {
      if (data) {
        console.log(`✅ ${operation}:`, data);
      } else {
        console.log(`✅ ${operation}`);
      }
    }
  },
};
