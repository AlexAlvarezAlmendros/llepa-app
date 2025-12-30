import React from 'react';
import { Card as PaperCard } from 'react-native-paper';
import { StyleSheet, Platform } from 'react-native';
import { spacing, borderRadius } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  elevated?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  elevated = true,
}) => {
  return (
    <PaperCard
      onPress={onPress}
      style={[styles.card, elevated && styles.elevated, style]}
      mode={elevated ? 'elevated' : 'contained'}
    >
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  elevated: {
    elevation: 2,
    // Web usa boxShadow, Native usa shadowColor
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }
    ),
  },
});

export default Card;
