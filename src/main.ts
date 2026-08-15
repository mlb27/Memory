import "./styles/style.scss";

const settingsForm = document.querySelector<HTMLFormElement>("#settings-form");

initializeMemory();

/** Initializes the navigation and all settings controls. */
function initializeMemory(): void {
    const playButton = document.querySelector<HTMLButtonElement>(
        '[data-action="open-settings"]',
    );

    playButton?.addEventListener("click", showSettings);
    settingsForm?.addEventListener("change", handleSettingsChange);
    updateSettingsSummary();
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
    const startButton = settingsForm?.querySelector<HTMLButtonElement>("button");

    if (startButton) startButton.disabled = !(hasTheme && hasPlayer && hasBoard);
}
