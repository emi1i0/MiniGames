import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { Tunnel } from "./Tunnel";
import { Player } from "./Player";
import { ObstacleSpawner } from "./ObstacleSpawner";
import { InputController } from "./InputController";
import { Hud } from "./Hud";
import {
  BACKGROUND_COLOR,
  BASE_SPEED,
  BEST_SCORE_KEY,
  CAMERA_Z,
  FOG_FAR,
  FOG_NEAR,
  MAX_SPEED,
  SPEED_RAMP_PER_SEC,
} from "./constants";

type GameState = "ready" | "playing" | "gameover";

export class Game {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;

  private readonly tunnel: Tunnel;
  private readonly player: Player;
  private readonly spawner: ObstacleSpawner;
  private readonly input: InputController;
  private readonly hud: Hud;

  private readonly container: HTMLElement;
  private state: GameState = "ready";
  private score = 0;
  private best = 0;
  private elapsed = 0;
  private lastTime = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);
    this.scene.fog = new THREE.Fog(BACKGROUND_COLOR, FOG_NEAR, FOG_FAR);

    this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 0, CAMERA_Z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,
      0.4,
      0.4,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.tunnel = new Tunnel();
    this.player = new Player();
    this.spawner = new ObstacleSpawner(this.scene);

    this.scene.add(this.tunnel.mesh, this.player.object);

    this.input = new InputController(this.renderer.domElement);
    this.hud = new Hud(this.container, () => this.handleActivate());

    this.best = Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    this.hud.setBest(this.best);
    this.hud.showStart();

    window.addEventListener("resize", this.onResize);
    this.renderer.setAnimationLoop(this.tick);
  }

  private handleActivate(): void {
    if (this.state === "playing") return;
    this.startGame();
  }

  private startGame(): void {
    this.player.reset();
    this.spawner.reset();
    this.score = 0;
    this.elapsed = 0;
    this.hud.setScore(0);
    this.hud.hide();
    this.state = "playing";
    this.lastTime = performance.now();
  }

  private endGame(): void {
    this.state = "gameover";
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_SCORE_KEY, String(this.best));
    }
    this.hud.setBest(this.best);
    this.hud.showGameOver(this.score, this.best);
  }

  private readonly tick = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.state === "playing") {
      this.elapsed += dt;
      const speed = Math.min(BASE_SPEED + this.elapsed * SPEED_RAMP_PER_SEC, MAX_SPEED);
      const dz = speed * dt;

      if (this.input.consumeFlip()) this.player.flip();
      this.player.update(dt, this.input.direction);
      this.tunnel.scroll(dz);

      const events = this.spawner.update(dt, dz, this.player.angle, this.player.object.position.z, this.score);
      for (const event of events) {
        if (event === "hit") {
          this.endGame();
          break;
        }
        this.score++;
      }
      this.hud.setScore(this.score);
    } else {
      this.tunnel.scroll(dt * 4);
    }

    this.composer.render();
  };

  private readonly onResize = (): void => {
    const { innerWidth, innerHeight } = window;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.bloomPass.setSize(innerWidth, innerHeight);
  };
}
