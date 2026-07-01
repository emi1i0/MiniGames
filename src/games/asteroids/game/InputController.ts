export class InputController {
  public rotateLeft = false;
  public rotateRight = false;
  public thrust = false;
  public shoot = false;

  private onShootCallback?: () => void;
  private onStartCallback?: () => void;

  private container: HTMLElement;
  private mobileControlsEl?: HTMLDivElement;

  constructor(container: HTMLElement, onShoot: () => void, onStart: () => void) {
    this.container = container;
    this.onShootCallback = onShoot;
    this.onStartCallback = onStart;

    this.bindKeyboard();
    this.bindTouchDetection();
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private bindTouchDetection(): void {
    const detectTouch = () => {
      this.createMobileControls();
      window.removeEventListener("touchstart", detectTouch);
    };
    window.addEventListener("touchstart", detectTouch, { passive: true });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.rotateLeft = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.rotateRight = true;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        this.thrust = true;
        break;
      case " ":
        // Space shoots
        e.preventDefault(); // Prevent page scroll
        if (!this.shoot) {
          this.shoot = true;
          this.onShootCallback?.();
        }
        break;
      case "Enter":
        this.onStartCallback?.();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.rotateLeft = false;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.rotateRight = false;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        this.thrust = false;
        break;
      case " ":
        this.shoot = false;
        break;
    }
  };

  private createMobileControls(): void {
    if (this.mobileControlsEl) return;

    this.mobileControlsEl = document.createElement("div");
    this.mobileControlsEl.className = "mobile-controls active";

    // Left group: Rotation
    const leftGroup = document.createElement("div");
    leftGroup.className = "mobile-controls__group";

    const btnLeft = document.createElement("div");
    btnLeft.className = "mobile-btn";
    btnLeft.innerHTML = "&larr;";
    this.setupButton(btnLeft, (val) => { this.rotateLeft = val; });

    const btnRight = document.createElement("div");
    btnRight.className = "mobile-btn";
    btnRight.innerHTML = "&rarr;";
    this.setupButton(btnRight, (val) => { this.rotateRight = val; });

    leftGroup.append(btnLeft, btnRight);

    // Right group: Thrust & Fire
    const rightGroup = document.createElement("div");
    rightGroup.className = "mobile-controls__group";

    const btnThrust = document.createElement("div");
    btnThrust.className = "mobile-btn";
    btnThrust.innerHTML = "&#9650;"; // Up triangle
    this.setupButton(btnThrust, (val) => { this.thrust = val; });

    const btnShoot = document.createElement("div");
    btnShoot.className = "mobile-btn mobile-btn--shoot";
    btnShoot.innerHTML = "Fuego";
    btnShoot.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.shoot = true;
      this.onShootCallback?.();
      this.onStartCallback?.(); // Can also trigger action in overlays
    });
    btnShoot.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.shoot = false;
    });

    rightGroup.append(btnThrust, btnShoot);

    this.mobileControlsEl.append(leftGroup, rightGroup);
    this.container.append(this.mobileControlsEl);
  }

  private setupButton(btn: HTMLElement, stateSetter: (val: boolean) => void): void {
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      stateSetter(true);
      this.onStartCallback?.(); // Interacting with controls can activate start screen
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      stateSetter(false);
    });
    btn.addEventListener("touchcancel", (e) => {
      e.preventDefault();
      stateSetter(false);
    });
  }

  public destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    if (this.mobileControlsEl) {
      this.mobileControlsEl.remove();
    }
  }
}
