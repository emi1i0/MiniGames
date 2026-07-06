import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "../../../shared/supabase";

/** Progreso en vivo que cada jugador emite mientras escribe (efimero, sin DB). */
export interface Progress {
  /** Nickname del emisor. */
  p: string;
  /** Frases superadas. */
  f: number;
  /** Balas cargadas en el tambor. */
  c: number;
  /** Ya cayo (ejecutado). */
  d: boolean;
}

/**
 * Canal efimero para ver como le va al resto de la sala en tiempo real: cada
 * cliente emite su progreso por broadcast puro (sin tocar la DB), separado del
 * RoomChannel de salas. Un canal por sala (los mensajes son efimeros y solo los
 * emiten las paginas vivas de la ronda actual). Degrada a no-op sin Supabase.
 */
export class TypingChannel {
  private readonly channel: RealtimeChannel | null;
  private readonly cbs: Array<(p: Progress) => void> = [];

  constructor(code: string) {
    const supabase = getSupabase();
    if (!supabase) {
      this.channel = null;
      return;
    }
    this.channel = supabase.channel(`type:${code}`, {
      config: { broadcast: { self: false } },
    });
    this.channel.on("broadcast", { event: "prog" }, ({ payload }) => {
      const pr = payload as Progress;
      if (pr && typeof pr.p === "string") for (const cb of this.cbs) cb(pr);
    });
    this.channel.subscribe();
  }

  send(p: Progress): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "prog", payload: p });
  }

  onProgress(cb: (p: Progress) => void): void {
    this.cbs.push(cb);
  }

  dispose(): void {
    if (!this.channel) return;
    const supabase = getSupabase();
    if (supabase) void supabase.removeChannel(this.channel);
  }
}
