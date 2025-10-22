// src/utils/validation.js
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isFutureDate(date) {
  if (!date) return false;
  return new Date(date) > new Date();
}
