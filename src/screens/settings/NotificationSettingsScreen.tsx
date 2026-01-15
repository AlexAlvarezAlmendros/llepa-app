import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Linking, Alert } from 'react-native';
import {
  Text,
  Switch,
  List,
  Divider,
  Portal,
  Dialog,
  useTheme,
  Chip,
  SegmentedButtons,
  Surface,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Button, Loading } from '../../components/ui';
import { spacing, borderRadius } from '../../constants/theme';
import {
  useNotificationStore,
  getReminderTypeLabel,
  getReminderTypeIcon,
} from '../../store/notificationStore';
import {
  requestNotificationPermissions,
  getAllScheduledNotifications,
  cancelAllNotifications,
} from '../../services/notificationService';
import { ReminderType } from '../../types';
import { useDialog } from '../../contexts/DialogContext';

const REMINDER_TYPES: ReminderType[] = [
  'MEDICATION',
  'VET_APPOINTMENT',
  'VACCINE',
  'ANTIPARASITIC',
  'HYGIENE',
  'GROOMING',
  'FOOD',
  'WALK',
  'TRAINING',
  'OTHER',
];

const ADVANCE_OPTIONS = [
  { value: 0, label: 'A la hora exacta' },
  { value: 5, label: '5 min antes' },
  { value: 10, label: '10 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
];

const VACCINE_ADVANCE_OPTIONS = [
  { value: 1, label: '1 día' },
  { value: 3, label: '3 días' },
  { value: 7, label: '1 semana' },
  { value: 14, label: '2 semanas' },
];

const NotificationSettingsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert, showError, showConfirm } = useDialog();
  
  const {
    preferences,
    setEnabled,
    setSound,
    setVibration,
    setDoNotDisturb,
    setTypePreference,
    setVaccineAdvanceDays,
    setPermissionStatus,
    resetPreferences,
  } = useNotificationStore();
  
  const [loading, setLoading] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Diálogos
  const [advanceDialogVisible, setAdvanceDialogVisible] = useState(false);
  const [selectedTypeForAdvance, setSelectedTypeForAdvance] = useState<ReminderType | null>(null);
  const [doNotDisturbDialogVisible, setDoNotDisturbDialogVisible] = useState(false);
  const [vaccineAdvanceDialogVisible, setVaccineAdvanceDialogVisible] = useState(false);
  
  // Cargar estado inicial
  useEffect(() => {
    loadNotificationStatus();
  }, []);
  
  const loadNotificationStatus = async () => {
    try {
      setLoading(true);
      
      // Verificar permisos
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      setPermissionStatus(granted ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
      
      // Contar notificaciones programadas
      const scheduled = await getAllScheduledNotifications();
      setScheduledCount(scheduled.length);
    } catch (error) {
      console.error('Error loading notification status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    setPermissionStatus(granted ? 'granted' : 'denied');
    
    if (!granted) {
      Alert.alert(
        'Permisos Requeridos',
        'Para recibir recordatorios, necesitas habilitar las notificaciones en la configuración de tu dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };
  
  const handleToggleEnabled = async (value: boolean) => {
    if (value && !permissionGranted) {
      await handleRequestPermissions();
      return;
    }
    setEnabled(value);
  };
  
  const handleClearAllNotifications = async () => {
    showConfirm(
      '¿Cancelar todas las notificaciones?',
      'Se eliminarán todas las notificaciones programadas. Los recordatorios seguirán existiendo pero no recibirás alertas.',
      async () => {
        try {
          await cancelAllNotifications();
          setScheduledCount(0);
          showAlert('Listo', 'Se han cancelado todas las notificaciones programadas.');
        } catch (error) {
          showError('Error', 'No se pudieron cancelar las notificaciones.');
        }
      }
    );
  };
  
  const handleResetPreferences = () => {
    showConfirm(
      '¿Restablecer configuración?',
      'Se restaurarán todas las preferencias de notificaciones a sus valores por defecto.',
      () => {
        resetPreferences();
        showAlert('Listo', 'Preferencias restablecidas correctamente.');
      }
    );
  };
  
  const openAdvanceDialog = (type: ReminderType) => {
    setSelectedTypeForAdvance(type);
    setAdvanceDialogVisible(true);
  };
  
  const handleAdvanceSelect = (minutes: number) => {
    if (selectedTypeForAdvance) {
      setTypePreference(selectedTypeForAdvance, { advanceMinutes: minutes });
    }
    setAdvanceDialogVisible(false);
    setSelectedTypeForAdvance(null);
  };
  
  const formatAdvanceTime = (minutes: number): string => {
    if (minutes === 0) return 'A la hora exacta';
    if (minutes < 60) return `${minutes} min antes`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h antes`;
  };
  
  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };
  
  if (loading) {
    return <Loading message="Cargando configuración..." />;
  }
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      {/* Estado de permisos */}
      {!permissionGranted && (
        <Surface style={[styles.warningCard, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
          <View style={styles.warningContent}>
            <List.Icon icon="bell-off" color={theme.colors.error} />
            <View style={styles.warningText}>
              <Text style={[styles.warningTitle, { color: theme.colors.onErrorContainer }]}>
                Notificaciones deshabilitadas
              </Text>
              <Text style={[styles.warningSubtitle, { color: theme.colors.onErrorContainer }]}>
                Habilita los permisos para recibir recordatorios
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            onPress={handleRequestPermissions}
            style={styles.warningButton}
            buttonColor={theme.colors.error}
          >
            Habilitar
          </Button>
        </Surface>
      )}
      
      {/* Configuración General */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>General</Text>
        
        <List.Item
          title="Notificaciones"
          description={preferences.enabled ? 'Activadas' : 'Desactivadas'}
          left={(props) => <List.Icon {...props} icon="bell" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={preferences.enabled && permissionGranted}
              onValueChange={handleToggleEnabled}
              color={theme.colors.primary}
            />
          )}
        />
        <Divider />
        
        <List.Item
          title="Sonido"
          description="Reproducir sonido con las notificaciones"
          left={(props) => <List.Icon {...props} icon="volume-high" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={preferences.sound}
              onValueChange={setSound}
              disabled={!preferences.enabled}
              color={theme.colors.primary}
            />
          )}
        />
        <Divider />
        
        <List.Item
          title="Vibración"
          description="Vibrar con las notificaciones"
          left={(props) => <List.Icon {...props} icon="vibrate" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={preferences.vibration}
              onValueChange={setVibration}
              disabled={!preferences.enabled}
              color={theme.colors.primary}
            />
          )}
        />
      </View>
      
      {/* Modo No Molestar */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Modo No Molestar</Text>
        
        <List.Item
          title="No molestar"
          description={
            preferences.doNotDisturb.enabled
              ? `${formatTime(preferences.doNotDisturb.startHour, preferences.doNotDisturb.startMinute)} - ${formatTime(preferences.doNotDisturb.endHour, preferences.doNotDisturb.endMinute)}`
              : 'Desactivado'
          }
          left={(props) => <List.Icon {...props} icon="moon-waning-crescent" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={preferences.doNotDisturb.enabled}
              onValueChange={(enabled) => setDoNotDisturb({ enabled })}
              disabled={!preferences.enabled}
              color={theme.colors.primary}
            />
          )}
        />
        
        {preferences.doNotDisturb.enabled && (
          <>
            <Divider />
            <List.Item
              title="Configurar horario"
              description="Establece las horas de silencio"
              left={(props) => <List.Icon {...props} icon="clock-outline" color={theme.colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setDoNotDisturbDialogVisible(true)}
            />
          </>
        )}
      </View>
      
      {/* Tipos de Notificación */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Tipos de Recordatorio
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
          Activa o desactiva las notificaciones por tipo
        </Text>
        
        {REMINDER_TYPES.map((type, index) => (
          <React.Fragment key={type}>
            {index > 0 && <Divider />}
            <List.Item
              title={getReminderTypeLabel(type)}
              description={
                preferences.typePreferences[type].enabled
                  ? formatAdvanceTime(preferences.typePreferences[type].advanceMinutes)
                  : 'Desactivado'
              }
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={getReminderTypeIcon(type)}
                  color={preferences.typePreferences[type].enabled ? theme.colors.primary : theme.colors.outline}
                />
              )}
              right={() => (
                <View style={styles.typeActions}>
                  {preferences.typePreferences[type].enabled && (
                    <IconButton
                      icon="clock-edit-outline"
                      size={20}
                      onPress={() => openAdvanceDialog(type)}
                      disabled={!preferences.enabled}
                    />
                  )}
                  <Switch
                    value={preferences.typePreferences[type].enabled}
                    onValueChange={(enabled) => setTypePreference(type, { enabled })}
                    disabled={!preferences.enabled}
                    color={theme.colors.primary}
                  />
                </View>
              )}
            />
          </React.Fragment>
        ))}
      </View>
      
      {/* Recordatorios de Vacunas */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Vacunas Próximas
        </Text>
        
        <List.Item
          title="Aviso anticipado"
          description={`${preferences.vaccineAdvanceDays} días antes de la próxima vacuna`}
          left={(props) => <List.Icon {...props} icon="calendar-alert" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setVaccineAdvanceDialogVisible(true)}
          disabled={!preferences.enabled || !preferences.typePreferences.VACCINE.enabled}
        />
      </View>
      
      {/* Estadísticas y Acciones */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Estado
        </Text>
        
        <List.Item
          title="Notificaciones programadas"
          description={`${scheduledCount} notificaciones pendientes`}
          left={(props) => <List.Icon {...props} icon="calendar-clock" color={theme.colors.primary} />}
        />
        <Divider />
        
        <List.Item
          title="Cancelar todas"
          description="Eliminar notificaciones programadas"
          left={(props) => <List.Icon {...props} icon="bell-cancel" color={theme.colors.error} />}
          onPress={handleClearAllNotifications}
          disabled={scheduledCount === 0}
          titleStyle={scheduledCount > 0 ? { color: theme.colors.error } : undefined}
        />
        <Divider />
        
        <List.Item
          title="Restablecer configuración"
          description="Volver a los valores por defecto"
          left={(props) => <List.Icon {...props} icon="refresh" color={theme.colors.outline} />}
          onPress={handleResetPreferences}
        />
      </View>
      
      {/* Dialog: Tiempo de anticipación */}
      <Portal>
        <Dialog
          visible={advanceDialogVisible}
          onDismiss={() => setAdvanceDialogVisible(false)}
        >
          <Dialog.Title>Tiempo de anticipación</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.md }}>
              ¿Cuánto antes quieres recibir la notificación?
            </Text>
            {ADVANCE_OPTIONS.map((option) => (
              <List.Item
                key={option.value}
                title={option.label}
                onPress={() => handleAdvanceSelect(option.value)}
                left={(props) =>
                  selectedTypeForAdvance &&
                  preferences.typePreferences[selectedTypeForAdvance].advanceMinutes === option.value ? (
                    <List.Icon {...props} icon="check" color={theme.colors.primary} />
                  ) : (
                    <View style={{ width: 24 }} />
                  )
                }
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setAdvanceDialogVisible(false)}>
              Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Dialog: Días de anticipación vacunas */}
      <Portal>
        <Dialog
          visible={vaccineAdvanceDialogVisible}
          onDismiss={() => setVaccineAdvanceDialogVisible(false)}
        >
          <Dialog.Title>Aviso de vacunas</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.md }}>
              ¿Con cuánta anticipación quieres el recordatorio de vacunas próximas?
            </Text>
            {VACCINE_ADVANCE_OPTIONS.map((option) => (
              <List.Item
                key={option.value}
                title={option.label}
                onPress={() => {
                  setVaccineAdvanceDays(option.value);
                  setVaccineAdvanceDialogVisible(false);
                }}
                left={(props) =>
                  preferences.vaccineAdvanceDays === option.value ? (
                    <List.Icon {...props} icon="check" color={theme.colors.primary} />
                  ) : (
                    <View style={{ width: 24 }} />
                  )
                }
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setVaccineAdvanceDialogVisible(false)}>
              Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Dialog: Horario No Molestar */}
      <Portal>
        <Dialog
          visible={doNotDisturbDialogVisible}
          onDismiss={() => setDoNotDisturbDialogVisible(false)}
        >
          <Dialog.Title>Horario de silencio</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
              Las notificaciones se silenciarán durante este horario.
            </Text>
            
            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={[styles.timeLabel, { color: theme.colors.onSurface }]}>Desde</Text>
                <View style={styles.timeInputs}>
                  <SegmentedButtons
                    value={preferences.doNotDisturb.startHour.toString()}
                    onValueChange={(v) => setDoNotDisturb({ startHour: parseInt(v) })}
                    buttons={[
                      { value: '21', label: '21:00' },
                      { value: '22', label: '22:00' },
                      { value: '23', label: '23:00' },
                    ]}
                    style={styles.segmentedButton}
                  />
                </View>
              </View>
              
              <View style={styles.timePicker}>
                <Text style={[styles.timeLabel, { color: theme.colors.onSurface }]}>Hasta</Text>
                <View style={styles.timeInputs}>
                  <SegmentedButtons
                    value={preferences.doNotDisturb.endHour.toString()}
                    onValueChange={(v) => setDoNotDisturb({ endHour: parseInt(v) })}
                    buttons={[
                      { value: '7', label: '07:00' },
                      { value: '8', label: '08:00' },
                      { value: '9', label: '09:00' },
                    ]}
                    style={styles.segmentedButton}
                  />
                </View>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDoNotDisturbDialogVisible(false)}>
              Cerrar
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
  warningCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  warningButton: {
    marginTop: spacing.xs,
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
  sectionDescription: {
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  typeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePickerContainer: {
    gap: spacing.lg,
  },
  timePicker: {
    gap: spacing.sm,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentedButton: {
    flex: 1,
  },
});

export default NotificationSettingsScreen;
