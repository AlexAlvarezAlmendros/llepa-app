import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PetsStackParamList } from '../types';
import { colors } from '../constants/theme';
import PetsListScreen from '../screens/pets/PetsListScreen';
import PetDetailScreen from '../screens/pets/PetDetailScreen';
import AddPetScreen from '../screens/pets/AddPetScreen';
import EditPetScreen from '../screens/pets/EditPetScreen';
import HealthHistoryScreen from '../screens/health/HealthHistoryScreen';
import AddVisitScreen from '../screens/health/AddVisitScreen';
import VaccinesScreen from '../screens/health/VaccinesScreen';
import AddVaccineScreen from '../screens/health/AddVaccineScreen';

const Stack = createNativeStackNavigator<PetsStackParamList>();

const PetsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="PetsList"
        component={PetsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetDetail"
        component={PetDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddPet"
        component={AddPetScreen}
        options={{ title: 'Nueva Mascota' }}
      />
      <Stack.Screen
        name="EditPet"
        component={EditPetScreen}
        options={{ title: 'Editar Mascota' }}
      />
      <Stack.Screen
        name="HealthHistory"
        component={HealthHistoryScreen}
        options={{ title: 'Historial de Salud' }}
      />
      <Stack.Screen
        name="AddVisit"
        component={AddVisitScreen}
        options={{ title: 'Nueva Visita' }}
      />
      <Stack.Screen
        name="Vaccines"
        component={VaccinesScreen}
        options={{ title: 'Vacunas' }}
      />
      <Stack.Screen
        name="AddVaccine"
        component={AddVaccineScreen}
        options={{ title: 'Nueva Vacuna' }}
      />
    </Stack.Navigator>
  );
};

export default PetsNavigator;
