declare module 'cubejs' {
  export default class Cube {
    constructor()
    constructor(state: { center: number[]; cp: number[]; co: number[]; ep: number[]; eo: number[] })
    static initSolver(): void
    static fromString(state: string): Cube
    static random(): Cube
    asString(): string
    isSolved(): boolean
    move(algorithm: string): Cube
    solve(maxDepth?: number): string
  }
}
