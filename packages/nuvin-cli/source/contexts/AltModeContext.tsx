import { createContext, useContext, type ReactNode } from 'react';

type AltModeContextType = {
  altMode: boolean;
};

const AltModeContext = createContext<AltModeContextType | undefined>(undefined);

export const AltModeProvider = ({ children, altMode = false }: { children: ReactNode; altMode?: boolean }) => {
  return <AltModeContext.Provider value={{ altMode }}>{children}</AltModeContext.Provider>;
};

export const useAltMode = () => {
  const context = useContext(AltModeContext);
  if (!context) {
    console.warn('useAltMode used outside AltModeProvider, using defaults');
    return {
      altMode: false,
    };
  }
  return context;
};
