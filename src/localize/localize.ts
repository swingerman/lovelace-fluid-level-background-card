import * as en from './languages/en.json';
import * as nb from './languages/nb.json';
import * as pt-BR from './languages/pt-BR.json';
import * as pt-pt from './languages/pt-pt.json';
import * as sv from './languages/sv.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languages: any = {
  en: en,
  nb: nb,
  pt-BR: pt-BR,
  pt-pt: pt-pt,
  sv: sv,
};

export function localize(string: string, search = '', replace = ''): string {
  const lang = (localStorage.getItem('selectedLanguage') || 'en').replace(/['"]+/g, '').replace('-', '_');

  let translated: string;

  try {
    translated = string.split('.').reduce((o, i) => o[i], languages[lang]);
  } catch (e) {
    translated = string.split('.').reduce((o, i) => o[i], languages['en']);
  }

  if (translated === undefined) translated = string.split('.').reduce((o, i) => o[i], languages['en']);

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
}
