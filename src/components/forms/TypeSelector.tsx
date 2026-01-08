/**
 * Componente: TypeSelector
 * 
 * Selector de tipo en formato grid con iconos.
 * Usado para seleccionar tipos de medicamento, recordatorio, etc.
 * 
 * Props:
 * - items: Array de opciones { value, label, icon }
 * - value: Valor seleccionado actualmente
 * - onValueChange: Callback cuando cambia la selección
 * - label: Etiqueta opcional para la sección
 * - columns: Número de columnas (default: 3)
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { spacing } from '../../constants/theme';

export interface TypeSelectorItem<T extends string> {
  value: T;
  label: string;
  icon: string;
}

interface TypeSelectorProps<T extends string> {
  items: TypeSelectorItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  label?: string;
  columns?: 2 | 3 | 4;
  style?: StyleProp<ViewStyle>;
}

export function TypeSelector<T extends string>({
  items,
  value,
  onValueChange,
  label,
  columns = 3,
  style,
}: TypeSelectorProps<T>) {
  const theme = useTheme();

  const getButtonWidth = () => {
    switch (columns) {
      case 2:
        return '47%';
      case 3:
        return '30%';
      case 4:
        return '22%';
      default:
        return '30%';
    }
  };

  return (
    <View style={style}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>
          {label}
        </Text>
      )}
      <View style={styles.grid}>
        {items.map((item) => {
          const isSelected = value === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.button,
                { 
                  borderColor: theme.colors.outline,
                  width: getButtonWidth(),
                },
                isSelected && {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => onValueChange(item.value)}
              activeOpacity={0.7}
            >
              <Icon
                source={item.icon}
                size={24}
                color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.buttonLabel,
                  { color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
  },
  buttonLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
  },
});

export default TypeSelector;
