/** Normaliza uma matrícula: maiúsculas, sem espaços, com hífenes entre pares (AA-00-BB). */
export function normalizePlate(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length === 6) return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  return raw;
}

/** Aceita matrículas portuguesas (3 pares) ou outras com 4 a 10 caracteres alfanuméricos. */
export function isValidPlate(input: string): boolean {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length >= 4 && raw.length <= 10;
}
