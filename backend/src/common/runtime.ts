export const serverStartedAt = Date.now();

export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - serverStartedAt) / 1000);
}
