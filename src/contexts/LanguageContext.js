import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Site-wide English / Japanese switch. Japanese shows a project's
// `title_ja` / `subtitle_ja` where they've been filled in, and falls back to
// the English text where they haven't.
const LanguageContext = createContext({ lang: 'en', setLang: () => {}, localize: (o, f) => o?.[f] });

const STORAGE_KEY = 'gcdp_lang';

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ja' ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = useCallback(next => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const localize = useCallback(
    (obj, field) => {
      if (!obj) return '';
      if (lang === 'ja') {
        const ja = obj[`${field}_ja`];
        if (typeof ja === 'string' && ja.trim()) return ja;
      }
      return obj[field] || '';
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, localize }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
