export type Polygon = readonly (readonly [number, number])[];

// Original floor plans, centered on the intersection; no image tracing or facades.
export const SETTLEMENT: Polygon = [
    [-8, -10],
    [8, -10],
    [10.5, -7.5],
    [10.5, 7],
    [8, 9],
    [3.5, 9],
    [3.5, 11],
    [-3.5, 11],
    [-3.5, 9],
    [-8, 9],
    [-10.5, 7],
    [-10.5, -7.5],
];
// A deep, open quarter makes the city distinct from a compact dwelling at 25 px.
export const CITY: Polygon = [
    [-12.5, -12.5],
    [-1.5, -12.5],
    [-1.5, 1.5],
    [12.5, 1.5],
    [12.5, 12.5],
    [-12.5, 12.5],
];
export const CITY_INSET: Polygon = [
    [-9, -9],
    [-5, -9],
    [-5, 5],
    [9, 5],
    [9, 9],
    [-9, 9],
];
