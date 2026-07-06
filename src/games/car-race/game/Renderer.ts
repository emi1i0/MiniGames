import { CAR_LENGTH, CAR_WIDTH } from "./constants";
import {
  BOOST_RADIUS,
  CONE_RADIUS,
  BARRIER_HALF_THICK,
  type Obstacles,
} from "./obstacles";
import type { Track } from "./tracks";

/** Auto de otro jugador, con posicion interpolada para dibujar suave. */
export interface RemoteCar {
  player: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  tx: number;
  ty: number;
  ta: number;
  lap: number;
  s: number;
  finished: boolean;
  lastAt: number;
}

/** Segmento de marca de derrape (se desvanece por alpha). */
export interface Skid {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

/** Vista del auto propio que necesita el Renderer (posicion + velocidad). */
export interface FocusCar {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  speed: number;
  boosting: boolean;
}

const GRID_STEP = 150;
const MAX_SPEED_REF = 470;

export class Renderer {
  /** Puntos de una tesela reutilizable para estrellas/follaje/brasas. */
  private readonly speckTile: { x: number; y: number; r: number }[] = [];
  private t = 0;
  /** Estado de camara suavizada (posicion y zoom que persiguen al auto). */
  private cam = { x: 0, y: 0, zoom: 1, ready: false };

  constructor() {
    // Tesela pseudoaleatoria estable (misma cada sesion) de 512x512.
    let seed = 987654321 >>> 0;
    const rnd = () => {
      seed = (Math.imul(seed ^ (seed >>> 15), seed | 1) + 0x2545f491) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 60; i++) {
      this.speckTile.push({ x: rnd() * 512, y: rnd() * 512, r: 0.6 + rnd() * 1.8 });
    }
  }

  /** Fuerza a la camara a reencuadrar sin paneo (auto reposicionado en grilla). */
  snapCamera(): void {
    this.cam.ready = false;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    track: Track,
    obstacles: Obstacles,
    skids: Skid[],
    me: FocusCar,
    myColor: string,
    remotes: RemoteCar[],
    dt: number,
  ): void {
    this.t += dt;
    const speedFrac = Math.min(1, Math.abs(me.speed) / MAX_SPEED_REF);

    // Camara suavizada: un look-ahead minimo (para "ver" un poco hacia donde
    // vas) que persigue el objetivo con un ease, en vez de saltar con la
    // velocidad cruda. Asi los envones del boost no producen tirones.
    const targetX = me.x + me.vx * 0.09;
    const targetY = me.y + me.vy * 0.09;
    const targetZoom = 1 - 0.035 * speedFrac;
    if (!this.cam.ready) {
      this.cam.x = targetX;
      this.cam.y = targetY;
      this.cam.zoom = targetZoom;
      this.cam.ready = true;
    } else {
      const ease = 1 - Math.exp(-dt * 9);
      this.cam.x += (targetX - this.cam.x) * ease;
      this.cam.y += (targetY - this.cam.y) * ease;
      this.cam.zoom += (targetZoom - this.cam.zoom) * (1 - Math.exp(-dt * 6));
    }
    const focusX = this.cam.x;
    const focusY = this.cam.y;
    const zoom = this.cam.zoom;

    this.drawBackground(ctx, viewW, viewH, track, focusX, focusY);

    ctx.save();
    ctx.translate(viewW / 2, viewH / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-focusX, -focusY);

    this.drawTrack(ctx, track);
    this.drawSkids(ctx, track, skids);
    this.drawBoosts(ctx, track, obstacles);
    this.drawBarriers(ctx, obstacles);
    this.drawCones(ctx, obstacles);

    for (const car of remotes) {
      this.drawCar(ctx, car.x, car.y, car.angle, car.color, 0.85, false);
      this.drawName(ctx, car);
    }
    if (me.boosting) this.drawBoostFlame(ctx, me, myColor);
    this.drawCar(ctx, me.x, me.y, me.angle, myColor, 1, me.boosting);

    ctx.restore();

    this.drawMinimap(ctx, viewW, track, obstacles, me, myColor, remotes);
  }

  // ---------- Fondo ----------

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    track: Track,
    focusX: number,
    focusY: number,
  ): void {
    const th = track.theme;
    const g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, th.bgTop);
    g.addColorStop(1, th.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);

    const px = focusX * 0.4;
    const py = focusY * 0.4;

    switch (th.backdrop) {
      case "grid":
      case "ice":
        this.drawGridBackdrop(ctx, viewW, viewH, px, py, th.grid, th.backdrop === "ice");
        break;
      case "stars":
        this.drawSpecks(ctx, viewW, viewH, focusX * 0.25, focusY * 0.25, th.grid, false);
        break;
      case "jungle":
        this.drawSpecks(ctx, viewW, viewH, px, py, th.grid, false, 6);
        break;
      case "lava":
        this.drawSpecks(ctx, viewW, viewH, px, py, th.grid, true, 4);
        break;
      case "dunes":
        this.drawDunes(ctx, viewW, viewH, focusY * 0.3, th.grid);
        break;
    }
  }

  private drawGridBackdrop(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    px: number,
    py: number,
    color: string,
    diagonal: boolean,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -(px % GRID_STEP); x < viewW; x += GRID_STEP) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
    }
    for (let y = -(py % GRID_STEP); y < viewH; y += GRID_STEP) {
      ctx.moveTo(0, y);
      ctx.lineTo(viewW, y);
    }
    ctx.stroke();
    if (diagonal) {
      ctx.beginPath();
      const step = GRID_STEP * 2;
      for (let x = -(px % step) - viewH; x < viewW; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + viewH, viewH);
      }
      ctx.stroke();
    }
  }

  private drawSpecks(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    px: number,
    py: number,
    color: string,
    glow: boolean,
    sizeMul = 1,
  ): void {
    const tile = 512;
    const ox = -(((px % tile) + tile) % tile);
    const oy = -(((py % tile) + tile) % tile);
    ctx.fillStyle = color;
    for (let tx = ox; tx < viewW; tx += tile) {
      for (let ty = oy; ty < viewH; ty += tile) {
        for (const s of this.speckTile) {
          const sx = tx + s.x;
          const sy = ty + s.y;
          if (sx < -4 || sx > viewW + 4 || sy < -4 || sy > viewH + 4) continue;
          const r = s.r * sizeMul;
          if (glow) {
            const pulse = 0.5 + 0.5 * Math.sin(this.t * 2 + s.x);
            ctx.globalAlpha = 0.3 + 0.5 * pulse;
          }
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawDunes(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    py: number,
    color: string,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const baseY = ((k * 140 - py) % (viewH + 200)) - 100;
      ctx.beginPath();
      for (let x = 0; x <= viewW; x += 24) {
        const yy = baseY + Math.sin(x * 0.01 + k) * 20;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  // ---------- Pista ----------

  private tracePath(ctx: CanvasRenderingContext2D, track: Track): void {
    ctx.beginPath();
    ctx.moveTo(track.pts[0].x, track.pts[0].y);
    for (let i = 1; i < track.pts.length; i++) {
      ctx.lineTo(track.pts[i].x, track.pts[i].y);
    }
    ctx.closePath();
  }

  private drawTrack(ctx: CanvasRenderingContext2D, track: Track): void {
    const width = track.def.width;
    const th = track.theme;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Halo neon exterior (acotado para que dos tramos cercanos no se fundan).
    this.tracePath(ctx, track);
    ctx.strokeStyle = th.accent + "20";
    ctx.lineWidth = width + 22;
    ctx.stroke();

    // Pared/borde solido: es tambien el limite de colision del auto.
    this.tracePath(ctx, track);
    ctx.strokeStyle = th.edge;
    ctx.lineWidth = width + 12;
    ctx.stroke();

    // Cordon brillante al filo del asfalto: lectura clara de "pared".
    this.tracePath(ctx, track);
    ctx.strokeStyle = th.accent + "cc";
    ctx.lineWidth = width + 5;
    ctx.stroke();

    this.tracePath(ctx, track);
    ctx.strokeStyle = th.asphalt;
    ctx.lineWidth = width;
    ctx.stroke();

    this.tracePath(ctx, track);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 24]);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawDirectionArrows(ctx, track);
    this.drawStartLine(ctx, track);
  }

  /**
   * Flechas (chevrons) sobre el asfalto que indican el sentido de la carrera.
   * Se reparten por distancia a lo largo de la centerline y apuntan en la
   * direccion de avance (tangente de la spline). Sutiles para no tapar la pista.
   */
  private drawDirectionArrows(ctx: CanvasRenderingContext2D, track: Track): void {
    const spacing = 175;
    const count = Math.max(6, Math.round(track.total / spacing));
    const size = Math.min(track.def.width * 0.3, 15);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < count; i++) {
      const s = (i + 0.5) / count;
      // Saltar la zona de la meta para no pisar la grilla de largada.
      if (s < 0.03 || s > 0.97) continue;
      const p = track.pointAt(s);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.72);
      ctx.lineTo(size * 0.62, 0);
      ctx.lineTo(-size * 0.5, size * 0.72);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawStartLine(ctx: CanvasRenderingContext2D, track: Track): void {
    const start = track.pointAt(0);
    const width = track.def.width;
    const cell = 11;
    const cols = 3;

    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(start.angle);
    const rows = Math.floor(width / cell);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = (c + r) % 2 === 0 ? "#e8e8e8" : "#14161d";
        ctx.fillRect(c * cell - (cols * cell) / 2, r * cell - (rows * cell) / 2, cell, cell);
      }
    }
    ctx.restore();
  }

  // ---------- Marcas de derrape ----------

  private drawSkids(ctx: CanvasRenderingContext2D, track: Track, skids: Skid[]): void {
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    for (const s of skids) {
      ctx.strokeStyle = track.theme.skid.replace(/[\d.]+\)$/, `${(s.alpha * 0.5).toFixed(3)})`);
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }

  // ---------- Obstaculos ----------

  private drawBoosts(ctx: CanvasRenderingContext2D, track: Track, obstacles: Obstacles): void {
    const accent = track.theme.accent;
    for (const b of obstacles.boosts) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      const pulse = 0.55 + 0.45 * Math.sin(this.t * 6 + b.x * 0.01);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
      for (let i = -1; i <= 1; i++) {
        const cx = i * 20;
        ctx.beginPath();
        ctx.moveTo(cx - 10, -BOOST_RADIUS * 0.5);
        ctx.lineTo(cx + 12, 0);
        ctx.lineTo(cx - 10, BOOST_RADIUS * 0.5);
        ctx.lineTo(cx - 4, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawBarriers(ctx: CanvasRenderingContext2D, obstacles: Obstacles): void {
    for (const b of obstacles.barriers) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      const w = b.half * 2;
      const h = BARRIER_HALF_THICK * 2;
      // Franjas rojas y blancas.
      ctx.fillStyle = "#d0d4dc";
      ctx.beginPath();
      ctx.roundRect(-b.half, -BARRIER_HALF_THICK, w, h, 4);
      ctx.fill();
      const stripes = Math.max(2, Math.round(w / 18));
      for (let i = 0; i < stripes; i++) {
        if (i % 2 === 0) continue;
        ctx.fillStyle = "#e33b3b";
        ctx.fillRect(-b.half + (i * w) / stripes, -BARRIER_HALF_THICK, w / stripes, h);
      }
      ctx.restore();
    }
  }

  private drawCones(ctx: CanvasRenderingContext2D, obstacles: Obstacles): void {
    for (const c of obstacles.cones) {
      const x = c.x + c.ox;
      const y = c.y + c.oy;
      ctx.save();
      ctx.translate(x, y);
      // Base sombra.
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, CONE_RADIUS, CONE_RADIUS * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cuerpo.
      ctx.fillStyle = "#ff7a1a";
      ctx.beginPath();
      ctx.moveTo(0, -CONE_RADIUS - 4);
      ctx.lineTo(CONE_RADIUS * 0.8, CONE_RADIUS * 0.6);
      ctx.lineTo(-CONE_RADIUS * 0.8, CONE_RADIUS * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-CONE_RADIUS * 0.55, -CONE_RADIUS * 0.2, CONE_RADIUS * 1.1, 4);
      ctx.restore();
    }
  }

  // ---------- Autos ----------

  private drawCar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    alpha: number,
    boosting: boolean,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;

    const l = CAR_LENGTH;
    const w = CAR_WIDTH;

    // Sombra en el asfalto.
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.roundRect(-l / 2 + 2, -w / 2 + 3, l, w, 6);
    ctx.fill();

    // Ruedas.
    ctx.fillStyle = "#0a0b0e";
    ctx.fillRect(-l / 2 + 4, -w / 2 - 3, 9, 5);
    ctx.fillRect(-l / 2 + 4, w / 2 - 2, 9, 5);
    ctx.fillRect(l / 2 - 13, -w / 2 - 3, 9, 5);
    ctx.fillRect(l / 2 - 13, w / 2 - 2, 9, 5);

    // Carroceria con brillo neon.
    ctx.shadowColor = color;
    ctx.shadowBlur = boosting ? 24 : 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-l / 2, -w / 2, l, w, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Franja central mas clara.
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-l / 2 + 4, -1.5, l - 8, 3);
    ctx.globalAlpha = alpha;

    // Aleron trasero.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(-l / 2 - 1, -w / 2 + 1, 4, w - 2);

    // Parabrisas.
    ctx.fillStyle = "rgba(10, 12, 16, 0.8)";
    ctx.beginPath();
    ctx.roundRect(l * 0.04, -w / 2 + 3, l * 0.3, w - 6, 3);
    ctx.fill();

    // Faros.
    ctx.fillStyle = "rgba(255,255,220,0.9)";
    ctx.fillRect(l / 2 - 3, -w / 2 + 2, 2, 4);
    ctx.fillRect(l / 2 - 3, w / 2 - 6, 2, 4);

    ctx.restore();
  }

  private drawBoostFlame(ctx: CanvasRenderingContext2D, me: FocusCar, color: string): void {
    ctx.save();
    ctx.translate(me.x, me.y);
    ctx.rotate(me.angle);
    const flick = 0.6 + 0.4 * Math.sin(this.t * 40);
    const len = CAR_LENGTH * (0.7 + 0.4 * flick);
    ctx.globalAlpha = 0.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    const grad = ctx.createLinearGradient(-CAR_LENGTH / 2, 0, -CAR_LENGTH / 2 - len, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-CAR_LENGTH / 2, -CAR_WIDTH * 0.32);
    ctx.lineTo(-CAR_LENGTH / 2 - len, 0);
    ctx.lineTo(-CAR_LENGTH / 2, CAR_WIDTH * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawName(ctx: CanvasRenderingContext2D, car: RemoteCar): void {
    ctx.save();
    ctx.font = "600 13px 'Outfit', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    const label = car.finished ? `${car.player} FIN` : car.player;
    const w = ctx.measureText(label).width + 12;
    ctx.beginPath();
    ctx.roundRect(car.x - w / 2, car.y - 42, w, 19, 9);
    ctx.fill();
    ctx.fillStyle = car.color;
    ctx.fillText(label, car.x, car.y - 28);
    ctx.restore();
  }

  // ---------- Minimapa ----------

  private drawMinimap(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    track: Track,
    obstacles: Obstacles,
    me: { x: number; y: number },
    myColor: string,
    remotes: RemoteCar[],
  ): void {
    const mapW = 176;
    const mapH = 128;
    const pad = 14;
    const x0 = viewW - mapW - 16;
    const y0 = 16;

    ctx.save();
    ctx.fillStyle = "rgba(10, 12, 16, 0.68)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x0, y0, mapW, mapH, 12);
    ctx.fill();
    ctx.stroke();

    const b = track.bounds;
    const scale = Math.min(
      (mapW - pad * 2) / (b.maxX - b.minX),
      (mapH - pad * 2) / (b.maxY - b.minY),
    );
    const ox = x0 + mapW / 2 - ((b.minX + b.maxX) / 2) * scale;
    const oy = y0 + mapH / 2 - ((b.minY + b.maxY) / 2) * scale;
    const mx = (wx: number) => wx * scale + ox;
    const my = (wy: number) => wy * scale + oy;

    ctx.beginPath();
    ctx.moveTo(mx(track.pts[0].x), my(track.pts[0].y));
    for (let i = 1; i < track.pts.length; i++) ctx.lineTo(mx(track.pts[i].x), my(track.pts[i].y));
    ctx.closePath();
    ctx.strokeStyle = track.theme.accent + "88";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Boosts en el minimapa.
    ctx.fillStyle = track.theme.accent;
    for (const bp of obstacles.boosts) {
      ctx.beginPath();
      ctx.arc(mx(bp.x), my(bp.y), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const car of remotes) {
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.arc(mx(car.x), my(car.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = myColor;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(mx(me.x), my(me.y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
