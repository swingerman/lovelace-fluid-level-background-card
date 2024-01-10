import * as en from './languages/en.json';
import * as nb from './languages/nb.json';
import * as ptbr from './languages/ptbr.json';
import * as ptpt from './languages/ptpt.json';
import * as sk from './languages/sk.json';
import * as sv from './languages/sv.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languages: any = {
  en: en,
  nb: nb,
  ptbr: ptbr,
  ptpt: ptpt,
  sk: sk,
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
