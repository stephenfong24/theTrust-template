export const passwordCriteriaMessage =
  "Password must be 6 to 30 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";

export function isValidPasswordCriteria(value: string) {
  return (
    value.length >= 6 &&
    value.length <= 30 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}
