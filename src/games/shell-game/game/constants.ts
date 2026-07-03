export const BEST_KEY = "mg:shell-game:best";
export const TOTAL_LIVES = 1;

export const COUNTDOWN_LABELS = ["3", "2", "1", "YA!"];
export const COUNTDOWN_STEP = 0.5; // seconds per tick
export const MAX_DT = 0.1; // clamp delta-time to avoid jumps on tab switch

export interface LevelConfig {
  cups: number;
  swaps: number;
  speed: number; // Duration of each swap in ms
}

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: { cups: 3, swaps: 3, speed: 600 },
  2: { cups: 4, swaps: 6, speed: 500 },
  3: { cups: 4, swaps: 9, speed: 420 },
  4: { cups: 5, swaps: 12, speed: 350 },
  5: { cups: 5, swaps: 15, speed: 300 },
};

export function getLevelConfig(level: number): LevelConfig {
  if (LEVEL_CONFIGS[level]) return LEVEL_CONFIGS[level];
  // Infinite difficulty scaling beyond level 5:
  // Cap at 5 cups, keep piling on swaps and speeding up (minimum speed 200ms)
  const cups = 5;
  const swaps = 15 + (level - 5) * 3;
  const speed = Math.max(200, 300 - (level - 5) * 20);
  return { cups, swaps, speed };
}
