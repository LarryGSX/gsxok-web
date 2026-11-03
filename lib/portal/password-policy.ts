// Mirrors PHP's Unicode character minimum and bcrypt-safe byte maximum.
export function validNewPassword(value: string): boolean {
  return !value.includes('\0') && Array.from(value).length >= 12 && new TextEncoder().encode(value).length <= 72
}
export const passwordPolicyMessage = 'Use at least 12 characters and no more than 72 UTF-8 bytes. Spaces are preserved.'
