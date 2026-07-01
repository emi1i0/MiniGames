import {
  BASE_HUE,
  BASE_SPEED,
  BASE_WIDTH,
  BLOCK_HEIGHT,
  CAMERA_LERP,
  CAMERA_TARGET_Y,
  HUE_STEP,
  MAX_SPEED,
  PERFECT_EPS,
  SLIVER_DRIFT,
  SLIVER_GRAVITY,
  SPEED_STEP,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "./constants";

/** A stacked (or moving) block. `x` is the left edge, `y` the top edge, both in
 *  tower-world units (y grows downward, bottom of the base sits at VIEW_HEIGHT). */
export interface Block {
  x: number;
  y: number;
  width: number;
  hue: number;
}

/** A sliced-off overhang tumbling away after an imperfect (or missed) drop. */
export interface Sliver {
  x: number;
  y: number;
  width: number;
  hue: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
}

/** A brief white pulse drawn on a perfect placement. */
export interface Flash {
  x: number;
  y: number;
  width: number;
  life: number;
}

export type DropResult = "placed" | "perfect" | "miss";

/**
 * Owns the tower state: placed blocks, the sliding block, falling slivers and
 * the follow camera. Pure simulation — the ready/playing/dead state machine and
 * the game loop live in Game.
 */
export class Tower {
  blocks: Block[] = [];
  moving: Block | null = null;
  slivers: Sliver[] = [];
  flashes: Flash[] = [];
  /** World->screen vertical shift so the top of the tower stays in view. */
  cameraOffset = 0;

  private dir: 1 | -1 = 1;
  private speed = BASE_SPEED;

  reset(): void {
    const base: Block = {
      x: (VIEW_WIDTH - BASE_WIDTH) / 2,
      y: VIEW_HEIGHT - BLOCK_HEIGHT,
      width: BASE_WIDTH,
      hue: BASE_HUE,
    };
    this.blocks = [base];
    this.slivers = [];
    this.flashes = [];
    this.cameraOffset = 0;
    this.dir = 1;
    this.spawnMoving();
  }

  /** Number of blocks stacked on top of the base — the player's score. */
  get score(): number {
    return this.blocks.length - 1;
  }

  private spawnMoving(): void {
    const top = this.blocks[this.blocks.length - 1];
    const width = top.width;
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.blocks.length * SPEED_STEP);
    // Alternate the entry side so the block sweeps back and forth over the tower.
    this.dir = this.dir === 1 ? -1 : 1;
    this.moving = {
      x: this.dir === 1 ? 0 : VIEW_WIDTH - width,
      y: top.y - BLOCK_HEIGHT,
      width,
      hue: BASE_HUE + this.blocks.length * HUE_STEP,
    };
  }

  update(dt: number): void {
    // Slide the moving block, bouncing off the play-field edges.
    const m = this.moving;
    if (m) {
      m.x += this.speed * this.dir * dt;
      if (m.x <= 0) {
        m.x = 0;
        this.dir = 1;
      } else if (m.x + m.width >= VIEW_WIDTH) {
        m.x = VIEW_WIDTH - m.width;
        this.dir = -1;
      }
    }

    // Ease the camera so the active row sits around CAMERA_TARGET_Y once the
    // tower is tall enough; never scrolls below the base (offset >= 0).
    const reference = m ? m.y : this.blocks[this.blocks.length - 1].y;
    const targetOffset = Math.max(0, CAMERA_TARGET_Y - reference);
    this.cameraOffset += (targetOffset - this.cameraOffset) * Math.min(1, CAMERA_LERP * dt);

    // Advance slivers and drop the ones that fell off the bottom of the view.
    for (const s of this.slivers) {
      s.vy += SLIVER_GRAVITY * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
    }
    this.slivers = this.slivers.filter((s) => s.y + this.cameraOffset < VIEW_HEIGHT + 200);

    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);
  }

  /**
   * Drop the moving block onto the tower. Slices off any overhang (spawning a
   * falling sliver) and shrinks the block to the overlap; a well-aligned drop
   * keeps the full width. Returns "miss" when there is no overlap at all.
   */
  drop(): DropResult {
    const m = this.moving;
    if (!m) return "miss";
    const top = this.blocks[this.blocks.length - 1];

    const overlapLeft = Math.max(m.x, top.x);
    const overlapRight = Math.min(m.x + m.width, top.x + top.width);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Nothing landed on the tower: the whole block tumbles away.
      this.slivers.push(this.makeSliver(m.x, m.y, m.width, m.hue, this.dir >= 0 ? 1 : -1));
      this.moving = null;
      return "miss";
    }

    if (Math.abs(m.x - top.x) <= PERFECT_EPS) {
      // Snap to a perfect placement: full width preserved, no waste.
      this.blocks.push({ x: top.x, y: m.y, width: top.width, hue: m.hue });
      this.flashes.push({ x: top.x, y: m.y, width: top.width, life: 0.35 });
      this.moving = null;
      this.spawnMoving();
      return "perfect";
    }

    // Imperfect: keep the overlap, peel the overhang off whichever side stuck out.
    if (m.x < overlapLeft) {
      this.slivers.push(this.makeSliver(m.x, m.y, overlapLeft - m.x, m.hue, -1));
    } else {
      const right = m.x + m.width;
      this.slivers.push(this.makeSliver(overlapRight, m.y, right - overlapRight, m.hue, 1));
    }
    this.blocks.push({ x: overlapLeft, y: m.y, width: overlap, hue: m.hue });
    this.moving = null;
    this.spawnMoving();
    return "placed";
  }

  private makeSliver(x: number, y: number, width: number, hue: number, side: 1 | -1): Sliver {
    return {
      x,
      y,
      width,
      hue,
      vx: side * SLIVER_DRIFT,
      vy: -40,
      rot: 0,
      vr: side * 2.2,
    };
  }
}
