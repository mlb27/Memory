import "./styles/style.scss";
import { MemoryGame } from "./classes/memory-game.class";
import type {
    BoardSize,
    GameSettings,
    GameTheme,
    PlayerColor,
} from "./types/game.types";

const settingsForm = document.querySelector<HTMLFormElement>("#settings-form");
const gameScreen = document.querySelector<HTMLElement>("[data-screen-view=game]");
const quitDialog = document.querySelector<HTMLDialogElement>("#quit-dialog");
let activeGame: MemoryGame | null = null;

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
    return theme === "code-vibes" && boardSize === "16";
}

/** Creates the selected game and displays its screen. */
function startSelectedGame(): void {
    const settings = getGameSettings();

    if (!settings || !gameScreen || !isSupportedConfiguration()) return;
    activeGame?.destroy();
    activeGame = new MemoryGame(gameScreen, settings);
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
    document.body.dataset.screen = "game";
    document.body.dataset.player = settings.startingPlayer;
    document.body.dataset.boardSize = String(settings.boardSize);
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
    document.body.dataset.screen = "settings";
}
