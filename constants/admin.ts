import Constants from 'expo-constants';

/** Emails listed here are treated as admins in the app UI. */
function configuredAdminEmails(): string[] {
  const extra = Constants.expoConfig?.extra as
    | { adminEmails?: string[] | string }
    | undefined;
  const raw = extra?.adminEmails;
  if (Array.isArray(raw)) {
    return raw.map((email) => String(email).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return configuredAdminEmails().includes(normalized);
}

export function isAdminUser(profile?: {
  role?: string | null;
  email?: string | null;
} | null) {
  if (!profile) return false;
  if (String(profile.role ?? '').toLowerCase() === 'admin') return true;
  return isAdminEmail(profile.email);
}
