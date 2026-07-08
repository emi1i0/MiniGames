/** Etiquetas y paso del countdown 3/2/1/YA compartido con todo el repo. */
export const COUNTDOWN_LABELS = ["3", "2", "1", "YA"] as const;
export const COUNTDOWN_STEP = 700;

/**
 * URL del game server autoritativo (socket.io). Sin esta env el juego no puede
 * funcionar: Bomba Palabra depende del server para validar palabras (diccionario
 * server-side) y arbitrar la mecha. A diferencia del resto del repo, no degrada a
 * un modo local; sin server muestra "no disponible". Es una excepcion deliberada
 * a la regla de degradacion (documentada en el CLAUDE.md del juego).
 */
export const GAME_SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL as string | undefined;
