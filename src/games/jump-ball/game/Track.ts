import * as THREE from "three";
import {
  DESPAWN_Z,
  LANE_X,
  PLATFORM_COLOR_A,
  PLATFORM_COLOR_B,
  PLATFORM_DEPTH,
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
  private readonly matWhite: THREE.MeshStandardMaterial;
  private nextIndex = 0;

  constructor() {
    const geometry = new THREE.BoxGeometry(PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_DEPTH);
    // Shift so the top surface sits exactly at y = 0.
    geometry.translate(0, -PLATFORM_HEIGHT / 2, 0);

    this.matA = new THREE.MeshStandardMaterial({ color: PLATFORM_COLOR_A, roughness: 0.85 });
    this.matB = new THREE.MeshStandardMaterial({ color: PLATFORM_COLOR_B, roughness: 0.85 });
    this.matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

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

  /** Checks if the given X coordinate is on a generated platform at the specified row. */
  isOnPlatform(index: number, x: number): boolean {
    const lanes = this.occupancy.get(index);
    if (!lanes) return true; // defaults to safe
    for (let lane = 0; lane < 3; lane++) {
      if (lanes[lane]) {
        const laneX = (lane - 1) * LANE_X;
        const halfW = PLATFORM_WIDTH / 2;
        if (x >= laneX - halfW && x <= laneX + halfW) {
          return true;
        }
      }
    }
    return false;
  }

  /** Change the material of the platform at (index, lane) to white when landed on. */
  landOn(index: number, lane: number): void {
    const row = this.rows.find((r) => r.index === index);
    if (row && row.tiles[lane]) {
      row.tiles[lane].material = this.matWhite;
    }
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
    const lanes = [false, false, false];
    if (index === 0) {
      lanes[1] = true;
      return lanes;
    }

    // Pick any of the three lanes randomly (left, center, or right)
    const chosenLane = Math.floor(Math.random() * 3);
    lanes[chosenLane] = true;
    return lanes;
  }
}
