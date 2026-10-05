import type { Bullet } from './bullet'
import type { Enemy } from './enemy'

export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number
): boolean {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy < (ar + br) * (ar + br)
}

export function applyPlayerBulletHits(bullets: Bullet[], enemies: Enemy[]): Bullet[] {
  const remaining: Bullet[] = []
  for (const b of bullets) {
    if (b.isEnemy) {
      remaining.push(b)
      continue
    }
    let consumed = false
    for (const e of enemies) {
      if (e.hp <= 0 || b.hitTargets.has(e)) continue
      if (!circlesOverlap(b.x, b.y, b.radius, e.x, e.y, e.radius)) continue
      e.hp -= b.damage
      if (!b.pierce) {
        consumed = true
        break
      }
      b.hitTargets.add(e)
    }
    if (!consumed) remaining.push(b)
  }
  return remaining
}
