import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toFixed(decimals);
}

export function getGripStyleLabel(grip: string): string {
  const labels: Record<string, string> = {
    claw: "Claw Grip",
    thumbs: "Thumbs Only",
    hybrid: "Hybrid",
    "3finger": "3-Finger",
    "4finger": "4-Finger",
    "5finger": "5-Finger",
    "6finger": "6-Finger",
  };
  return labels[grip] || grip;
}

export function getPlayStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    aggressive: "Aggressive",
    balanced: "Balanced",
    passive: "Passive",
    sniper: "Sniper",
  };
  return labels[style] || style;
}

export function getExperienceLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    pro: "Pro Player",
  };
  return labels[level] || level;
}
