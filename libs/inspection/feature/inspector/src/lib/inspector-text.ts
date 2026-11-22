import type { AutocompleteLanguage } from '@org/ui-forms'
import type { InspectionCheck } from '@org/transport-inspection-data-access'

export type InspectorTextKey =
  | 'title'
  | 'createIntro'
  | 'visitDetails'
  | 'visitDetailsIntro'
  | 'checksIntro'
  | 'back'
  | 'loading'
  | 'retry'
  | 'denied'
  | 'selectCompany'
  | 'searchDrivers'
  | 'find'
  | 'driver'
  | 'vehicle'
  | 'driverPlaceholder'
  | 'vehiclePlaceholder'
  | 'vehiclePages'
  | 'previousPage'
  | 'nextPage'
  | 'noDrivers'
  | 'noVehicles'
  | 'lookupError'
  | 'inspectionDate'
  | 'description'
  | 'status'
  | 'checks'
  | 'trueValue'
  | 'falseValue'
  | 'yesValue'
  | 'noValue'
  | 'satisfactoryValue'
  | 'needsAttentionValue'
  | 'submit'
  | 'saving'
  | 'required'
  | 'driverRequired'
  | 'vehicleRequired'
  | 'inspectionDateInvalid'
  | 'dueDateInvalid'
  | 'actionRequired'
  | 'actionLimit'
  | 'checkRequired'
  | 'dateRequired'
  | 'descriptionRequired'
  | 'descriptionLimit'
  | 'saveError'
  | 'uncertainSave'
  | 'detailTitle'
  | 'notFound'
  | 'detailError'
  | 'defects'
  | 'correctiveActions'
  | 'dueDate'
  | 'completedAt'
  | 'requiredAction'
  | 'recordRequiredAction'
  | 'approve'
  | 'closeRequest'
  | 'approved'
  | 'approvalError'
  | 'actionError'
  | 'actionSaved'
  | 'noItems'
  | 'noCorrectiveActions'
  | InspectionCheck

const text = {
  en: {
    title: 'Register inspection',
    createIntro: 'Record the vehicle, operator, and inspection findings in one visit.',
    visitDetails: 'Visit details',
    visitDetailsIntro: 'Choose the driver and vehicle, then add the inspection date and notes.',
    checksIntro: 'Mark each item based on its condition or presence.',
    back: 'Inspection workspace',
    loading: 'Loading…',
    retry: 'Retry',
    denied: 'Inspector role is required.',
    selectCompany: 'Your account must be assigned to a company before creating inspections.',
    searchDrivers: 'Find a driver',
    find: 'Search',
    driver: 'Driver',
    vehicle: 'Vehicle',
    driverPlaceholder: 'Select a driver',
    vehiclePlaceholder: 'Select a vehicle',
    vehiclePages: 'Vehicle pages',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    noDrivers: 'No drivers are available for this company.',
    noVehicles: 'No vehicles are available for this company.',
    lookupError: 'Driver and vehicle choices could not be loaded.',
    inspectionDate: 'Inspection date',
    description: 'Description',
    status: 'Review status',
    checks: 'Inspection checks',
    trueValue: 'Yes',
    falseValue: 'No',
    yesValue: 'Yes',
    noValue: 'No',
    satisfactoryValue: 'Satisfactory',
    needsAttentionValue: 'Needs attention',
    submit: 'Register visit',
    saving: 'Registering…',
    required: 'Choose a driver and vehicle, enter a date and description, and answer every check.',
    driverRequired: 'Choose a valid driver.',
    vehicleRequired: 'Choose a valid vehicle.',
    inspectionDateInvalid: 'Enter a valid inspection date.',
    dueDateInvalid: 'Enter a valid due date.',
    actionRequired: 'Enter a required action description.',
    actionLimit: 'Required action description is limited to 300 characters.',
    checkRequired: 'Choose an answer for this inspection item.',
    dateRequired: 'Enter a valid due date.',
    descriptionRequired: 'Enter a description for the required action.',
    descriptionLimit: 'Description is limited to 1000 characters.',
    saveError: 'The visit could not be registered.',
    uncertainSave: 'The result was not confirmed. Check visit details before trying again.',
    detailTitle: 'Inspection result',
    notFound: 'This visit is not available to your Inspector account.',
    detailError: 'Could not load the inspection result.',
    defects: 'Required actions',
    correctiveActions: 'Completed corrective actions',
    dueDate: 'Due date',
    completedAt: 'Completed at',
    requiredAction: 'Required action description',
    recordRequiredAction: 'Record required action',
    approve: 'Approve and close inspection',
    closeRequest: 'Close Request',
    approved: 'Inspection approved and closed.',
    approvalError: 'The inspection could not be approved. Refresh and try again.',
    actionError: 'The required action could not be saved.',
    actionSaved: 'Required action saved.',
    noItems: 'None recorded.',
    noCorrectiveActions: 'No corrective actions are recorded.',
    tiresCondition: 'Tires condition',
    lightsCondition: 'Lights condition',
    seatsCondition: 'Seats condition',
    hasSeatBelt: 'Seat belt present',
    heaterCondition: 'Heater condition',
    airConditionerCondition: 'Air conditioner condition',
    hasFirstAidKit: 'First aid kit present',
    hasFireExtinguisher: 'Fire extinguisher present',
    hasTurnSignals: 'Turn signals',
    wipersCondition: 'Wipers condition',
    windowsCondition: 'Windows condition',
    hasSafetyVestAndWarningTriangle: 'Safety vest and warning triangle present',
  },
  fa: {
    title: 'ثبت بازرسی',
    createIntro: 'مشخصات خودرو و راننده را همراه با نتیجه بررسی در یک بازدید ثبت کنید.',
    visitDetails: 'جزئیات بازدید',
    visitDetailsIntro: 'راننده و خودرو را انتخاب کنید و تاریخ و توضیحات بازرسی را وارد کنید.',
    checksIntro: 'وضعیت یا وجود هر مورد را مشخص کنید.',
    back: 'فضای بازرسی',
    loading: 'در حال بارگذاری…',
    retry: 'تلاش دوباره',
    denied: 'دسترسی به نقش بازرس نیاز دارد.',
    selectCompany: 'برای ثبت بازرسی، حساب شما باید به یک شرکت متصل باشد.',
    searchDrivers: 'یافتن راننده',
    find: 'جستجو',
    driver: 'راننده',
    vehicle: 'وسیله نقلیه',
    driverPlaceholder: 'انتخاب راننده',
    vehiclePlaceholder: 'انتخاب وسیله نقلیه',
    vehiclePages: 'صفحه‌های خودروها',
    previousPage: 'صفحه قبل',
    nextPage: 'صفحه بعد',
    noDrivers: 'راننده‌ای برای این شرکت موجود نیست.',
    noVehicles: 'وسیله نقلیه‌ای برای این شرکت موجود نیست.',
    lookupError: 'بارگذاری گزینه‌های راننده و خودرو ناموفق بود.',
    inspectionDate: 'تاریخ بازرسی',
    description: 'توضیحات',
    status: 'وضعیت بررسی',
    checks: 'موارد بازرسی',
    trueValue: 'بله',
    falseValue: 'خیر',
    yesValue: 'بله',
    noValue: 'خیر',
    satisfactoryValue: 'مطلوب',
    needsAttentionValue: 'نیازمند رسیدگی',
    submit: 'ثبت بازدید',
    saving: 'در حال ثبت…',
    required: 'راننده، خودرو، تاریخ، توضیحات و پاسخ همه موارد را وارد کنید.',
    driverRequired: 'یک راننده معتبر انتخاب کنید.',
    vehicleRequired: 'یک وسیله نقلیه معتبر انتخاب کنید.',
    inspectionDateInvalid: 'تاریخ بازرسی معتبری وارد کنید.',
    dueDateInvalid: 'مهلت معتبری وارد کنید.',
    actionRequired: 'شرح اقدام لازم را وارد کنید.',
    actionLimit: 'شرح اقدام لازم حداکثر ۳۰۰ نویسه است.',
    checkRequired: 'برای این مورد بازرسی یک پاسخ انتخاب کنید.',
    dateRequired: 'مهلت معتبری وارد کنید.',
    descriptionRequired: 'شرح اقدام لازم را وارد کنید.',
    descriptionLimit: 'توضیحات حداکثر ۱۰۰۰ نویسه است.',
    saveError: 'ثبت بازدید ناموفق بود.',
    uncertainSave: 'نتیجه ثبت تأیید نشد. پیش از تلاش دوباره، جزئیات بازدید را بررسی کنید.',
    detailTitle: 'نتیجه بازرسی',
    notFound: 'این بازدید برای حساب بازرس شما قابل مشاهده نیست.',
    detailError: 'بارگذاری نتیجه بازرسی ناموفق بود.',
    defects: 'اقدامات موردنیاز',
    correctiveActions: 'اقدامات اصلاحی انجام‌شده',
    dueDate: 'مهلت انجام',
    completedAt: 'تاریخ انجام',
    requiredAction: 'شرح اقدام لازم',
    recordRequiredAction: 'ثبت اقدام لازم',
    approve: 'تأیید و اختتام بازرسی',
    closeRequest: 'اختتام درخواست',
    approved: 'بازرسی تأیید و مختومه شد.',
    approvalError: 'تأیید بازرسی ناموفق بود. صفحه را تازه‌سازی و دوباره تلاش کنید.',
    actionError: 'ذخیره اقدام لازم ناموفق بود.',
    actionSaved: 'اقدام لازم ثبت شد.',
    noItems: 'موردی ثبت نشده است.',
    noCorrectiveActions: 'اقدام اصلاحی ثبت نشده است.',
    tiresCondition: 'وضعیت لاستیک‌ها',
    lightsCondition: 'وضعیت چراغ‌ها',
    seatsCondition: 'وضعیت صندلی‌ها',
    hasSeatBelt: 'وجود کمربند ایمنی',
    heaterCondition: 'وضعیت بخاری',
    airConditionerCondition: 'وضعیت کولر',
    hasFirstAidKit: 'وجود جعبه کمک‌های اولیه',
    hasFireExtinguisher: 'وجود کپسول آتش‌نشانی',
    hasTurnSignals: 'راهنماها',
    wipersCondition: 'وضعیت برف‌پاک‌کن',
    windowsCondition: 'وضعیت شیشه‌ها',
    hasSafetyVestAndWarningTriangle: 'وجود جلیقه و مثلث هشدار',
  },
} satisfies Record<AutocompleteLanguage, Record<InspectorTextKey, string>>

export function inspectorText(language: AutocompleteLanguage, key: InspectorTextKey): string {
  return text[language][key]
}
