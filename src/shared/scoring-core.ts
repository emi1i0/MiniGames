/**
 * Modulo hoja del scoring: tipos y helpers puros, sin dependencias. Existe
 * separado de `scoring.ts` para romper el ciclo de imports: cada juego declara
 * su `scoring` en su `meta.ts` (que importa helpers de aca), y `scoring.ts`
 * arma el mapa con un glob de esos `meta.ts`. Si los helpers vivieran en
 * `scoring.ts`, el glob crearia una dependencia circular en runtime.
 */

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
  /**
   * Direccion por variante, cuando distintas variantes se ordenan distinto que
   * el juego base. Ej: memory-match usa "higher" (pares) en modo sala, pero sus
   * rankings solo de tiempo y movimientos son "lower". Si falta una variante,
   * se usa `direction`.
   */
  variantDirection?: Record<string, Direction>;
  /** Formato por variante (mismo criterio que variantDirection). */
  variantFormat?: Record<string, (score: number) => string>;
}

/**
 * Codifica tiempo (centisegundos) y movimientos en un unico puntaje para poder
 * ordenar un ranking por tiempo sin cambiar el esquema de la tabla:
 * `centisegundos * BASE + movimientos`. Como el tiempo ocupa la parte alta del
 * numero, ordenar ascendente ("lower") ordena por tiempo y usa los movimientos
 * como desempate. Los movimientos se topean por debajo de BASE. Compartido por
 * sliding-puzzle y memory-match (modo solo).
 */
const TIME_MOVES_BASE = 100000;

export function encodeTimeMoves(seconds: number, moves: number): number {
  const centis = Math.max(0, Math.round(seconds * 100));
  const clampedMoves = Math.min(Math.max(0, Math.round(moves)), TIME_MOVES_BASE - 1);
  return centis * TIME_MOVES_BASE + clampedMoves;
}

export function formatTimeMoves(encoded: number): string {
  const centis = Math.floor(encoded / TIME_MOVES_BASE);
  const moves = encoded % TIME_MOVES_BASE;
  return `${formatClock(centis)} - ${moves} mov`;
}

/** "1:23.45" a partir de centisegundos (minutos:segundos.centesimas). */
export function formatClock(centiseconds: number): string {
  const cs = Math.max(0, Math.round(centiseconds));
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${m}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}
