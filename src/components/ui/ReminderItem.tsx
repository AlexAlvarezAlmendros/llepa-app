import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Checkbox, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../constants/theme';
import { Reminder } from '../../types';
import { TodayItem } from '../../hooks/useTodayItems';

interface ReminderItemProps {
  item: TodayItem;
  reminderColor: string;
  onToggleComplete: (reminderId: string) => void;
  showConnectorLine: boolean;
}

const ReminderItemComponent: React.FC<ReminderItemProps> = ({
  item,
  reminderColor,
  onToggleComplete,
  showConnectorLine,
}) => {
  const reminder = item.data as Reminder;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <Text style={styles.timeText}>{item.time}</Text>
        <View style={[styles.timelineDot, { backgroundColor: reminderColor }]} />
        {showConnectorLine && <View style={styles.timelineLine} />}
      </View>

      <TouchableOpacity
        style={[
          styles.reminderCard,
          { borderLeftColor: reminderColor },
          item.completed && styles.reminderCardCompleted,
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.reminderHeader}>
          <View style={styles.reminderIconContainer}>
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={reminderColor}
            />
          </View>
          <View style={styles.reminderContent}>
            <Text
              style={[
                styles.reminderTitle,
                item.completed && styles.reminderTitleCompleted,
              ]}
            >
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.reminderSubtitle}>{item.subtitle}</Text>
            )}
            {reminder.notes && (
              <Text style={styles.reminderNotes} numberOfLines={2}>
                {reminder.notes}
              </Text>
            )}
          </View>
          <Checkbox
            status={item.completed ? 'checked' : 'unchecked'}
            onPress={() => onToggleComplete(reminder.id)}
            color={colors.secondary}
          />
        </View>

        {reminder.frequency && reminder.frequency !== 'ONCE' && (
          <Chip
            icon="repeat"
            style={styles.frequencyChip}
            textStyle={styles.frequencyChipText}
            compact
          >
            {reminder.frequency === 'DAILY' && 'Diaria'}
            {reminder.frequency === 'WEEKLY' && 'Semanal'}
            {reminder.frequency === 'MONTHLY' && 'Mensual'}
          </Chip>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const ReminderItem = memo(ReminderItemComponent);

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
  reminderCardCompleted: {
    opacity: 0.6,
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
  reminderTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  reminderSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reminderNotes: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
