import type { CardData } from "../types/game.types";

const cardBackPath = "/assets/themes/code-vibes/card-back.png";

export class MemoryCard {
    readonly element: HTMLButtonElement;
    private readonly clickHandler: () => void;
    private isFlipped = false;
    private isMatched = false;

    /** Creates one clickable card and connects its selection callback. */
    constructor(
        public readonly data: CardData,
        onSelect: (card: MemoryCard) => void,
    ) {
        this.element = this.createElement();
        this.clickHandler = () => onSelect(this);
        this.element.addEventListener("click", this.clickHandler);
    }

    /** Returns whether the card can currently be selected. */
    isSelectable(): boolean {
        return !this.isFlipped && !this.isMatched;
    }

    /** Checks whether another card belongs to the same pair. */
    matches(otherCard: MemoryCard): boolean {
        return this.data.pairId === otherCard.data.pairId;
    }

    /** Reveals the card front. */
    flip(): void {
        this.isFlipped = true;
        this.element.classList.add("is-flipped");
        this.element.setAttribute("aria-label", `Aufgedeckte Karte: ${this.data.label}`);
        this.element.setAttribute("aria-pressed", "true");
    }

    /** Conceals an unmatched card again. */
    hide(): void {
        this.isFlipped = false;
        this.element.classList.remove("is-flipped");
        this.element.setAttribute("aria-label", "Verdeckte Memory-Karte");
        this.element.setAttribute("aria-pressed", "false");
    }

    /** Keeps a found card visible and prevents further selections. */
    markAsMatched(): void {
        this.isMatched = true;
        this.element.disabled = true;
        this.element.setAttribute("aria-label", `Gefundenes Paar: ${this.data.label}`);
    }

    /** Removes the card listener before a game is discarded. */
    destroy(): void {
        this.element.removeEventListener("click", this.clickHandler);
    }

    /** Creates the semantic button and its two visual card sides. */
    private createElement(): HTMLButtonElement {
        const button = document.createElement("button");
        button.className = "memory-card";
        button.type = "button";
        button.setAttribute("aria-label", "Verdeckte Memory-Karte");
        button.setAttribute("aria-pressed", "false");
        button.innerHTML = this.createCardMarkup();
        return button;
    }

    /** Creates the front and back markup of a card. */
    private createCardMarkup(): string {
        return `<span class="memory-card__inner">
            <span class="memory-card__side memory-card__side--cover">
                <img src="${cardBackPath}" alt="">
            </span>
            <span class="memory-card__side memory-card__side--picture">
                <img src="${this.data.imagePath}" alt="">
            </span>
        </span>`;
    }
}
