import * as THREE from "three";
import {
  COLLISION_TOLERANCE,
  DEBRIS_COLOR,
  FIELD_HALF_HEIGHT,
  FIELD_HALF_WIDTH,
  HAZARD_COLOR,
  ICE_COLOR,
  PLAYER_RADIUS,
  ROCK_COLOR,
} from "./constants";

export type ObstacleKind = "meteor" | "ice" | "debris";

export interface ObstacleConfig {
  kind: ObstacleKind;
  z: number;
  /** Center of the guaranteed clear lane (used for reachability chaining). */
  centerX: number;
  centerY: number;
  laneHalfWidth: number;
  laneHalfHeight: number;
  count: number;
}

// Shared low-poly geometries (never disposed — reused for the whole session).
const ROCK_GEOM = new THREE.IcosahedronGeometry(1, 0);
const ICE_GEOM = new THREE.OctahedronGeometry(1, 0);
const BOX_GEOM = new THREE.BoxGeometry(1, 1, 1);
const CYL_GEOM = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 8);

interface Spinner {
  obj: THREE.Object3D;
  sx: number;
  sy: number;
  sz: number;
}

/**
 * A field of drifting space objects (no solid walls) with a guaranteed clear
 * lane at its center. Collision is per-object, so any open pocket is survivable
 * — you dodge the debris rather than thread a hole. Three visual kinds:
 * `meteor` (rock), `ice` (crystal shards) and `debris` (metal wreckage).
 */
export class Obstacle {
  readonly group: THREE.Group;
  readonly kind: ObstacleKind;
  readonly centerX: number;
  readonly centerY: number;
  resolved = false;

  private readonly disposables: Array<THREE.Material | THREE.BufferGeometry> = [];
  private readonly spinners: Spinner[] = [];
  private readonly objects: Array<{ x: number; y: number; r: number }> = [];

  constructor(cfg: ObstacleConfig) {
    this.kind = cfg.kind;
    this.centerX = cfg.centerX;
    this.centerY = cfg.centerY;
    this.group = new THREE.Group();
    this.group.position.z = cfg.z;

    this.buildField(cfg);
    this.buildLaneMarkers(cfg);
  }

  update(dt: number, dz: number): void {
    this.group.position.z += dz;
    for (const s of this.spinners) {
      s.obj.rotation.x += s.sx * dt;
      s.obj.rotation.y += s.sy * dt;
      s.obj.rotation.z += s.sz * dt;
    }
  }

  get z(): number {
    return this.group.position.z;
  }

  /** Safe when the ship touches none of the field's objects. */
  isSafe(px: number, py: number): boolean {
    for (const o of this.objects) {
      if (Math.hypot(px - o.x, py - o.y) < o.r + PLAYER_RADIUS - COLLISION_TOLERANCE) return false;
    }
    return true;
  }

  dispose(): void {
    for (const m of this.disposables) m.dispose();
    this.disposables.length = 0;
  }

  // --- Builders ---

  private material(kind: ObstacleKind): THREE.MeshStandardMaterial {
    if (kind === "ice") {
      return new THREE.MeshStandardMaterial({
        color: ICE_COLOR,
        metalness: 0.1,
        roughness: 0.15,
        emissive: ICE_COLOR,
        emissiveIntensity: 0.35,
        flatShading: true,
        transparent: true,
        opacity: 0.85,
      });
    }
    if (kind === "debris") {
      return new THREE.MeshStandardMaterial({
        color: DEBRIS_COLOR,
        metalness: 0.9,
        roughness: 0.45,
        flatShading: true,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: ROCK_COLOR,
      metalness: 0.2,
      roughness: 0.95,
      flatShading: true,
    });
  }

  private buildField(cfg: ObstacleConfig): void {
    const mat = this.material(cfg.kind);
    this.disposables.push(mat);

    const laneHW = cfg.laneHalfWidth;
    const laneHH = cfg.laneHalfHeight;

    let placed = 0;
    let attempts = 0;
    while (placed < cfg.count && attempts < cfg.count * 10) {
      attempts++;
      const x = (Math.random() * 2 - 1) * FIELD_HALF_WIDTH;
      const y = (Math.random() * 2 - 1) * FIELD_HALF_HEIGHT;
      const r = 0.5 + Math.random() * 0.95;
      // Keep the reachable clear lane completely free.
      if (Math.abs(x - cfg.centerX) < laneHW + r + 0.3 && Math.abs(y - cfg.centerY) < laneHH + r + 0.3) {
        continue;
      }
      this.objects.push({ x, y, r });
      const mesh = this.makeObjectMesh(cfg.kind, mat, r);
      mesh.position.set(x, y, (Math.random() * 2 - 1) * 0.8);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(mesh);
      this.spinners.push({
        obj: mesh,
        sx: (Math.random() * 2 - 1) * 0.6,
        sy: (Math.random() * 2 - 1) * 0.6,
        sz: (Math.random() * 2 - 1) * 0.6,
      });
      placed++;
    }
  }

  private makeObjectMesh(kind: ObstacleKind, mat: THREE.Material, r: number): THREE.Mesh {
    if (kind === "ice") {
      const mesh = new THREE.Mesh(ICE_GEOM, mat);
      // Elongated crystal shards.
      mesh.scale.set(r * 0.7, r * 1.5, r * 0.7);
      return mesh;
    }
    if (kind === "debris") {
      if (Math.random() < 0.5) {
        const mesh = new THREE.Mesh(BOX_GEOM, mat);
        mesh.scale.set(r * (0.7 + Math.random()), r * (0.7 + Math.random()), r * (0.7 + Math.random()));
        return mesh;
      }
      const mesh = new THREE.Mesh(CYL_GEOM, mat);
      mesh.scale.set(r * 0.8, r, r * 0.8);
      return mesh;
    }
    // Meteorite: lumpy rock.
    const mesh = new THREE.Mesh(ROCK_GEOM, mat);
    mesh.scale.set(r * (0.8 + Math.random() * 0.4), r * (0.8 + Math.random() * 0.4), r * (0.8 + Math.random() * 0.4));
    return mesh;
  }

  /** Amber markers framing the clear lane so it reads at a glance. */
  private buildLaneMarkers(cfg: ObstacleConfig): void {
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0x201400,
      emissive: HAZARD_COLOR,
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.5,
    });
    this.disposables.push(markerMat);
    const geom = new THREE.SphereGeometry(0.16, 10, 10);
    this.disposables.push(geom);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const m = new THREE.Mesh(geom, markerMat);
        m.position.set(cfg.centerX + sx * cfg.laneHalfWidth, cfg.centerY + sy * cfg.laneHalfHeight, 0);
        this.group.add(m);
      }
    }
  }
}
