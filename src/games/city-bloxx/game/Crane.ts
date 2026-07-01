import {
  HOOK_SPEED_BASE,
  HOOK_SPEED_MAX,
  HOOK_SPEED_PER_FLOOR,
  VIEW_WIDTH,
} from "./constants";

export const PENDULUM_LENGTH = 350;
// Maximum swing angle: we want L * sin(thetaMax) = 180
// sin(thetaMax) = 180 / 350 = 0.5143
// thetaMax = arcsin(0.5143) = 0.539 rad (approx 31 degrees)
export const THETA_MAX = Math.asin(180 / PENDULUM_LENGTH);

/** The hook swinging as a pendulum from the top-center, carrying the next block. */
export class Crane {
  x = VIEW_WIDTH / 2;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  private phase = 0;

  reset(): void {
    this.x = VIEW_WIDTH / 2;
    this.y = 0;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.phase = 0;
  }

  /** Swing the pendulum; faster as floors stack. */
  update(dt: number, floors: number, hangTopY: number): void {
    const speed = Math.min(HOOK_SPEED_BASE + floors * HOOK_SPEED_PER_FLOOR, HOOK_SPEED_MAX);
    // Convert speed to angular velocity (omega).
    // Standard period is T = 720 / speed -> omega = 2pi / T = 2pi * speed / 720 = pi * speed / 360.
    const omega = (Math.PI * speed) / 360;

    this.phase += omega * dt;
    this.angle = THETA_MAX * Math.sin(this.phase);

    const pivotX = VIEW_WIDTH / 2;
    const pivotY = hangTopY - PENDULUM_LENGTH;

    this.x = pivotX + PENDULUM_LENGTH * Math.sin(this.angle);
    this.y = pivotY + PENDULUM_LENGTH * Math.cos(this.angle);

    // Calculate instantaneous horizontal/vertical velocities using derivative of position
    const dTheta = THETA_MAX * omega * Math.cos(this.phase);
    this.vx = PENDULUM_LENGTH * Math.cos(this.angle) * dTheta;
    this.vy = -PENDULUM_LENGTH * Math.sin(this.angle) * dTheta;
  }
}
