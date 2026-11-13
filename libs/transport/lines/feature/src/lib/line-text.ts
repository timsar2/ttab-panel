import type { BilingualText } from '@org/ui-forms'

export const LINE_TEXT = {
  lines: { en: 'Lines', fa: 'خطوط' },
  line: { en: 'Line', fa: 'خط' },
  name: { en: 'Line name', fa: 'نام خط' },
  route: { en: 'Route', fa: 'مسیر' },
  outbound: { en: 'Outbound service time', fa: 'نوبت رفت با سرویس' },
  return: { en: 'Return service time', fa: 'نوبت برگشت با سرویس' },
  add: { en: 'Add Line', fa: 'افزودن خط' },
  edit: { en: 'View / edit Line', fa: 'مشاهده و ویرایش خط' },
  save: { en: 'Save Line', fa: 'ذخیره خط' },
  loading: { en: 'Loading Lines...', fa: 'در حال دریافت خطوط...' },
  detailLoading: { en: 'Loading Line details...', fa: 'در حال دریافت جزئیات خط...' },
  choicesLoading: { en: 'Loading service-time choices...', fa: 'در حال دریافت گزینه‌های سرویس...' },
  empty: { en: 'No Lines found for this Route.', fa: 'خطی برای این مسیر پیدا نشد.' },
  denied: {
    en: 'Line access is not approved for this Route and company.',
    fa: 'دسترسی خط برای این مسیر و شرکت تأیید نشده است.',
  },
  failed: { en: 'Unable to load Lines.', fa: 'دریافت خطوط ناموفق بود.' },
  choicesFailed: {
    en: 'Unable to load service-time choices.',
    fa: 'دریافت گزینه‌های زمان سرویس ناموفق بود.',
  },
  saveFailed: {
    en: 'Unable to save the Line. Your edits were retained.',
    fa: 'ذخیره خط ناموفق بود؛ تغییرات حفظ شده‌اند.',
  },
  saveUnconfirmed: {
    en: 'The server did not confirm the save. Check the Line list before retrying.',
    fa: 'ذخیره در سرور تأیید نشد. پیش از تلاش دوباره فهرست خطوط را بررسی کنید.',
  },
  notFound: { en: 'Line not found.', fa: 'خط پیدا نشد.' },
  retry: { en: 'Retry', fa: 'تلاش دوباره' },
  back: { en: 'Back to Lines', fa: 'بازگشت به خطوط' },
  actions: { en: 'Line actions', fa: 'عملیات خط' },
  directionMismatch: {
    en: 'This Line belongs to a different Route.',
    fa: 'این خط به مسیر دیگری تعلق دارد.',
  },
} satisfies Record<string, BilingualText>

export type LineTextKey = keyof typeof LINE_TEXT

export function lineText(language: 'en' | 'fa', key: LineTextKey) {
  return LINE_TEXT[key][language]
}
