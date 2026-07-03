import {
  BOOST_ACCEL,
  BOOST_DURATION,
  BOOST_MAX_BONUS,
  BRAKE_DECEL,
  ENGINE_ACCEL,
  GRIP_OFF,
  GRIP_ON,
  GRIP_SPEED_FALLOFF,
  MAX_DT,
  MAX_REVERSE,
  MAX_SPEED,
  OFFTRACK_ACCEL_FACTOR,
  OFFTRACK_SPEED_FACTOR,
  ROLL_DRAG,
  TURN_FULL_SPEED,
  TURN_RATE,
} from "./constants";

export interface CarInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Auto propio con cinematica de velocidad vectorial. La velocidad se guarda
 * como (vx, vy) y en cada frame se descompone en avance (a lo largo del morro)
 * y lateral. El agarre lateral alto amortigua rapido el componente transversal
 * (trazada limpia); a alta velocidad el grip baja un poco y aparece un derrape
 * sutil. Los rebotes contra barreras y el boost operan sobre el mismo (vx, vy).
 */
export class Car {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  /** Velocidad de avance con signo (para camara, efectos y HUD). */
  speed = 0;
  /** Magnitud del componente lateral (para marcas de derrape). */
  slip = 0;
  private boostTimer = 0;

  reset(x: number, y: number, angle: number): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.slip = 0;
    this.boostTimer = 0;
  }

  get boosting(): boolean {
    return this.boostTimer > 0;
  }

  /** Activa el boost: no es un salto instantaneo, sino un empuje sostenido
   *  durante BOOST_DURATION (ver update), asi la aceleracion es suave. */
  applyBoost(): void {
    this.boostTimer = BOOST_DURATION;
  }

  /** Rebote elastico contra una superficie de normal (nx, ny) unitaria. */
  bounce(nx: number, ny: number, restitution: number): void {
    const vn = this.vx * nx + this.vy * ny;
    if (vn >= 0) return; // ya se aleja
    const j = (1 + restitution) * vn;
    this.vx -= j * nx;
    this.vy -= j * ny;
  }

  /** Frenada por golpe (conos). */
  slowDown(factor: number): void {
    this.vx *= factor;
    this.vy *= factor;
  }

  update(dt: number, input: CarInput, onTrack: boolean): void {
    dt = Math.min(dt, MAX_DT);
    if (this.boostTimer > 0) this.boostTimer -= dt;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    // Ejes locales: avance (cos, sin) y derecha (-sin, cos).
    let vForward = this.vx * cos + this.vy * sin;
    let vLateral = -this.vx * sin + this.vy * cos;

    const bonus = this.boostTimer > 0 ? BOOST_MAX_BONUS : 0;
    const maxFwd = (MAX_SPEED + bonus) * (onTrack ? 1 : OFFTRACK_SPEED_FACTOR);
    const accel = ENGINE_ACCEL * (onTrack ? 1 : OFFTRACK_ACCEL_FACTOR);

    if (input.up) {
      vForward += accel * dt;
    } else if (input.down) {
      vForward -= (vForward > 0 ? BRAKE_DECEL : ENGINE_ACCEL * 0.6) * dt;
    }

    // Empuje del boost: acelera de forma continua hacia el tope aumentado.
    if (this.boostTimer > 0 && vForward >= 0) {
      vForward += BOOST_ACCEL * dt;
    }

    // Rozamiento longitudinal.
    vForward -= vForward * ROLL_DRAG * dt;
    vForward = Math.max(-MAX_REVERSE, Math.min(maxFwd, vForward));
    if (!input.up && !input.down && Math.abs(vForward) < 4 && Math.abs(vLateral) < 4) {
      vForward = 0;
      vLateral = 0;
    }

    // Agarre lateral (decaimiento exponencial); menor a alta velocidad.
    const baseGrip = onTrack ? GRIP_ON : GRIP_OFF;
    const speedFrac = Math.min(1, Math.abs(vForward) / MAX_SPEED);
    const grip = baseGrip * (1 - GRIP_SPEED_FALLOFF * speedFrac);
    vLateral *= Math.exp(-grip * dt);

    // Recompone la velocidad en ejes globales.
    this.vx = cos * vForward - sin * vLateral;
    this.vy = sin * vForward + cos * vLateral;
    this.speed = vForward;
    this.slip = Math.abs(vLateral);

    // Direccion: proporcional a la velocidad, en el sentido de la marcha.
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (steer !== 0 && Math.abs(vForward) > 1) {
      const effect = Math.min(1, Math.abs(vForward) / TURN_FULL_SPEED);
      const dir = vForward >= 0 ? 1 : -1;
      this.angle += steer * dir * TURN_RATE * effect * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}
