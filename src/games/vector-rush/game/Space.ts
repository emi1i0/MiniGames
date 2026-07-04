import * as THREE from "three";
import { getDotTexture } from "./dotTexture";
import {
  CAMERA_Z,
  FIELD_HALF_HEIGHT,
  FIELD_HALF_WIDTH,
  FOG_FAR,
  STAR_COUNT,
} from "./constants";

const STAR_DEPTH = FOG_FAR * 0.95;
const STAR_WRAP = STAR_DEPTH + CAMERA_Z + 10;

const RING_COUNT = 16;
const RING_SPACING = 20;
const RING_SPAN = RING_COUNT * RING_SPACING;

function toRgb(c: THREE.Color): string {
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}

/**
 * Smooth Saturn-like latitudinal banding: creamy golds blended along the
 * sphere's latitude with a few band frequencies + faint noise (bands run
 * horizontally so they wrap around the globe).
 */
function makeSaturnTexture(): THREE.CanvasTexture {
  const w = 16;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const cream = new THREE.Color(0xe9dcbc);
  const gold = new THREE.Color(0xcaa96e);
  const tan = new THREE.Color(0xa07d4c);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    // Blend of a few sine bands for smooth, non-repeating stripes.
    const band =
      0.5 +
      0.28 * Math.sin(t * Math.PI * 9) +
      0.14 * Math.sin(t * Math.PI * 23 + 1.3) +
      0.08 * Math.sin(t * Math.PI * 47 + 2.1);
    const noise = (Math.random() - 0.5) * 0.05;
    const m = Math.min(1, Math.max(0, band + noise));
    const c = m < 0.5 ? tan.clone().lerp(gold, m * 2) : gold.clone().lerp(cream, (m - 0.5) * 2);
    ctx.fillStyle = toRgb(c);
    ctx.fillRect(0, y, w, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A cratered, mottled grey moon texture. */
function makeMoonTexture(): THREE.CanvasTexture {
  const s = 128;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#b8b3a4";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const r = 1 + Math.random() * 6;
    const shade = 140 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgba(${shade - 40},${shade - 42},${shade - 55},0.5)`;
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The space backdrop: a deep parallax starfield, scrolling rectangular
 * "corridor" outlines that mark the flight-lane cross-section, and a huge,
 * close ringed Saturn (only partly in frame, its banded rings sweeping across)
 * plus a distant moon. The vista stays put (very far away) while stars scroll.
 */
export class Space {
  readonly group: THREE.Group;

  private readonly stars: THREE.Points;
  private readonly starPositions: Float32Array;
  private readonly rings: THREE.LineLoop[] = [];

  constructor() {
    this.group = new THREE.Group();

    // --- Starfield ---
    this.starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      this.starPositions[i * 3] = (Math.random() * 2 - 1) * FIELD_HALF_WIDTH * 3.2;
      this.starPositions[i * 3 + 1] = (Math.random() * 2 - 1) * FIELD_HALF_HEIGHT * 3.2;
      this.starPositions[i * 3 + 2] = CAMERA_Z - Math.random() * STAR_DEPTH;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute("position", new THREE.BufferAttribute(this.starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xbcd4ff,
      map: getDotTexture(),
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      fog: true,
    });
    this.stars = new THREE.Points(starGeom, starMat);
    this.group.add(this.stars);

    // --- Corridor rings (rectangular outlines scrolling toward the camera) ---
    const w = FIELD_HALF_WIDTH;
    const h = FIELD_HALF_HEIGHT;
    const ringGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-w, -h, 0),
      new THREE.Vector3(w, -h, 0),
      new THREE.Vector3(w, h, 0),
      new THREE.Vector3(-w, h, 0),
    ]);
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x2f6f9e,
      transparent: true,
      opacity: 0.4,
      fog: true,
    });
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = new THREE.LineLoop(ringGeom, ringMat);
      ring.position.z = CAMERA_Z - i * RING_SPACING;
      this.rings.push(ring);
      this.group.add(ring);
    }

    this.buildVista();
  }

  /** A huge close Saturn (partly in frame) with banded rings + a distant moon. */
  private buildVista(): void {
    const R = 52;
    const saturn = new THREE.Group();
    // Up in the top-right, close and large, so only the lower-left limb shows.
    saturn.position.set(58, 44, -120);
    // Tilt the whole system so the rings sweep down toward the lower-left.
    saturn.rotation.set(-1.18, 0.15, 0.62);

    // --- Globe: lit banded sphere (directional light gives the terminator). ---
    const globeMat = new THREE.MeshStandardMaterial({
      map: makeSaturnTexture(),
      roughness: 1,
      metalness: 0,
      emissive: 0x0a0805,
      emissiveIntensity: 1,
      fog: false,
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), globeMat);
    saturn.add(globe);

    // --- Thin atmosphere rim (back-side additive shell glows at the limb). ---
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0xf0e4c4,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 48, 48), atmoMat);
    saturn.add(atmo);

    // --- Ring system: many thin concentric annuli with banding + a Cassini gap.
    // Rings depth-test against the opaque globe, so the far arc is hidden behind
    // the planet — the natural "shadow"/occlusion of the reference photo. ---
    const RING_COUNT = 22;
    const inner = R * 1.22;
    const outer = R * 2.35;
    const dark = new THREE.Color(0x6f5a3a);
    const mid = new THREE.Color(0xbda274);
    const light = new THREE.Color(0xe6d6b0);
    for (let i = 0; i < RING_COUNT; i++) {
      const t = i / RING_COUNT;
      const r0 = inner + (outer - inner) * t;
      const r1 = inner + (outer - inner) * ((i + 1) / RING_COUNT);
      // A wide Cassini-style gap around 45% out, plus a couple thin gaps.
      const gap = (t > 0.42 && t < 0.5) || Math.abs(t - 0.7) < 0.02;
      const bright = 0.45 + 0.4 * Math.sin(t * 26) * 0.5 + 0.25 * Math.random();
      const col = bright < 0.5 ? dark.clone().lerp(mid, bright * 2) : mid.clone().lerp(light, (bright - 0.5) * 2);
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: gap ? 0.04 : 0.55 + Math.random() * 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 160), mat);
      saturn.add(ring);
    }

    this.group.add(saturn);

    // --- A small cratered moon far off to the upper-left, like the reference. ---
    const moonMat = new THREE.MeshStandardMaterial({
      map: makeMoonTexture(),
      roughness: 1,
      metalness: 0,
      emissive: 0x060606,
      emissiveIntensity: 1,
      fog: false,
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 40), moonMat);
    moon.position.set(-40, 22, -170);
    this.group.add(moon);
  }

  /** Scrolls stars and corridor rings toward the camera to convey motion. */
  scroll(distance: number): void {
    // Stars move at full speed; wrap them back to the far end.
    for (let i = 0; i < STAR_COUNT; i++) {
      let z = this.starPositions[i * 3 + 2] + distance;
      if (z > CAMERA_Z + 5) z -= STAR_WRAP;
      this.starPositions[i * 3 + 2] = z;
    }
    (this.stars.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    for (const ring of this.rings) {
      ring.position.z += distance;
      if (ring.position.z > CAMERA_Z + 4) ring.position.z -= RING_SPAN;
    }
  }
}
