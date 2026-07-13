export function buildDefaultEmailUserName(email: string): string {
  return email.split("@", 1)[0] || email;
}
