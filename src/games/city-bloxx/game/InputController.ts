/** Turns keyboard / mouse / touch into a single "drop" callback. */
export class InputController {
  private readonly target: HTMLElement;
  private readonly onDrop: () => void;

  constructor(target: HTMLElement, onDrop: () => void) {
    this.target = target;
    this.onDrop = onDrop;
    window.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("pointerdown", this.onPointerDown);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "Space" || e.code === "ArrowDown" || e.code === "Enter") {
      e.preventDefault();
      this.onDrop();
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.onDrop();
  };
}
