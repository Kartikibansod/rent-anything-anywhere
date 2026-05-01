const blockedDomains = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "temp-mail.org",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "tempmail.com",
  "sharklasers.com",
  "spam4.me"
]);

const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export function isAllowedEmail(email = "") {
  const normalized = String(email).trim().toLowerCase();
  if (!emailRegex.test(normalized)) return false;
  const domain = normalized.split("@")[1];
  if (blockedDomains.has(domain)) return false;
  return true;
}
