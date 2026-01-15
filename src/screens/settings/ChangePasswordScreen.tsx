import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../../constants/theme';
import { Button, Input } from '../../components/ui';
import { useDialog } from '../../contexts/DialogContext';
import { changePassword } from '../../services/authService';
import { SettingsStackParamList } from '../../types';
import { getFirebaseAuthErrorMessage } from '../../utils/firebaseErrors';

type ChangePasswordNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'ChangePassword'>;

const ChangePasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ChangePasswordNavigationProp>();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useDialog();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validaciones
  const isCurrentPasswordValid = currentPassword.length >= 6;
  const isNewPasswordValid = newPassword.length >= 6;
  const doPasswordsMatch = newPassword === confirmPassword;
  const isNewPasswordDifferent = newPassword !== currentPassword;
  
  const canSubmit = 
    isCurrentPasswordValid && 
    isNewPasswordValid && 
    doPasswordsMatch && 
    isNewPasswordDifferent &&
    confirmPassword.length > 0;

  const handleChangePassword = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      showSuccess('¡Contraseña actualizada!', 'Tu contraseña se ha cambiado correctamente');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      const errorMessage = getFirebaseAuthErrorMessage(error.code) || error.message || 'No se pudo cambiar la contraseña';
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Información */}
        <View style={[styles.infoSection, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.infoText, { color: theme.colors.onPrimaryContainer }]}>
            🔒 Para tu seguridad, introduce tu contraseña actual antes de establecer una nueva.
          </Text>
        </View>

        {/* Formulario */}
        <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
          {/* Contraseña actual */}
          <Input
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Tu contraseña actual"
            left="lock"
            secureTextEntry={!showCurrentPassword}
            right={showCurrentPassword ? 'eye-off' : 'eye'}
            onRightPress={() => setShowCurrentPassword(!showCurrentPassword)}
            autoCapitalize="none"
          />

          {/* Nueva contraseña */}
          <View style={styles.inputContainer}>
            <Input
              label="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mínimo 6 caracteres"
              left="lock-plus"
              secureTextEntry={!showNewPassword}
              right={showNewPassword ? 'eye-off' : 'eye'}
              onRightPress={() => setShowNewPassword(!showNewPassword)}
              autoCapitalize="none"
            />
            {newPassword.length > 0 && !isNewPasswordValid && (
              <HelperText type="error" visible={true}>
                La contraseña debe tener al menos 6 caracteres
              </HelperText>
            )}
            {newPassword.length > 0 && !isNewPasswordDifferent && (
              <HelperText type="error" visible={true}>
                La nueva contraseña debe ser diferente a la actual
              </HelperText>
            )}
          </View>

          {/* Confirmar contraseña */}
          <View style={styles.inputContainer}>
            <Input
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite la nueva contraseña"
              left="lock-check"
              secureTextEntry={!showConfirmPassword}
              right={showConfirmPassword ? 'eye-off' : 'eye'}
              onRightPress={() => setShowConfirmPassword(!showConfirmPassword)}
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && !doPasswordsMatch && (
              <HelperText type="error" visible={true}>
                Las contraseñas no coinciden
              </HelperText>
            )}
          </View>
        </View>

        {/* Requisitos de contraseña */}
        <View style={[styles.requirementsSection, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.requirementsTitle, { color: theme.colors.onSurfaceVariant }]}>
            Requisitos de la contraseña:
          </Text>
          <View style={styles.requirementItem}>
            <Text style={{ color: isNewPasswordValid ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
              {isNewPasswordValid ? '✓' : '○'} Mínimo 6 caracteres
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Text style={{ color: doPasswordsMatch && confirmPassword.length > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
              {doPasswordsMatch && confirmPassword.length > 0 ? '✓' : '○'} Las contraseñas coinciden
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Text style={{ color: isNewPasswordDifferent && newPassword.length > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
              {isNewPasswordDifferent && newPassword.length > 0 ? '✓' : '○'} Diferente a la actual
            </Text>
          </View>
        </View>

        {/* Botón de guardar */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading || !canSubmit}
            icon="lock-reset"
          >
            Cambiar contraseña
          </Button>
        </View>
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
  infoSection: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  formSection: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginTop: spacing.sm,
  },
  requirementsSection: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  requirementItem: {
    paddingVertical: spacing.xs,
  },
  buttonSection: {
    marginTop: spacing.md,
  },
});

export default ChangePasswordScreen;
