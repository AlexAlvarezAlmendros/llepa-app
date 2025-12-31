import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TextInput, Menu, HelperText } from 'react-native-paper';
import { colors } from '../../constants/theme';

interface PickerOption {
  label: string;
  value: string;
}

interface PickerFieldProps {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'Selecciona una opción',
}) => {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || '';

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    closeMenu();
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <TouchableOpacity onPress={openMenu} activeOpacity={0.7}>
            <View pointerEvents="none">
              <TextInput
                label={label}
                value={displayValue}
                placeholder={placeholder}
                mode="outlined"
                editable={false}
                error={!!error}
                right={<TextInput.Icon icon="menu-down" />}
                style={styles.input}
              />
            </View>
          </TouchableOpacity>
        }
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            onPress={() => handleSelect(option.value)}
            title={option.label}
          />
        ))}
      </Menu>
      
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
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface || 'transparent',
  },
});
