import React, { 
  createContext, 
  useContext, 
  useState, 
  ReactNode, 
  useEffect, 
  useCallback, 
  useMemo 
} from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';

// --- Domain Models ---

export interface FileHandoffData {
  uri: string;
  fileName: string;
  mimeType: string;
  base64?: string;
  targetToolId?: string; // e.g. 'math', 'quiz'
}

interface AppState {
  userCredits: number;
  apiEngine: 'claude' | 'groq' | 'ocr.space';
  pendingFile: FileHandoffData | null;
  apiConnected: boolean; // strict BYOK status
}

interface AppContextType {
  state: AppState;
  refreshCredits: () => Promise<void>;
  refreshApiStatus: () => Promise<void>;
  syncCredits: (newCredits: number) => void;
  setEngine: (engine: AppState['apiEngine']) => void;
  // Handoff specific
  setPendingFile: (file: FileHandoffData | null) => void;
  consumeFile: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * 🛠️ AppProvider: Unified Global Application State
 * Corrected nesting: Manages Credits, Engines, and File Handoffs.
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  const [state, setState] = useState<AppState>({
    userCredits: 0,
    apiEngine: 'groq',
    pendingFile: null,
    apiConnected: false,
  });

  /**
   * Fetches real credit balance from the backend
   */
  const refreshCredits = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiClient.get('/api/user/profile');
      if (response.data?.credits !== undefined) {
        setState((prev) => ({ ...prev, userCredits: response.data.credits }));
      }
    } catch (error) {
      console.error('[App Service] Failed to sync credits:', error);
    }
  }, [isAuthenticated]);

  /**
   * Checks if the user has a personal API key connected (BYOK)
   */
  const refreshApiStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await apiClient.get('/api/keys/status');
      setState((prev) => ({ ...prev, apiConnected: !!response.data?.isConnected }));
    } catch (error) {
       console.error('[App Service] Failed to sync API status:', error);
       setState((prev) => ({ ...prev, apiConnected: false }));
    }
  }, [isAuthenticated]);

  // Sync state on auth state change
  useEffect(() => {
    if (isAuthenticated) {
      refreshCredits();
      refreshApiStatus();
    } else {
      setState((prev) => ({ 
        ...prev, 
        userCredits: 0, 
        apiConnected: false 
      }));
    }
  }, [isAuthenticated, refreshCredits, refreshApiStatus]);

  // File Handoff Auto-Clear Logic
  useEffect(() => {
    if (state.pendingFile) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, pendingFile: null }));
        console.log('[AppContext] File handoff auto-cleared after 30s timeout');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [state.pendingFile]);

  /**
   * Authoritatively updates the local credit count from a backend response.
   */
  const syncCredits = useCallback((newCredits: number) => {
    setState((prev) => ({ ...prev, userCredits: newCredits }));
  }, []);

  const setEngine = useCallback((apiEngine: AppState['apiEngine']) => {
    setState((prev) => ({ ...prev, apiEngine }));
  }, []);

  const setPendingFile = useCallback((file: FileHandoffData | null) => {
    setState(prev => ({ ...prev, pendingFile: file }));
  }, []);

  const consumeFile = useCallback(() => {
    setState(prev => ({ ...prev, pendingFile: null }));
  }, []);

  // 💎 Memoize the context value to ensure stable identity
  const contextValue = useMemo(() => ({
    state,
    refreshCredits,
    refreshApiStatus,
    syncCredits,
    setEngine,
    setPendingFile,
    consumeFile
  }), [state, refreshCredits, refreshApiStatus, syncCredits, setEngine, setPendingFile, consumeFile]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/**
 * 🪝 Legacy Shim: Redirects file handoff calls to the new unified AppContext.
 * This prevents breaking changes across the codebase.
 */
export const useFileHandoff = () => {
  const { state, setPendingFile, consumeFile } = useApp();
  return {
    pendingFile: state.pendingFile,
    setPendingFile,
    consumeFile
  };
};
