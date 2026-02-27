export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function monthName(month: number): string {
  return MONTH_OPTIONS[month - 1]?.label ?? '';
}

/** Check if a month (1-12) falls within a start→end range, handling year wrap. */
export function isMonthInRange(month: number, start: number, end: number): boolean {
  if (start <= end) {
    // Normal range: e.g. Mar(3)→Aug(8)
    return month >= start && month <= end;
  }
  // Wrap-around: e.g. Nov(11)→Feb(2)
  return month >= start || month <= end;
}

/** Check if startMonth is within the next `windowSize` months from currentMonth. */
export function isMonthUpcoming(currentMonth: number, startMonth: number, windowSize = 2): boolean {
  for (let i = 1; i <= windowSize; i++) {
    const futureMonth = ((currentMonth - 1 + i) % 12) + 1;
    if (futureMonth === startMonth) return true;
  }
  return false;
}
