import type { Track } from "./tracks";

export interface Cone {
  x: number;
  y: number;
  /** Desplazamiento visual al ser golpeado (se desvanece en el Renderer). */
  ox: number;
  oy: number;
  /** Timestamp del ultimo golpe, para animar y evitar frenadas repetidas. */
  hitAt: number;
}

export interface Barrier {
  x: number;
  y: number;
  angle: number;
  /** Mitad del largo del muro (a lo largo de la pista). */
  half: number;
}

export interface BoostPad {
  x: number;
  y: number;
  angle: number;
}

export interface Obstacles {
  cones: Cone[];
  barriers: Barrier[];
  boosts: BoostPad[];
}

export const CONE_RADIUS = 15;
export const BARRIER_HALF_THICK = 12;
export const BOOST_RADIUS = 46;

/** PRNG determinista (mulberry32) a partir de una seed entera. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curvatura [0,1] de la centerline en el progreso s. */
function curvatureAtS(track: Track, s: number): number {
  const m = track.pts.length;
  const idx = Math.floor((((s % 1) + 1) % 1) * m) % m;
  return track.curvature[idx];
}

/** Punto desplazado perpendicularmente a la pista (lane en px, + a la derecha). */
function offset(track: Track, s: number, lane: number): { x: number; y: number; angle: number } {
  const p = track.pointAt(s);
  const perp = p.angle + Math.PI / 2;
  return { x: p.x + Math.cos(perp) * lane, y: p.y + Math.sin(perp) * lane, angle: p.angle };
}

/**
 * Genera los obstaculos de una pista de forma determinista (misma seed -> mismo
 * layout, clave para el modo sala). Recorre el circuito y coloca:
 *  - boost pads al centro de las rectas (recompensa),
 *  - barreras parciales a un lado en rectas (obligan a trazar),
 *  - conos en fila sobre el borde interno de las curvas (slalom esquivable).
 * Deja libre la zona de largada.
 */
export function buildObstacles(track: Track, seed: number): Obstacles {
  const rand = rng(seed);
  const cones: Cone[] = [];
  const barriers: Barrier[] = [];
  const boosts: BoostPad[] = [];
  const half = track.def.width / 2;

  // Densidad alta: obstaculos frecuentes en rectas y curvas (dificultad).
  const STEP = 0.007;
  let cooldown = 0;

  for (let s = 0.06; s < 0.94; s += STEP) {
    if (cooldown > 0) {
      cooldown -= STEP;
      continue;
    }
    const curv = curvatureAtS(track, s);

    if (curv < 0.12) {
      // Recta: boost, barrera parcial o una chicane de conos que obliga a tejer.
      const roll = rand();
      if (roll < 0.28) {
        const p = offset(track, s, (rand() - 0.5) * half * 0.4);
        boosts.push({ x: p.x, y: p.y, angle: p.angle });
        cooldown = 0.09;
      } else if (roll < 0.62) {
        const side = rand() < 0.5 ? -1 : 1;
        const p = offset(track, s, side * half * 0.5);
        barriers.push({ x: p.x, y: p.y, angle: p.angle, half: half * 0.4 });
        cooldown = 0.11;
      } else if (roll < 0.86) {
        // Chicane: fila diagonal de conos cruzando media pista.
        const side = rand() < 0.5 ? -1 : 1;
        for (let k = 0; k < 4; k++) {
          const lane = side * half * (0.7 - k * 0.34);
          const p = offset(track, s + k * 0.005, lane);
          cones.push({ x: p.x, y: p.y, ox: 0, oy: 0, hitAt: 0 });
        }
        cooldown = 0.08;
      }
    } else if (curv > 0.24) {
      // Curva (incluye las medias): fila de conos sobre el borde interno.
      const a0 = track.pointAt(s).angle;
      const a1 = track.pointAt(s + 0.02).angle;
      let d = a1 - a0;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const innerSide = d > 0 ? 1 : -1;
      const count = curv > 0.5 ? 5 : 4;
      for (let k = 0; k < count; k++) {
        const p = offset(track, s + k * 0.006, innerSide * half * 0.66);
        cones.push({ x: p.x, y: p.y, ox: 0, oy: 0, hitAt: 0 });
      }
      cooldown = 0.04;
    }
  }

  return { cones, barriers, boosts };
}
