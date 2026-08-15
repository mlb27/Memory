import { CODE_VIBES_CARDS } from "../data/code-vibes-cards";
import type { CardData, GameScores, GameSettings } from "../types/game.types";
import { MemoryCard } from "./memory-card.class";
import { Player } from "./player.class";

const mismatchDelay = 700;
const completionDelay = 700;

export class MemoryGame {
    private readonly board: HTMLElement;
    private readonly blueScore: HTMLElement;
    private readonly orangeScore: HTMLElement;
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

    /** Creates the game state and reads its interface elements. */
    constructor(
        private readonly root: HTMLElement,
        private readonly settings: GameSettings,
        private readonly onGameOver: (scores: GameScores) => void,
    ) {
        this.players = [new Player("blue"), new Player("orange")];
        this.currentPlayerIndex = settings.startingPlayer === "blue" ? 0 : 1;
        this.board = this.getElement<HTMLElement>("#memory-board");
        this.blueScore = this.getElement<HTMLElement>("#blue-score");
        this.orangeScore = this.getElement<HTMLElement>("#orange-score");
        this.currentPlayerDisplay = this.getElement<HTMLElement>("#current-player");
        this.currentPlayerIcon = this.getElement<HTMLImageElement>("#current-player-icon");
    }

    /** Creates a shuffled game board and renders its initial status. */
    start(): void {
        const roundCards = this.createRoundCards();
        this.cards = roundCards.map(
            (data) => new MemoryCard(data, (card) => this.selectCard(card)),
        );
        this.board.replaceChildren(...this.cards.map((card) => card.element));
        this.updateInterface();
    }

    /** Clears pending work, listeners and rendered cards. */
    destroy(): void {
        if (this.mismatchTimeout) window.clearTimeout(this.mismatchTimeout);
        if (this.completionTimeout) window.clearTimeout(this.completionTimeout);
        this.cards.forEach((card) => card.destroy());
        this.cards = [];
        this.selectedCards = [];
        this.board.replaceChildren();
    }

    /** Returns the player whose turn is currently active. */
    private get currentPlayer(): Player {
        return this.players[this.currentPlayerIndex];
    }

    /** Selects random motifs, duplicates them and shuffles the pairs. */
    private createRoundCards(): CardData[] {
        const pairCount = this.settings.boardSize / 2;
        const motifs = this.shuffle([...CODE_VIBES_CARDS]).slice(0, pairCount);
        return this.shuffle([...motifs, ...motifs]);
    }

    /** Handles one available card selection. */
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

    /** Finishes the game after the final pair was visible briefly. */
    private checkForGameOver(): void {
        if (this.matchedPairCount !== this.settings.boardSize / 2) return;
        this.boardIsLocked = true;
        this.completionTimeout = window.setTimeout(
            () => this.onGameOver(this.getScores()),
            completionDelay,
        );
    }

    /** Returns a copy of the final player scores. */
    private getScores(): GameScores {
        return {
            blue: this.players[0].score,
            orange: this.players[1].score,
        };
    }

    /** Waits briefly before concealing an incorrect pair. */
    private scheduleMismatch(): void {
        this.mismatchTimeout = window.setTimeout(() => this.resolveMismatch(), mismatchDelay);
    }

    /** Conceals an incorrect pair and hands over the turn. */
    private resolveMismatch(): void {
        this.selectedCards.forEach((card) => card.hide());
        this.currentPlayerIndex = this.currentPlayerIndex === 0 ? 1 : 0;
        this.finishTurn();
        this.updateInterface();
    }

    /** Releases both selected cards for the next turn. */
    private finishTurn(): void {
        this.selectedCards = [];
        this.boardIsLocked = false;
        this.mismatchTimeout = undefined;
    }

    /** Updates both scores and the current-player indicator. */
    private updateInterface(): void {
        this.blueScore.textContent = String(this.players[0].score);
        this.orangeScore.textContent = String(this.players[1].score);
        this.currentPlayerIcon.src = this.currentPlayer.iconPath;
        this.currentPlayerIcon.alt = this.currentPlayer.name;
        this.currentPlayerDisplay.setAttribute(
            "aria-label",
            `Current player: ${this.currentPlayer.name}`,
        );
    }

    /** Returns a required interface element or reports invalid markup. */
    private getElement<T extends HTMLElement>(selector: string): T {
        const element = this.root.querySelector<T>(selector);
        if (!element) throw new Error(`Missing game element: ${selector}`);
        return element;
    }

    /** Returns a shuffled copy of the provided array. */
    private shuffle<T>(items: T[]): T[] {
        for (let index = items.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
        }
        return items;
    }
}
