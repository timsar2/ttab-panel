import type { BilingualText } from '@org/ui-forms'

export const ROUTE_TEXT = {
  routes: { en: 'Routes', fa: 'مسیرها' },
  route: { en: 'Route', fa: 'مسیر' },
  routeName: { en: 'Route name', fa: 'نام مسیر' },
  departureTime: { en: 'First-station departure', fa: 'زمان حرکت از ایستگاه اول' },
  addRoute: { en: 'Add route', fa: 'معرفی مسیر جدید' },
  editRoute: { en: 'View / edit route', fa: 'مشاهده و ویرایش' },
  map: { en: 'Show on map', fa: 'نمایش روی نقشه' },
  lines: { en: 'Lines', fa: 'خطوط' },
  stations: { en: 'Stations', fa: 'ایستگاه‌ها' },
  save: { en: 'Save route', fa: 'ذخیره مسیر' },
  loading: { en: 'Loading routes...', fa: 'در حال دریافت مسیرها...' },
  detailLoading: { en: 'Loading route details...', fa: 'در حال دریافت جزئیات مسیر...' },
  stationsLoading: { en: 'Loading ordered stations...', fa: 'در حال دریافت ایستگاه‌های مسیر...' },
  empty: { en: 'No routes found.', fa: 'مسیری پیدا نشد.' },
  denied: {
    en: 'Route access is not enabled for this company.',
    fa: 'دسترسی مسیر برای این شرکت فعال نیست.',
  },
  failed: { en: 'Unable to load routes.', fa: 'دریافت مسیرها ناموفق بود.' },
  notFound: { en: 'Route not found.', fa: 'مسیر پیدا نشد.' },
  stationsFailed: {
    en: 'Unable to load route stations.',
    fa: 'دریافت ایستگاه‌های مسیر ناموفق بود.',
  },
  saveFailed: {
    en: 'Unable to save the route. Your edits are retained.',
    fa: 'ذخیره مسیر ناموفق بود؛ تغییرات حفظ شده‌اند.',
  },
  saveUnconfirmed: {
    en: 'The server did not confirm the save. Check the route list before retrying.',
    fa: 'ذخیره در سرور تأیید نشد. پیش از تلاش دوباره فهرست مسیرها را بررسی کنید.',
  },
  retry: { en: 'Retry', fa: 'تلاش دوباره' },
  back: { en: 'Back to routes', fa: 'بازگشت به مسیرها' },
  actions: { en: 'Route actions', fa: 'عملیات مسیر' },
  menu: { en: 'Open route menu', fa: 'باز کردن منوی مسیر' },
  noStations: {
    en: 'This route has no stations with map coordinates.',
    fa: 'برای این مسیر ایستگاهی با مختصات نقشه وجود ندارد.',
  },
  missingMapKey: {
    en: 'Neshan Web Map key is not configured. The existing legacy key is scoped to routing services, not map tiles.',
    fa: 'کلید نقشه وب نشان تنظیم نشده است. کلید قدیمی فقط برای سرویس مسیریابی است، نه کاشی‌های نقشه.',
  },
  mapOrderNote: {
    en: 'Stations are numbered in stored order; no road route geometry is stored for Routes.',
    fa: 'ایستگاه‌ها به ترتیب ثبت‌شده شماره‌گذاری شده‌اند؛ هندسه راه برای مسیر ذخیره نشده است.',
  },
  linePending: {
    en: 'Line management is a separate feature and is not mounted yet.',
    fa: 'مدیریت خطوط قابلیت جداگانه‌ای است و هنوز نصب نشده است.',
  },
  routeId: { en: 'Route ID', fa: 'شناسه مسیر' },
  stationName: { en: 'Station', fa: 'ایستگاه' },
  order: { en: 'Order', fa: 'ترتیب' },
} satisfies Record<string, BilingualText>

export type RouteTextKey = keyof typeof ROUTE_TEXT

export function routeText(language: 'en' | 'fa', key: RouteTextKey): string {
  return ROUTE_TEXT[key][language]
}
