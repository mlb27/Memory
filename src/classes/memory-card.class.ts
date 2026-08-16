import type { CardData } from "../types/game.types";

/** Represents one interactive card and its visible state on the memory board. */
export class MemoryCard {
  readonly element: HTMLButtonElement;
  private readonly clickHandler: () => void;
  private isFlipped = false;
  private isMatched = false;

  /**
   * Creates one clickable card and connects its selection callback.
   * @param data - Motif data displayed on the card's front.
   * @param cardBackPath - Asset path of the covered card image.
   * @param onSelect - Callback invoked when the card is selected.
   */
  constructor(
    public readonly data: CardData,
    private readonly cardBackPath: string,
    onSelect: (card: MemoryCard) => void,
  ) {
    this.element = this.createElement();
    this.clickHandler = () => onSelect(this);
    this.element.addEventListener("click", this.clickHandler);
  }

  /**
   * Checks whether the card can currently be selected.
   * @returns Whether the card is neither flipped nor already matched.
   */
  isSelectable(): boolean {
    return !this.isFlipped && !this.isMatched;
  }

  /**
   * Checks whether another card belongs to the same motif pair.
   * @param otherCard - Card whose pair identifier should be compared.
   * @returns Whether both cards have the same pair identifier.
   */
  matches(otherCard: MemoryCard): boolean {
    return this.data.pairId === otherCard.data.pairId;
  }

  /** Reveals the card front and updates its accessible state. */
  flip(): void {
    this.isFlipped = true;
    this.element.classList.add("is-flipped");
    this.element.setAttribute("aria-label", `Revealed card: ${this.data.label}`);
    this.element.setAttribute("aria-pressed", "true");
  }

  /** Conceals an unmatched card and restores its accessible state. */
  hide(): void {
    this.isFlipped = false;
    this.element.classList.remove("is-flipped");
    this.element.setAttribute("aria-label", "Hidden memory card");
    this.element.setAttribute("aria-pressed", "false");
  }

  /** Keeps a found card visible and prevents further selections. */
  markAsMatched(): void {
    this.isMatched = true;
    this.element.classList.add("is-matched");
    this.element.disabled = true;
    this.element.setAttribute("aria-label", `Matched pair: ${this.data.label}`);
  }

  /** Removes the card's click listener before its game is discarded. */
  destroy(): void {
    this.element.removeEventListener("click", this.clickHandler);
  }

  /**
   * Creates the semantic button containing both visual card sides.
   * @returns The configured button element for this memory card.
   */
  private createElement(): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "memory-card";
    button.type = "button";
    button.setAttribute("aria-label", "Hidden memory card");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = this.createCardMarkup();
    return button;
  }

  /**
   * Creates the markup for the covered and revealed card sides.
   * @returns The HTML markup inserted into the card button.
   */
  private createCardMarkup(): string {
    return `<span class="memory-card__inner">
      <span class="memory-card__side memory-card__side--cover">
        <img src="${this.cardBackPath}" alt="">
      </span>
      <span class="memory-card__side memory-card__side--picture">
        <img src="${this.data.imagePath}" alt="">
      </span>
    </span>`;
  }
}
