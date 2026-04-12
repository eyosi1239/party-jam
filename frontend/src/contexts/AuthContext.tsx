import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes (only when Firebase is configured)
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Sync user record to Postgres on every login
      if (currentUser) {
        const providerId = currentUser.providerData[0]?.providerId ?? 'password';
        const authProvider =
          providerId === 'google.com' ? 'google'
          : providerId === 'spotify.com' ? 'spotify'
          : 'email';

        api.syncUser({
          firebaseUid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          authProvider,
        }).catch((err) => console.error('Failed to sync user:', err));
      }
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!auth || !db) {
      throw new Error('Firebase is not configured. Add your credentials to frontend/.env.local');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      if (newUser) {
        if (displayName?.trim()) {
          await updateProfile(newUser, { displayName: displayName.trim() });
        }
        await setDoc(doc(db, "users", newUser.uid), {
          email: newUser.email,
          displayName: displayName?.trim() ?? null,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error during sign up:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase is not configured. Add your credentials to frontend/.env.local');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase is not configured. Add your credentials to frontend/.env.local');
    }
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase is not configured. Add your credentials to frontend/.env.local');
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) {
      throw new Error('Firebase is not configured. Add your credentials to frontend/.env.local');
    }
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, login, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
