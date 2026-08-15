import type { PlayerColor } from "../types/game.types";

export class Player {
    score = 0;

    /** Creates a player with its selected color. */
    constructor(public readonly color: PlayerColor) {}

    /** Returns the player name used in the interface. */
    get name(): string {
        return this.color === "blue" ? "Blue" : "Orange";
    }

    /** Returns the matching player-label asset. */
    get iconPath(): string {
        return `/assets/icons/game/player-${this.color}.png`;
    }

    /** Adds the two cards of a found pair to the score. */
    addPair(): void {
        this.score += 2;
    }
}
