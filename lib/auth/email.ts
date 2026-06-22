const AUTH_EMAIL_DOMAIN = "anu.local";

export function usernameToAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function authEmailToUsername(email: string): string {
  return email.split("@")[0]?.toLowerCase() ?? email;
}
