export function inspectionStatusLabel(
  value: string | number | null,
  language: 'en' | 'fa',
): string {
  if (value === null) return language === 'fa' ? 'نامشخص' : 'Unknown'
  if (typeof value === 'number') {
    switch (value) {
      case 1:
        value = 'Pending action'
        break
      case 2:
        value = 'Pending approval'
        break
      case 3:
        value = 'Approved'
        break
      default:
        return language === 'fa' ? 'نامشخص' : 'Unknown'
    }
  }
  switch (value.trim().toLowerCase()) {
    case 'pending action':
      return language === 'fa' ? 'در انتظار اقدام' : 'Pending action'
    case 'pending approval':
      return language === 'fa' ? 'در انتظار تأیید' : 'Pending approval'
    case 'approved':
      return language === 'fa' ? 'تأییدشده' : 'Approved'
    default:
      return value
  }
}
