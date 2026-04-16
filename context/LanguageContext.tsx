import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { TRANSLATIONS } from '@/constants/translations';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ur' | 'ar' | 'hi' | 'es' | 'fr'>('en');

  useEffect(() => {
    fetchSavedLanguage();
  }, []);

  const fetchSavedLanguage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .single();

      if (data?.language && TRANSLATIONS[data.language]) {
        setCurrentLanguage(data.language);
      }
    } catch (e) {
      console.log('[LANG_CONTEXT_FETCH_ERROR]', e);
    }
  };

  const setLanguage = useCallback(async (lang: any) => {
    setCurrentLanguage(lang);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ language: lang }).eq('id', user.id);
      }
    } catch (e) {
      console.log('[LANG_CONTEXT_UPDATE_ERROR]', e);
    }
  }, []);

  const t = useCallback((key: string): string => {
    const langSet = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    return langSet[key] || TRANSLATIONS.en[key] || key;
  }, [currentLanguage]);

  const isRTL = useMemo(() => ['ur', 'ar'].includes(currentLanguage), [currentLanguage]);

  const value = useMemo(() => ({ currentLanguage, setLanguage, t, isRTL }), [currentLanguage, setLanguage, t, isRTL]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
