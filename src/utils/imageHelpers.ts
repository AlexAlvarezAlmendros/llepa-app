import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Comprime y redimensiona una imagen para optimizar el almacenamiento
 */
export const compressImage = async (
  uri: string,
  options: ImageCompressionOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
  } = options;

  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    return manipulatedImage.uri;
  } catch (error) {
    // Si falla la compresión, devolver la URI original
    return uri;
  }
};

/**
 * Comprime imagen para avatar/perfil (formato cuadrado)
 */
export const compressAvatarImage = async (uri: string): Promise<string> => {
  return compressImage(uri, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
  });
};

/**
 * Comprime imagen para documentos/recetas (mantiene legibilidad)
 */
export const compressDocumentImage = async (uri: string): Promise<string> => {
  return compressImage(uri, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.9,
  });
};

/**
 * Obtiene el tamaño estimado de una imagen en bytes
 */
export const getImageSize = async (uri: string): Promise<number> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
};

/**
 * Valida que la URI de la imagen sea válida
 */
export const isValidImageUri = (uri: string | null | undefined): uri is string => {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('http://') || uri.startsWith('https://');
};
