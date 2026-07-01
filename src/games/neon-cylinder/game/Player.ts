import * as THREE from "three";
import { PLAYER_ORBIT_RADIUS, PLAYER_RADIUS, PLAYER_ROTATE_SPEED, PLAYER_Z } from "./constants";

/** The glowing sphere that orbits the inner wall of the tunnel. */
export class Player {
  readonly object: THREE.Group;
  angle = 0;

  private readonly core: THREE.Mesh;
  private readonly glow: THREE.Mesh;

  constructor() {
    this.object = new THREE.Group();

    const coreGeometry = new THREE.SphereGeometry(PLAYER_RADIUS, 24, 24);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);

    const glowGeometry = new THREE.SphereGeometry(PLAYER_RADIUS * 1.9, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00fff2,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);

    this.object.add(this.core, this.glow);
    this.object.position.z = PLAYER_Z;
    this.updatePosition();
  }

  reset(): void {
    this.angle = 0;
    this.updatePosition();
  }

  update(dt: number, direction: number): void {
    this.angle += direction * PLAYER_ROTATE_SPEED * dt;
    this.updatePosition();
  }

  /** Instantly jump to the opposite side of the tunnel (half a turn). */
  flip(): void {
    this.angle += Math.PI;
    this.updatePosition();
  }

  private updatePosition(): void {
    this.object.position.x = PLAYER_ORBIT_RADIUS * Math.sin(this.angle);
    this.object.position.y = -PLAYER_ORBIT_RADIUS * Math.cos(this.angle);
    this.object.rotation.z = -this.angle;
  }
}
