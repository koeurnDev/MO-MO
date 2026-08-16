import {
  parseDeliverySetting,
  calculateDeliveryFee,
  formatFullAddress
} from '@shared/deliveryUtils.js';

export { parseDeliverySetting, calculateDeliveryFee, formatFullAddress };

export function isAlwaysFreeDelivery(deliveryFeeSetting) {
  return parseDeliverySetting(deliveryFeeSetting, 1.5) <= 0;
}

export function formatDeliveryFeeLabel(appliedFee, lang = 'kh') {
  if (appliedFee <= 0) return lang === 'kh' ? 'ឥតគិតថ្លៃ' : 'Free';
  return `$${appliedFee.toFixed(2)}`;
}

export function getDeliveryRuleSummary(deliveryFeeSetting, deliveryThresholdSetting, lang = 'kh') {
  const fee = parseDeliverySetting(deliveryFeeSetting, 1.5);
  const threshold = parseDeliverySetting(deliveryThresholdSetting, 50);

  if (fee <= 0) {
    return lang === 'kh'
      ? 'ដឹកជញ្ជូនឥតគិតថ្លៃគ្រប់ order'
      : 'Free delivery on every order';
  }

  return lang === 'kh'
    ? `ថ្លៃដឹក $${fee.toFixed(2)} · ទិញ $${threshold.toFixed(0)}+ ដឹកហ្វ្រី`
    : `$${fee.toFixed(2)} delivery · Free on orders $${threshold.toFixed(0)}+`;
}
