# kypaw

Una aplicación móvil para la gestión integral de tus mascotas: historial médico, recordatorios, vacunas y más.

## ✨ Características Principales

- 📱 **Diseño Material Design 3** - Interfaz moderna y accesible
- 🌓 **Modo Oscuro** - Soporte completo para tema claro y oscuro
- 🐾 **Multi-Mascota** - Gestiona varios animales desde una cuenta
- 🏥 **Historial Médico Digital** - Registra visitas y diagnósticos
- 📸 **Digitalización de Recetas** - Captura y almacena documentos
- 💉 **Control de Vacunas** - Calendario completo de vacunación
- ⏰ **Recordatorios Inteligentes** - Alertas para medicación y citas
- 🔒 **Seguro y Privado** - Datos protegidos con Firebase

## 🚀 Stack Tecnológico

- **Framework:** React Native (Expo SDK 50+)
- **Lenguaje:** TypeScript
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Navegación:** React Navigation v6
- **UI Library:** React Native Paper 5.x (Material Design 3)
- **Gestión de Estado:** Zustand
- **Validación:** Zod + React Hook Form

## 🎨 Sistema de Diseño

Esta aplicación implementa **Material Design 3** (MD3) de Google, proporcionando:

- Sistema de colores dinámico con 30+ tokens
- 15 escalas tipográficas completas
- Modo claro y oscuro
- Componentes accesibles (WCAG AA)

📚 **Ver guía completa:** [MATERIAL_DESIGN_3.md](./MATERIAL_DESIGN_3.md)  
📖 **Migración:** [MATERIAL_DESIGN_3_MIGRATION.md](./MATERIAL_DESIGN_3_MIGRATION.md)

## 📁 Estructura del Proyecto

```
src/
├── assets/           # Recursos estáticos
├── components/       # Componentes reutilizables
│   ├── ui/          # Componentes base
│   └── forms/       # Componentes de formulario
├── config/          # Configuración (Firebase, temas)
├── constants/       # Constantes y temas
├── hooks/           # Custom Hooks
├── navigation/      # Configuración de navegación
├── screens/         # Pantallas de la app
│   ├── auth/       # Login, Registro
│   ├── dashboard/  # Pantalla "Hoy"
│   ├── pets/       # Gestión de mascotas
│   ├── health/     # Historial médico
│   └── settings/   # Configuración
├── services/       # Lógica de negocio (Firebase)
├── store/          # Estado global (Zustand)
├── types/          # Tipos TypeScript
└── utils/          # Funciones auxiliares
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js (v18+)
- npm o yarn
- Expo CLI
- Cuenta de Firebase

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/AlexAlvarezAlmendros/llepa-app.git
   cd llepa-app
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Firebase:**
   - Crear un proyecto en [Firebase Console](https://console.firebase.google.com)
   - Habilitar Authentication (Email/Password)
   - Crear una base de datos Firestore
   - Habilitar Storage
   - Copiar las credenciales del proyecto

4. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` con tus credenciales de Firebase:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
   ```

5. **Ejecutar la aplicación:**
   ```bash
   npm start
   ```

## 📱 Comandos Disponibles

- `npm start` - Iniciar servidor de desarrollo
- `npm run android` - Ejecutar en Android
- `npm run ios` - Ejecutar en iOS (requiere macOS)
- `npm run web` - Ejecutar en navegador

## 🎯 Funcionalidades Principales

### ✅ Implementado en el Setup Inicial

- ✅ Estructura de proyecto completa
- ✅ Configuración de navegación (Stack + Tabs)
- ✅ Integración con Firebase
- ✅ Sistema de autenticación
- ✅ Gestión de estado global
- ✅ Tema personalizado
- ✅ Tipos TypeScript completos


## 🏗️ Arquitectura

### Modelo de Datos (Firestore)

```
users/{userId}
├── pets/{petId}
│   ├── visits/{visitId}
│   └── vaccines/{vaccineId}
└── reminders/{reminderId}
```

### Flujo de Autenticación

1. Usuario se registra/inicia sesión
2. Firebase Auth gestiona la autenticación
3. `onAuthStateChanged` actualiza el estado global
4. La navegación se actualiza automáticamente

### Gestión de Estado

- **Zustand** para estado global (usuario, mascota activa)
- **React Hook Form** para estado de formularios
- **Firebase** como fuente de verdad

## 🎨 Diseño

La aplicación sigue las directrices de Material Design 3 mediante React Native Paper, con una paleta personalizada:

- **Primario:** `#4F46E5` (Índigo)
- **Secundario:** `#10B981` (Esmeralda)
- **Error:** `#EF4444` (Rojo)
- **Fondo:** `#F9FAFB` (Gris claro)

## 🤝 Contribución

Este proyecto está en desarrollo activo. Para contribuir:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

[MIT License](LICENSE)

## 📧 Contacto

Alex Álvarez Almendros - [@AlexAlvarezAlmendros](https://github.com/AlexAlvarezAlmendros)

---

**Nota:** Este proyecto está en fase MVP. Las funcionalidades se irán implementando progresivamente según el roadmap definido.
