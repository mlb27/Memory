export type GameTheme = "code-vibes" | "gaming";
export type PlayerColor = "blue" | "orange";
export type BoardSize = 16 | 24 | 36;

export interface GameSettings {
    theme: GameTheme;
    startingPlayer: PlayerColor;
    boardSize: BoardSize;
}

export interface CardData {
    pairId: string;
    label: string;
    imagePath: string;
}
