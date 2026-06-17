import { create } from 'zustand';
import { vi, TranslationKey } from '../i18n/translations';

interface LanguageStore {
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageStore>(() => ({
  t: (key) => vi[key] ?? key,
}));
