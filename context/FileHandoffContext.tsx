import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

/**
 * 📄 File Data Handoff Type Definition
 */
export interface FileHandoffData {
  uri: string;
  fileName: string;
  mimeType: string;
  base64?: string;
  targetToolId?: string; // e.g. 'math', 'quiz'
}

interface FileHandoffContextType {
  pendingFile: FileHandoffData | null;
  /**
   * 📤 Sets a file to be handed off to a consumer screen.
   */
  setPendingFile: (file: FileHandoffData | null) => void;
  /**
   * 🛒 Consumes the pending file (clearing it from global state).
   */
  consumeFile: () => void;
}

const FileHandoffContext = createContext<FileHandoffContextType | undefined>(undefined);

export function FileHandoffProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFile] = useState<FileHandoffData | null>(null);

  const consumeFile = () => {
    setPendingFile(null);
  };

  useEffect(() => {
    if (pendingFile) {
      const timer = setTimeout(() => {
        setPendingFile(null);
        console.log('File handoff auto-cleared after timeout');
      }, 30000); // 30 seconds
      return () => clearTimeout(timer);
    }
  }, [pendingFile]);

  return (
    <FileHandoffContext.Provider value={{ pendingFile, setPendingFile, consumeFile }}>
      {children}
    </FileHandoffContext.Provider>
  );
}

/**
 * 🪝 Hook to access the file handoff system.
 */
export function useFileHandoff() {
  const context = useContext(FileHandoffContext);
  if (context === undefined) {
    throw new Error('useFileHandoff must be used within a FileHandoffProvider');
  }
  return context;
}
