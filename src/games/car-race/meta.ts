import type { GameEntry } from "../../games";
import type { GameScoring } from "../../shared/scoring-core";

export const meta: GameEntry = {
  id: "car-race",
  title: "Neon Drift",
  description: "Carrera 2D en circuitos neón: 5 pistas, mapa aleatorio y los autos de todos los jugadores en vivo.",
  path: "/games/car-race/",
  accent: "#00f0ff",
  category: "Carreras",
  order: 110,
};

export const scoring: GameScoring = {
  direction: "lower",
  format: (n) => {
    const m = Math.floor(n / 60000);
    const s = Math.floor((n % 60000) / 1000);
    const cs = Math.floor((n % 1000) / 10);
    return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  },
};
