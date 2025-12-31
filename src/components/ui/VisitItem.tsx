import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../constants/theme';
import { VetVisit } from '../../types';
import { TodayItem } from '../../hooks/useTodayItems';

interface VisitItemProps {
  item: TodayItem;
  visitColor: string;
  onPress: (petId: string) => void;
  showConnectorLine: boolean;
}

const VisitItemComponent: React.FC<VisitItemProps> = ({
  item,
  visitColor,
  onPress,
  showConnectorLine,
}) => {
  const visit = item.data as VetVisit;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <Text style={styles.timeText}>{item.time}</Text>
        <View style={[styles.timelineDot, { backgroundColor: visitColor }]} />
        {showConnectorLine && <View style={styles.timelineLine} />}
      </View>

      <TouchableOpacity
        style={[styles.reminderCard, { borderLeftColor: visitColor }]}
        onPress={() => onPress(visit.petId)}
        activeOpacity={0.7}
      >
        <View style={styles.reminderHeader}>
          <View style={styles.reminderIconContainer}>
            <MaterialCommunityIcons name={item.icon} size={24} color={visitColor} />
          </View>
          <View style={styles.reminderContent}>
            <Text style={styles.reminderTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.reminderSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        {visit.clinicName && (
          <Chip
            icon="hospital-building"
            style={styles.frequencyChip}
            textStyle={styles.frequencyChipText}
            compact
          >
            {visit.clinicName}
          </Chip>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const VisitItem = memo(VisitItemComponent);

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLeft: {
    width: 60,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
  },
  reminderCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderIconContainer: {
    marginRight: spacing.sm,
  },
  reminderContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  reminderTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  reminderSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  frequencyChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.primary + '15',
  },
  frequencyChipText: {
    ...typography.caption,
    color: colors.primary,
  },
});
