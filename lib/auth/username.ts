const USERNAME_RE = /^[a-z0-9._-]+$/;

export function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

/** Generates ASCII username safe for profiles.username constraint. */
export function generateUsernameFromFullname(fullname: string, empId?: string): string {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  let base = "";

  if (parts.length >= 2) {
    const first = parts[0].replace(/[^a-zA-Z0-9]/g, "");
    const last = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, "");
    base = sanitizeUsername(first + last.slice(0, 2));
  } else if (parts.length === 1) {
    base = sanitizeUsername(parts[0].replace(/[^a-zA-Z0-9]/g, ""));
  }

  if (base.length < 3 && empId) {
    base = sanitizeUsername(empId);
  }

  if (base.length < 3) {
    base = `u${Date.now().toString(36).slice(-5)}`;
  }

  return base.slice(0, 32);
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username) && username.length >= 3;
}
