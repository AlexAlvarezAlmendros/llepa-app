import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Dialog, Portal, Text, Button, useTheme, Icon } from 'react-native-paper';
import { spacing } from '../../constants/theme';

export type DialogType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  mode?: 'text' | 'outlined' | 'contained';
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  type?: DialogType;
  buttons?: DialogButton[];
  dismissable?: boolean;
}

const getIconForType = (type: DialogType): { icon: string; color: string } => {
  switch (type) {
    case 'success':
      return { icon: 'check-circle', color: '#10B981' };
    case 'error':
      return { icon: 'alert-circle', color: '#EF4444' };
    case 'warning':
      return { icon: 'alert', color: '#F59E0B' };
    case 'confirm':
      return { icon: 'help-circle', color: '#4F46E5' };
    case 'info':
    default:
      return { icon: 'information', color: '#4F46E5' };
  }
};

const CustomDialog: React.FC<CustomDialogProps> = ({
  visible,
  onDismiss,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'OK', onPress: onDismiss }],
  dismissable = true,
}) => {
  const theme = useTheme();
  const { icon, color } = getIconForType(type);

  // Si hay más de 2 botones, apilarlos verticalmente
  const shouldStack = buttons.length > 2;

  const getButtonStyle = (button: DialogButton) => {
    if (button.style === 'destructive') {
      return { buttonColor: theme.colors.error };
    }
    if (button.style === 'cancel') {
      return { textColor: theme.colors.onSurfaceVariant };
    }
    return {};
  };

  const getButtonMode = (button: DialogButton): 'text' | 'outlined' | 'contained' => {
    if (button.mode) return button.mode;
    if (button.style === 'cancel') return 'text';
    if (button.style === 'destructive') return 'contained';
    // Si es el último botón, hacerlo contained
    const buttonIndex = buttons.indexOf(button);
    if (buttonIndex === buttons.length - 1) {
      return 'contained';
    }
    return 'text';
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={dismissable ? onDismiss : undefined}
        style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconBackground, { backgroundColor: `${color}15` }]}>
            <Icon source={icon} size={40} color={color} />
          </View>
        </View>

        <Dialog.Title style={[styles.title, { color: theme.colors.onSurface }]}>
          {title}
        </Dialog.Title>

        <Dialog.Content>
          <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>
        </Dialog.Content>

        <Dialog.Actions style={[styles.actions, shouldStack && styles.actionsStacked]}>
          <ScrollView 
            style={shouldStack ? styles.scrollView : undefined}
            contentContainerStyle={shouldStack ? styles.scrollContent : styles.horizontalContent}
            showsVerticalScrollIndicator={false}
          >
            {buttons.map((button, index) => (
              <Button
                key={index}
                mode={getButtonMode(button)}
                onPress={() => {
                  button.onPress?.();
                  if (!button.onPress) onDismiss();
                }}
                style={[styles.button, shouldStack && styles.buttonStacked]}
                labelStyle={styles.buttonLabel}
                {...getButtonStyle(button)}
              >
                {button.text}
              </Button>
            ))}
          </ScrollView>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 24,
    marginHorizontal: spacing.lg,
    maxHeight: '80%',
  },
  iconContainer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    paddingTop: spacing.md,
  },
  message: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  actionsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  scrollView: {
    maxHeight: 200,
  },
  scrollContent: {
    flexDirection: 'column',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  horizontalContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  button: {
    borderRadius: 12,
    minWidth: 100,
  },
  buttonStacked: {
    width: '100%',
  },
  buttonLabel: {
    fontWeight: '600',
    paddingVertical: 2,
  },
});

export default CustomDialog;
