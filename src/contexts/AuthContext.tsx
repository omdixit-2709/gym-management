import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { UserRole, logoutUser } from '../firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'manager' | 'receptionist' | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'receptionist' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data() as UserRole;
        setUserRole(userData?.role || null);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userRole,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 