import { CODE_VIBES_CARDS } from "../data/code-vibes-cards";
import { GAMING_CARDS } from "../data/gaming-cards";
import { getAssetPath } from "../utils/asset-path";
import type { CardData, GameScores, GameSettings } from "../types/game.types";
import { MemoryCard } from "./memory-card.class";
import { Player } from "./player.class";

const MISMATCH_DELAY = 700;
const COMPLETION_DELAY = 700;

/** Controls one memory round, its cards, players and interface updates. */
export class MemoryGame {
  private readonly board: HTMLElement;
  private readonly blueScore: HTMLElement;
  private readonly bluePlayerIcon: HTMLImageElement;
  private readonly orangeScore: HTMLElement;
  private readonly orangePlayerIcon: HTMLImageElement;
  private readonly currentPlayerDisplay: HTMLElement;
  private readonly currentPlayerIcon: HTMLImageElement;
  private readonly players: [Player, Player];
  private cards: MemoryCard[] = [];
  private selectedCards: MemoryCard[] = [];
  private currentPlayerIndex: number;
  private mismatchTimeout?: number;
  private completionTimeout?: number;
  private matchedPairCount = 0;
  private boardIsLocked = false;

  /**
   * Creates the game state and reads its required interface elements.
   * @param root - Container that holds the complete game interface.
   * @param settings - Theme, starting player and board size for the round.
   * @param onGameOver - Callback invoked with both final scores.
   */
  constructor(
    private readonly root: HTMLElement,
    private readonly settings: GameSettings,
    private readonly onGameOver: (scores: GameScores) => void,
  ) {
    this.players = [new Player("blue"), new Player("orange")];
    this.currentPlayerIndex = settings.startingPlayer === "blue" ? 0 : 1;
    this.board = this.getElement<HTMLElement>("#memory-board");
    this.blueScore = this.getElement<HTMLElement>("#blue-score");
    this.bluePlayerIcon = this.getElement<HTMLImageElement>("#blue-player-icon");
    this.orangeScore = this.getElement<HTMLElement>("#orange-score");
    this.orangePlayerIcon = this.getElement<HTMLImageElement>("#orange-player-icon");
    this.currentPlayerDisplay = this.getElement<HTMLElement>("#current-player");
    this.currentPlayerIcon = this.getElement<HTMLImageElement>("#current-player-icon");
  }

  /** Creates a shuffled game board and renders its initial status. */
  start(): void {
    const roundCards = this.createRoundCards();
    this.cards = roundCards.map(
      (data) => new MemoryCard(
        data,
        this.getCardBackPath(),
        (card) => this.selectCard(card),
      ),
    );
    this.board.replaceChildren(...this.cards.map((card) => card.element));
    this.updateInterface();
  }

  /** Clears pending timeouts, card listeners and rendered cards. */
  destroy(): void {
    if (this.mismatchTimeout) window.clearTimeout(this.mismatchTimeout);
    if (this.completionTimeout) window.clearTimeout(this.completionTimeout);
    this.cards.forEach((card) => card.destroy());
    this.cards = [];
    this.selectedCards = [];
    this.board.replaceChildren();
  }

  /**
   * Gets the player whose turn is currently active.
   * @returns The player referenced by the current player index.
   */
  private get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Selects random motifs, duplicates them and shuffles the pairs.
   * @returns The shuffled card data used for the current round.
   */
  private createRoundCards(): CardData[] {
    const pairCount = this.settings.boardSize / 2;
    const motifs = this.shuffle([...this.getThemeCards()]).slice(0, pairCount);
    return this.shuffle([...motifs, ...motifs]);
  }

  /**
   * Gets all available motifs belonging to the selected theme.
   * @returns The card data collection for the active theme.
   */
  private getThemeCards(): CardData[] {
    return this.settings.theme === "gaming" ? GAMING_CARDS : CODE_VIBES_CARDS;
  }

  /**
   * Creates the asset path of the covered card for the selected theme.
   * @returns The public path of the active theme's card-back image.
   */
  private getCardBackPath(): string {
    return getAssetPath(`themes/${this.settings.theme}/card-back.png`);
  }

  /**
   * Handles a card selection when the board and card are available.
   * @param card - Card selected by the current player.
   */
  private selectCard(card: MemoryCard): void {
    if (this.boardIsLocked || !card.isSelectable()) return;
    card.flip();
    this.selectedCards.push(card);
    if (this.selectedCards.length === 2) this.evaluatePair();
  }

  /** Resolves the two selected cards as a match or mismatch. */
  private evaluatePair(): void {
    const [firstCard, secondCard] = this.selectedCards;
    this.boardIsLocked = true;
    if (firstCard.matches(secondCard)) this.resolveMatch();
    else this.scheduleMismatch();
  }

  /** Awards a found pair and lets the current player continue. */
  private resolveMatch(): void {
    this.selectedCards.forEach((card) => card.markAsMatched());
    this.currentPlayer.addPair();
    this.matchedPairCount += 1;
    this.finishTurn();
    this.updateInterface();
    this.checkForGameOver();
  }

  /** Schedules game completion after the final pair was briefly visible. */
  private checkForGameOver(): void {
    if (this.matchedPairCount !== this.settings.boardSize / 2) return;
    this.boardIsLocked = true;
    this.completionTimeout = window.setTimeout(
      () => this.onGameOver(this.getScores()),
      COMPLETION_DELAY,
    );
  }

  /**
   * Creates a copy of the current player scores.
   * @returns The blue and orange player scores.
   */
  private getScores(): GameScores {
    return {
      blue: this.players[0].score,
      orange: this.players[1].score,
    };
  }

  /** Schedules the concealment of an incorrect pair after a short delay. */
  private scheduleMismatch(): void {
    this.mismatchTimeout = window.setTimeout(() => this.resolveMismatch(), MISMATCH_DELAY);
  }

  /** Conceals an incorrect pair and hands the turn to the other player. */
  private resolveMismatch(): void {
    this.selectedCards.forEach((card) => card.hide());
    this.currentPlayerIndex = this.currentPlayerIndex === 0 ? 1 : 0;
    this.finishTurn();
    this.updateInterface();
  }

  /** Releases both selected cards and unlocks the board for the next turn. */
  private finishTurn(): void {
    this.selectedCards = [];
    this.boardIsLocked = false;
    this.mismatchTimeout = undefined;
  }

  /** Updates both scores, player icons and the current-player indicator. */
  private updateInterface(): void {
    this.blueScore.textContent = String(this.players[0].score);
    this.orangeScore.textContent = String(this.players[1].score);
    this.bluePlayerIcon.src = this.players[0].getIconPath(this.settings.theme);
    this.orangePlayerIcon.src = this.players[1].getIconPath(this.settings.theme);
    this.currentPlayerIcon.src = this.currentPlayer.getIconPath(this.settings.theme);
    this.currentPlayerIcon.alt = this.currentPlayer.name;
    this.currentPlayerDisplay.setAttribute(
      "aria-label",
      `Current player: ${this.currentPlayer.name}`,
    );
  }

  /**
   * Finds a required interface element inside the game container.
   * @typeParam T - Expected HTML element type.
   * @param selector - CSS selector used to locate the element.
   * @returns The matching interface element.
   * @throws Error when no matching element exists.
   */
  private getElement<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing game element: ${selector}`);
    return element;
  }

  /**
   * Shuffles the provided array in place using the Fisher-Yates algorithm.
   * @typeParam T - Type of the array entries.
   * @param items - Array whose entries should be shuffled.
   * @returns The same array with its entries in randomized order.
   */
  private shuffle<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }
    return items;
  }
}
