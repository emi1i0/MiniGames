import {
  ASTEROID_MIN_VERTICES,
  ASTEROID_MAX_VERTICES,
  ASTEROID_JAGGEDNESS,
  ASTEROID_RADII,
  ASTEROID_SPEEDS,
  ASTEROID_SCORES,
} from "./constants";

const NEON_COLORS = [
  "#39ff14", // Neon Green
  "#ffbd00", // Gold/Amber
  "#00ffcc", // Mint Neon
  "#ff00cc", // Purple Neon
];

export class Asteroid {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number; // 3 = Large, 2 = Medium, 1 = Small
  public radius: number;
  public scoreValue: number;

  private numVertices: number;
  private offsets: number[] = [];
  private angle = 0;
  private spinSpeed: number;
  public color: string;

  constructor(x: number, y: number, size: number, vx?: number, vy?: number, color?: string) {
    this.x = x;
    this.y = y;
    this.size = size;

    // Retrieve size settings
    const sizes = [1, 2, 3] as const;
    const validatedSize = size as typeof sizes[number];
    this.radius = ASTEROID_RADII[validatedSize];
    this.scoreValue = ASTEROID_SCORES[validatedSize];

    // Assign color
    this.color = color || NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];

    // Initialize velocity if not provided
    if (vx !== undefined && vy !== undefined) {
      this.vx = vx;
      this.vy = vy;
    } else {
      const speedConfig = ASTEROID_SPEEDS[validatedSize];
      const speed = speedConfig.min + Math.random() * (speedConfig.max - speedConfig.min);
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }

    // Generate irregular polygon vertices
    this.numVertices = Math.floor(
      ASTEROID_MIN_VERTICES + Math.random() * (ASTEROID_MAX_VERTICES - ASTEROID_MIN_VERTICES + 1)
    );
    for (let i = 0; i < this.numVertices; i++) {
      this.offsets.push(1 + (Math.random() * ASTEROID_JAGGEDNESS * 2 - ASTEROID_JAGGEDNESS));
    }

    // Spin speed: random between -1.5 and 1.5 radians/sec
    this.spinSpeed = (Math.random() * 2 - 1) * 1.5;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(dt: number, width: number, height: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spinSpeed * dt;

    // Screen wraparound
    if (this.x < -this.radius) this.x += width + this.radius * 2;
    if (this.x > width + this.radius) this.x -= width + this.radius * 2;
    if (this.y < -this.radius) this.y += height + this.radius * 2;
    if (this.y > height + this.radius) this.y -= height + this.radius * 2;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.0;
    ctx.lineJoin = "round";

    ctx.beginPath();
    for (let i = 0; i < this.numVertices; i++) {
      const vertexAngle = (i / this.numVertices) * Math.PI * 2;
      const r = this.radius * this.offsets[i];
      const px = Math.cos(vertexAngle) * r;
      const py = Math.sin(vertexAngle) * r;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Splits this asteroid into two smaller ones.
   * Returns empty array if size is already 1 (Small).
   */
  split(): Asteroid[] {
    if (this.size <= 1) return [];

    const newSize = this.size - 1;
    // Split into opposite perpendicular directions with speed boost
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + Math.PI;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const splitSpeed = currentSpeed * 1.25; // 25% speed increase

    const vx1 = Math.cos(angle1) * splitSpeed + this.vx * 0.4;
    const vy1 = Math.sin(angle1) * splitSpeed + this.vy * 0.4;

    const vx2 = Math.cos(angle2) * splitSpeed + this.vx * 0.4;
    const vy2 = Math.sin(angle2) * splitSpeed + this.vy * 0.4;

    return [
      new Asteroid(this.x, this.y, newSize, vx1, vy1, this.color),
      new Asteroid(this.x, this.y, newSize, vx2, vy2, this.color),
    ];
  }

  /**
   * Checks if a point (x, y) is inside the asteroid (uses circle approximation for fast collision).
   */
  collidesWithCircle(cx: number, cy: number, cradius: number): boolean {
    const distSq = (this.x - cx) * (this.x - cx) + (this.y - cy) * (this.y - cy);
    const minDist = this.radius + cradius;
    return distSq < minDist * minDist;
  }
}
