import "./style.css";
import { Game } from "./game/Game";

const app = document.querySelector<HTMLDivElement>("#app")!;

// Editor visual del laberinto (solo dev): abrir el juego con ?edit=1.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("edit")) {
  void import("./game/MazeEditor").then(({ MazeEditor }) => new MazeEditor(app));
} else {
  new Game(app);
}
