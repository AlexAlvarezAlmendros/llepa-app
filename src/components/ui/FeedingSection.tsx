import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, Icon, ProgressBar } from 'react-native-paper';
import { Timestamp } from 'firebase/firestore';
import { spacing } from '../../constants/theme';

interface FeedingInfo {
  brand: string;
  type?: 'Pienso' | 'Húmedo' | 'Natural' | 'Mixto';
  purchaseAmount: number; // en gramos
  dailyAmount: number; // en gramos
  lastPurchaseDate?: Timestamp; // fecha de última compra
  alertDays?: number; // días restantes para activar alerta de compra
}

interface FeedingSectionProps {
  food?: FeedingInfo;
  onResetPurchase?: () => void; // callback para reiniciar la compra
}

/**
 * Calcula los días totales que dura el paquete de comida
 */
const calculateTotalDays = (purchaseAmount: number, dailyAmount: number): number => {
  if (dailyAmount <= 0) return 0;
  return Math.floor(purchaseAmount / dailyAmount);
};

/**
 * Calcula los días restantes desde la fecha de compra
 */
const calculateDaysRemaining = (
  purchaseAmount: number,
  dailyAmount: number,
  lastPurchaseDate?: Timestamp
): number => {
  const totalDays = calculateTotalDays(purchaseAmount, dailyAmount);
  
  if (!lastPurchaseDate) {
    return totalDays; // Si no hay fecha, mostramos el total
  }
  
  const purchaseDate = lastPurchaseDate.toDate();
  const today = new Date();
  const diffTime = today.getTime() - purchaseDate.getTime();
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, totalDays - daysPassed);
};

/**
 * Formatea el peso en gramos a kg o g según corresponda
 */
const formatWeight = (grams: number): string => {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg % 1 === 0 ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams} g`;
};

/**
 * Obtiene el color según los días restantes
 */
const getDaysColor = (days: number, theme: any): string => {
  if (days <= 3) return theme.colors.error;
  if (days <= 7) return '#F59E0B'; // Amarillo/naranja
  return theme.colors.primary;
};

/**
 * Obtiene el icono según el tipo de comida
 */
const getFoodTypeIcon = (type?: string): string => {
  switch (type) {
    case 'Pienso':
      return 'food-drumstick';
    case 'Húmedo':
      return 'food-variant';
    case 'Natural':
      return 'leaf';
    case 'Mixto':
      return 'food-fork-drink';
    default:
      return 'food-drumstick';
  }
};

const FeedingSection: React.FC<FeedingSectionProps> = ({ food, onResetPurchase }) => {
  const theme = useTheme();

  if (!food || !food.dailyAmount || !food.purchaseAmount) {
    return (
      <View style={styles.emptyContainer}>
        <Icon
          source="food-drumstick-off"
          size={32}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          No hay información de alimentación configurada
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
          Edita el perfil para añadir los datos de comida
        </Text>
      </View>
    );
  }

  const totalDays = calculateTotalDays(food.purchaseAmount, food.dailyAmount);
  const daysRemaining = calculateDaysRemaining(food.purchaseAmount, food.dailyAmount, food.lastPurchaseDate);
  const daysColor = getDaysColor(daysRemaining, theme);
  
  // Progreso basado en días restantes vs total
  const progressValue = totalDays > 0 ? daysRemaining / totalDays : 0;

  return (
    <View style={styles.container}>
      {/* Marca y tipo */}
      <View style={styles.row}>
        <Icon
          source={getFoodTypeIcon(food.type)}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Marca:</Text>
        <Text style={[styles.value, { color: theme.colors.onSurface }]}>
          {food.brand}
        </Text>
      </View>

      {/* Tipo de comida */}
      {food.type && (
        <View style={styles.row}>
          <Icon
            source="tag"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Tipo:</Text>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>
            {food.type}
          </Text>
        </View>
      )}

      {/* Cantidad comprada */}
      <View style={styles.row}>
        <Icon
          source="package-variant"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Paquete:</Text>
        <Text style={[styles.value, { color: theme.colors.onSurface }]}>
          {formatWeight(food.purchaseAmount)}
        </Text>
      </View>

      {/* Cantidad diaria */}
      <View style={styles.row}>
        <Icon
          source="bowl-mix"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Ración diaria:</Text>
        <Text style={[styles.value, { color: theme.colors.onSurface }]}>
          {formatWeight(food.dailyAmount)}
        </Text>
      </View>

      {/* Indicador de días */}
      <View style={[styles.daysCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.daysHeader}>
          <Icon
            source="calendar-clock"
            size={24}
            color={daysColor}
          />
          <Text style={[styles.daysLabel, { color: theme.colors.onSurfaceVariant }]}>
            {food.lastPurchaseDate ? 'Días restantes:' : 'Duración del paquete:'}
          </Text>
          {onResetPurchase && (
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
              onPress={onResetPurchase}
            >
              <Icon source="refresh" size={16} color={theme.colors.onPrimary} />
              <Text style={[styles.resetButtonText, { color: theme.colors.onPrimary }]}>
                Nueva compra
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.daysValueContainer}>
          <Text style={[styles.daysValue, { color: daysColor }]}>
            {daysRemaining}
          </Text>
          <Text style={[styles.daysUnit, { color: theme.colors.onSurfaceVariant }]}>
            {daysRemaining === 1 ? 'día' : 'días'}
          </Text>
          {food.lastPurchaseDate && (
            <Text style={[styles.totalDaysText, { color: theme.colors.onSurfaceVariant }]}>
              de {totalDays}
            </Text>
          )}
        </View>

        <ProgressBar
          progress={progressValue}
          color={daysColor}
          style={styles.progressBar}
        />

        <Text style={[styles.nextPurchase, { color: theme.colors.onSurfaceVariant }]}>
          {daysRemaining <= 3 
            ? '⚠️ ¡Hora de comprar más comida!'
            : daysRemaining <= 7
            ? '📦 Planifica tu próxima compra'
            : '✅ Tienes comida suficiente'}
        </Text>

        {/* Indicador de alerta configurada */}
        {food.alertDays && (
          <View style={[styles.alertConfigured, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="bell-ring" size={16} color={theme.colors.primary} />
            <Text style={[styles.alertConfiguredText, { color: theme.colors.onPrimaryContainer }]}>
              Recordatorio configurado: avisar cuando queden {food.alertDays} días
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 16,
    flex: 2,
  },
  daysCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  daysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  daysValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  daysUnit: {
    fontSize: 16,
  },
  totalDaysText: {
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  nextPurchase: {
    fontSize: 13,
    textAlign: 'center',
  },
  alertConfigured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
  },
  alertConfiguredText: {
    fontSize: 12,
    flex: 1,
  },
});

export default FeedingSection;
