export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number
): boolean {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy < (ar + br) * (ar + br)
}
