export function normalizePhone(input: string | null | undefined, defaultCountry = "US"): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    if (rest.length < 7 || rest.length > 15) return null;
    return "+" + rest;
  }

  digits = digits.replace(/\D/g, "");
  if (!digits) return null;

  if (defaultCountry === "US") {
    if (digits.length === 10) return "+1" + digits;
    if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  }
  if (defaultCountry === "IN") {
    if (digits.length === 10) return "+91" + digits;
    if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  }

  if (digits.length >= 10 && digits.length <= 15) return "+" + digits;
  return null;
}

export function isValidE164(phone: string | null): boolean {
  return !!phone && /^\+\d{8,15}$/.test(phone);
}
