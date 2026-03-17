export interface Game {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  description: string | null;
  sensitivity_fields: SensitivityField[];
  is_active: boolean;
  sort_order: number;
}

export interface SensitivityField {
  key: string;
  label: string;
  min: number;
  max: number;
}

export interface Device {
  id: string;
  brand: string;
  model: string;
  display_name: string;
  screen_size: number;
  refresh_rate: number;
  touch_sampling_rate: number | null;
  processor: string | null;
  ram_options: number[];
  is_tablet: boolean;
  popularity_score: number;
}

export interface Vendor {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  social_links: Record<string, string>;
  theme_color: string;
  is_verified: boolean;
  is_active: boolean;
  total_codes_generated: number;
}

export interface VaultCode {
  id: string;
  code: string;
  vendor_id: string | null;
  code_type: "user" | "vendor" | "admin";
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  vendor?: Vendor;
}

export interface Calibration {
  id: string;
  user_id: string | null;
  vault_code_id: string | null;
  game_id: string;
  device_id: string | null;
  device_name: string | null;
  ram_gb: number;
  screen_size: number;
  grip_style: GripStyle;
  play_style: PlayStyle;
  hand_size: HandSize;
  experience_level: ExperienceLevel;
  sensitivity_values: Record<string, number>;
  calibration_score: number;
  share_code: string | null;
  is_public: boolean;
  views_count: number;
  saves_count: number;
  created_at: string;
  game?: Game;
  device?: Device;
}

export interface Tutorial {
  id: string;
  game_id: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: "sensitivity" | "aim" | "movement" | "strategy" | "settings";
  views_count: number;
  is_featured: boolean;
  game?: Game;
}

export type GripStyle =
  | "claw"
  | "thumbs"
  | "hybrid"
  | "3finger"
  | "4finger"
  | "5finger"
  | "6finger";

export type PlayStyle = "aggressive" | "balanced" | "passive" | "sniper";

export type HandSize = "small" | "medium" | "large";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "pro";

export interface CalibrationInput {
  gameId: string;
  deviceId?: string;
  deviceName?: string;
  ramGb: number;
  screenSize: number;
  gripStyle: GripStyle;
  playStyle: PlayStyle;
  handSize: HandSize;
  experienceLevel: ExperienceLevel;
  vaultCodeId?: string;
}

export interface CalibrationResult {
  sensitivityValues: Record<string, number>;
  calibrationScore: number;
  tips: string[];
}
