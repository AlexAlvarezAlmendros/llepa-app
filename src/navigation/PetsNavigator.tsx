import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PetsStackParamList } from '../types';
import { useTheme } from 'react-native-paper';
import PetsListScreen from '../screens/pets/PetsListScreen';
import PetDetailScreen from '../screens/pets/PetDetailScreen';
import AddPetScreen from '../screens/pets/AddPetScreen';
import EditPetScreen from '../screens/pets/EditPetScreen';
import HealthHistoryScreen from '../screens/health/HealthHistoryScreen';
import AddVisitScreen from '../screens/health/AddVisitScreen';
import VaccinesScreen from '../screens/health/VaccinesScreen';
import AddVaccineScreen from '../screens/health/AddVaccineScreen';
import MedicationsScreen from '../screens/health/MedicationsScreen';
import AddMedicationScreen from '../screens/health/AddMedicationScreen';
// Gamificación: Entrenamiento, Paseos e Incidentes
import TrainingListScreen from '../screens/activity/TrainingListScreen';
import AddTrainingScreen from '../screens/activity/AddTrainingScreen';
import WalksListScreen from '../screens/activity/WalksListScreen';
import ActiveWalkScreen from '../screens/activity/ActiveWalkScreen';
import AddWalkScreen from '../screens/activity/AddWalkScreen';
import RouteViewScreen from '../screens/activity/RouteViewScreen';
import IncidentsListScreen from '../screens/activity/IncidentsListScreen';
import AddIncidentScreen from '../screens/activity/AddIncidentScreen';

const Stack = createNativeStackNavigator<PetsStackParamList>();

const PetsNavigator = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
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
      <Stack.Screen
        name="Medications"
        component={MedicationsScreen}
        options={{ title: 'Medicaciones' }}
      />
      <Stack.Screen
        name="AddMedication"
        component={AddMedicationScreen}
        options={{ title: 'Nueva Medicación' }}
      />
      {/* Gamificación: Entrenamiento */}
      <Stack.Screen
        name="TrainingList"
        component={TrainingListScreen}
        options={{ title: 'Entrenamiento' }}
      />
      <Stack.Screen
        name="AddTraining"
        component={AddTrainingScreen}
        options={{ title: 'Nuevo Truco' }}
      />
      {/* Gamificación: Paseos */}
      <Stack.Screen
        name="WalksList"
        component={WalksListScreen}
        options={{ title: 'Diario de Paseos' }}
      />
      <Stack.Screen
        name="ActiveWalk"
        component={ActiveWalkScreen}
        options={{ 
          title: 'Paseo en vivo',
          headerShown: false, // Pantalla inmersiva sin header
        }}
      />
      <Stack.Screen
        name="AddWalk"
        component={AddWalkScreen}
        options={{ title: 'Registrar Paseo' }}
      />
      <Stack.Screen
        name="RouteView"
        component={RouteViewScreen}
        options={{ 
          title: 'Ver Ruta',
          headerShown: false,
        }}
      />
      {/* Gamificación: Incidentes */}
      <Stack.Screen
        name="IncidentsList"
        component={IncidentsListScreen}
        options={{ title: 'Registro de Incidentes' }}
      />
      <Stack.Screen
        name="AddIncident"
        component={AddIncidentScreen}
        options={{ title: 'Nuevo Incidente' }}
      />
    </Stack.Navigator>
  );
};

export default PetsNavigator;
