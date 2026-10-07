const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomToken(length = 16): string {
  let s = '';
  for (let i = 0; i < length; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export const QR_PREFIX = 'PARKSMART';

/** Conteúdo do QR Code de entrada/saída de uma reserva. */
export function buildQrPayload(reservationId: string, token: string): string {
  return `${QR_PREFIX}:${reservationId}:${token}`;
}

export function parseQrPayload(data: string): { reservationId: string; token: string } | null {
  const parts = data.trim().split(':');
  if (parts.length !== 3 || parts[0] !== QR_PREFIX || !parts[1] || !parts[2]) return null;
  return { reservationId: parts[1], token: parts[2] };
}
