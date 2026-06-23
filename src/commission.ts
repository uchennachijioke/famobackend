// Single source of truth for the platform's commission split. The rider's net
// is computed here and persisted onto the delivery row at the moment it is
// marked `delivered`, so both the rider app and the admin dashboard read the
// same authoritative number instead of each recomputing price * 0.9.

/** Share of each delivery fare the platform retains as commission. */
export const APP_COMMISSION_RATE = 0.1;

/**
 * Rider's net earning from a fare after the platform commission, rounded to
 * whole currency units. Returns null when the price is missing/invalid so the
 * caller can leave the stored net null rather than writing a bogus 0.
 */
export function riderNetAmount(price: number | null | undefined): number | null {
  if (price == null || Number.isNaN(Number(price))) return null;
  return Math.round(Number(price) * (1 - APP_COMMISSION_RATE));
}
