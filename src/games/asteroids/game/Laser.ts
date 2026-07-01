import { LASER_LIFETIME, LASER_SPEED } from "./constants";

export class Laser {
  public x: number;
  public y: number;
  private vx: number;
  private vy: number;
  public radius = 2.5;
  private lifeTime: number;
  private color = "#ff3f81"; // Neon Pink/Red

  constructor(x: number, y: number, angle: number, shipVx: number, shipVy: number) {
    this.x = x;
    this.y = y;

    // Laser velocity combines the speed of the laser and the ship's current velocity
    this.vx = Math.cos(angle) * LASER_SPEED + shipVx;
    this.vy = Math.sin(angle) * LASER_SPEED + shipVy;

    this.lifeTime = LASER_LIFETIME;
  }

  update(dt: number, width: number, height: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.lifeTime -= dt;

    // Screen wraparound
    if (this.x < 0) this.x += width;
    if (this.x > width) this.x -= width;
    if (this.y < 0) this.y += height;
    if (this.y > height) this.y -= height;
  }

  isExpired(): boolean {
    return this.lifeTime <= 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    // Draw the laser as a short line in the direction of its velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const dirX = this.vx / speed;
    const dirY = this.vy / speed;
    const length = 12;

    ctx.beginPath();
    ctx.moveTo(this.x - dirX * length, this.y - dirY * length);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    ctx.restore();
  }
}
