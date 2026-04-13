export function verifyCronBearer(req: Request): boolean {
  const secret = process.env.CRON_BEARER;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}
