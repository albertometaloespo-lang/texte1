import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializar Firebase apenas se ainda não tiver sido inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Ativar persistência local do Firebase Auth (guarda a sessão no browser)
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Aviso ao definir persistência do Firebase Auth:', err);
  });
} catch (e) {
  console.warn('Erro ao configurar persistência do Firebase:', e);
}

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Chaves de armazenamento persistente para credenciais do Google Drive
const STORAGE_KEY_TOKEN = 'metaloespo_gdrive_access_token';
const STORAGE_KEY_EXPIRY = 'metaloespo_gdrive_token_expiry';
const STORAGE_KEY_USER_EMAIL = 'metaloespo_gdrive_user_email';
const STORAGE_KEY_USER_NAME = 'metaloespo_gdrive_user_name';
const STORAGE_KEY_USER_PHOTO = 'metaloespo_gdrive_user_photo';

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedTokenExpiry: number = 0;

function saveStoredAuth(token: string, user: User) {
  try {
    // Tokens OAuth do Google expiram normalmente em 3600s (1 hora).
    // Guardamos com margem de segurança de 55 minutos.
    const expiresAt = Date.now() + 55 * 60 * 1000;
    cachedAccessToken = token;
    cachedTokenExpiry = expiresAt;

    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_EXPIRY, expiresAt.toString());
    if (user.email) {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, user.email);
    }
    if (user.displayName) {
      localStorage.setItem(STORAGE_KEY_USER_NAME, user.displayName);
    }
    if (user.photoURL) {
      localStorage.setItem(STORAGE_KEY_USER_PHOTO, user.photoURL);
    }
  } catch (e) {
    console.warn('Não foi possível guardar credenciais no armazenamento local:', e);
  }
}

function getStoredToken(): { token: string; expiresAt: number } | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiryStr = localStorage.getItem(STORAGE_KEY_EXPIRY);
    if (!token || !expiryStr) return null;
    const expiresAt = parseInt(expiryStr, 10);
    if (isNaN(expiresAt)) return null;
    return { token, expiresAt };
  } catch {
    return null;
  }
}

export function getStoredUserEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_USER_EMAIL);
  } catch {
    return null;
  }
}

export function hasActiveGoogleToken(): boolean {
  if (cachedAccessToken && cachedTokenExpiry > Date.now()) {
    return true;
  }
  const stored = getStoredToken();
  return Boolean(stored && stored.token && stored.expiresAt > Date.now());
}

export function hasSavedCredentials(): boolean {
  try {
    const stored = getStoredToken();
    const hasEmail = Boolean(localStorage.getItem(STORAGE_KEY_USER_EMAIL));
    return Boolean(auth.currentUser || (stored && stored.expiresAt > Date.now()) || hasEmail);
  } catch {
    return false;
  }
}

function clearStoredAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
    localStorage.removeItem(STORAGE_KEY_USER_NAME);
    localStorage.removeItem(STORAGE_KEY_USER_PHOTO);
  } catch {}
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Restaurar o token guardado da sessão anterior se ainda for válido
      const stored = getStoredToken();
      if (stored && stored.expiresAt > Date.now()) {
        cachedAccessToken = stored.token;
        cachedTokenExpiry = stored.expiresAt;
      }

      if (user.email) {
        try {
          localStorage.setItem(STORAGE_KEY_USER_EMAIL, user.email);
        } catch {}
      }

      // Manter a sessão do utilizador ativa permanentemente na aplicação
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      clearStoredAuth();
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (options?: {
  forceSelectAccount?: boolean;
}): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    // Se já conhecermos o email anterior, usamos login_hint para evitar perguntas repetidas
    const currentEmail = auth.currentUser?.email || getStoredUserEmail();
    if (options?.forceSelectAccount) {
      provider.setCustomParameters({ prompt: 'select_account' });
    } else if (currentEmail) {
      provider.setCustomParameters({ login_hint: currentEmail });
    } else {
      // Apenas na 1ª vez: não forçar prompt repetido
      provider.setCustomParameters({});
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    saveStoredAuth(credential.accessToken, result.user);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no início de sessão Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (interactiveIfExpired: boolean = false): Promise<string | null> => {
  // 1. Verificar em memória
  if (cachedAccessToken && cachedTokenExpiry > Date.now()) {
    return cachedAccessToken;
  }

  // 2. Verificar no armazenamento local persistente
  const stored = getStoredToken();
  if (stored && stored.token && stored.expiresAt > Date.now()) {
    cachedAccessToken = stored.token;
    cachedTokenExpiry = stored.expiresAt;
    return cachedAccessToken;
  }

  // 3. Se ainda houver um token guardado (mesmo próximo do limite), tentar usar antes de falhar
  if (stored && stored.token) {
    cachedAccessToken = stored.token;
    return cachedAccessToken;
  }

  // 4. Se a ação for interativa e o utilizador tiver sessão iniciada, renovar silenciosamente
  if (interactiveIfExpired && auth.currentUser) {
    try {
      const res = await googleSignIn();
      return res?.accessToken || null;
    } catch {
      return null;
    }
  }

  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  clearStoredAuth();
};
