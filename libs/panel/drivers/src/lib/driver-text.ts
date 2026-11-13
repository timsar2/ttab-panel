import type { AutocompleteLanguage, BilingualText } from '@org/ui-forms'

const pair = (en: string, fa: string): BilingualText => ({ en, fa })

export const DRIVER_TEXT = {
  drivers: pair('Drivers', 'رانندگان'),
  peopleAndTransport: pair('People & transport', 'اشخاص و حمل‌ونقل'),
  driverListDescription: pair(
    'Identity, licence and document records for this company.',
    'اطلاعات هویتی، گواهینامه و مدارک رانندگان این شرکت.',
  ),
  driverNameOrNationalId: pair('Driver name or national ID', 'نام یا کد ملی راننده'),
  driverSearchHint: pair('Enter at least 2 characters', 'حداقل ۲ نویسه وارد کنید'),
  clearDriverSearch: pair('Clear driver search', 'پاک کردن جستجوی راننده'),
  searching: pair('Searching...', 'در حال جستجو...'),
  minimumSearch: pair(
    'Enter at least 2 characters to search.',
    'برای جستجو حداقل ۲ نویسه وارد کنید.',
  ),
  noMatchingDrivers: pair('No matching drivers found.', 'راننده‌ای با این مشخصات پیدا نشد.'),
  addDriver: pair('Add driver', 'افزودن راننده'),
  editDriver: pair('Edit driver', 'ویرایش راننده'),
  driverOnboarding: pair('Driver onboarding', 'ثبت راننده'),
  driverRecord: pair('Driver record', 'پرونده راننده'),
  backToDrivers: pair('Back to drivers', 'بازگشت به فهرست رانندگان'),
  viewDetails: pair('View details', 'مشاهده جزئیات'),
  actions: pair('Actions', 'عملیات'),
  driver: pair('Driver', 'راننده'),
  person: pair('Person', 'شخص'),
  nationalCardFront: pair('National card front', 'روی کارت ملی'),
  nationalCardBack: pair('National card back', 'پشت کارت ملی'),
  drivingLicence: pair('Driving licence', 'گواهینامه رانندگی'),
  driverSmartCard: pair('Driver smart card', 'کارت هوشمند راننده'),
  currentNationalCardFront: pair('Current National card front', 'تصویر فعلی روی کارت ملی'),
  currentNationalCardBack: pair('Current National card back', 'تصویر فعلی پشت کارت ملی'),
  currentDrivingLicence: pair('Current driving licence', 'تصویر فعلی گواهینامه رانندگی'),
  currentDriverSmartCard: pair('Current driver smart card', 'تصویر فعلی کارت هوشمند راننده'),
  nationalId: pair('National ID', 'کد ملی'),
  mobile: pair('Mobile', 'تلفن همراه'),
  licenceServerLabel: pair('Licence (server label)', 'گواهینامه (عنوان سرور)'),
  loadingRecords: pair('Loading records...', 'در حال بارگذاری اطلاعات...'),
  noRecords: pair('No records found.', 'اطلاعاتی پیدا نشد.'),
  unableLoadRecords: pair('Unable to load records', 'بارگذاری اطلاعات ناموفق بود'),
  retry: pair('Retry', 'تلاش دوباره'),
  tablePages: pair('Table pages', 'صفحه‌های جدول'),
  page: pair('Page', 'صفحه'),
  previous: pair('Previous', 'قبلی'),
  next: pair('Next', 'بعدی'),
  invalidDriverUrl: pair('Invalid driver URL.', 'نشانی راننده معتبر نیست.'),
  accessManageDenied: pair(
    'Driver management requires an Admin or Manager role and an authorized company context.',
    'مدیریت رانندگان به نقش مدیر سامانه یا مدیر شرکت و دسترسی به شرکت نیاز دارد.',
  ),
  accessDriverDenied: pair(
    'You do not have access to this driver.',
    'شما به اطلاعات این راننده دسترسی ندارید.',
  ),
  loadingDriverDetails: pair('Loading driver details...', 'در حال بارگذاری جزئیات راننده...'),
  driverNotFound: pair('Driver not found.', 'راننده پیدا نشد.'),
  driverDetails: pair('Driver details', 'جزئیات راننده'),
  editPerson: pair('Edit person details', 'ویرایش اطلاعات شخص'),
  hidePersonEditor: pair('Hide person editor', 'بستن ویرایش اطلاعات شخص'),
  personDriverId: pair('Person / driver ID', 'شناسه شخص / راننده'),
  email: pair('Email', 'رایانامه'),
  city: pair('City', 'شهر'),
  licenceValue: pair('Licence value', 'مقدار گواهینامه'),
  selectLicence: pair('Select licence value', 'مقدار گواهینامه را انتخاب کنید'),
  address: pair('Address', 'نشانی'),
  documents: pair('Documents', 'مدارک'),
  storedDocumentsNote: pair(
    'Stored documents do not indicate approval, qualification or expiry status.',
    'وجود مدرک به معنی تأیید صلاحیت یا مشخص بودن تاریخ انقضا نیست.',
  ),
  noDocument: pair('No document on record.', 'مدرکی ثبت نشده است.'),
  addDriverTitle: pair('Add driver', 'افزودن راننده'),
  editDriverTitle: pair('Edit driver', 'ویرایش راننده'),
  discardUnsaved: pair('Discard unsaved changes?', 'تغییرات ذخیره‌نشده کنار گذاشته شود؟'),
  saveInProgress: pair(
    'A save is in progress. Stay here until it completes.',
    'ذخیره‌سازی در حال انجام است. تا پایان آن در این صفحه بمانید.',
  ),
  discardChangesDescription: pair(
    'Unsaved person and driver changes will be lost.',
    'تغییرات ذخیره‌نشده شخص و راننده از بین می‌رود.',
  ),
  discardChanges: pair('Discard changes', 'کنار گذاشتن تغییرات'),
  keepEditing: pair('Keep editing', 'ادامه ویرایش'),
  loadingDriver: pair('Loading driver details...', 'در حال بارگذاری جزئیات راننده...'),
  loadingPerson: pair('Loading person details...', 'در حال بارگذاری اطلاعات شخص...'),
  retryDriverCheck: pair('Retry driver check', 'بررسی دوباره راننده'),
  onboardingProgress: pair('Onboarding progress', 'مراحل ثبت راننده'),
  selectPersistedPerson: pair('Select a saved person', 'انتخاب شخص ثبت‌شده'),
  licenceAndDocuments: pair('Licence & documents', 'گواهینامه و مدارک'),
  startWithPerson: pair('Start with a person', 'ابتدا شخص را انتخاب کنید'),
  selectExistingCompanyPerson: pair(
    'Select an existing person in this company. A national ID alone is not a saved identity.',
    'شخص ثبت‌شده در این شرکت را انتخاب کنید. کد ملی به‌تنهایی هویت ثبت‌شده محسوب نمی‌شود.',
  ),
  personNameOrNationalId: pair('Person name or national ID', 'نام شخص یا کد ملی'),
  clearPersonSearch: pair('Clear person search', 'پاک کردن جستجوی اشخاص'),
  noMatchingPeople: pair('No matching people found.', 'شخصی با این مشخصات پیدا نشد.'),
  findPerson: pair('Find person', 'جستجوی شخص'),
  existingPeople: pair('Existing people', 'اشخاص ثبت‌شده'),
  selectPerson: pair('Select person', 'انتخاب شخص'),
  peopleAccessDenied: pair('People access is not approved.', 'دسترسی به اشخاص تأیید نشده است.'),
  hideRegistration: pair('Hide registration', 'بستن فرم ثبت شخص'),
  registerNewPerson: pair('Register a new person', 'ثبت شخص جدید'),
  registerPerson: pair('Register person', 'ثبت شخص'),
  personSaveFailed: pair('Person could not be saved', 'ذخیره اطلاعات شخص ناموفق بود'),
  persistedPersonMissing: pair(
    'The server did not confirm a saved person. Check the people list before trying again. Driver saving is unavailable.',
    'سرور ثبت شخص را تأیید نکرد. پیش از تلاش دوباره فهرست اشخاص را بررسی کنید. ذخیره راننده غیرفعال است.',
  ),
  checkExistingDriver: pair(
    'Checking existing driver information...',
    'در حال بررسی اطلاعات راننده...',
  ),
  existingDriverDenied: pair(
    'Existing driver information could not be authorized. Driver saving is unavailable.',
    'دسترسی به اطلاعات راننده موجود تأیید نشد. ذخیره راننده غیرفعال است.',
  ),
  chooseAnotherPerson: pair('Choose another person', 'انتخاب شخص دیگر'),
  existingDriverNotice: pair(
    'This person already has a driver record. Existing licence and documents are loaded; saving updates that record.',
    'این شخص از قبل پرونده رانندگی دارد. گواهینامه و مدارک فعلی بارگذاری شده‌اند و ذخیره، همان پرونده را به‌روزرسانی می‌کند.',
  ),
  persistedPerson: pair('Saved person', 'شخص ثبت‌شده'),
  personIdNationalId: pair(
    'Person ID {id} | National ID {nationalId}',
    'شناسه شخص {id} | کد ملی {nationalId}',
  ),
  personSaved: pair('Person details saved.', 'اطلاعات شخص ذخیره شد.'),
  driverSaveFailed: pair('Driver could not be saved', 'ذخیره اطلاعات راننده ناموفق بود'),
  serverFieldInvalid: pair(
    'Review this field and try again.',
    'این فیلد را بررسی و دوباره تلاش کنید.',
  ),
  saveUnconfirmed: pair(
    'The server accepted the request without confirming the saved record. Verify driver details before trying again.',
    'سرور درخواست را پذیرفت اما ثبت پرونده را تأیید نکرد. پیش از تلاش دوباره جزئیات راننده را بررسی کنید.',
  ),
  driverInformation: pair('Driver information', 'اطلاعات راننده'),
  licenceStoredNote: pair(
    'Values are shown as stored. No qualification or availability is inferred.',
    'مقادیر همان‌طور که ذخیره شده‌اند نمایش داده می‌شوند و صلاحیت یا دسترس‌پذیری از آن‌ها برداشت نمی‌شود.',
  ),
  documentReplacements: pair('Document replacements', 'جایگزینی مدارک'),
  documentReplacementNote: pair(
    'Optional. Existing documents are kept unless replaced. Removal is unavailable. Maximum 160 KiB per image.',
    'اختیاری. مدارک فعلی حفظ می‌شوند مگر آنکه جایگزین شوند. حذف مدرک در دسترس نیست. حداکثر اندازه هر تصویر ۱۶۰ کیلوبایت است.',
  ),
  currentDocument: pair('Current document', 'مدرک فعلی'),
  savingDriver: pair('Saving driver...', 'در حال ذخیره راننده...'),
  saveDriver: pair('Save driver', 'ذخیره راننده'),
  roleAssignmentNote: pair(
    'Saving may assign the linked account the Driver role.',
    'با ذخیره، ممکن است نقش راننده به حساب پیوندخورده اختصاص داده شود.',
  ),
  savePersonFirst: pair(
    'Save person changes first, or discard them before saving the driver.',
    'پیش از ذخیره راننده، تغییرات شخص را ذخیره یا کنار بگذارید.',
  ),
  discardPersonChanges: pair('Discard person changes', 'کنار گذاشتن تغییرات شخص'),
  selectLicenceRequired: pair('Choose a licence value.', 'مقدار گواهینامه را انتخاب کنید.'),
  selectLicenceKnown: pair(
    'Choose licence value 1 or 2.',
    'مقدار گواهینامه ۱ یا ۲ را انتخاب کنید.',
  ),
  saveFailedGeneric: pair(
    'Driver save failed. Review the form and try again.',
    'ذخیره راننده ناموفق بود. فرم را بررسی و دوباره تلاش کنید.',
  ),
  detailFailedGeneric: pair(
    'Driver details could not be loaded.',
    'بارگذاری جزئیات راننده ناموفق بود.',
  ),
  personFailedGeneric: pair('Person details could not be saved.', 'ذخیره اطلاعات شخص ناموفق بود.'),
  imageFailedGeneric: pair('Select a valid image file.', 'یک فایل تصویر معتبر انتخاب کنید.'),
  imagePrepareFailed: pair(
    'Unable to prepare driver documents.',
    'آماده‌سازی مدارک راننده ناموفق بود.',
  ),
  imageSizeExceeded: pair(
    'The combined images exceed the 1 MiB request limit. Choose smaller replacements.',
    'حجم مجموع تصاویر از سقف یک مگابایت بیشتر است. تصاویر کوچک‌تری انتخاب کنید.',
  ),
  fieldRequired: pair('This field is required.', 'تکمیل این فیلد الزامی است.'),
  mobileRequired: pair('Enter a mobile number.', 'شماره تلفن همراه را وارد کنید.'),
  mobileFormat: pair(
    'Enter an 11-digit mobile number starting with 09.',
    'شماره همراه ۱۱ رقمی که با ۰۹ شروع می‌شود وارد کنید.',
  ),
  emailFormat: pair('Enter a valid email address.', 'نشانی رایانامه معتبر وارد کنید.'),
  nationalIdRequired: pair(
    'Enter the national ID required for driver registration.',
    'کد ملی لازم برای ثبت راننده را وارد کنید.',
  ),
  tenDigitsOptional: pair(
    'Enter 10 digits, or leave this field empty.',
    '۱۰ رقم وارد کنید یا این فیلد را خالی بگذارید.',
  ),
  coordinateRemovalBlocked: pair(
    'Existing coordinates cannot be removed until the backend contract is approved.',
    'تا زمان تأیید قرارداد سرور، حذف مختصات فعلی امکان‌پذیر نیست.',
  ),
  bothCoordinates: pair('Enter both latitude and longitude.', 'طول و عرض جغرافیایی را وارد کنید.'),
  coordinateRange: pair(
    'Enter a valid coordinate within its geographic range.',
    'مختصات معتبر در محدوده جغرافیایی وارد کنید.',
  ),
  firstName: pair('First name', 'نام'),
  lastName: pair('Last name', 'نام خانوادگی'),
  mobileNumber: pair('Mobile number', 'تلفن همراه'),
  phoneNumber: pair('Phone number', 'تلفن ثابت'),
  postalCode: pair('Postal code', 'کد پستی'),
  latitude: pair('Latitude', 'عرض جغرافیایی'),
  longitude: pair('Longitude', 'طول جغرافیایی'),
  chooseOnMap: pair('Choose on map', 'انتخاب روی نقشه'),
  noCity: pair('No city selected', 'شهری انتخاب نشده است'),
  notSelected: pair('Not selected', 'انتخاب نشده'),
  cityLookupUnavailable: pair(
    'City: {city}. City changes require a configured geography lookup.',
    'شهر: {city}. برای تغییر شهر باید جستجوی جغرافیایی پیکربندی شود.',
  ),
  profileImage: pair('Profile image', 'تصویر پروفایل'),
  profileImageReplacement: pair('Profile image replacement', 'جایگزینی تصویر پروفایل'),
  currentProfileImage: pair('Current profile image', 'تصویر پروفایل فعلی'),
  currentPersonProfile: pair('Current person profile', 'پروفایل فعلی شخص'),
  profileImagePolicy: pair(
    'JPEG, PNG or WebP. Up to 160 KiB. Existing profile image is kept unless replaced.',
    'فرمت‌های JPEG، PNG یا WebP. حداکثر ۱۶۰ کیلوبایت. تصویر فعلی حفظ می‌شود مگر آنکه جایگزین شود.',
  ),
  documentImagePolicy: pair(
    'JPEG, PNG or WebP. Up to 160 KiB. Existing documents are kept unless replaced.',
    'فرمت‌های JPEG، PNG یا WebP. حداکثر ۱۶۰ کیلوبایت. مدارک فعلی حفظ می‌شوند مگر آنکه جایگزین شوند.',
  ),
  mobileReadonly: pair(
    'Mobile number is read-only on existing records.',
    'تلفن همراه در پرونده‌های موجود فقط خواندنی است.',
  ),
  registrationSideEffects: pair(
    'Registration creates a linked account and may send a welcome message. It does not assign panel permissions.',
    'ثبت، حساب پیوندخورده ایجاد می‌کند و ممکن است پیام خوشامدگویی بفرستد. این کار مجوز پنل اختصاص نمی‌دهد.',
  ),
  savePersonDetails: pair('Save person details', 'ذخیره اطلاعات شخص'),
} as const satisfies Record<string, BilingualText>

export type DriverTextKey = keyof typeof DRIVER_TEXT

export function driverText(language: AutocompleteLanguage, key: DriverTextKey): string {
  return DRIVER_TEXT[key][language]
}

export function driverTextPair(key: DriverTextKey): BilingualText {
  return DRIVER_TEXT[key]
}

export function driverFieldLabel(key: string, language: AutocompleteLanguage): string {
  const normalized = key.replace(/[^a-z]/gi, '').toLowerCase()
  const keys: Record<string, DriverTextKey> = {
    firstname: 'firstName',
    lastname: 'lastName',
    nationalid: 'nationalId',
    mobilenumber: 'mobileNumber',
    phonenumber: 'phoneNumber',
    email: 'email',
    address: 'address',
    postalcode: 'postalCode',
    cityid: 'city',
    latitude: 'latitude',
    longitude: 'longitude',
    driverlicencelevelid: 'licenceValue',
    licence: 'licenceValue',
  }
  const matched = keys[normalized]
  return matched ? driverText(language, matched) : driverText(language, 'fieldRequired')
}

export function safeDriverError(
  error: unknown,
  language: AutocompleteLanguage,
  fallback:
    'saveFailedGeneric' | 'detailFailedGeneric' | 'personFailedGeneric' | 'imagePrepareFailed',
): string {
  const message = error instanceof Error ? error.message : ''
  if (language === 'en') return message || driverText(language, fallback)
  return /[\u0600-\u06ff]/u.test(message) ? message : driverText(language, fallback)
}
