import * as THREE from "three";
import {
  BALL_COLOR,
  BALL_RADIUS,
  FALL_SPEED,
  HOP_HEIGHT,
  LANE_LERP,
  LANE_X,
} from "./constants";

/** The player ball: a solid-colored sphere that hops forward automatically and
 *  is only steered between the three lanes. Owns its own mesh. */
export class Ball {
  readonly object: THREE.Mesh;
  /** Discrete target lane, 0 = left, 1 = center, 2 = right. */
  lane = 1;

  constructor() {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
    const material = new THREE.MeshStandardMaterial({
      color: BALL_COLOR,
      roughness: 0.35,
      metalness: 0.0,
    });
    this.object = new THREE.Mesh(geometry, material);
    this.object.castShadow = true;
    this.reset();
  }

  reset(): void {
    this.lane = 1;
    this.object.position.set(0, BALL_RADIUS, 0);
  }

  /** Queue a lane change; clamped to the valid lane range. */
  steer(dir: number): void {
    this.lane = THREE.MathUtils.clamp(this.lane + Math.sign(dir), 0, 2);
  }

  private laneX(lane: number): number {
    return (lane - 1) * LANE_X;
  }

  /** Ease sideways toward the target lane and set the hop height from phase
   *  (0 = on a platform, 0.5 = apex, 1 = about to land on the next). */
  update(dt: number, hopPhase: number): void {
    const targetX = this.laneX(this.lane);
    const t = Math.min(1, dt * LANE_LERP);
    this.object.position.x += (targetX - this.object.position.x) * t;
    this.object.position.y = BALL_RADIUS + Math.sin(Math.PI * hopPhase) * HOP_HEIGHT;
  }

  /** After a missed platform: let the ball drop through the gap. */
  fall(dt: number): void {
    this.object.position.y -= FALL_SPEED * dt;
  }

  /** Idle bob for the start / game-over screens. */
  idle(time: number): void {
    const phase = (time % 1) + 0;
    this.object.position.x += (0 - this.object.position.x) * 0.1;
    this.object.position.y = BALL_RADIUS + Math.abs(Math.sin(Math.PI * phase)) * HOP_HEIGHT * 0.55;
  }
}
