import type { Locale } from '../lib/i18n';
import type { Translation } from '../types/Translation';
import en from './en';
import ru from './ru';

/**
 * Every Locale's strings, keyed by Locale. The single place that resolves which
 * translation table a page or the shell renders, so no caller repeats the
 * `lang === 'ru' ? ru : en` switch — adding a Locale updates this one map.
 */
export const translations: Record<Locale, Translation> = { ru, en };