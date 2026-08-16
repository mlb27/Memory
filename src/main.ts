import "./styles/style.scss";
import { MemoryGame } from "./classes/memory-game.class";
import { getAssetPath } from "./utils/asset-path";
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

/**
 * Initializes the navigation, settings controls and initial summary values.
 */
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

/**
 * Connects a button identified by its data action to a click handler.
 * @param action - Value of the button's `data-action` attribute.
 * @param handler - Function that runs when the button is clicked.
 */
function addActionListener(action: string, handler: () => void): void {
  const button = document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
  button?.addEventListener("click", handler);
}

/**
 * Displays the settings screen by updating the active screen state.
 */
function showSettings(): void {
  document.body.dataset.screen = "settings";
}

/**
 * Applies a changed radio setting and refreshes the settings summary.
 * @param event - Change event emitted by the settings form.
 */
function handleSettingsChange(event: Event): void {
  const input = event.target;

  if (!(input instanceof HTMLInputElement)) return;
  if (input.name === "theme") document.body.dataset.theme = input.value;
  updateSettingsSummary();
}

/**
 * Finds the currently selected input of a radio group.
 * @param name - Name of the radio group to search.
 * @returns The selected input, or `null` when no option is selected.
 */
function getSelectedInput(name: string): HTMLInputElement | null {
  return SETTINGS_FORM?.querySelector<HTMLInputElement>(
    `input[name="${name}"]:checked`,
  ) ?? null;
}

/**
 * Updates one summary value with its selected option or fallback text.
 * @param id - ID of the summary element to update.
 * @param name - Name of the corresponding radio group.
 * @param fallback - Text shown when the group has no selection.
 * @returns Whether an option is selected in the radio group.
 */
function updateSummaryValue(id: string, name: string, fallback: string): boolean {
  const selectedInput = getSelectedInput(name);
  const summary = document.querySelector<HTMLElement>(`#${id}`);

  if (summary) summary.textContent = selectedInput?.dataset.summary ?? fallback;
  return selectedInput !== null;
}

/**
 * Updates all selected values and the availability of the start button.
 */
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

/**
 * Checks whether the selected theme and board size are implemented.
 * @returns Whether the current game configuration is supported.
 */
function isSupportedConfiguration(): boolean {
  const theme = getSelectedInput("theme")?.value;
  const boardSize = getSelectedInput("boardSize")?.value;
  const supportedThemes = ["code-vibes", "gaming"];
  const supportedSizes = ["16", "24", "36"];
  return supportedThemes.includes(theme ?? "") && supportedSizes.includes(boardSize ?? "");
}

/**
 * Creates the selected game, starts it and displays the game screen.
 */
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

/**
 * Reads the complete game selection from the settings form.
 * @returns The selected game settings, or `null` when a value is missing.
 */
function getGameSettings(): GameSettings | null {
  const theme = getSelectedInput("theme")?.value;
  const player = getSelectedInput("player")?.value;
  const boardSize = getSelectedInput("boardSize")?.value;

  if (!theme || !player || !boardSize) return null;
  return createGameSettings(theme, player, boardSize);
}

/**
 * Converts validated form values into typed game settings.
 * @param theme - Selected theme value from the settings form.
 * @param player - Selected starting player value from the settings form.
 * @param boardSize - Selected board-size value from the settings form.
 * @returns The typed settings used to create a game.
 */
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

/**
 * Stores the active game selection and displays the game screen.
 * @param settings - Complete settings of the game being displayed.
 */
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

/**
 * Updates interface labels that differ between the visual themes.
 * @param theme - Theme whose labels should be displayed.
 */
function updateThemeTexts(theme: GameTheme): void {
  const isGaming = theme === "gaming";
  if (QUIT_CANCEL_BUTTON) QUIT_CANCEL_BUTTON.textContent = isGaming ? "No, back to game" : "Back to game";
  if (QUIT_CONFIRM_BUTTON) QUIT_CONFIRM_BUTTON.textContent = isGaming ? "Yes, quit game" : "Exit game";
  if (RESULT_BUTTON) RESULT_BUTTON.textContent = isGaming ? "Home" : "Back to start";
}

/**
 * Stops the completed game and starts its result sequence.
 * @param scores - Final scores reported by the completed game.
 */
function handleCompletedGame(scores: GameScores): void {
  activeGame?.destroy();
  activeGame = null;
  const result = getGameResult(scores);
  showGameOver(scores, result);
}

/**
 * Displays the final score briefly before revealing the result screen.
 * @param scores - Final scores displayed on the game-over screen.
 * @param result - Winner color or draw result revealed afterwards.
 */
function showGameOver(scores: GameScores, result: GameResult): void {
  updateFinalScores(scores);
  document.body.dataset.screen = "game-over";
  resultTimeout = window.setTimeout(
    () => showResultScreen(result),
    GAME_OVER_DURATION,
  );
}

/**
 * Writes both final scores and theme-specific icons to the game-over screen.
 * @param scores - Final blue and orange player scores.
 */
function updateFinalScores(scores: GameScores): void {
  const blueScore = document.querySelector<HTMLElement>("#final-blue-score");
  const orangeScore = document.querySelector<HTMLElement>("#final-orange-score");
  if (blueScore) blueScore.textContent = String(scores.blue);
  if (orangeScore) orangeScore.textContent = String(scores.orange);
  updateFinalScoreIcon(FINAL_BLUE_ICON, "blue");
  updateFinalScoreIcon(FINAL_ORANGE_ICON, "orange");
}

/**
 * Updates one final-score icon for the selected theme and player.
 * @param icon - Image element that should display the player icon.
 * @param player - Player color represented by the icon.
 */
function updateFinalScoreIcon(icon: HTMLImageElement | null, player: PlayerColor): void {
  if (!icon) return;
  const folder = isGamingTheme() ? "results/pawn" : "icons/game/player";
  icon.src = getAssetPath(`${folder}-${player}.png`);
}

/**
 * Prepares and displays the winner or draw screen.
 * @param result - Winner color or draw result to display.
 */
function showResultScreen(result: GameResult): void {
  document.body.dataset.result = result;
  updateResultContent(result);
  document.body.dataset.screen = "result";
  resultTimeout = undefined;
}

/**
 * Compares both scores and determines the completed game's result.
 * @param scores - Final scores that should be compared.
 * @returns The winner's color, or `draw` for equal scores.
 */
function getGameResult(scores: GameScores): GameResult {
  if (scores.blue === scores.orange) return "draw";
  return scores.blue > scores.orange ? "blue" : "orange";
}

/**
 * Updates the shared result elements for a winner or draw.
 * @param result - Winner color or draw result to render.
 */
function updateResultContent(result: GameResult): void {
  const isDraw = result === "draw";
  if (RESULT_EYEBROW) RESULT_EYEBROW.textContent = isDraw ? "It's a" : "The winner is";
  if (RESULT_TITLE) RESULT_TITLE.textContent = getResultTitle(result);
  if (!RESULT_ICON) return;
  updateResultIcon(getResultImagePath(result), getResultImageText(result));
}

/**
 * Creates the result headline in the selected theme's spelling.
 * @param result - Winner color or draw result represented by the headline.
 * @returns The theme-specific result headline.
 */
function getResultTitle(result: GameResult): string {
  if (result === "draw") return "DRAW";
  const playerName = result === "blue" ? "Blue" : "Orange";
  return isGamingTheme() ? `${playerName} Player` : `${playerName.toUpperCase()} PLAYER`;
}

/**
 * Creates the asset path for a theme-specific result illustration.
 * @param result - Winner color or draw result represented by the image.
 * @returns The public asset path of the matching illustration.
 */
function getResultImagePath(result: GameResult): string {
  if (isGamingTheme()) {
    const imageName = result === "draw" ? "scale" : "trophy";
    return getAssetPath(`themes/gaming/results/${imageName}.png`);
  }
  if (result === "draw") return getAssetPath("results/scale.png");
  return getAssetPath(`results/pawn-${result}.png`);
}

/**
 * Creates an accessible description of the current result image.
 * @param result - Winner color or draw result represented by the image.
 * @returns Alternative text for the result illustration.
 */
function getResultImageText(result: GameResult): string {
  if (result === "draw") return "Balanced scale";
  if (isGamingTheme()) return "Winner trophy";
  return `${result} player`;
}

/**
 * Checks whether the currently displayed theme is Gaming.
 * @returns Whether the Gaming theme is active.
 */
function isGamingTheme(): boolean {
  return document.body.dataset.theme === "gaming";
}

/**
 * Replaces the result icon while hiding its previous image during loading.
 * @param imagePath - Public path of the new result image.
 * @param imageText - Accessible alternative text for the new image.
 */
function updateResultIcon(imagePath: string, imageText: string): void {
  if (!RESULT_ICON) return;
  RESULT_ICON.classList.add("is-loading");
  RESULT_ICON.onload = showResultIcon;
  RESULT_ICON.src = imagePath;
  RESULT_ICON.alt = imageText;
  if (RESULT_ICON.complete) showResultIcon();
}

/**
 * Reveals the result icon after its new image has finished loading.
 */
function showResultIcon(): void {
  if (!RESULT_ICON) return;
  RESULT_ICON.classList.remove("is-loading");
  RESULT_ICON.onload = null;
}

/**
 * Opens the native quit confirmation dialog when it is closed.
 */
function openQuitDialog(): void {
  if (QUIT_DIALOG && !QUIT_DIALOG.open) QUIT_DIALOG.showModal();
}

/**
 * Closes the quit confirmation dialog when it is open.
 */
function closeQuitDialog(): void {
  if (QUIT_DIALOG?.open) QUIT_DIALOG.close();
}

/**
 * Destroys the active game and returns to its retained settings.
 */
function exitCurrentGame(): void {
  activeGame?.destroy();
  activeGame = null;
  closeQuitDialog();
  returnToSettings();
}

/**
 * Returns from an outcome screen to the retained settings selection.
 */
function returnToSettings(): void {
  clearResultTransition();
  delete document.body.dataset.result;
  document.body.dataset.screen = "settings";
}

/**
 * Cancels an unfinished transition to an outcome screen.
 */
function clearResultTransition(): void {
  if (resultTimeout) window.clearTimeout(resultTimeout);
  resultTimeout = undefined;
}
