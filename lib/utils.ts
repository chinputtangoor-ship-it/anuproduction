// /lib/utils.ts
export function nowISO(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" })
    .replace(" ", "T") + "+07:00";
}