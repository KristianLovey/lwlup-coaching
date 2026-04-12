'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type Lang, type TranslationKey, getT } from '@/lib/i18n'

type LangCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangCtx>({
  lang: 'hr',
  setLang: () => {},
  t: (key) => key as string,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('hr')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lwlup-lang') as Lang | null
      if (stored === 'en' || stored === 'hr') setLangState(stored)
    } catch {}
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('lwlup-lang', l) } catch {}
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: getT(lang) }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLanguage = () => useContext(LangContext)
