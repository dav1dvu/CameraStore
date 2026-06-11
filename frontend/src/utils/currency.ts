/**
 * Formats a number or numeric string to Vietnamese Dong (VNĐ) currency format.
 * Example: 5500000 -> "5.500.000₫"
 */
export function formatVND(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '0₫';
  const numericVal = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numericVal)) return '0₫';
  
  // Format with dot separator and ₫ suffix
  return new Intl.NumberFormat('vi-VN').format(numericVal) + '₫';
}
