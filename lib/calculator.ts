import type {
  CalibrationInput,
  CalibrationResult,
  SensitivityField,
  GripStyle,
  PlayStyle,
  HandSize,
  ExperienceLevel,
} from "./types";

// Base sensitivity values for different games
const BASE_SENSITIVITY: Record<string, Record<string, number>> = {
  "free-fire": {
    general: 65,
    redDot: 60,
    scope2x: 55,
    scope4x: 45,
    sniperScope: 35,
    freeLook: 70,
  },
  "pubg-mobile": {
    camera: 120,
    ads: 100,
    gyroscope: 150,
    scope2x: 90,
    scope3x: 80,
    scope4x: 70,
    scope6x: 50,
    scope8x: 40,
  },
  "cod-mobile": {
    standard: 120,
    ads: 100,
    tactical: 80,
    sniper: 60,
    gyroscope: 140,
  },
  "apex-mobile": {
    look: 5,
    ads: 4.5,
    scope1x: 4,
    scope2x: 3.5,
    scope3x: 3,
    scope4x: 2.5,
    sniperScope: 2,
  },
  bgmi: {
    camera: 120,
    ads: 100,
    gyroscope: 150,
    scope2x: 90,
    scope3x: 80,
    scope4x: 70,
    scope6x: 50,
    scope8x: 40,
  },
};

// Multipliers based on player attributes
const GRIP_MULTIPLIERS: Record<GripStyle, number> = {
  claw: 1.15,
  thumbs: 0.9,
  hybrid: 1.05,
  "3finger": 1.08,
  "4finger": 1.12,
  "5finger": 1.18,
  "6finger": 1.22,
};

const PLAY_STYLE_MODIFIERS: Record<PlayStyle, { close: number; far: number }> =
  {
    aggressive: { close: 1.15, far: 0.9 },
    balanced: { close: 1.0, far: 1.0 },
    passive: { close: 0.9, far: 1.1 },
    sniper: { close: 0.85, far: 1.2 },
  };

const HAND_SIZE_MULTIPLIERS: Record<HandSize, number> = {
  small: 1.1,
  medium: 1.0,
  large: 0.92,
};

const EXPERIENCE_MULTIPLIERS: Record<ExperienceLevel, number> = {
  beginner: 0.85,
  intermediate: 0.95,
  advanced: 1.05,
  pro: 1.15,
};

// Screen size affects sensitivity (larger screens need lower sens)
function getScreenSizeMultiplier(screenSize: number, isTablet: boolean): number {
  if (isTablet || screenSize > 10) {
    return 0.75 + (14 - Math.min(screenSize, 14)) * 0.03;
  }
  // Phone: optimal around 6.5 inches
  const deviation = Math.abs(screenSize - 6.5);
  return 1 - deviation * 0.04;
}

// RAM affects smoothness, higher RAM allows for more precise movements
function getRamMultiplier(ramGb: number): number {
  if (ramGb <= 3) return 0.9;
  if (ramGb <= 4) return 0.95;
  if (ramGb <= 6) return 1.0;
  if (ramGb <= 8) return 1.03;
  if (ramGb <= 12) return 1.05;
  return 1.08; // 16GB+
}

// Determine if a field is "close range" or "far range"
function isCloseRangeField(fieldKey: string): boolean {
  const closeRangeFields = [
    "general",
    "camera",
    "standard",
    "look",
    "ads",
    "redDot",
    "scope1x",
  ];
  return closeRangeFields.some((f) => fieldKey.toLowerCase().includes(f.toLowerCase()));
}

export function calculateSensitivity(
  input: CalibrationInput,
  gameSlug: string,
  fields: SensitivityField[],
  isTablet: boolean = false
): CalibrationResult {
  const baseSens = BASE_SENSITIVITY[gameSlug] || BASE_SENSITIVITY["free-fire"];
  const sensitivityValues: Record<string, number> = {};

  // Get all multipliers
  const gripMult = GRIP_MULTIPLIERS[input.gripStyle];
  const handMult = HAND_SIZE_MULTIPLIERS[input.handSize];
  const expMult = EXPERIENCE_MULTIPLIERS[input.experienceLevel];
  const screenMult = getScreenSizeMultiplier(input.screenSize, isTablet);
  const ramMult = getRamMultiplier(input.ramGb);
  const playMod = PLAY_STYLE_MODIFIERS[input.playStyle];

  // Calculate each sensitivity field
  for (const field of fields) {
    const base = baseSens[field.key] || 50;
    const isCloseRange = isCloseRangeField(field.key);
    const playStyleMult = isCloseRange ? playMod.close : playMod.far;

    let calculated =
      base * gripMult * handMult * expMult * screenMult * ramMult * playStyleMult;

    // Add some natural variation (±3%)
    const variation = 1 + (Math.random() * 0.06 - 0.03);
    calculated *= variation;

    // Clamp to field min/max
    calculated = Math.max(field.min, Math.min(field.max, calculated));

    // Round appropriately based on max value
    if (field.max <= 10) {
      sensitivityValues[field.key] = Math.round(calculated * 10) / 10;
    } else {
      sensitivityValues[field.key] = Math.round(calculated);
    }
  }

  // Calculate calibration score (how optimized the settings are)
  const calibrationScore = calculateScore(input, gameSlug);

  // Generate tips
  const tips = generateTips(input, gameSlug);

  return {
    sensitivityValues,
    calibrationScore,
    tips,
  };
}

function calculateScore(input: CalibrationInput, gameSlug: string): number {
  let score = 70; // Base score

  // Experience bonus
  const expBonus: Record<ExperienceLevel, number> = {
    beginner: 0,
    intermediate: 5,
    advanced: 10,
    pro: 15,
  };
  score += expBonus[input.experienceLevel];

  // Grip style bonus (more fingers = better control potential)
  const gripBonus: Record<GripStyle, number> = {
    thumbs: 0,
    claw: 5,
    hybrid: 3,
    "3finger": 4,
    "4finger": 6,
    "5finger": 8,
    "6finger": 10,
  };
  score += gripBonus[input.gripStyle];

  // RAM bonus
  if (input.ramGb >= 8) score += 5;
  else if (input.ramGb >= 6) score += 3;

  // Screen size optimization (phones in sweet spot get bonus)
  if (input.screenSize >= 6.3 && input.screenSize <= 6.8) {
    score += 3;
  }

  // Game-specific bonuses
  if (gameSlug === "free-fire" && input.playStyle === "aggressive") {
    score += 2;
  }
  if (
    (gameSlug === "pubg-mobile" || gameSlug === "bgmi") &&
    input.playStyle === "balanced"
  ) {
    score += 2;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function generateTips(input: CalibrationInput, gameSlug: string): string[] {
  const tips: string[] = [];

  // Grip-based tips
  if (input.gripStyle === "thumbs") {
    tips.push(
      "Consider trying claw grip for faster reaction times in close combat."
    );
  }
  if (input.gripStyle === "claw" && input.experienceLevel === "beginner") {
    tips.push(
      "Practice claw grip in training mode first to build muscle memory."
    );
  }

  // Experience-based tips
  if (input.experienceLevel === "beginner") {
    tips.push("Start with these settings and gradually increase as you improve.");
    tips.push("Spend 10-15 minutes daily in training mode to build consistency.");
  }
  if (input.experienceLevel === "pro") {
    tips.push("Fine-tune these values by ±5% based on your playstyle preferences.");
  }

  // Play style tips
  if (input.playStyle === "aggressive") {
    tips.push(
      "Your higher close-range sensitivity will help in rush plays. Practice hip-fire."
    );
  }
  if (input.playStyle === "sniper") {
    tips.push(
      "Your lower scope sensitivity gives better precision for long-range shots."
    );
  }

  // Device tips
  if (input.ramGb <= 4) {
    tips.push(
      "Close background apps to ensure smooth gameplay with your device specs."
    );
  }
  if (input.screenSize > 7) {
    tips.push(
      "On larger screens, consider adjusting your HUD layout for better reach."
    );
  }

  // Game-specific tips
  if (gameSlug === "free-fire") {
    tips.push("In Free Fire, test your settings in Clash Squad for quick feedback.");
  }
  if (gameSlug === "pubg-mobile" || gameSlug === "bgmi") {
    tips.push("Enable gyroscope for scope-only to improve long-range accuracy.");
  }
  if (gameSlug === "cod-mobile") {
    tips.push("Adjust your ADS sensitivity separately for each weapon class.");
  }

  return tips.slice(0, 4); // Return max 4 tips
}
