import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import {
  Text,
  List,
  Divider,
  useTheme,
  Surface,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '../../constants/theme';

interface PolicySection {
  id: string;
  title: string;
  icon: string;
  content: string[];
}

const LAST_UPDATED = '15 de enero de 2026';

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'intro',
    title: 'Introducción',
    icon: 'shield-check',
    content: [
      'En Llepa App nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos tu información personal cuando utilizas nuestra aplicación móvil.',
      'Al utilizar Llepa App, aceptas las prácticas descritas en esta política. Te recomendamos leerla detenidamente.',
    ],
  },
  {
    id: 'data-collected',
    title: 'Datos que Recopilamos',
    icon: 'database',
    content: [
      '**Información de la cuenta:**',
      '• Correo electrónico',
      '• Nombre de usuario (opcional)',
      '• Foto de perfil (opcional)',
      '',
      '**Información de tus mascotas:**',
      '• Nombre, especie, raza y fecha de nacimiento',
      '• Peso y número de microchip',
      '• Fotos de perfil',
      '• Historial médico y vacunas',
      '• Recordatorios y medicaciones',
      '',
      '**Datos técnicos:**',
      '• Tipo de dispositivo y sistema operativo',
      '• Identificadores únicos del dispositivo',
      '• Datos de uso y rendimiento de la app',
    ],
  },
  {
    id: 'data-usage',
    title: 'Uso de los Datos',
    icon: 'cog',
    content: [
      'Utilizamos tu información para:',
      '',
      '• **Proporcionar el servicio:** Almacenar y sincronizar los datos de tus mascotas entre dispositivos.',
      '• **Notificaciones:** Enviarte recordatorios de medicación, citas y vacunas.',
      '• **Mejora del servicio:** Analizar el uso de la app para mejorar funcionalidades.',
      '• **Soporte:** Responder a tus consultas y resolver problemas técnicos.',
      '• **Seguridad:** Proteger tu cuenta y prevenir usos fraudulentos.',
    ],
  },
  {
    id: 'data-storage',
    title: 'Almacenamiento y Seguridad',
    icon: 'lock',
    content: [
      '**Dónde almacenamos tus datos:**',
      'Tus datos se almacenan en servidores seguros de Firebase (Google Cloud Platform) ubicados en la Unión Europea.',
      '',
      '**Medidas de seguridad:**',
      '• Encriptación de datos en tránsito (TLS/SSL)',
      '• Encriptación de datos en reposo',
      '• Autenticación segura con Firebase Auth',
      '• Acceso restringido solo a tu cuenta',
      '• Copias de seguridad automáticas',
      '',
      '**Retención de datos:**',
      'Conservamos tus datos mientras mantengas tu cuenta activa. Si eliminas tu cuenta, tus datos serán eliminados en un plazo máximo de 30 días.',
    ],
  },
  {
    id: 'data-sharing',
    title: 'Compartición de Datos',
    icon: 'share-variant',
    content: [
      '**No vendemos tus datos.**',
      '',
      'Solo compartimos información con terceros en los siguientes casos:',
      '',
      '• **Proveedores de servicios:** Firebase (Google) para almacenamiento y autenticación, ImgBB para almacenamiento de imágenes.',
      '• **Requisitos legales:** Cuando sea requerido por ley o para proteger nuestros derechos.',
      '• **Con tu consentimiento:** Si nos autorizas explícitamente a compartir cierta información.',
      '',
      'Nuestros proveedores están sujetos a acuerdos de confidencialidad y solo procesan datos según nuestras instrucciones.',
    ],
  },
  {
    id: 'user-rights',
    title: 'Tus Derechos',
    icon: 'account-check',
    content: [
      'De acuerdo con el RGPD y otras leyes de protección de datos, tienes derecho a:',
      '',
      '• **Acceso:** Solicitar una copia de todos tus datos personales.',
      '• **Rectificación:** Corregir datos inexactos o incompletos.',
      '• **Eliminación:** Solicitar la eliminación de tus datos ("derecho al olvido").',
      '• **Portabilidad:** Recibir tus datos en un formato estructurado.',
      '• **Oposición:** Oponerte al procesamiento de tus datos.',
      '• **Limitación:** Solicitar la restricción del procesamiento.',
      '',
      'Para ejercer estos derechos, contacta con nosotros en: privacidad@llepa-app.com',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies y Tecnologías Similares',
    icon: 'cookie',
    content: [
      'Llepa App utiliza tecnologías de almacenamiento local para:',
      '',
      '• Mantener tu sesión iniciada',
      '• Guardar tus preferencias (tema, notificaciones)',
      '• Mejorar el rendimiento de la aplicación',
      '',
      'No utilizamos cookies de terceros con fines publicitarios.',
    ],
  },
  {
    id: 'children',
    title: 'Menores de Edad',
    icon: 'account-child',
    content: [
      'Llepa App no está dirigida a menores de 16 años. No recopilamos intencionadamente información de menores de esta edad.',
      '',
      'Si eres padre o tutor y descubres que tu hijo ha proporcionado información personal, contacta con nosotros para eliminarla.',
    ],
  },
  {
    id: 'changes',
    title: 'Cambios en esta Política',
    icon: 'update',
    content: [
      'Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre cambios significativos mediante:',
      '',
      '• Notificación en la aplicación',
      '• Correo electrónico (si procede)',
      '• Actualización de la fecha de "Última modificación"',
      '',
      'Te recomendamos revisar esta política periódicamente.',
    ],
  },
  {
    id: 'contact',
    title: 'Contacto',
    icon: 'email',
    content: [
      'Si tienes preguntas sobre esta Política de Privacidad o sobre cómo tratamos tus datos, puedes contactarnos:',
      '',
      '**Correo electrónico:** privacidad@llepa-app.com',
      '**Web:** https://llepa-app.com/privacidad',
      '',
      '**Responsable del tratamiento:**',
      'Llepa App',
      'España',
    ],
  },
];

const PrivacyPolicyScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>('intro');
  
  const handleToggleSection = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const renderContent = (content: string[]) => {
    return content.map((line, index) => {
      // Línea vacía
      if (line === '') {
        return <View key={index} style={{ height: spacing.sm }} />;
      }
      
      // Texto en negrita
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <Text
            key={index}
            style={[styles.boldText, { color: theme.colors.onSurface }]}
          >
            {line.replace(/\*\*/g, '')}
          </Text>
        );
      }
      
      // Texto con negrita parcial
      if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <Text key={index} style={[styles.contentText, { color: theme.colors.onSurfaceVariant }]}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <Text key={i} style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                    {part.replace(/\*\*/g, '')}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        );
      }
      
      // Lista con viñetas
      if (line.startsWith('• ')) {
        return (
          <Text
            key={index}
            style={[styles.bulletText, { color: theme.colors.onSurfaceVariant }]}
          >
            {line}
          </Text>
        );
      }
      
      // Texto normal
      return (
        <Text
          key={index}
          style={[styles.contentText, { color: theme.colors.onSurfaceVariant }]}
        >
          {line}
        </Text>
      );
    });
  };
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      {/* Header */}
      <Surface style={[styles.headerCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <List.Icon icon="shield-lock" color={theme.colors.onPrimaryContainer} style={styles.headerIcon} />
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimaryContainer }]}>
            Política de Privacidad
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimaryContainer }]}>
            Última actualización: {LAST_UPDATED}
          </Text>
        </View>
      </Surface>
      
      {/* Secciones */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        {POLICY_SECTIONS.map((section, index) => (
          <React.Fragment key={section.id}>
            {index > 0 && <Divider />}
            <List.Accordion
              title={section.title}
              titleStyle={styles.sectionTitle}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={section.icon}
                  color={theme.colors.primary}
                />
              )}
              expanded={expandedId === section.id}
              onPress={() => handleToggleSection(section.id)}
              style={{ backgroundColor: 'transparent' }}
            >
              <View style={[styles.contentContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                {renderContent(section.content)}
              </View>
            </List.Accordion>
          </React.Fragment>
        ))}
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
          Al utilizar Llepa App, aceptas esta Política de Privacidad.
        </Text>
        <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }]}>
          © 2026 Llepa App. Todos los derechos reservados.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    margin: 0,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  boldText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  footer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PrivacyPolicyScreen;
