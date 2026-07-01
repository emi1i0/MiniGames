export class Particle {
  public x: number;
  public y: number;
  private vx: number;
  private vy: number;
  private color: string;
  public alpha: number;
  private decay: number;
  private size: number;

  constructor(x: number, y: number, color: string, isThrust = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1.0;

    if (isThrust) {
      // Thrust particles: flame exhaust, slow decay, moves backwards
      // Velocity will be adjusted from the outside or given random small spread
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 40 + 20;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.decay = Math.random() * 2.0 + 1.5; // decays in ~0.5s
      this.size = Math.random() * 3 + 2;
    } else {
      // Explosion sparks: fast spread
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 30;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.decay = Math.random() * 1.2 + 0.8; // decays in ~1.0s
      this.size = Math.random() * 2 + 1;
    }
  }

  // Allow setting manual velocities (e.g. directed exhaust)
  public setVelocity(vx: number, vy: number): void {
    this.vx = vx;
    this.vy = vy;
  }

  update(dt: number, width: number, height: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Apply slight air resistance/friction to explosion particles
    this.vx *= Math.exp(-0.5 * dt);
    this.vy *= Math.exp(-0.5 * dt);

    this.alpha -= this.decay * dt;

    // Wrap around screen boundaries for particles
    if (this.x < 0) this.x += width;
    if (this.x > width) this.x -= width;
    if (this.y < 0) this.y += height;
    if (this.y > height) this.y -= height;
  }

  isDead(): boolean {
    return this.alpha <= 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
