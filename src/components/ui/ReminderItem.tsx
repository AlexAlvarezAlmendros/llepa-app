import React, { memo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, GestureResponderEvent, Pressable } from 'react-native';
import { Checkbox, Chip, Icon, useTheme, Menu, IconButton } from 'react-native-paper';
import { spacing } from '../../constants/theme';
import { Reminder } from '../../types';
import { TodayItem } from '../../hooks/useTodayItems';

interface ReminderItemProps {
  item: TodayItem;
  reminderColor: string;
  onToggleComplete: (reminderId: string) => void;
  onEdit?: (reminderId: string) => void;
  onDelete?: (reminderId: string) => void;
  onRequestDelete?: (reminderId: string, title: string) => void; // Nueva prop para solicitar eliminación con confirmación
  showConnectorLine: boolean;
}

const ReminderItemComponent: React.FC<ReminderItemProps> = ({
  item,
  reminderColor,
  onToggleComplete,
  onEdit,
  onDelete,
  onRequestDelete,
  showConnectorLine,
}) => {
  const theme = useTheme();
  const reminder = item.data as Reminder;
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const cardRef = useRef<View>(null);

  const handlePress = () => {
    if (onEdit) {
      onEdit(reminder.id);
    }
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuAnchor({ x: pageX, y: pageY });
    setMenuVisible(true);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    // Si hay callback de solicitud de eliminación, usarlo (para diálogos personalizados)
    if (onRequestDelete) {
      onRequestDelete(reminder.id, item.title);
    } else if (onDelete) {
      // Fallback: eliminar directamente sin confirmación
      onDelete(reminder.id);
    }
  };

  const handleEdit = () => {
    setMenuVisible(false);
    onEdit?.(reminder.id);
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>{item.time}</Text>
        <View style={[styles.timelineDot, { backgroundColor: reminderColor }]} />
        {showConnectorLine && <View style={[styles.timelineLine, { backgroundColor: theme.colors.outlineVariant }]} />}
      </View>

      <View style={styles.cardContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={menuAnchor}
        >
          <Menu.Item
            onPress={handleEdit}
            title="Editar"
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={handleDelete}
            title="Eliminar"
            leadingIcon="delete"
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>

        <TouchableOpacity
          style={[
            styles.reminderCard,
            { borderLeftColor: reminderColor, backgroundColor: theme.colors.elevation.level1 },
            item.completed && styles.reminderCardCompleted,
          ]}
          activeOpacity={0.7}
          onPress={handlePress}
          onLongPress={handleLongPress}
        >
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <Icon
                source={item.icon}
                size={24}
                color={reminderColor}
              />
            </View>
            <View style={styles.reminderContent}>
              <Text
                style={[
                  styles.reminderTitle,
                  { color: theme.colors.onSurface },
                  item.completed && [styles.reminderTitleCompleted, { color: theme.colors.onSurfaceVariant }],
                ]}
              >
                {item.title}
              </Text>
              {item.subtitle && (
                <Text style={[styles.reminderSubtitle, { color: theme.colors.onSurfaceVariant }]}>{item.subtitle}</Text>
              )}
              {reminder.notes && (
                <Text style={[styles.reminderNotes, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                  {reminder.notes}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => onToggleComplete(item.id)}
              hitSlop={8}
            >
              <Checkbox
                status={item.completed ? 'checked' : 'unchecked'}
                onPress={() => onToggleComplete(item.id)}
                color={theme.colors.secondary}
              />
            </Pressable>
          </View>

          {reminder.frequency && reminder.frequency !== 'ONCE' && (
            <Chip
              icon="repeat"
              style={[styles.frequencyChip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={[styles.frequencyChipText, { color: theme.colors.onPrimaryContainer }]}
              compact
            >
              {reminder.frequency === 'EVERY_8_HOURS' && 'Cada 8 horas'}
              {reminder.frequency === 'EVERY_12_HOURS' && 'Cada 12 horas'}
              {reminder.frequency === 'DAILY' && 'Diaria'}
              {reminder.frequency === 'EVERY_TWO_DAYS' && 'Cada 2 días'}
              {reminder.frequency === 'EVERY_THREE_DAYS' && 'Cada 3 días'}
              {reminder.frequency === 'WEEKLY' && 'Semanal'}
              {reminder.frequency === 'MONTHLY' && 'Mensual'}
            </Chip>
          )}
        </TouchableOpacity>
      </View>
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
    fontSize: 14,
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
  },
  cardContainer: {
    flex: 1,
  },
  reminderCard: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reminderTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  reminderSubtitle: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  reminderNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  frequencyChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  frequencyChipText: {
    fontSize: 12,
  },
});
