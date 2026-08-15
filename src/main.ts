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

const gameOverDuration = 3000;
const settingsForm = document.querySelector<HTMLFormElement>("#settings-form");
const gameScreen = document.querySelector<HTMLElement>("[data-screen-view=game]");
const quitDialog = document.querySelector<HTMLDialogElement>("#quit-dialog");
const resultEyebrow = document.querySelector<HTMLElement>("#result-eyebrow");
const resultTitle = document.querySelector<HTMLElement>("#result-title");
const resultIcon = document.querySelector<HTMLImageElement>("#result-icon");
let activeGame: MemoryGame | null = null;
let resultTimeout: number | undefined;

initializeMemory();

/** Initializes the navigation and all settings controls. */
function initializeMemory(): void {
    const playButton = document.querySelector<HTMLButtonElement>(
        '[data-action="open-settings"]',
    );

    playButton?.addEventListener("click", showSettings);
    settingsForm?.addEventListener("change", handleSettingsChange);
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
    return settingsForm?.querySelector<HTMLInputElement>(
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
    const startButton = settingsForm?.querySelector<HTMLButtonElement>(
        "[data-action=start-game]",
    );
    const isSupported = isSupportedConfiguration();

    if (startButton) startButton.disabled = !(hasTheme && hasPlayer && hasBoard && isSupported);
}

/** Checks whether the currently selected game variant is implemented. */
function isSupportedConfiguration(): boolean {
    const theme = getSelectedInput("theme")?.value;
    const boardSize = getSelectedInput("boardSize")?.value;
    const supportedSizes = ["16", "24", "36"];
    return theme === "code-vibes" && supportedSizes.includes(boardSize ?? "");
}

/** Creates the selected game and displays its screen. */
function startSelectedGame(): void {
    const settings = getGameSettings();

    if (!settings || !gameScreen || !isSupportedConfiguration()) return;
    clearResultTransition();
    activeGame?.destroy();
    activeGame = new MemoryGame(
        gameScreen,
        settings,
        (scores) => handleCompletedGame(scores, settings.startingPlayer),
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
    document.body.dataset.player = settings.startingPlayer;
    document.body.dataset.boardSize = String(settings.boardSize);
}

/** Displays the outcome from the selected player's perspective. */
function handleCompletedGame(scores: GameScores, selectedPlayer: PlayerColor): void {
    activeGame?.destroy();
    activeGame = null;
    const result = getGameResult(scores);
    if (result === "draw" || result === selectedPlayer) {
        showResultScreen(result);
        return;
    }
    showGameOver(scores, result);
}

/** Displays a loss briefly before revealing the winning opponent. */
function showGameOver(scores: GameScores, result: GameResult): void {
    updateFinalScores(scores);
    document.body.dataset.screen = "game-over";
    resultTimeout = window.setTimeout(
        () => showResultScreen(result),
        gameOverDuration,
    );
}

/** Writes the final score into the game-over screen. */
function updateFinalScores(scores: GameScores): void {
    const blueScore = document.querySelector<HTMLElement>("#final-blue-score");
    const orangeScore = document.querySelector<HTMLElement>("#final-orange-score");
    if (blueScore) blueScore.textContent = String(scores.blue);
    if (orangeScore) orangeScore.textContent = String(scores.orange);
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
    if (resultEyebrow) resultEyebrow.textContent = isDraw ? "It's a" : "The winner is";
    if (resultTitle) resultTitle.textContent = isDraw ? "DRAW" : `${result.toUpperCase()} PLAYER`;
    if (!resultIcon) return;
    const imagePath = isDraw ? "/assets/results/scale.png" : `/assets/results/pawn-${result}.png`;
    const imageText = isDraw ? "Balanced scale" : `${result} player`;
    updateResultIcon(imagePath, imageText);
}

/** Replaces the result icon without displaying its previous image. */
function updateResultIcon(imagePath: string, imageText: string): void {
    if (!resultIcon) return;
    resultIcon.classList.add("is-loading");
    resultIcon.onload = showResultIcon;
    resultIcon.src = imagePath;
    resultIcon.alt = imageText;
    if (resultIcon.complete) showResultIcon();
}

/** Reveals the result icon after its new image is available. */
function showResultIcon(): void {
    if (!resultIcon) return;
    resultIcon.classList.remove("is-loading");
    resultIcon.onload = null;
}

/** Opens the native confirmation dialog. */
function openQuitDialog(): void {
    if (quitDialog && !quitDialog.open) quitDialog.showModal();
}

/** Closes the confirmation dialog. */
function closeQuitDialog(): void {
    if (quitDialog?.open) quitDialog.close();
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
