import { getAssetPath } from "../utils/asset-path";
import type { GameTheme, PlayerColor } from "../types/game.types";

/** Stores one player's color, score and theme-specific presentation. */
export class Player {
  score = 0;

  /**
   * Creates a player with the selected color and an initial score of zero.
   * @param color - Color used to identify the player.
   */
  constructor(public readonly color: PlayerColor) {}

  /**
   * Gets the capitalized player name used in the interface.
   * @returns The display name matching the player's color.
   */
  get name(): string {
    return this.color === "blue" ? "Blue" : "Orange";
  }

  /**
   * Creates the path of the player icon used by the selected theme.
   * @param theme - Theme whose player icon should be used.
   * @returns The public path of the matching player icon.
   */
  getIconPath(theme: GameTheme): string {
    if (theme === "gaming") return getAssetPath(`results/pawn-${this.color}.png`);
    return getAssetPath(`icons/game/player-${this.color}.png`);
  }

  /** Adds the two cards of a found pair to the player's score. */
  addPair(): void {
    this.score += 2;
  }
}
