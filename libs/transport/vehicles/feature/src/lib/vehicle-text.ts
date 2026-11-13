import type { BilingualText } from '@org/ui-forms'

export const VEHICLE_TEXT = {
  vehicles: { en: 'Vehicles', fa: 'خودروها' },
  vehicle: { en: 'Vehicle', fa: 'خودرو' },
  createVehicle: { en: 'Add vehicle', fa: 'افزودن خودرو' },
  createCar: { en: 'Create vehicle', fa: 'ثبت خودرو' },
  updateCar: { en: 'Save changes', fa: 'ذخیره تغییرات' },
  editCar: { en: 'Edit vehicle', fa: 'ویرایش خودرو' },
  deleteCar: { en: 'Delete vehicle', fa: 'حذف خودرو' },
  noVehicles: { en: 'No vehicles found.', fa: 'خودرویی پیدا نشد.' },
  loading: { en: 'Loading vehicles...', fa: 'در حال بارگذاری خودروها...' },
  detailLoading: { en: 'Loading vehicle details...', fa: 'در حال بارگذاری جزئیات خودرو...' },
  denied: {
    en: 'Vehicle access is not approved for this company.',
    fa: 'دسترسی خودرو برای این شرکت تأیید نشده است.',
  },
  loadFailed: { en: 'Unable to load vehicle data.', fa: 'بارگذاری اطلاعات خودرو ناموفق بود.' },
  retry: { en: 'Retry', fa: 'تلاش دوباره' },
  back: { en: 'Back to vehicles', fa: 'بازگشت به خودروها' },
  driver: { en: 'Driver', fa: 'راننده' },
  driverSearch: { en: 'Search by driver name or national ID', fa: 'جستجو با نام یا کد ملی راننده' },
  driverPlaceholder: { en: 'Type at least 2 characters', fa: 'حداقل ۲ نویسه وارد کنید' },
  clearSearch: { en: 'Clear search', fa: 'پاک کردن جستجو' },
  searching: { en: 'Searching drivers...', fa: 'در حال جستجوی رانندگان...' },
  minSearch: { en: 'Enter at least 2 characters.', fa: 'حداقل ۲ نویسه وارد کنید.' },
  noDrivers: { en: 'No matching drivers.', fa: 'راننده‌ای پیدا نشد.' },
  vehicleType: { en: 'Car type', fa: 'نوع خودرو' },
  addType: { en: 'Add car type', fa: 'افزودن نوع خودرو' },
  model: { en: 'Model', fa: 'مدل' },
  typeGroupId: { en: 'Car type group ID (optional)', fa: 'شناسه گروه نوع خودرو (اختیاری)' },
  saveType: { en: 'Save type', fa: 'ذخیره نوع' },
  carPlate: { en: 'Plate', fa: 'پلاک' },
  color: { en: 'Color', fa: 'رنگ' },
  produnctionYear: { en: 'Production year', fa: 'سال تولید' },
  capacity: { en: 'Capacity', fa: 'ظرفیت' },
  carImage: { en: 'Vehicle photo', fa: 'تصویر خودرو' },
  carSmartCardImage: { en: 'Smart-card image', fa: 'تصویر کارت هوشمند' },
  carInsuranceImage: { en: 'Insurance image', fa: 'تصویر بیمه‌نامه' },
  carCardImage: { en: 'Vehicle-card image', fa: 'تصویر کارت خودرو' },
  photoPolicy: {
    en: 'JPEG, PNG, or WebP, maximum 160 KiB per file.',
    fa: 'فرمت JPEG، PNG یا WebP، حداکثر ۱۶۰ کیلوبایت برای هر فایل.',
  },
  saveFailed: {
    en: 'Unable to save the vehicle. Your changes remain in the form.',
    fa: 'ذخیره خودرو ناموفق بود؛ تغییرات فرم حفظ شده‌اند.',
  },
  saveUnconfirmed: {
    en: 'The server did not confirm the save. Do not retry until you check the vehicle list.',
    fa: 'سرور ذخیره را تأیید نکرد. پیش از تلاش دوباره، فهرست خودروها را بررسی کنید.',
  },
  typeFailed: {
    en: 'Unable to save or reload car types.',
    fa: 'ذخیره یا بارگذاری انواع خودرو ناموفق بود.',
  },
  typeCreated: {
    en: 'Car type saved and choices refreshed.',
    fa: 'نوع خودرو ذخیره و گزینه‌ها به‌روزرسانی شد.',
  },
  discardTitle: { en: 'Discard vehicle changes?', fa: 'تغییرات خودرو کنار گذاشته شود؟' },
  discardDescription: {
    en: 'Unsaved vehicle and image changes will be lost.',
    fa: 'تغییرات ذخیره‌نشده خودرو و تصاویر از بین می‌روند.',
  },
  discard: { en: 'Discard changes', fa: 'صرف‌نظر از تغییرات' },
  keepEditing: { en: 'Keep editing', fa: 'ادامه ویرایش' },
  deleteTitle: { en: 'Delete vehicle?', fa: 'خودرو حذف شود؟' },
  deleteDescription: {
    en: 'This permanently removes the vehicle record. Continue only if your organization has approved deletion and history-retention behavior.',
    fa: 'این کار رکورد خودرو را حذف می‌کند. فقط در صورت تأیید سیاست حذف و نگهداری سوابق ادامه دهید.',
  },
  deleteFailed: { en: 'Unable to delete the vehicle.', fa: 'حذف خودرو ناموفق بود.' },
  notFound: { en: 'Vehicle not found.', fa: 'خودرو پیدا نشد.' },
  search: { en: 'Search vehicles', fa: 'جستجوی خودروها' },
  person: { en: 'Driver', fa: 'راننده' },
  vehicleDetails: { en: 'Vehicle details', fa: 'جزئیات خودرو' },
} satisfies Record<string, BilingualText>

export type VehicleTextKey = keyof typeof VEHICLE_TEXT

export function vehicleText(language: 'en' | 'fa', key: VehicleTextKey): string {
  return VEHICLE_TEXT[key][language]
}
