import * as THREE from "three";
import {
  DESPAWN_Z,
  LANE_X,
  PLATFORM_COLOR_A,
  PLATFORM_COLOR_B,
  PLATFORM_DEPTH,
  PLATFORM_FILL,
  PLATFORM_HEIGHT,
  PLATFORM_WIDTH,
  ROW_DEPTH,
  VISIBLE_ROWS,
} from "./constants";

interface Row {
  index: number;
  group: THREE.Group;
  tiles: THREE.Mesh[];
}

/** The streaming stepping-stone track: a pool of platform rows that scroll
 *  toward the camera and recycle to the back. Every row is generated so that
 *  each occupied lane has a reachable platform in the next row (no dead ends). */
export class Track {
  readonly object = new THREE.Group();

  private readonly rows: Row[] = [];
  private readonly occupancy = new Map<number, boolean[]>();
  private readonly matA: THREE.MeshStandardMaterial;
  private readonly matB: THREE.MeshStandardMaterial;
  private nextIndex = 0;

  constructor() {
    const geometry = new THREE.BoxGeometry(PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_DEPTH);
    // Shift so the top surface sits exactly at y = 0.
    geometry.translate(0, -PLATFORM_HEIGHT / 2, 0);

    this.matA = new THREE.MeshStandardMaterial({ color: PLATFORM_COLOR_A, roughness: 0.85 });
    this.matB = new THREE.MeshStandardMaterial({ color: PLATFORM_COLOR_B, roughness: 0.85 });

    for (let r = 0; r < VISIBLE_ROWS; r++) {
      const group = new THREE.Group();
      const tiles: THREE.Mesh[] = [];
      for (let lane = 0; lane < 3; lane++) {
        const tile = new THREE.Mesh(geometry, this.matA);
        tile.position.x = (lane - 1) * LANE_X;
        tile.receiveShadow = true;
        group.add(tile);
        tiles.push(tile);
      }
      this.object.add(group);
      this.rows.push({ index: r, group, tiles });
    }

    this.reset();
  }

  reset(): void {
    this.occupancy.clear();
    this.nextIndex = 0;
    for (const row of this.rows) {
      row.index = this.nextIndex++;
      this.applyRow(row);
    }
    this.layout(0);
  }

  /** Scroll to the given accumulated distance and recycle rows past the camera. */
  update(worldScroll: number): void {
    this.layout(worldScroll);
    for (const row of this.rows) {
      if (row.group.position.z > DESPAWN_Z) {
        this.occupancy.delete(row.index);
        row.index = this.nextIndex++;
        this.applyRow(row);
        row.group.position.z = worldScroll - row.index * ROW_DEPTH;
      }
    }
  }

  /** Is there a platform at (row index, lane)? Missing rows default to safe. */
  laneOccupied(index: number, lane: number): boolean {
    const lanes = this.occupancy.get(index);
    return lanes ? lanes[lane] : true;
  }

  private layout(worldScroll: number): void {
    for (const row of this.rows) {
      row.group.position.z = worldScroll - row.index * ROW_DEPTH;
    }
  }

  private applyRow(row: Row): void {
    const lanes = this.generateLanes(row.index);
    this.occupancy.set(row.index, lanes);
    const mat = row.index % 2 === 0 ? this.matA : this.matB;
    for (let lane = 0; lane < 3; lane++) {
      row.tiles[lane].visible = lanes[lane];
      row.tiles[lane].material = mat;
    }
  }

  private generateLanes(index: number): boolean[] {
    // The very first row is a single centered platform under the ball's start.
    if (index === 0) return [false, true, false];

    const lanes = [
      Math.random() < PLATFORM_FILL,
      Math.random() < PLATFORM_FILL,
      Math.random() < PLATFORM_FILL,
    ];
    if (!lanes.some(Boolean)) lanes[Math.floor(Math.random() * 3)] = true;

    // Guarantee no dead ends: every platform in the previous row must be able to
    // reach a platform here by moving at most one lane.
    const prev = this.occupancy.get(index - 1);
    if (prev) {
      for (let L = 0; L < 3; L++) {
        if (!prev[L]) continue;
        const reach = [L - 1, L, L + 1].filter((l) => l >= 0 && l < 3);
        if (!reach.some((l) => lanes[l])) {
          lanes[reach.includes(L) ? L : reach[0]] = true;
        }
      }
    }
    return lanes;
  }
}
