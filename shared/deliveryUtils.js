/**
 * Shared delivery fee rules — single source of truth for bot + webapp.
 */
export const toCents = (val) => Math.round(Number(val || 0) * 100);
export const fromCents = (cents) => Math.round(cents) / 100;

export function parseDeliverySetting(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateDeliveryFeeCents(subtotalCents, deliveryFeeSetting, deliveryThresholdSetting) {
  const fee = parseDeliverySetting(deliveryFeeSetting, 1.5);
  const threshold = parseDeliverySetting(deliveryThresholdSetting, 50);
  if (fee <= 0) return 0;
  if (subtotalCents >= toCents(threshold)) return 0;
  return toCents(fee);
}

export function calculateDeliveryFee(subtotal, deliveryFeeSetting, deliveryThresholdSetting) {
  return fromCents(
    calculateDeliveryFeeCents(toCents(subtotal), deliveryFeeSetting, deliveryThresholdSetting)
  );
}

const STALE_DEFAULT_PROVINCES = new Set(['phnom penh', 'ភ្នំពេញ']);

/**
 * Build a single display address from structured CambodiaAddress + legacy province field.
 * CambodiaAddress already stores province at the end of `address`; avoid duplicating it.
 */
export function formatFullAddress(address, province) {
  const addr = (address || '').trim();
  const prov = (province || '').trim();
  if (!addr) return prov;
  if (!prov) return addr;

  const addrLower = addr.toLowerCase();
  const provLower = prov.toLowerCase();

  if (STALE_DEFAULT_PROVINCES.has(provLower) && addr.includes(',')) {
    return addr;
  }

  if (addrLower.endsWith(provLower) || addrLower.includes(`, ${provLower}`)) {
    return addr;
  }

  return `${addr}, ${prov}`;
}
