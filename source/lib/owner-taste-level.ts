export type Planet = 'hot' | 'sweet' | 'rich';
export function ownerTasteMax(planet: Planet): number { return planet === 'hot' ? 7 : 5; }
export function validOwnerTaste(planet: Planet, value: unknown): boolean { return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= ownerTasteMax(planet); }
