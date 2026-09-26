const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const DATE_TIME_SHORT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  year: "numeric",
};

export function formatDate(
  date: Date | string | null | undefined,
  fallback = "N/A",
): string {
  if (!date) return fallback;
  return new Date(date).toLocaleDateString("en-US", DATE_OPTIONS);
}

export function formatDateTime(
  date: Date | string | null | undefined,
  fallback = "N/A",
): string {
  if (!date) return fallback;
  return new Date(date).toLocaleString("en-US", DATE_TIME_OPTIONS);
}

export function formatDateTimeShort(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", DATE_TIME_SHORT_OPTIONS);
}

export function formatLongDate(
  date: Date | string | null | undefined,
  fallback = "N/A",
): string {
  if (!date) return fallback;
  return new Date(date).toLocaleDateString("en-US", LONG_DATE_OPTIONS);
}

export function formatCurrency(
  amount: string | number,
  currency: string,
  options?: { showCurrencyCode?: boolean },
): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  const rendered = `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  if (options?.showCurrencyCode === false) return rendered;
  return `${rendered} ${currency}`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
