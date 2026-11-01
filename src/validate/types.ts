/** What the data parsers give: the value, and where each value starts (by JSON Pointer). */
export interface Position {
  line: number
  column: number
}

/** JSON Pointer (RFC 6901) → where the value starts in the source. */
export type PositionMap = Map<string, Position>

export interface Parsed<T = unknown> {
  value: T
  positions: PositionMap
}
