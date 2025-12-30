import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Sube una imagen a Firebase Storage y devuelve la URL pública
 * @param uri - URI local de la imagen
 * @param path - Ruta en Storage (ej: 'users/{uid}/pets/{petId}/visits/{filename}')
 * @returns URL pública de la imagen subida
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
  console.log('📤 uploadImage: Iniciando subida a path:', path);
  const startTime = Date.now();
  
  try {
    // Verificar que storage esté inicializado
    if (!storage) {
      throw new Error('Firebase Storage no está inicializado');
    }

    console.log('📷 Optimizando imagen...');
    // Optimizar imagen antes de subir (reducir tamaño)
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Redimensionar a max 1200px de ancho
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log('🔄 Convirtiendo a Blob...');
    // Convertir URI a Blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    console.log('📦 Blob creado:', blob.size, 'bytes, tipo:', blob.type);

    // Crear referencia en Storage
    const storageRef = ref(storage, path);
    console.log('📍 Referencia de Storage creada:', storageRef.fullPath);

    console.log('⬆️ Iniciando upload...');
    // Subir imagen
    const uploadResult = await uploadBytes(storageRef, blob);
    console.log('✅ Upload completado:', uploadResult.metadata.fullPath);

    // Obtener URL pública
    console.log('🔗 Obteniendo URL pública...');
    const downloadURL = await getDownloadURL(storageRef);
    
    const endTime = Date.now();
    console.log(`✅ uploadImage: Completado en ${endTime - startTime}ms`);
    console.log('📥 URL:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('❌ uploadImage: Error:', error);
    console.error('❌ Error code:', error?.code);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error serverResponse:', error?.serverResponse);
    throw error;
  }
};

/**
 * Elimina una imagen de Firebase Storage
 * @param url - URL completa de la imagen en Storage
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
    console.log('🗑️ Imagen eliminada de Storage');
  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    throw error;
  }
};

/**
 * Genera un path único para Storage
 * @param userId - ID del usuario
 * @param petId - ID de la mascota
 * @param type - Tipo de imagen ('profile' | 'visit')
 * @returns Path para Storage
 */
export const generateStoragePath = (
  userId: string,
  petId: string,
  type: 'profile' | 'visit'
): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return `users/${userId}/pets/${petId}/${type}/${timestamp}_${randomId}.jpg`;
};
