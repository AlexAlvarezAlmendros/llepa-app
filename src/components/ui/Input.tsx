import React from 'react';
import { TextInput as PaperInput, HelperText } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../constants/theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  disabled?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onRightPress?: () => void;
}

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
  disabled = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  left,
  right,
  onRightPress,
}) => {
  // Procesar iconos de left y right
  const leftIcon = typeof left === 'string' ? <PaperInput.Icon icon={left} /> : left;
  const rightIcon = typeof right === 'string' 
    ? <PaperInput.Icon icon={right} onPress={onRightPress} /> 
    : right;

  return (
    <View style={styles.container}>
      <PaperInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        error={!!error}
        disabled={disabled}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        mode="outlined"
        style={styles.input}
        left={leftIcon}
        right={rightIcon}
      />
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  input: {
    backgroundColor: 'transparent',
  },
});

export default Input;
