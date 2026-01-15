import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface UpdateProfileData {
  displayName?: string;
  photoURL?: string;
}

// Actualizar perfil del usuario
export const updateUserProfile = async (data: UpdateProfileData): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }

  // Actualizar en Firebase Auth
  await updateProfile(user, {
    displayName: data.displayName,
    photoURL: data.photoURL,
  });

  // Actualizar en Firestore (usar setDoc con merge para crear si no existe)
  const userDoc = doc(db, 'users', user.uid);
  await setDoc(userDoc, {
    email: user.email,
    displayName: data.displayName || null,
    photoURL: data.photoURL || null,
    updatedAt: Timestamp.now(),
  }, { merge: true });
};

// Registrar nuevo usuario
export const registerUser = async (email: string, password: string, displayName?: string): Promise<FirebaseUser> => {

  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  

  
  // Actualizar perfil con nombre
  if (displayName) {
    await updateProfile(user, { displayName });
  }
  
  // Crear documento de usuario en Firestore
  const userDoc = doc(db, 'users', user.uid);
  await setDoc(userDoc, {
    email: user.email,
    displayName: displayName || null,
    createdAt: Timestamp.now(),
  });
  

  
  return user;
};

// Iniciar sesión
export const loginUser = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Cerrar sesión
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// Cambiar contraseña
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No hay usuario autenticado');
  }

  // Re-autenticar al usuario con la contraseña actual
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Actualizar la contraseña
  await updatePassword(user, newPassword);
};
