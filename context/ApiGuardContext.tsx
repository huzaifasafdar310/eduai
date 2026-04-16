import React, { 
  createContext, 
  useContext, 
  useState, 
  ReactNode, 
  useCallback 
} from 'react';
import { useApp } from './AppContext';
import { ApiGuardModal } from '@/components/ApiGuardModal';

interface ApiGuardContextType {
  withApiAccess: (action: () => void) => void;
  isModalVisible: boolean;
  hideModal: () => void;
}

const ApiGuardContext = createContext<ApiGuardContextType | undefined>(undefined);

/**
 * 🛡️ ApiGuardProvider: Manages lazy-gated access to AI features.
 * Prevents execution of AI actions unless a personal API is connected.
 */
export const ApiGuardProvider = ({ children }: { children: ReactNode }) => {
  const { state } = useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const hideModal = useCallback(() => {
    setIsModalVisible(false);
    setPendingAction(null);
  }, []);

  /**
   * 🎯 withApiAccess: The primary lazy-gate gatekeeper.
   * Checks for API authority before executing any AI-sensitive logic.
   */
  const withApiAccess = useCallback((action: () => void) => {
    if (state.apiConnected) {
      action();
    } else {
      console.log('[ApiGuard] AI feature blocked: API authority not established.');
      setIsModalVisible(true);
      setPendingAction(() => action);
    }
  }, [state.apiConnected]);

  return (
    <ApiGuardContext.Provider value={{ withApiAccess, isModalVisible, hideModal }}>
      {children}
      <ApiGuardModal 
        visible={isModalVisible} 
        onClose={hideModal} 
      />
    </ApiGuardContext.Provider>
  );
};

export const useApiGuard = (): ApiGuardContextType => {
  const context = useContext(ApiGuardContext);
  if (context === undefined) {
    throw new Error('useApiGuard must be used within an ApiGuardProvider');
  }
  return context;
};
