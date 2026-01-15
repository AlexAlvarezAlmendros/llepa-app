import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { List, Divider, Dialog, Portal, Avatar, RadioButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useColorSchemeStore } from '../../hooks/useColorScheme';
import { useNotificationStore } from '../../store/notificationStore';
import { useDialog } from '../../contexts/DialogContext';
import { SettingsStackParamList } from '../../types';

type SettingsNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

const SettingsScreen = () => {
  const { user, logout, loading } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<SettingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const { showAlert, showError } = useDialog();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  
  const { themeMode, setThemeMode } = useColorSchemeStore();
  const { preferences } = useNotificationStore();

  const handleLogout = async () => {
    try {
      await logout();
      setLogoutDialogVisible(false);
    } catch (error) {
      showError('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
    setThemeDialogVisible(false);
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Oscuro';
      case 'auto':
        return 'Automático';
    }
  };

  const getNotificationStatus = () => {
    if (!preferences.enabled) return 'Desactivadas';
    if (preferences.permissionStatus !== 'granted') return 'Sin permisos';
    return 'Activadas';
  };

  const showLogoutDialog = () => setLogoutDialogVisible(true);
  const hideLogoutDialog = () => setLogoutDialogVisible(false);
  const showThemeDialog = () => setThemeDialogVisible(true);
  const hideThemeDialog = () => setThemeDialogVisible(false);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header con información del usuario */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg, backgroundColor: theme.colors.surface }]}>
        {user?.photoURL ? (
          <Avatar.Image
            size={80}
            source={{ uri: user.photoURL }}
            style={styles.avatar}
          />
        ) : (
          <Avatar.Icon
            size={80}
            icon="account"
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            color={theme.colors.onPrimary}
          />
        )}
        <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
          {user?.displayName || 'Usuario'}
        </Text>
        <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
          {user?.email}
        </Text>
      </View>

      {/* Opciones de la cuenta */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Cuenta</Text>
        <List.Item
          title="Editar Perfil"
          description="Cambia tu nombre y foto"
          left={(props) => <List.Icon {...props} icon="account-edit" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider />
        <List.Item
          title="Cambiar Contraseña"
          description="Actualiza tu contraseña"
          left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </View>

      {/* Preferencias */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Preferencias</Text>
        <List.Item
          title="Notificaciones"
          description={getNotificationStatus()}
          left={(props) => (
            <List.Icon 
              {...props} 
              icon={preferences.enabled && preferences.permissionStatus === 'granted' ? 'bell' : 'bell-off'} 
              color={preferences.enabled && preferences.permissionStatus === 'granted' ? theme.colors.primary : theme.colors.outline} 
            />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <Divider />
        <List.Item
          title="Tema"
          description={getThemeLabel()}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={showThemeDialog}
        />
      </View>

      {/* Información */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Información</Text>
        <List.Item
          title="Acerca de"
          description="Versión 1.0.0"
          left={(props) => <List.Icon {...props} icon="information" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            showAlert(
              'Llepa App',
              'Versión 1.0.0\n\nGestión integral para tus mascotas\n\n© 2025 Alex Álvarez'
            );
          }}
        />
        <Divider />
        <List.Item
          title="Ayuda y Soporte"
          description="FAQs, contacto y más"
          left={(props) => <List.Icon {...props} icon="help-circle" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <Divider />
        <List.Item
          title="Políticas de Privacidad"
          description="Cómo protegemos tus datos"
          left={(props) => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </View>

      {/* Botón de Cerrar Sesión */}
      <View style={styles.logoutSection}>
        <Button
          mode="outlined"
          onPress={showLogoutDialog}
          icon="logout"
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          textColor={theme.colors.error}
        >
          Cerrar Sesión
        </Button>
      </View>

      {/* Dialog de selección de tema */}
      <Portal>
        <Dialog visible={themeDialogVisible} onDismiss={hideThemeDialog}>
          <Dialog.Title>Selecciona un tema</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={handleThemeChange as any} value={themeMode}>
              <View style={styles.radioItem}>
                <RadioButton.Item label="Claro" value="light" />
              </View>
              <View style={styles.radioItem}>
                <RadioButton.Item label="Oscuro" value="dark" />
              </View>
              <View style={styles.radioItem}>
                <RadioButton.Item 
                  label="Automático (según el sistema)" 
                  value="auto" 
                />
              </View>
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={hideThemeDialog}>
              Cerrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog de confirmación de logout */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={hideLogoutDialog}>
          <Dialog.Icon icon="logout" />
          <Dialog.Title style={styles.dialogTitle}>Cerrar Sesión</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogText, { color: theme.colors.onSurfaceVariant }]}>
              ¿Estás seguro que deseas cerrar sesión?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={hideLogoutDialog}>
              Cancelar
            </Button>
            <Button mode="text" onPress={handleLogout} loading={loading}>
              Cerrar Sesión
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    marginBottom: spacing.md,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '400',
  },
  section: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutSection: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoutButton: {
    // El color del borde se aplica dinámicamente
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  radioItem: {
    marginVertical: -8,
  },
});

export default SettingsScreen;
