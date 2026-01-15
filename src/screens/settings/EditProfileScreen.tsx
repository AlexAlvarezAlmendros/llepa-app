import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  useTheme,
  Avatar,
  Portal,
  Dialog,
  RadioButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Button, Input, Loading } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useDialog } from '../../contexts/DialogContext';
import { updateUserProfile } from '../../services/authService';
import { uploadImageToImgbb, generateImageName } from '../../services/imgbbService';
import { SettingsStackParamList } from '../../types';

type EditProfileNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'EditProfile'>;

const EditProfileScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EditProfileNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showSuccess, showError } = useDialog();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  
  const { imageUri, pickImage, takePhoto, clearImage } = useImagePicker(user?.photoURL || null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      showError('Error', 'El nombre no puede estar vacío');
      return;
    }

    try {
      setLoading(true);
      
      let photoURL = user?.photoURL || undefined;
      
      // Si hay una nueva imagen seleccionada, subirla
      if (imageUri && imageUri !== user?.photoURL) {
        const imageName = generateImageName('pet').replace('pet', 'user');
        photoURL = await uploadImageToImgbb(imageUri, imageName);
      }
      
      await updateUserProfile({
        displayName: displayName.trim(),
        photoURL,
      });
      
      showSuccess('¡Perfil actualizado!', 'Tus cambios se han guardado correctamente');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error actualizando perfil:', error);
      showError('Error', error.message || 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = () => {
    setImagePickerVisible(true);
  };

  const handlePickFromGallery = async () => {
    setImagePickerVisible(false);
    await pickImage([1, 1]);
  };

  const handleTakePhoto = async () => {
    setImagePickerVisible(false);
    await takePhoto([1, 1]);
  };

  const handleRemovePhoto = () => {
    setImagePickerVisible(false);
    clearImage();
  };

  const currentPhotoUri = imageUri || user?.photoURL;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* Sección de foto de perfil */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleSelectImage} activeOpacity={0.8}>
            <View style={styles.avatarContainer}>
              {currentPhotoUri ? (
                <Avatar.Image
                  size={120}
                  source={{ uri: currentPhotoUri }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Icon
                  size={120}
                  icon="account"
                  style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                  color={theme.colors.onPrimary}
                />
              )}
              <View
                style={[
                  styles.editBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={[styles.editBadgeIcon, { color: theme.colors.onPrimary }]}>
                  📷
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>
            Cambiar foto
          </Text>
        </View>

        {/* Formulario */}
        <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
          <Input
            label="Nombre"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Tu nombre"
            left="account"
            autoCapitalize="words"
          />
          
          <View style={styles.emailContainer}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
              Correo electrónico
            </Text>
            <Text style={[styles.emailValue, { color: theme.colors.onSurface }]}>
              {user?.email}
            </Text>
            <Text style={[styles.emailHint, { color: theme.colors.onSurfaceVariant }]}>
              El correo electrónico no se puede cambiar
            </Text>
          </View>
        </View>

        {/* Botón de guardar */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            icon="content-save"
          >
            Guardar cambios
          </Button>
        </View>

        {/* Dialog para selección de imagen */}
        <Portal>
          <Dialog
            visible={imagePickerVisible}
            onDismiss={() => setImagePickerVisible(false)}
          >
            <Dialog.Title>Cambiar foto de perfil</Dialog.Title>
            <Dialog.Content>
              <TouchableOpacity
                style={styles.dialogOption}
                onPress={handlePickFromGallery}
              >
                <Text style={[styles.dialogOptionText, { color: theme.colors.onSurface }]}>
                  📁 Seleccionar de galería
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogOption}
                onPress={handleTakePhoto}
              >
                <Text style={[styles.dialogOptionText, { color: theme.colors.onSurface }]}>
                  📷 Tomar foto
                </Text>
              </TouchableOpacity>
              {currentPhotoUri && (
                <TouchableOpacity
                  style={styles.dialogOption}
                  onPress={handleRemovePhoto}
                >
                  <Text style={[styles.dialogOptionText, { color: theme.colors.error }]}>
                    🗑️ Eliminar foto
                  </Text>
                </TouchableOpacity>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button mode="text" onPress={() => setImagePickerVisible(false)}>
                Cancelar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    elevation: 4,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  editBadgeIcon: {
    fontSize: 18,
  },
  changePhotoText: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emailContainer: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  emailHint: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  buttonSection: {
    marginTop: spacing.md,
  },
  dialogOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dialogOptionText: {
    fontSize: 16,
  },
});

export default EditProfileScreen;
