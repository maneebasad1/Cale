const DECIMAL_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

/**
 * Parses a user-typed decimal number, accepting either a dot or a comma as
 * the decimal separator ("70.5" and "70,5" both give 70.5). Returns NaN for
 * empty or malformed input instead of silently truncating like parseFloat.
 */
export function parseDecimal(input: string): number {
  const normalized = input.trim().replace(',', '.');
  if (!DECIMAL_PATTERN.test(normalized)) {
    return NaN;
  }
  return Number(normalized);
}
