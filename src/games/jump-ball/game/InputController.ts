/** Turns keyboard and pointer/touch into discrete lane-change steps plus an
 *  "any input" signal used to start / restart the run. */
export class InputController {
  private readonly target: HTMLElement;
  private readonly onAnyInput: () => void;
  /** Net pending lane steps, consumed once per frame by the game. */
  private steerQueue = 0;

  constructor(target: HTMLElement, onAnyInput: () => void) {
    this.target = target;
    this.onAnyInput = onAnyInput;
    window.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("pointerdown", this.onPointerDown);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
  }

  /** Returns the pending steer (-1 left, +1 right, 0 none) and clears it. */
  consumeSteer(): number {
    const s = this.steerQueue;
    this.steerQueue = 0;
    return s;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      if (!e.repeat) this.steerQueue -= 1;
      e.preventDefault();
      this.onAnyInput();
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      if (!e.repeat) this.steerQueue += 1;
      e.preventDefault();
      this.onAnyInput();
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.steerQueue += e.clientX < window.innerWidth / 2 ? -1 : 1;
    this.onAnyInput();
  };
}
