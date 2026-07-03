/** Direccion de orden del ranking: mayor puntaje mejor, o menor mejor. */
export type Direction = "higher" | "lower";

export interface GameScoring {
  /** "higher" = mayor puntaje mejor (default de la mayoria de los juegos). */
  direction: Direction;
  /** Formatea el puntaje para mostrarlo (p.ej. reaction-time -> "213 ms"). */
  format?: (score: number) => string;
  /** Variantes independientes de ranking (p.ej. tamanos de sliding-puzzle). */
  variants?: string[];
  /** Etiqueta legible de cada variante para el selector de la landing. */
  variantLabel?: (variant: string) => string;
}

/**
 * Configuracion de ranking por juego. La clave es el `id` de src/games.ts.
 * Todo juego que envie puntajes debe tener una entrada aca.
 */
export const GAME_SCORING: Record<string, GameScoring> = {
  "neon-cylinder": { direction: "higher" },
  "flappy-bird": { direction: "higher" },
  "stack-tower": { direction: "higher" },
  "rhythm-tap": { direction: "higher" },
  "jump-ball": { direction: "higher" },
  "city-bloxx": { direction: "higher" },
  "asteroids": { direction: "higher" },
  "mini-frogger": { direction: "higher" },
  "kunai-throw": { direction: "higher" },
  "odd-one-out": { direction: "higher" },
  "penalty-keeper": { direction: "higher" },
  "reaction-time": {
    direction: "lower",
    format: (n) => `${Math.round(n)} ms`,
  },
  "car-race": {
    direction: "lower",
    // Un ranking independiente por circuito (variante = id de la pista).
    variants: ["monaco", "shanghai", "silverstone", "red-dune", "glacier-loop", "magma-eight"],
    variantLabel: (v) =>
      ({
        monaco: "Mónaco",
        shanghai: "Shanghái",
        silverstone: "Silverstone",
        "red-dune": "Duna Roja",
        "glacier-loop": "Glaciar",
        "magma-eight": "Volcán",
      })[v] ?? v,
    format: (n) => {
      const m = Math.floor(n / 60000);
      const s = Math.floor((n % 60000) / 1000);
      const cs = Math.floor((n % 1000) / 10);
      return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
    },
  },
  "rocket-arena": {
    direction: "higher",
    format: (n) => `${n} ${n === 1 ? "gol" : "goles"}`,
  },
  "monopoly-mundial": {
    direction: "higher",
    format: (n) => `$${Math.round(n)}`,
  },
  "sliding-puzzle": {
    direction: "lower",
    variants: ["3", "4", "5"],
    variantLabel: (v) => `${v}x${v}`,
    format: (n) => `${n} mov`,
  },
};

/** Devuelve la config de un juego, con default seguro si no esta declarado. */
export function getScoring(gameId: string): GameScoring {
  return GAME_SCORING[gameId] ?? { direction: "higher" };
}

/** Formatea un puntaje segun la config del juego. */
export function formatScore(gameId: string, score: number): string {
  const fmt = getScoring(gameId).format;
  return fmt ? fmt(score) : String(score);
}
