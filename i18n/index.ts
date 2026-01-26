'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './zh.json'
import en from './en.json'

const I18N_LANG = `${process.env.NEXT_PUBLIC_CACHE_PREFIX}_i18n_code`

export const I18nLocalCache = {
  // getUnipassAddress(): string | null {
  //   return localStorage.getItem(UNIPASS_ADDRESS_KEY)
  // },
  // setUnipassAddress(address: string): void {
  //   localStorage.setItem(UNIPASS_ADDRESS_KEY, address)
  // },
  // getUnipassEmail(): string | null {
  //   return localStorage.getItem(UNIPASS_EMAIL_KEY)
  // },
  // setUnipassEmail(email: string): void {
  //   localStorage.setItem(UNIPASS_EMAIL_KEY, email)
  // },
  // getUnipassLoginDate(): string | null {
  //   return localStorage.getItem(UNIPASS_LOGIN_DATE)
  // },
  // setUnipassLoginDate(date: string) {
  //   localStorage.setItem(UNIPASS_LOGIN_DATE, date)
  // },
  setI18nLng(lang: 'zh' | 'en') {
    if (typeof window === 'undefined') return
    localStorage.setItem(I18N_LANG, lang)
  },
  getI18nLng() {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem(I18N_LANG)
  }
}


// eslint-disable-next-line @typescript-eslint/no-floating-promises
i18n.use(initReactI18next).init({
  resources: {
    zh,
    en
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  },
  react: {
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'b', 'span', 'em', 'small']
  }
})

export default i18n
