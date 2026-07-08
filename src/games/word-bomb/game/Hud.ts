export interface HudPlayer {
  nickname: string;
  lives: number;
  alive: boolean;
  connected: boolean;
  isTurn: boolean;
  isMe: boolean;
  /** Ultima palabra aceptada por este jugador (se muestra bajo su avatar). */
  lastWord: string;
}

export interface PlayView {
  players: HudPlayer[];
  fragment: string | null;
  myTurn: boolean;
  usedCount: number;
}

/** Avatar generico compartido por todos (silueta violeta sobre placa gris). La
 *  identidad la da el nombre, no una imagen. Ver DESIGN.md ("Mesa de bomba"). */
const AVATAR_SVG = `
  <svg class="wb__avatar-svg" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="24" r="12"></circle>
    <path d="M12 56c0-11 9-18 20-18s20 7 20 18z"></path>
  </svg>`;

/** Radio del circulo de jugadores, como fraccion del semilado de la arena. */
const RING_RADIUS = 0.37;

/**
 * DOM de Bomba Palabra (estetica "mesa de bomba", ver DESIGN.md): los jugadores
 * forman un circulo alrededor de la bomba central; cada uno es nombre arriba,
 * avatar generico, y debajo lo que escribe. La bomba muestra el fragmento y una
 * flecha apunta al jugador de turno. NO hay caja de texto: un input invisible
 * captura el tecleo (y summonea el teclado en movil) y el texto se ve bajo el
 * avatar propio. Los estados de espera / resultados / tablero final los cubre el
 * `RoomOverlay` compartido por encima.
 */
export class Hud {
  private readonly stage: HTMLDivElement;
  private readonly arena: HTMLDivElement;
  private readonly bombFragEl: HTMLDivElement;
  private readonly pointer: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly overlay: HTMLDivElement;
  private readonly countdownEl: HTMLDivElement;

  /** Celda de palabra por jugador (para actualizar el tipeo sin re-render). */
  private wordEls = new Map<string, HTMLDivElement>();
  /** Tarjeta por jugador (para sacudir en el rechazo). */
  private cardEls = new Map<string, HTMLDivElement>();
  private me = "";

  private submitCb: (word: string) => void = () => {};
  private typeCb: (text: string) => void = () => {};

  constructor(root: HTMLElement) {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "wb";
    wrap.innerHTML = `
      <div class="wb__stage" hidden>
        <div class="wb__arena">
          <div class="wb__bomb">
            <div class="wb__bomb-frag"></div>
          </div>
          <div class="wb__pointer" hidden></div>
        </div>
        <input class="wb__input" type="text" inputmode="text" autocapitalize="off"
               autocomplete="off" autocorrect="off" spellcheck="false" maxlength="32"
               aria-label="escribi una palabra" />
      </div>
      <div class="wb__overlay"></div>
      <div class="wb__countdown" hidden></div>
    `;
    root.appendChild(wrap);

    this.stage = wrap.querySelector(".wb__stage")!;
    this.arena = wrap.querySelector(".wb__arena")!;
    this.bombFragEl = wrap.querySelector(".wb__bomb-frag")!;
    this.pointer = wrap.querySelector(".wb__pointer")!;
    this.input = wrap.querySelector(".wb__input")!;
    this.overlay = wrap.querySelector(".wb__overlay")!;
    this.countdownEl = wrap.querySelector(".wb__countdown")!;

    // Enter envia; el texto tipeado se refleja bajo el avatar propio en vivo.
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const word = this.input.value.trim();
        if (word) this.submitCb(word);
      }
    });
    this.input.addEventListener("input", () => {
      this.typeCb(this.input.value);
      this.setWord(this.me, this.input.value);
    });
    // Tocar la arena enfoca el input (summonea el teclado en movil sin caja visible).
    this.arena.addEventListener("pointerdown", () => {
      if (!this.input.disabled) this.input.focus();
    });
  }

  onSubmit(cb: (word: string) => void): void {
    this.submitCb = cb;
  }
  onType(cb: (text: string) => void): void {
    this.typeCb = cb;
  }

  // ---------- Mensajes / countdown ----------

  /** Cartel a pantalla (start, requiere sala, no disponible). `bodyHtml` es HTML. */
  showMessage(title: string, bodyHtml: string, action?: { label: string; onClick: () => void }): void {
    this.stage.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <div class="wb__card">
        <h1 class="wb__title">${title}</h1>
        <div class="wb__body">${bodyHtml}</div>
        ${action ? `<button class="wb__btn" type="button">${action.label}</button>` : ""}
      </div>
    `;
    if (action) {
      this.overlay.querySelector<HTMLButtonElement>(".wb__btn")!.addEventListener(
        "click",
        action.onClick,
      );
    }
  }

  hideMessage(): void {
    this.overlay.hidden = true;
    this.overlay.innerHTML = "";
  }

  showCountdown(text: string | null): void {
    if (text === null) {
      this.countdownEl.hidden = true;
      return;
    }
    this.countdownEl.hidden = false;
    this.countdownEl.textContent = text;
    this.countdownEl.classList.remove("is-pop");
    void this.countdownEl.offsetWidth; // reflow para reiniciar la animacion
    this.countdownEl.classList.add("is-pop");
  }

  // ---------- Escena en-juego ----------

  showStage(): void {
    this.hideMessage();
    this.stage.hidden = false;
  }

  render(view: PlayView): void {
    this.me = view.players.find((p) => p.isMe)?.nickname ?? this.me;

    // Reconstruye el circulo. Se limpian solo las tarjetas (bomba/pointer quedan).
    for (const el of this.cardEls.values()) el.remove();
    this.cardEls.clear();
    this.wordEls.clear();

    const n = view.players.length;
    let turnAngle: number | null = null;

    view.players.forEach((p, i) => {
      const angle = n > 0 ? (i * 360) / n : 0; // 0 = arriba, girando en sentido horario
      const rad = (angle * Math.PI) / 180;
      const x = 50 + RING_RADIUS * 100 * Math.sin(rad);
      const y = 50 - RING_RADIUS * 100 * Math.cos(rad);
      if (p.isTurn) turnAngle = angle;

      const card = document.createElement("div");
      card.className = "wb__player";
      if (p.isTurn) card.classList.add("is-turn");
      if (p.isMe) card.classList.add("is-me");
      if (!p.alive) card.classList.add("is-out");
      if (!p.connected) card.classList.add("is-off");
      card.style.left = `${x}%`;
      card.style.top = `${y}%`;

      const badge = p.alive
        ? `<span class="wb__hearts">${"❤️".repeat(Math.max(0, p.lives))}</span>`
        : `<span class="wb__skull">\u{1F480}</span>`;

      // La palabra bajo el avatar: el que tiene el turno arranca vacio (se llena
      // con el tipeo en vivo); el resto muestra su ultima palabra aceptada.
      const word = p.isTurn ? "" : p.lastWord;

      card.innerHTML = `
        <div class="wb__pname">${escapeHtml(p.nickname)}</div>
        <div class="wb__badge">${badge}</div>
        <div class="wb__avatar">${AVATAR_SVG}</div>
        <div class="wb__word">${escapeHtml(word)}</div>
      `;
      this.arena.appendChild(card);
      this.cardEls.set(p.nickname, card);
      this.wordEls.set(p.nickname, card.querySelector<HTMLDivElement>(".wb__word")!);
    });

    // Bomba: fragmento + flecha girando hacia el jugador de turno.
    this.bombFragEl.textContent = view.fragment ? view.fragment.toUpperCase() : "";
    if (turnAngle !== null) {
      this.pointer.hidden = false;
      this.pointer.style.transform = `translate(-50%, -50%) rotate(${turnAngle}deg) translateY(-70px)`;
    } else {
      this.pointer.hidden = true;
    }

    this.setInputEnabled(view.myTurn);
    if (view.myTurn) this.setWord(this.me, this.input.value);
  }

  /** Actualiza la palabra bajo el avatar de un jugador (tipeo en vivo o aceptada). */
  private setWord(nickname: string, text: string): void {
    const el = this.wordEls.get(nickname);
    if (el) el.textContent = text;
  }

  setInputEnabled(on: boolean): void {
    this.input.disabled = !on;
    if (on) {
      this.input.focus();
    } else {
      this.input.value = "";
      this.input.blur();
    }
  }

  clearInput(): void {
    this.input.value = "";
    this.setWord(this.me, "");
  }

  focusInput(): void {
    if (!this.input.disabled) this.input.focus();
  }

  /** Muestra lo que el jugador de turno (otro) esta tecleando, bajo su avatar. */
  showTyping(player: string, text: string): void {
    this.setWord(player, text);
  }

  /** Rechazo: sacude el avatar propio y muestra el motivo bajo el. */
  flashReject(message: string): void {
    const card = this.cardEls.get(this.me);
    if (card) {
      card.classList.remove("is-reject");
      void card.offsetWidth;
      card.classList.add("is-reject");
      window.setTimeout(() => card.classList.remove("is-reject"), 500);
    }
    const el = this.wordEls.get(this.me);
    if (el) {
      el.textContent = message;
      el.classList.add("is-reject");
      window.setTimeout(() => el.classList.remove("is-reject"), 900);
    }
  }

  /** Sello de palabra aceptada bajo el avatar de quien la escribio. */
  flashAccept(player: string, word: string): void {
    const el = this.wordEls.get(player);
    if (!el) return;
    el.textContent = word;
    el.classList.remove("is-reject");
    el.classList.add("is-accept");
    window.setTimeout(() => el.classList.remove("is-accept"), 700);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
