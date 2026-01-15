import React from 'react';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../constants/theme';

export interface LoadingProps {
  size?: 'small' | 'large' | number;
  fullScreen?: boolean;
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = 'large', fullScreen = false, message }) => {
  const theme = useTheme();
  
  if (fullScreen || message) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size={size} color={theme.colors.primary} />
        {message && (
          <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>
        )}
      </View>
    );
  }

  return <ActivityIndicator size={size} color={theme.colors.primary} />;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: spacing.md,
    fontSize: 16,
  },
});

export default Loading;
