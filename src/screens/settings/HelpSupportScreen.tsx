import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import {
  Text,
  List,
  Divider,
  useTheme,
  Surface,
  Searchbar,
  Chip,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '../../constants/theme';
import { useDialog } from '../../contexts/DialogContext';

// Datos de FAQ
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'reminders' | 'pets' | 'health' | 'account';
}

const FAQ_DATA: FAQItem[] = [
  // General
  {
    id: '1',
    question: '¿Cómo añado una nueva mascota?',
    answer: 'Ve a la pestaña "Mis Mascotas" y pulsa el botón "+" en la esquina inferior derecha. Completa el formulario con los datos de tu mascota y guarda.',
    category: 'general',
  },
  {
    id: '2',
    question: '¿Puedo tener varias mascotas?',
    answer: '¡Sí! Puedes añadir todas las mascotas que necesites. Cada una tendrá su propio perfil con historial médico, vacunas y recordatorios independientes.',
    category: 'general',
  },
  {
    id: '3',
    question: '¿Mis datos están seguros?',
    answer: 'Sí, utilizamos Firebase de Google con encriptación de datos. Tu información está protegida y solo tú tienes acceso a ella con tu cuenta.',
    category: 'general',
  },
  // Recordatorios
  {
    id: '4',
    question: '¿Cómo creo un recordatorio?',
    answer: 'Desde la pantalla "Hoy", pulsa el botón "+" y selecciona "Nuevo Recordatorio". Elige el tipo, la fecha, hora y frecuencia deseada.',
    category: 'reminders',
  },
  {
    id: '5',
    question: '¿Por qué no recibo notificaciones?',
    answer: 'Verifica que:\n1. Las notificaciones estén habilitadas en Ajustes > Notificaciones\n2. Hayas concedido permisos a la app\n3. El tipo de recordatorio esté activado\n4. No estés en horario de "No Molestar"',
    category: 'reminders',
  },
  {
    id: '6',
    question: '¿Qué frecuencias de recordatorio hay disponibles?',
    answer: 'Puedes elegir: Una vez, cada 8 horas, cada 12 horas, diario, cada 2 días, cada 3 días, semanal o mensual.',
    category: 'reminders',
  },
  // Mascotas
  {
    id: '7',
    question: '¿Cómo cambio la foto de mi mascota?',
    answer: 'Ve al perfil de tu mascota, pulsa "Editar" y luego toca sobre la imagen de perfil para seleccionar una nueva foto de la galería o tomar una con la cámara.',
    category: 'pets',
  },
  {
    id: '8',
    question: '¿Puedo eliminar una mascota?',
    answer: 'Sí, pero ten cuidado: al eliminar una mascota se borrarán todos sus datos (historial médico, vacunas, recordatorios). Ve al perfil, pulsa "Editar" y busca la opción "Eliminar mascota".',
    category: 'pets',
  },
  // Salud
  {
    id: '9',
    question: '¿Cómo registro una visita al veterinario?',
    answer: 'En el perfil de tu mascota, ve a la sección "Salud" > "Historial Médico" y pulsa "+" para añadir una nueva visita con diagnóstico, tratamiento y foto de la receta.',
    category: 'health',
  },
  {
    id: '10',
    question: '¿Cómo añado una vacuna?',
    answer: 'En el perfil de tu mascota, ve a "Salud" > "Vacunas" y pulsa "+" para registrar la vacuna administrada y la fecha de la próxima dosis.',
    category: 'health',
  },
  {
    id: '11',
    question: '¿Se me avisará cuando toque revacunar?',
    answer: 'Sí, si tienes activados los recordatorios de vacunas, recibirás una notificación antes de la fecha de la próxima dosis (configurable en Ajustes > Notificaciones).',
    category: 'health',
  },
  // Cuenta
  {
    id: '12',
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Ve a Ajustes > Cuenta > "Cambiar Contraseña". Deberás introducir tu contraseña actual y la nueva contraseña dos veces para confirmar.',
    category: 'account',
  },
  {
    id: '13',
    question: '¿Puedo usar la app sin conexión?',
    answer: 'La app requiere conexión para sincronizar datos. Sin embargo, puedes ver la información ya cargada. Los cambios se sincronizarán cuando recuperes conexión.',
    category: 'account',
  },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  general: { label: 'General', icon: 'help-circle' },
  reminders: { label: 'Recordatorios', icon: 'bell' },
  pets: { label: 'Mascotas', icon: 'paw' },
  health: { label: 'Salud', icon: 'medical-bag' },
  account: { label: 'Cuenta', icon: 'account' },
};

const HelpSupportScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useDialog();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filtrar FAQs
  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const handleExpandFAQ = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const handleEmailSupport = () => {
    const email = 'soporte@llepa-app.com';
    const subject = 'Soporte Llepa App';
    const body = `
Hola equipo de soporte,

[Describe tu consulta aquí]

---
Información del dispositivo:
- Plataforma: ${Platform.OS}
- Versión: ${Platform.Version}
- App versión: 1.0.0
    `.trim();
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(url).catch(() => {
      showAlert('Error', 'No se pudo abrir la aplicación de correo. Puedes escribirnos a: ' + email);
    });
  };
  
  const handleOpenWebsite = () => {
    Linking.openURL('https://llepa-app.com').catch(() => {
      showAlert('Error', 'No se pudo abrir el navegador');
    });
  };
  
  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/llepa/id000000000', // Reemplazar con ID real
      android: 'https://play.google.com/store/apps/details?id=com.llepa.app', // Reemplazar con ID real
      default: 'https://llepa-app.com',
    });
    
    Linking.openURL(storeUrl).catch(() => {
      showAlert('Próximamente', 'La app aún no está disponible en las tiendas. ¡Gracias por tu interés!');
    });
  };
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      {/* Buscador */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Buscar en preguntas frecuentes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
          inputStyle={{ minHeight: 0 }}
        />
      </View>
      
      {/* Filtros por categoría */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <Chip
          selected={selectedCategory === null}
          onPress={() => setSelectedCategory(null)}
          style={styles.categoryChip}
          showSelectedOverlay
        >
          Todas
        </Chip>
        {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
          <Chip
            key={key}
            selected={selectedCategory === key}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
            style={styles.categoryChip}
            showSelectedOverlay
          >
            {label}
          </Chip>
        ))}
      </ScrollView>
      
      {/* Preguntas Frecuentes */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Preguntas Frecuentes
        </Text>
        
        {filteredFAQs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No se encontraron resultados para "{searchQuery}"
            </Text>
          </View>
        ) : (
          filteredFAQs.map((faq, index) => (
            <React.Fragment key={faq.id}>
              {index > 0 && <Divider />}
              <List.Accordion
                title={faq.question}
                titleNumberOfLines={3}
                titleStyle={styles.questionTitle}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={CATEGORY_LABELS[faq.category].icon}
                    color={theme.colors.primary}
                  />
                )}
                expanded={expandedId === faq.id}
                onPress={() => handleExpandFAQ(faq.id)}
                style={{ backgroundColor: 'transparent' }}
              >
                <View style={[styles.answerContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text style={[styles.answerText, { color: theme.colors.onSurfaceVariant }]}>
                    {faq.answer}
                  </Text>
                </View>
              </List.Accordion>
            </React.Fragment>
          ))
        )}
      </View>
      
      {/* Contacto */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Contacto
        </Text>
        
        <List.Item
          title="Enviar correo de soporte"
          description="soporte@llepa-app.com"
          left={(props) => <List.Icon {...props} icon="email" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleEmailSupport}
        />
        <Divider />
        <List.Item
          title="Visitar nuestra web"
          description="llepa-app.com"
          left={(props) => <List.Icon {...props} icon="web" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={handleOpenWebsite}
        />
      </View>
      
      {/* Más opciones */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Más opciones
        </Text>
        
        <List.Item
          title="Valorar la app"
          description="¡Tu opinión nos ayuda a mejorar!"
          left={(props) => <List.Icon {...props} icon="star" color={theme.colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleRateApp}
        />
        <Divider />
        <List.Item
          title="Reportar un problema"
          description="Algo no funciona correctamente"
          left={(props) => <List.Icon {...props} icon="bug" color={theme.colors.error} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            const email = 'bugs@llepa-app.com';
            const subject = 'Reporte de bug - Llepa App';
            const body = `
Descripción del problema:
[Describe qué ocurre]

Pasos para reproducir:
1. 
2. 
3. 

Comportamiento esperado:
[Qué debería pasar]

---
Información del dispositivo:
- Plataforma: ${Platform.OS}
- Versión SO: ${Platform.Version}
- App versión: 1.0.0
            `.trim();
            
            const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(url).catch(() => {
              showAlert('Error', 'No se pudo abrir la aplicación de correo. Puedes escribirnos a: ' + email);
            });
          }}
        />
        <Divider />
        <List.Item
          title="Sugerir una función"
          description="¿Tienes una idea para mejorar la app?"
          left={(props) => <List.Icon {...props} icon="lightbulb-on" color={theme.colors.tertiary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            const email = 'ideas@llepa-app.com';
            const subject = 'Sugerencia - Llepa App';
            const body = `
Mi sugerencia:
[Describe tu idea]

¿Por qué sería útil?
[Explica cómo te ayudaría]

---
App versión: 1.0.0
            `.trim();
            
            const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(url).catch(() => {
              showAlert('Error', 'No se pudo abrir la aplicación de correo. Puedes escribirnos a: ' + email);
            });
          }}
        />
      </View>
      
      {/* Información adicional */}
      <Surface style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <List.Icon icon="information" color={theme.colors.onPrimaryContainer} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: theme.colors.onPrimaryContainer }]}>
            ¿No encuentras lo que buscas?
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.onPrimaryContainer }]}>
            Envíanos un correo y te responderemos lo antes posible. Normalmente respondemos en menos de 24 horas.
          </Text>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    padding: spacing.md,
  },
  searchbar: {
    elevation: 0,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    marginRight: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  questionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  answerContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default HelpSupportScreen;
