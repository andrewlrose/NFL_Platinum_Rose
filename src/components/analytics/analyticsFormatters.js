// src/components/analytics/analyticsFormatters.js
// Shared formatting helpers for analytics components

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatPercent = (percent) => {
  if (percent === null || percent === undefined) return '0.0%';
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
};
