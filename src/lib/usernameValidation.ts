export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUsernameFormat(username: string): UsernameValidationResult {
  if (username.length < 3) return { valid: false, error: "Username must be at least 3 characters" };
  if (username.length > 10) return { valid: false, error: "Username must be 10 characters or less" };
  if (!/^[a-z0-9]+$/.test(username)) return { valid: false, error: "Only lowercase letters and numbers allowed" };
  if (!/[0-9]/.test(username)) return { valid: false, error: "Username must contain at least one number" };
  return { valid: true };
}