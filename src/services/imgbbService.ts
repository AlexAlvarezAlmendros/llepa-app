import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// API Key de imgbb desde variables de entorno
const IMGBB_API_KEY = Constants.expoConfig?.extra?.imgbbApiKey || process.env.EXPO_PUBLIC_IMGBB_API_KEY || '';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

interface ImgbbResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium?: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

/**
 * Sube una imagen a imgbb y devuelve la URL pública
 * @param uri - URI local de la imagen
 * @param name - Nombre opcional para la imagen
 * @returns URL pública de la imagen subida
 */
export const uploadImageToImgbb = async (
  uri: string,
  name?: string
): Promise<string> => {
  try {
    // Verificar que la API key esté configurada
    if (!IMGBB_API_KEY) {
      throw new Error('Por favor configura EXPO_PUBLIC_IMGBB_API_KEY en tu archivo .env');
    }

    // Optimizar imagen antes de subir (reducir tamaño)
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Redimensionar a max 1200px de ancho
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Leer la imagen como base64
    const base64Image = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
      encoding: 'base64',
    });

    // Crear FormData para la petición
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Image);
    if (name) {
      formData.append('name', name);
    }

    // Subir a imgbb
    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al subir imagen: ${response.status} - ${errorText}`);
    }

    const result: ImgbbResponse = await response.json();

    if (!result.success) {
      throw new Error('La subida de imagen falló');
    }

    // Devolver la URL de la imagen (usamos display_url que es la versión optimizada)
    return result.data.display_url;
  } catch (error: any) {
    console.error('Error subiendo imagen a imgbb:', error);
    throw new Error(error.message || 'No se pudo subir la imagen');
  }
};

/**
 * Genera un nombre único para la imagen
 * @param type - Tipo de imagen ('pet' | 'visit' | 'incident')
 * @returns Nombre único
 */
export const generateImageName = (type: 'pet' | 'visit' | 'incident'): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return `llepa_${type}_${timestamp}_${randomId}`;
};
