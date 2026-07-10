/**
 * Contrato de mensajes socket.io de Bomba Palabra (namespace `/wordbomb`).
 *
 * El server es autoritativo: mantiene el turno, la mecha (deadline absoluto),
 * las vidas y el set de palabras usadas, y valida cada palabra contra el
 * diccionario embebido. Los clientes solo mandan su intento y animan localmente
 * la mecha entre snapshots. Mismo nivel de confianza spoofeable ya aceptado en el
 * repo (los clientes declaran su nickname); el server no escribe en Supabase.
 */

/** Vista publica de un jugador dentro de la partida. */
export interface WbPlayerView {
  nickname: string;
  lives: number;
  alive: boolean;
  /** Conectado al server ahora mismo (para las luces de estado del cliente). */
  connected: boolean;
}

export type WbPhase = "waiting" | "playing" | "over";

/** Snapshot completo que el server difunde en cada cambio. */
export interface WbState {
  phase: WbPhase;
  /** Nickname del jugador de turno, o null fuera de "playing". */
  turn: string | null;
  /** Fragmento (silaba/combo) que la palabra debe contener. */
  fragment: string | null;
  /** Fin de la mecha en epoch ms (el cliente lo anima), o null. */
  deadline: number | null;
  /** Ms restantes de la mecha al momento del broadcast. El cliente los ancla a su
   *  reloj monotono local (performance.now()) para animar el anillo sin depender
   *  del epoch del server (evita el drift de reloj entre maquinas). */
  fuseMs: number | null;
  /** Duracion total de la mecha de este turno, para la fraccion del anillo. */
  fuseTotalMs: number | null;
  players: WbPlayerView[];
  /** Palabras aceptadas en la partida (para mostrar el ritmo). */
  usedCount: number;
  /** Ultima palabra aceptada, para animarla una vez en los demas clientes. */
  lastAccepted: { player: string; word: string; seq: number } | null;
}

/** Motivo por el que se rechazo un intento (feedback privado al que lo mando). */
export type WbRejectReason = "not-a-word" | "missing-fragment" | "already-used" | "not-your-turn";

/**
 * Reacciones: el jugador cambia la cara de su personaje por un instante. Es un id
 * de un set cerrado (no texto libre, no emojis: el repo los prohibe y las caras se
 * dibujan en el SVG del personaje). El server solo las retransmite -- no tocan el
 * estado de la partida -- validando el id contra el allowlist y con un cooldown por
 * jugador. Se duplican en el cliente (game/constants.ts + game/WordBombTransport.ts).
 */
export type WbEmoteId = "risa" | "sorpresa" | "enojo" | "burla" | "llanto";

export interface WbGameover {
  /** Puesto por jugador: 1 = ganador (ultimo en pie). */
  ranking: { nickname: string; place: number }[];
}

/** Cliente -> Server. */
export interface WbClientToServer {
  "wb:join": (msg: { code: string; nickname: string; roster: string[] }) => void;
  "wb:submit": (msg: { word: string }) => void;
  /** Texto en vivo del jugador de turno (se retransmite tal cual, sin validar). */
  "wb:typing": (msg: { text: string }) => void;
  /** Reaccion del jugador (id del allowlist; el server la valida y la difunde). */
  "wb:emote": (msg: { emote: WbEmoteId }) => void;
}

/** Server -> Cliente. */
export interface WbServerToClient {
  "wb:state": (state: WbState) => void;
  "wb:invalid": (msg: { reason: WbRejectReason }) => void;
  "wb:typing": (msg: { player: string; text: string }) => void;
  "wb:emote": (msg: { player: string; emote: WbEmoteId }) => void;
  "wb:gameover": (msg: WbGameover) => void;
}

/* ==================== CADENA DE PALABRAS (namespace /wordchain) ==================== */

/**
 * Contrato de mensajes socket.io de Cadena de Palabras (namespace `/wordchain`).
 *
 * Fork de Bomba Palabra con otra mecanica: el reto es una LETRA (no un fragmento) y
 * la palabra tiene que EMPEZAR con ella; su ultima letra pasa a ser el reto del
 * siguiente. Una sola vida: si se te acaba el reloj quedas eliminado en el acto.
 * Server autoritativo igual que Bomba (turno, reloj, validacion contra el diccionario)
 * y misma confianza spoofeable; no escribe en Supabase.
 */

export interface WcPlayerView {
  nickname: string;
  /** Sigue en pie. Con una sola vida, `false` = eliminado. */
  alive: boolean;
  connected: boolean;
  /** Cuantos eslabones aporto (palabras aceptadas) — se muestra como su racha. */
  links: number;
}

export type WcPhase = "waiting" | "playing" | "over";

export interface WcState {
  phase: WcPhase;
  turn: string | null;
  /** Letra con la que tiene que empezar la palabra del jugador de turno. */
  letter: string | null;
  /** Fin del reloj del turno en epoch ms, o null. */
  deadline: number | null;
  /** Ms restantes al momento del broadcast; el cliente los ancla a performance.now()
   *  para animar el anillo sin drift de reloj (ver Bomba Palabra). */
  clockMs: number | null;
  /** Duracion total del reloj de este turno, para la fraccion del anillo. */
  clockTotalMs: number | null;
  players: WcPlayerView[];
  /** Largo de la cadena forjada (palabras aceptadas en la partida). */
  chainLength: number;
  /** Ultima palabra aceptada, para sellarla una vez en los demas clientes. */
  lastAccepted: { player: string; word: string; seq: number } | null;
}

/** Motivo del rechazo (feedback privado al que lo mando). */
export type WcRejectReason = "not-a-word" | "wrong-initial" | "already-used" | "not-your-turn";

/** Reacciones: mismo set cerrado que Bomba Palabra (ids, nunca glifos). */
export type WcEmoteId = "risa" | "sorpresa" | "enojo" | "burla" | "llanto";

export interface WcGameover {
  /** Puesto por jugador: 1 = ganador (ultimo en pie). */
  ranking: { nickname: string; place: number }[];
}

/** Cliente -> Server. */
export interface WcClientToServer {
  "wc:join": (msg: { code: string; nickname: string; roster: string[] }) => void;
  "wc:submit": (msg: { word: string }) => void;
  "wc:typing": (msg: { text: string }) => void;
  "wc:emote": (msg: { emote: WcEmoteId }) => void;
}

/** Server -> Cliente. */
export interface WcServerToClient {
  "wc:state": (state: WcState) => void;
  "wc:invalid": (msg: { reason: WcRejectReason }) => void;
  "wc:typing": (msg: { player: string; text: string }) => void;
  "wc:emote": (msg: { player: string; emote: WcEmoteId }) => void;
  "wc:gameover": (msg: WcGameover) => void;
}

/* ============================ PONG (namespace /pong) ============================ */

/**
 * Contrato de mensajes socket.io de PONG (namespace `/pong`).
 *
 * En sala el juego es PvP: la sala se empareja de a dos (jugadores 0-1, 2-3, ...);
 * el impar juega contra la IA. Cada par es un "match" con su propia pelota. El
 * server es autoritativo de la fisica de la pelota, las colisiones y el puntaje;
 * cada cliente solo controla su paleta (manda su Y) y renderiza los snapshots
 * (prediccion + reconciliacion suave entre ellos). Mismo nivel de confianza
 * spoofeable ya aceptado en el repo; el server no escribe en Supabase.
 */

export interface PongBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rapidez actual (rampa por cada rebote de paleta). */
  speed: number;
  /** Rebotes de paleta acumulados (para la rampa de velocidad). */
  hits: number;
}

export type PongPhase = "countdown" | "playing" | "over";

/** Snapshot del match que el server difunde a cada jugador del par. */
export interface PongMatchState {
  /** Lado de ESTE jugador: "p1" = paleta izquierda, "p2" = paleta derecha. */
  side: "p1" | "p2";
  phase: PongPhase;
  ball: PongBall;
  /** Y de la paleta izquierda / derecha (coord de vista, no escaladas). */
  p1Y: number;
  p2Y: number;
  p1Score: number;
  p2Score: number;
  /** El rival de ESTE jugador es la IA del server (impar sin pareja o ausente). */
  vsAi: boolean;
}

/** Cliente -> Server. */
export interface PongClientToServer {
  "pg:join": (msg: { code: string; nickname: string; roster: string[] }) => void;
  /** Posicion Y de la paleta propia (coord de vista). */
  "pg:paddle": (msg: { y: number }) => void;
}

/** Server -> Cliente. */
export interface PongServerToClient {
  "pg:state": (state: PongMatchState) => void;
}
