import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'NHANVIENBAN' | 'NHANVIENTHUE';
  fullName: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  setAuth: (user: User, session: Session) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try to load initial session from localStorage
  const localUser = localStorage.getItem('camera_store_user');
  const localSession = localStorage.getItem('camera_store_session');
  
  let initialUser: User | null = null;
  let initialSession: Session | null = null;

  try {
    if (localUser && localSession) {
      initialUser = JSON.parse(localUser);
      initialSession = JSON.parse(localSession);
    }
  } catch (err) {
    console.error('Failed to parse cached auth keys', err);
  }

  return {
    user: initialUser,
    session: initialSession,
    isAuthenticated: !!initialUser,
    setAuth: (user, session) => {
      localStorage.setItem('camera_store_user', JSON.stringify(user));
      localStorage.setItem('camera_store_session', JSON.stringify(session));
      set({ user, session, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('camera_store_user');
      localStorage.removeItem('camera_store_session');
      localStorage.removeItem('camera_store_session_role');
      set({ user: null, session: null, isAuthenticated: false });
    }
  };
});
