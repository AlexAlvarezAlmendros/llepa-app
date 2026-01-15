import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { spacing } from '../../constants/theme';

interface ButtonProps {
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  children: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: any;
  textColor?: string;
  buttonColor?: string;
  compact?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  mode = 'contained',
  children,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
  textColor,
  buttonColor,
  compact,
}) => {
  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      style={[styles.button, style]}
      contentStyle={styles.content}
      textColor={textColor}
      buttonColor={buttonColor}
      compact={compact}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: spacing.sm,
  },
  content: {
    paddingVertical: spacing.xs,
  },
});

export default Button;
