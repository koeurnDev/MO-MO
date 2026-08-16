import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBestDiscount, getDiscountedPrice } from '../discountUtils.js';
import {
  parseDeliverySetting,
  calculateDeliveryFee,
  calculateDeliveryFeeCents,
  toCents,
  formatFullAddress
} from '../deliveryUtils.js';

describe('discountUtils', () => {
  const product = { id: 5, price: 100 };

  it('picks highest percent discount', () => {
    const discounts = [
      { apply_to: 'all', discount_type: 'percent', value: 10 },
      { apply_to: 'all', discount_type: 'percent', value: 25 }
    ];
    const best = calculateBestDiscount(product, discounts);
    assert.equal(best.value, 25);
    assert.equal(getDiscountedPrice(product, best), 75);
  });

  it('applies fixed amount discount', () => {
    const best = { apply_to: 'all', discount_type: 'fixed', value: 12.5 };
    assert.equal(getDiscountedPrice(product, best), 87.5);
  });

  it('never returns negative price', () => {
    const best = { apply_to: 'all', discount_type: 'fixed', value: 999 };
    assert.equal(getDiscountedPrice(product, best), 0);
  });

  it('matches product-specific discount', () => {
    const discounts = [
      { apply_to: 'product', product_ids: [5], discount_type: 'percent', value: 15 }
    ];
    assert.equal(getDiscountedPrice(product, calculateBestDiscount(product, discounts)), 85);
  });
});

describe('deliveryUtils', () => {
  it('parses settings with fallback', () => {
    assert.equal(parseDeliverySetting('', 1.5), 1.5);
    assert.equal(parseDeliverySetting('2.25', 1.5), 2.25);
  });

  it('free delivery above threshold', () => {
    assert.equal(calculateDeliveryFee(50, 1.5, 50), 0);
    assert.equal(calculateDeliveryFeeCents(toCents(50), 1.5, 50), 0);
  });

  it('charges fee below threshold', () => {
    assert.equal(calculateDeliveryFee(10, 1.5, 50), 1.5);
    assert.equal(calculateDeliveryFeeCents(toCents(10), 1.5, 50), 150);
  });

  it('always free when fee setting is 0', () => {
    assert.equal(calculateDeliveryFee(5, 0, 50), 0);
  });

  it('returns CambodiaAddress string without stale Phnom Penh suffix', () => {
    const addr = 'dd, អូរញ្ញា, បឹងព្រីង, ថ្មគោល, បាត់ដំបង';
    assert.equal(formatFullAddress(addr, 'Phnom Penh'), addr);
  });

  it('appends legacy province when address is street only', () => {
    assert.equal(formatFullAddress('House 12A', 'Siem Reap'), 'House 12A, Siem Reap');
  });

  it('avoids duplicate province in address', () => {
    assert.equal(formatFullAddress('House 12A, Siem Reap', 'Siem Reap'), 'House 12A, Siem Reap');
  });
});
