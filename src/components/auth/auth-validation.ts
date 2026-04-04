export function validateRequired(value: string, label: string) {
  if (!value.trim()) {
    return `${label} is required.`;
  }

  return "";
}

export function validateEmail(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "Work email is required.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    return "Enter a valid work email.";
  }

  return "";
}

export function validatePassword(value: string, label = "Password") {
  if (!value) {
    return `${label} is required.`;
  }

  if (value.length < 8) {
    return `${label} must be at least 8 characters.`;
  }

  return "";
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return "Confirm password is required.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

export function passwordStrengthSegments(value: string) {
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  return Math.min(score, 4);
}

export function mapOrganizationTypeToFacilityType(value: string) {
  switch (value) {
    case "Hospital":
      return "HOSPITAL" as const;
    case "Diagnostic Center":
      return "DIAGNOSTIC" as const;
    case "Multi-specialty":
      return "HOSPITAL" as const;
    default:
      return "CLINIC" as const;
  }
}
