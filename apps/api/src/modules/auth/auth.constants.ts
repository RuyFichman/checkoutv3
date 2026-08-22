export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;
export const RESET_TOKEN_DURATION_MS = 1000 * 60 * 30;

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME ?? 'checkoutv3_session';
}
