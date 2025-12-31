import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface UseImagePickerResult {
  imageUri: string | null;
  pickImage: (aspect?: [number, number]) => Promise<void>;
  takePhoto: (aspect?: [number, number]) => Promise<void>;
  clearImage: () => void;
  isPickingImage: boolean;
}

export const useImagePicker = (
  initialUri: string | null = null
): UseImagePickerResult => {
  const [imageUri, setImageUri] = useState<string | null>(initialUri);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const pickImage = async (aspect: [number, number] = [1, 1]) => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu galería para seleccionar una foto'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setIsPickingImage(false);
    }
  };

  const takePhoto = async (aspect: [number, number] = [1, 1]) => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu cámara para tomar una foto'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setIsPickingImage(false);
    }
  };

  const clearImage = () => {
    setImageUri(null);
  };

  return {
    imageUri,
    pickImage,
    takePhoto,
    clearImage,
    isPickingImage,
  };
};
