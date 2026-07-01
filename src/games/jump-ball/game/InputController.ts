/** Turns keyboard and pointer/touch into continuous lane-change steering plus an
 *  "any input" signal used to start / restart the run. */
export class InputController {
  private readonly target: HTMLElement;
  private readonly onAnyInput: () => void;

  private activeKeys = new Set<string>();
  private pointerDir = 0;

  constructor(target: HTMLElement, onAnyInput: () => void) {
    this.target = target;
    this.onAnyInput = onAnyInput;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("pointerup", this.onPointerUp);
    target.addEventListener("pointercancel", this.onPointerUp);
    target.addEventListener("pointerleave", this.onPointerUp);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerUp);
    this.target.removeEventListener("pointerleave", this.onPointerUp);
  }

  reset(): void {
    this.activeKeys.clear();
    this.pointerDir = 0;
  }

  /** Returns 0, kept for backward compatibility in Game.ts calls. */
  consumeSteer(): number {
    return 0;
  }

  /** Returns -1 for left steering, 1 for right steering, or 0 for none. */
  getSteerDir(): number {
    if (this.activeKeys.has("left")) return -1;
    if (this.activeKeys.has("right")) return 1;
    return this.pointerDir;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      e.preventDefault();
      this.activeKeys.delete("right");
      this.activeKeys.add("left");
      this.onAnyInput();
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      e.preventDefault();
      this.activeKeys.delete("left");
      this.activeKeys.add("right");
      this.onAnyInput();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      this.activeKeys.delete("left");
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      this.activeKeys.delete("right");
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.pointerDir = e.clientX < window.innerWidth / 2 ? -1 : 1;
    this.onAnyInput();
  };

  private onPointerUp = (e: PointerEvent): void => {
    e.preventDefault();
    this.pointerDir = 0;
  };
}
