import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "../../../shared/supabase";

/** Snapshot de posicion que cada cliente emite ~10 veces por segundo. */
export interface RacePayload {
  /** Nickname del emisor. */
  p: string;
  x: number;
  y: number;
  /** Angulo del auto en radianes. */
  a: number;
  /** Vuelta actual (0-based). */
  l: number;
  /** Progreso dentro de la vuelta ∈ [0,1). */
  s: number;
  /** True cuando el emisor ya cruzo la meta final. */
  f: boolean;
}

/** Voto de un jugador por un circuito, antes de largar (fase de votacion). */
export interface VotePayload {
  /** Nickname del emisor. */
  p: string;
  /** Indice del circuito votado. */
  m: number;
}

/** Circuito ganador que anuncia el anfitrion al cerrar la votacion. */
export interface MapPayload {
  /** Indice del circuito elegido. */
  m: number;
}

/**
 * Canal efimero de la carrera: broadcast puro (sin DB) de las posiciones de
 * cada auto y de la votacion de circuito previa, separado del RoomChannel para
 * no mezclar el trafico de alta frecuencia con el sync de salas. Un canal por
 * sala+ronda.
 */
export class RaceChannel {
  private readonly channel: RealtimeChannel | null;
  private readonly cbs: Array<(p: RacePayload) => void> = [];
  private readonly voteCbs: Array<(v: VotePayload) => void> = [];
  private readonly mapCbs: Array<(m: MapPayload) => void> = [];

  constructor(code: string, round: number) {
    const supabase = getSupabase();
    if (!supabase) {
      this.channel = null;
      return;
    }

    this.channel = supabase.channel(`race:${code}:${round}`, {
      config: { broadcast: { self: false } },
    });
    this.channel.on("broadcast", { event: "pos" }, ({ payload }) => {
      for (const cb of this.cbs) cb(payload as RacePayload);
    });
    this.channel.on("broadcast", { event: "vote" }, ({ payload }) => {
      for (const cb of this.voteCbs) cb(payload as VotePayload);
    });
    this.channel.on("broadcast", { event: "map" }, ({ payload }) => {
      for (const cb of this.mapCbs) cb(payload as MapPayload);
    });
    this.channel.subscribe();
  }

  send(payload: RacePayload): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "pos", payload });
  }

  sendVote(payload: VotePayload): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "vote", payload });
  }

  /** Anuncio del circuito ganador (lo emite el anfitrion). */
  sendMap(payload: MapPayload): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "map", payload });
  }

  onPos(cb: (p: RacePayload) => void): void {
    this.cbs.push(cb);
  }

  onVote(cb: (v: VotePayload) => void): void {
    this.voteCbs.push(cb);
  }

  onMap(cb: (m: MapPayload) => void): void {
    this.mapCbs.push(cb);
  }

  dispose(): void {
    if (!this.channel) return;
    const supabase = getSupabase();
    if (supabase) void supabase.removeChannel(this.channel);
  }
}
