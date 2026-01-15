import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { MainTabParamList } from '../types';
import { useTheme, Icon } from 'react-native-paper';

// Importar navegadores de cada tab
import TodayScreen from '../screens/dashboard/TodayScreen';
import PetsNavigator from './PetsNavigator';
import SettingsNavigator from './SettingsNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: 'Hoy',
          tabBarIcon: ({ color, size }) => (
            <Icon source="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Pets"
        component={PetsNavigator}
        options={{
          tabBarLabel: 'Mis Mascotas',
          tabBarIcon: ({ color, size }) => (
            <Icon source="paw" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Cuenta',
          tabBarIcon: ({ color, size }) => (
            <Icon source="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
