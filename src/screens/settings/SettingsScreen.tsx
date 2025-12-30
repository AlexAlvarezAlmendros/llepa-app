import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Divider, Dialog, Portal, Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { colors, typography, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

const SettingsScreen = () => {
  const { user, logout, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setLogoutDialogVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }
  };

  const showLogoutDialog = () => setLogoutDialogVisible(true);
  const hideLogoutDialog = () => setLogoutDialogVisible(false);

  return (
    <ScrollView style={styles.container}>
      {/* Header con información del usuario */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Avatar.Icon
          size={80}
          icon="account"
          style={styles.avatar}
          color={colors.surface}
        />
        <Text style={styles.userName}>{user?.displayName || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Opciones de la cuenta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <List.Item
          title="Editar Perfil"
          description="Cambia tu nombre y foto"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navegar a editar perfil
            Alert.alert('Próximamente', 'Función en desarrollo');
          }}
        />
        <Divider />
        <List.Item
          title="Cambiar Contraseña"
          description="Actualiza tu contraseña"
          left={(props) => <List.Icon {...props} icon="lock-reset" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navegar a cambiar contraseña
            Alert.alert('Próximamente', 'Función en desarrollo');
          }}
        />
      </View>

      {/* Preferencias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <List.Item
          title="Notificaciones"
          description="Gestiona tus notificaciones"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Próximamente', 'Función en desarrollo');
          }}
        />
        <Divider />
        <List.Item
          title="Tema"
          description="Claro / Oscuro"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Próximamente', 'Función en desarrollo');
          }}
        />
      </View>

      {/* Información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <List.Item
          title="Acerca de"
          description="Versión 1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert(
              'Llepa App',
              'Versión 1.0.0\n\nGestión integral para tus mascotas\n\n© 2025 Alex Álvarez'
            );
          }}
        />
        <Divider />
        <List.Item
          title="Ayuda y Soporte"
          description="¿Necesitas ayuda?"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Próximamente', 'Función en desarrollo');
          }}
        />
        <Divider />
        <List.Item
          title="Políticas de Privacidad"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert('Próximamente', 'Función en desarrollo');
          }}
        />
      </View>

      {/* Botón de Cerrar Sesión */}
      <View style={styles.logoutSection}>
        <Button
          mode="outlined"
          onPress={showLogoutDialog}
          icon="logout"
          style={styles.logoutButton}
        >
          Cerrar Sesión
        </Button>
      </View>

      {/* Dialog de confirmación */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={hideLogoutDialog}>
          <Dialog.Icon icon="logout" />
          <Dialog.Title style={styles.dialogTitle}>Cerrar Sesión</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
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
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  avatar: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutSection: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SettingsScreen;
