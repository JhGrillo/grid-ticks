export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function isFutureDate(date) {
  return new Date(date) > new Date();
}
