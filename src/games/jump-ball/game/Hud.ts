/** DOM overlay: live score plus start / game-over screens. */
export class Hud {
  private readonly scoreEl: HTMLDivElement;
  private readonly bestEl: HTMLDivElement;
  private readonly overlayEl: HTMLDivElement;
  private readonly titleEl: HTMLDivElement;
  private readonly subtitleEl: HTMLDivElement;
  private readonly scoreLineEl: HTMLDivElement;
  private readonly hintEl: HTMLDivElement;

  constructor(container: HTMLElement, onActivate: () => void) {
    const hud = document.createElement("div");
    hud.className = "hud";

    this.scoreEl = document.createElement("div");
    this.scoreEl.className = "hud__score";
    this.scoreEl.textContent = "0";

    this.bestEl = document.createElement("div");
    this.bestEl.className = "hud__best";

    hud.append(this.scoreEl, this.bestEl);

    this.overlayEl = document.createElement("div");
    this.overlayEl.className = "overlay";

    this.titleEl = document.createElement("div");
    this.titleEl.className = "overlay__title";

    this.subtitleEl = document.createElement("div");
    this.subtitleEl.className = "overlay__subtitle";

    this.scoreLineEl = document.createElement("div");
    this.scoreLineEl.className = "overlay__score";

    this.hintEl = document.createElement("div");
    this.hintEl.className = "overlay__hint";
    this.hintEl.textContent = "← → / A D / toca izquierda-derecha";

    this.overlayEl.append(this.titleEl, this.subtitleEl, this.scoreLineEl, this.hintEl);

    container.append(hud, this.overlayEl);

    const activate = (e: Event): void => {
      e.preventDefault();
      onActivate();
    };
    this.overlayEl.addEventListener("pointerdown", activate);
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") onActivate();
    });
  }

  setScore(score: number): void {
    this.scoreEl.textContent = String(score);
  }

  setBest(best: number): void {
    this.bestEl.textContent = best > 0 ? `MEJOR: ${best}` : "";
  }

  showStart(): void {
    this.titleEl.textContent = "JUMP BALL";
    this.subtitleEl.textContent = "salta entre las plataformas y no caigas";
    this.scoreLineEl.textContent = "";
    this.hintEl.style.display = "block";
    this.overlayEl.classList.remove("hidden");
  }

  showGameOver(score: number, best: number): void {
    this.titleEl.textContent = "GAME OVER";
    this.subtitleEl.textContent = "toca o presiona espacio para reintentar";
    this.scoreLineEl.textContent =
      score >= best && score > 0
        ? `PUNTAJE: ${score} — ¡NUEVO MEJOR!`
        : `PUNTAJE: ${score}  ·  MEJOR: ${best}`;
    this.hintEl.style.display = "none";
    this.overlayEl.classList.remove("hidden");
  }

  hide(): void {
    this.overlayEl.classList.add("hidden");
  }
}
