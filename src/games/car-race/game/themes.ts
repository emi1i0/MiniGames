/**
 * Temas visuales de las pistas. Cada tema define la paleta del fondo, del
 * asfalto y de los detalles neon, mas un estilo de fondo decorativo (estrellas,
 * dunas, grilla...) que el Renderer dibuja detras del circuito. Mantiene el
 * look 2D top-down; solo cambian colores y adornos, no la geometria.
 */
export type BackdropKind = "grid" | "stars" | "dunes" | "ice" | "jungle" | "lava";

export interface Theme {
  id: string;
  name: string;
  /** Fondo: gradiente vertical (top -> bottom). */
  bgTop: string;
  bgBottom: string;
  /** Color de la grilla/adornos tenues del fondo. */
  grid: string;
  /** Halo neon del circuito y detalles (linea central, boosts, minimapa). */
  accent: string;
  /** Asfalto y banquina. */
  asphalt: string;
  edge: string;
  /** Tono de las marcas de derrape sobre este asfalto. */
  skid: string;
  backdrop: BackdropKind;
}

export const THEMES: Record<string, Theme> = {
  city: {
    id: "city",
    name: "Neon City",
    bgTop: "#0a0d18",
    bgBottom: "#12060f",
    grid: "rgba(120, 180, 255, 0.05)",
    accent: "#00f0ff",
    asphalt: "#20242f",
    edge: "#38405a",
    skid: "rgba(8, 8, 12, 0.5)",
    backdrop: "grid",
  },
  space: {
    id: "space",
    name: "Orbital",
    bgTop: "#05030f",
    bgBottom: "#0b0620",
    grid: "rgba(180, 200, 255, 0.5)",
    accent: "#a06bff",
    asphalt: "#1c1e2c",
    edge: "#4a3f7a",
    skid: "rgba(5, 5, 12, 0.5)",
    backdrop: "stars",
  },
  desert: {
    id: "desert",
    name: "Duna Roja",
    bgTop: "#241206",
    bgBottom: "#3a1c08",
    grid: "rgba(255, 190, 120, 0.06)",
    accent: "#ffb23d",
    asphalt: "#33291f",
    edge: "#6b4a2a",
    skid: "rgba(30, 15, 5, 0.5)",
    backdrop: "dunes",
  },
  ice: {
    id: "ice",
    name: "Glaciar",
    bgTop: "#071820",
    bgBottom: "#0c2b38",
    grid: "rgba(180, 240, 255, 0.07)",
    accent: "#4de1ff",
    asphalt: "#26333c",
    edge: "#4d7488",
    skid: "rgba(220, 240, 255, 0.35)",
    backdrop: "ice",
  },
  jungle: {
    id: "jungle",
    name: "Selva",
    bgTop: "#04140a",
    bgBottom: "#082b12",
    grid: "rgba(120, 255, 160, 0.06)",
    accent: "#39ff8f",
    asphalt: "#1f2a22",
    edge: "#3a5a3f",
    skid: "rgba(6, 14, 8, 0.5)",
    backdrop: "jungle",
  },
  volcano: {
    id: "volcano",
    name: "Volcan",
    bgTop: "#180404",
    bgBottom: "#2a0806",
    grid: "rgba(255, 120, 80, 0.06)",
    accent: "#ff5a3d",
    asphalt: "#2a2020",
    edge: "#6b3230",
    skid: "rgba(20, 6, 4, 0.5)",
    backdrop: "lava",
  },
};

export function themeFor(id: string): Theme {
  return THEMES[id] ?? THEMES.city;
}
