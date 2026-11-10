/**
 * TOTO DRIVE — SHARED VALIDATION SCHEMAS & HELPERS
 */

export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 12 && digits.startsWith('91')) return /^91[6-9]\d{9}$/.test(digits);
  return false;
}

export function isValidUtr(utr: string): boolean {
  return /^[0-9A-Za-z]{12}$/.test(utr.trim());
}

export function isValidOtp(otp: string): boolean {
  return /^\d{4,6}$/.test(otp.trim());
}
