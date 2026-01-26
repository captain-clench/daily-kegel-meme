/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { t, type i18n, type TFunction } from 'i18next'
import { useCallback, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { I18nLocalCache } from '../i18n'

export interface useTransStates {
  i18n: i18n
  t: TFunction
  tCommon: TFunction
  tRoot: TFunction
  tc: (key: string, props?: TcProps) => React.ReactNode
  locale: string
  changeLocale: (lang: 'en' | 'zh') => void
}

interface TcProps {
  valeu?: any
  components?: readonly React.ReactElement[] | { readonly [tagName: string]: React.ReactElement }
}

export default function useTrans(keyPrefix: string): useTransStates {
  const { t, i18n } = useTranslation('trans', { keyPrefix })
  const { t: tCommon } = useTranslation('trans', { keyPrefix: 'common' })
  const { t: tRoot } = useTranslation('trans')

  const tc = useCallback((key: string, props: TcProps = {}) => {
    return (
      <Trans i18nKey={key} t={t} values={props.valeu} components={props.components} />
    )
  }, [t])

  const locale = useMemo(() => i18n.language, [i18n.language])

  const changeLocale = useCallback((lang: 'en' | 'zh') => {
    i18n.changeLanguage(lang)
    I18nLocalCache.setI18nLng(lang)
  }, [i18n])

  return {
    i18n,
    t,
    tCommon,
    tRoot,
    tc,
    locale,
    changeLocale
  }
}
