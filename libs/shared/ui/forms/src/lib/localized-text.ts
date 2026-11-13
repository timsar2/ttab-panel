export type AutocompleteLanguage = 'en' | 'fa'

export interface BilingualText {
  readonly en: string
  readonly fa: string
}

export function textForLanguage(text: BilingualText, language: AutocompleteLanguage): string {
  return text[language]
}
