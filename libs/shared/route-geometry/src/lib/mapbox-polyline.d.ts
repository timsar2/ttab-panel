declare module '@mapbox/polyline' {
  export function encode(coordinates: readonly (readonly number[])[], precision?: number): string
  export function decode(value: string, precision?: number): number[][]
}
