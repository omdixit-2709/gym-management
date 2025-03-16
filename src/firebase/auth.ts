import { 
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export interface UserRole {
  role: 'admin' | 'manager' | 'receptionist';
}

export const loginWithEmail = async (
  email: string,
  password: string,
  rememberMe: boolean
) => {
  try {
    // Set persistence based on remember me option
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    
    // Sign in user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Get user role from Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    const userData = userDoc.data() as UserRole;
    
    if (!userData || !userData.role) {
      throw new Error('User role not found');
    }
    
    return {
      user: userCredential.user,
      role: userData.role
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to login');
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to logout');
  }
}; 