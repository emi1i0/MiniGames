// Tamano de celda del tablero en pixeles de mundo. Las dimensiones del "view"
// (ancho/alto) salen del nivel cargado (cols/rows * CELL).
export const CELL = 20;

// Escala visual de la senal (grosor del cable, tamano de las chispas). NO es la
// hitbox: el cable se dibuja fino (~1/3), asi que la colision usa COLLISION_RADIUS.
export const SIGNAL_RADIUS = 8;

// Radio real de colision. Debe coincidir con el grosor VISIBLE del cable (nucleo =
// SIGNAL_RADIUS*0.3 de ancho -> medio-ancho ~1.2px) para que solo choque cuando el
// cable realmente toca una pared, no cuando un circulo invisible mas grande la roza.
export const COLLISION_RADIUS = 1.6;

// Velocidad de la senal (px de mundo por segundo). Movimiento LIBRE y continuo;
// no hay colision de deslizamiento: si toca una pared, es choque.
export const SPEED = CELL * 9.5;

export const MAX_DT = 0.05;

export const COUNTDOWN_LABELS = ["3", "2", "1", "YA"];
export const COUNTDOWN_STEP = 0.75;

// Choque: breve congelamiento/flash antes de volver al inicio.
export const CRASH_FREEZE = 0.45;

// Cartel "NIVEL N" al pasar de nivel (segundos de pausa; el timer no corre).
export const LEVEL_FLASH = 0.9;

export const BEST_KEY = "circuit-breaker:best"; // mejor puntaje codificado (menor mejor)

// Paleta placa de circuitos (PCB), paredes de cobre verde y corredores oscuros.
export const COLOR_BG = "#04120c"; // fuera del tablero
export const COLOR_COPPER = "#0f5138"; // pared / cobre
export const COLOR_COPPER_HI = "#17784f"; // brillo del borde superior del cobre
export const COLOR_CHANNEL = "#061711"; // corredor (moat oscuro)
export const COLOR_EDGE = "#2fae7d"; // linea de borde entre cobre y corredor
export const COLOR_SILK = "rgba(206, 228, 216, 0.4)"; // serigrafia de componentes
export const COLOR_SIGNAL = "#d6fff0"; // nucleo de la senal
export const COLOR_GLOW = "#39ffb0"; // resplandor de la senal
export const COLOR_CABLE = "#5ab4ff"; // cable dejado por la senal (azul)
export const COLOR_CABLE_GLOW = "#1f6bff"; // resplandor del cable / particulas
export const COLOR_SOURCE = "#5effc0"; // pad de origen (A)
export const COLOR_DEST = "#7dfcff"; // conector destino (B)
export const COLOR_CRASH = "#ff3b3b"; // choque
