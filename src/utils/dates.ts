const pad = (n: number) => String(n).padStart(2, '0');

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function formatDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / MINUTE));
  const d = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m} min`;
}

export function formatMoney(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Período de vigência fixo de uma avença: do dia 1 às 23:59:59 do último dia do mês. */
export function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month, 1, 0, 0, 0, 0), end: new Date(year, month + 1, 0, 23, 59, 59, 999) };
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** "HH:MM" -> minutos desde a meia-noite */
export function parseHHMM(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

export function isValidHHMM(s: string): boolean {
  return !Number.isNaN(parseHHMM(s));
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export interface OpeningHours {
  open24h: boolean;
  openTime: string;
  closeTime: string;
}

export function isWithinOpeningHours(d: Date, h: OpeningHours): boolean {
  if (h.open24h) return true;
  const open = parseHHMM(h.openTime);
  const close = parseHHMM(h.closeTime);
  const m = minutesOfDay(d);
  if (open <= close) return m >= open && m <= close;
  // horário que atravessa a meia-noite (ex.: 18:00 - 02:00)
  return m >= open || m <= close;
}

export function openingHoursLabel(h: OpeningHours): string {
  return h.open24h ? 'Aberto 24h/24h' : `${h.openTime} - ${h.closeTime}`;
}
