import "./styles/style.scss";
import { MemoryGame } from "./classes/memory-game.class";
import type {
  BoardSize,
  GameResult,
  GameScores,
  GameSettings,
  GameTheme,
  PlayerColor,
} from "./types/game.types";

const GAME_OVER_DURATION = 3000;
const SETTINGS_FORM = document.querySelector<HTMLFormElement>("#settings-form");
const GAME_SCREEN = document.querySelector<HTMLElement>("[data-screen-view=game]");
const QUIT_DIALOG = document.querySelector<HTMLDialogElement>("#quit-dialog");
const RESULT_EYEBROW = document.querySelector<HTMLElement>("#result-eyebrow");
const RESULT_TITLE = document.querySelector<HTMLElement>("#result-title");
const RESULT_ICON = document.querySelector<HTMLImageElement>("#result-icon");
const FINAL_BLUE_ICON = document.querySelector<HTMLImageElement>("#final-blue-player-icon");
const FINAL_ORANGE_ICON = document.querySelector<HTMLImageElement>("#final-orange-player-icon");
const QUIT_CANCEL_BUTTON = document.querySelector<HTMLButtonElement>(
  '[data-action="close-quit-dialog"]',
);
const QUIT_CONFIRM_BUTTON = document.querySelector<HTMLButtonElement>(
  '[data-action="confirm-game-exit"]',
);
const RESULT_BUTTON = document.querySelector<HTMLButtonElement>('[data-action="back-to-settings"]');
let activeGame: MemoryGame | null = null;
let resultTimeout: number | undefined;

initializeMemory();

/** Initializes the navigation and all settings controls. */
function initializeMemory(): void {
  const playButton = document.querySelector<HTMLButtonElement>(
    '[data-action="open-settings"]',
  );

  playButton?.addEventListener("click", showSettings);
  SETTINGS_FORM?.addEventListener("change", handleSettingsChange);
  addActionListener("start-game", startSelectedGame);
  addActionListener("open-quit-dialog", openQuitDialog);
  addActionListener("close-quit-dialog", closeQuitDialog);
  addActionListener("confirm-game-exit", exitCurrentGame);
  addActionListener("back-to-settings", returnToSettings);
  updateSettingsSummary();
}

/** Connects one data-action button with its click handler. */
function addActionListener(action: string, handler: () => void): void {
  const button = document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
  button?.addEventListener("click", handler);
}

/** Displays the settings screen. */
function showSettings(): void {
  document.body.dataset.screen = "settings";
}

/** Applies a changed setting and refreshes the summary. */
function handleSettingsChange(event: Event): void {
  const input = event.target;

  if (!(input instanceof HTMLInputElement)) return;
  if (input.name === "theme") document.body.dataset.theme = input.value;
  updateSettingsSummary();
}

/** Returns the currently selected input of a radio group. */
function getSelectedInput(name: string): HTMLInputElement | null {
  return SETTINGS_FORM?.querySelector<HTMLInputElement>(
    `input[name="${name}"]:checked`,
  ) ?? null;
}

/** Updates one summary value with its selection or fallback text. */
function updateSummaryValue(id: string, name: string, fallback: string): boolean {
  const selectedInput = getSelectedInput(name);
  const summary = document.querySelector<HTMLElement>(`#${id}`);

  if (summary) summary.textContent = selectedInput?.dataset.summary ?? fallback;
  return selectedInput !== null;
}

/** Updates the selected values and the availability of the start button. */
function updateSettingsSummary(): void {
  const hasTheme = updateSummaryValue("theme-summary", "theme", "Game theme");
  const hasPlayer = updateSummaryValue("player-summary", "player", "Player");
  const hasBoard = updateSummaryValue("board-summary", "boardSize", "Board size");
  const startButton = SETTINGS_FORM?.querySelector<HTMLButtonElement>(
    "[data-action=start-game]",
  );
  const isSupported = isSupportedConfiguration();

  if (startButton) startButton.disabled = !(hasTheme && hasPlayer && hasBoard && isSupported);
}

/** Checks whether the currently selected game variant is implemented. */
function isSupportedConfiguration(): boolean {
  const theme = getSelectedInput("theme")?.value;
  const boardSize = getSelectedInput("boardSize")?.value;
  const supportedThemes = ["code-vibes", "gaming"];
  const supportedSizes = ["16", "24", "36"];
  return supportedThemes.includes(theme ?? "") && supportedSizes.includes(boardSize ?? "");
}

/** Creates the selected game and displays its screen. */
function startSelectedGame(): void {
  const settings = getGameSettings();

  if (!settings || !GAME_SCREEN || !isSupportedConfiguration()) return;
  clearResultTransition();
  activeGame?.destroy();
  activeGame = new MemoryGame(
    GAME_SCREEN,
    settings,
    handleCompletedGame,
  );
  activeGame.start();
  showGameScreen(settings);
}

/** Reads the complete selection from the settings form. */
function getGameSettings(): GameSettings | null {
  const theme = getSelectedInput("theme")?.value;
  const player = getSelectedInput("player")?.value;
  const boardSize = getSelectedInput("boardSize")?.value;

  if (!theme || !player || !boardSize) return null;
  return createGameSettings(theme, player, boardSize);
}

/** Converts controlled form values into typed game settings. */
function createGameSettings(
  theme: string,
  player: string,
  boardSize: string,
): GameSettings {
  return {
    theme: theme as GameTheme,
    startingPlayer: player as PlayerColor,
    boardSize: Number(boardSize) as BoardSize,
  };
}

/** Stores the active game selection and displays the game screen. */
function showGameScreen(settings: GameSettings): void {
  delete document.body.dataset.result;
  document.body.dataset.screen = "game";
  document.body.dataset.theme = settings.theme;
  document.body.dataset.player = settings.startingPlayer;
  document.body.dataset.boardSize = String(settings.boardSize);
  const themeName = settings.theme === "gaming" ? "Gaming" : "Code vibes";
  GAME_SCREEN?.setAttribute("aria-label", `${themeName} memory game`);
  updateThemeTexts(settings.theme);
}

/** Updates labels that differ between both visual themes. */
function updateThemeTexts(theme: GameTheme): void {
  const isGaming = theme === "gaming";
  if (QUIT_CANCEL_BUTTON) QUIT_CANCEL_BUTTON.textContent = isGaming ? "No, back to game" : "Back to game";
  if (QUIT_CONFIRM_BUTTON) QUIT_CONFIRM_BUTTON.textContent = isGaming ? "Yes, quit game" : "Exit game";
  if (RESULT_BUTTON) RESULT_BUTTON.textContent = isGaming ? "Home" : "Back to start";
}

/** Displays the final score before revealing the game's result. */
function handleCompletedGame(scores: GameScores): void {
  activeGame?.destroy();
  activeGame = null;
  const result = getGameResult(scores);
  showGameOver(scores, result);
}

/** Displays the final score briefly before revealing the result. */
function showGameOver(scores: GameScores, result: GameResult): void {
  updateFinalScores(scores);
  document.body.dataset.screen = "game-over";
  resultTimeout = window.setTimeout(
    () => showResultScreen(result),
    GAME_OVER_DURATION,
  );
}

/** Writes the final score into the game-over screen. */
function updateFinalScores(scores: GameScores): void {
  const blueScore = document.querySelector<HTMLElement>("#final-blue-score");
  const orangeScore = document.querySelector<HTMLElement>("#final-orange-score");
  if (blueScore) blueScore.textContent = String(scores.blue);
  if (orangeScore) orangeScore.textContent = String(scores.orange);
  updateFinalScoreIcon(FINAL_BLUE_ICON, "blue");
  updateFinalScoreIcon(FINAL_ORANGE_ICON, "orange");
}

/** Updates one final-score icon for the selected theme. */
function updateFinalScoreIcon(icon: HTMLImageElement | null, player: PlayerColor): void {
  if (!icon) return;
  const folder = isGamingTheme() ? "/assets/resuts/pawn" : "/assets/icons/game/player";
  icon.src = `${folder}-${player}.png`;
}

/** Displays the prepared winner or draw screen. */
function showResultScreen(result: GameResult): void {
  document.body.dataset.result = result;
  updateResultContent(result);
  document.body.dataset.screen = "result";
  resultTimeout = undefined;
}

/** Compares both scores and returns the completed game's result. */
function getGameResult(scores: GameScores): GameResult {
  if (scores.blue === scores.orange) return "draw";
  return scores.blue > scores.orange ? "blue" : "orange";
}

/** Updates the shared result elements for winner or draw. */
function updateResultContent(result: GameResult): void {
  const isDraw = result === "draw";
  if (RESULT_EYEBROW) RESULT_EYEBROW.textContent = isDraw ? "It's a" : "The winner is";
  if (RESULT_TITLE) RESULT_TITLE.textContent = getResultTitle(result);
  if (!RESULT_ICON) return;
  updateResultIcon(getResultImagePath(result), getResultImageText(result));
}

/** Returns the result headline in the selected theme's spelling. */
function getResultTitle(result: GameResult): string {
  if (result === "draw") return "DRAW";
  const playerName = result === "blue" ? "Blue" : "Orange";
  return isGamingTheme() ? `${playerName} Player` : `${playerName.toUpperCase()} PLAYER`;
}

/** Returns the theme-specific illustration for a completed game. */
function getResultImagePath(result: GameResult): string {
  if (isGamingTheme()) {
    const imageName = result === "draw" ? "scale" : "trophy";
    return `/assets/themes/gaming/results/${imageName}.png`;
  }
  if (result === "draw") return "/assets/results/scale.png";
  return `/assets/results/pawn-${result}.png`;
}

/** Returns an accessible description of the current result image. */
function getResultImageText(result: GameResult): string {
  if (result === "draw") return "Balanced scale";
  if (isGamingTheme()) return "Winner trophy";
  return `${result} player`;
}

/** Checks whether the currently displayed theme is Gaming. */
function isGamingTheme(): boolean {
  return document.body.dataset.theme === "gaming";
}

/** Replaces the result icon without displaying its previous image. */
function updateResultIcon(imagePath: string, imageText: string): void {
  if (!RESULT_ICON) return;
  RESULT_ICON.classList.add("is-loading");
  RESULT_ICON.onload = showResultIcon;
  RESULT_ICON.src = imagePath;
  RESULT_ICON.alt = imageText;
  if (RESULT_ICON.complete) showResultIcon();
}

/** Reveals the result icon after its new image is available. */
function showResultIcon(): void {
  if (!RESULT_ICON) return;
  RESULT_ICON.classList.remove("is-loading");
  RESULT_ICON.onload = null;
}

/** Opens the native confirmation dialog. */
function openQuitDialog(): void {
  if (QUIT_DIALOG && !QUIT_DIALOG.open) QUIT_DIALOG.showModal();
}

/** Closes the confirmation dialog. */
function closeQuitDialog(): void {
  if (QUIT_DIALOG?.open) QUIT_DIALOG.close();
}

/** Ends the active game and returns to its settings. */
function exitCurrentGame(): void {
  activeGame?.destroy();
  activeGame = null;
  closeQuitDialog();
  returnToSettings();
}

/** Returns from an outcome screen to the retained settings. */
function returnToSettings(): void {
  clearResultTransition();
  delete document.body.dataset.result;
  document.body.dataset.screen = "settings";
}

/** Cancels an unfinished transition to an outcome screen. */
function clearResultTransition(): void {
  if (resultTimeout) window.clearTimeout(resultTimeout);
  resultTimeout = undefined;
}
