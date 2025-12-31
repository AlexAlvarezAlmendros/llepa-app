import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate } from '../../utils/dateUtils';
import { colors } from '../../constants/theme';

interface DatePickerFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  mode?: 'date' | 'time' | 'datetime';
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
  mode = 'date',
}) => {
  const [show, setShow] = useState(false);

  // Cleanup: cerrar el picker al desmontar el componente
  useEffect(() => {
    return () => {
      setShow(false);
    };
  }, []);

  const handleChange = (event: any, selectedDate?: Date) => {
    // En Android, cerrar siempre
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    // Actualizar valor si se seleccionó
    if (selectedDate) {
      onChange(selectedDate);
      // En iOS, cerrar después de seleccionar
      if (Platform.OS === 'ios') {
        setShow(false);
      }
    } else if (Platform.OS === 'ios') {
      // Usuario canceló en iOS
      setShow(false);
    }
  };

  const showPicker = () => {
    setShow(true);
  };

  const displayValue = mode === 'date' 
    ? formatDate(value)
    : mode === 'time'
    ? value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : `${formatDate(value)} ${value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={showPicker} activeOpacity={0.7}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayValue}
            mode="outlined"
            editable={false}
            error={!!error}
            right={<TextInput.Icon icon="calendar" />}
            style={styles.input}
          />
        </View>
      </TouchableOpacity>
      
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}

      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
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
