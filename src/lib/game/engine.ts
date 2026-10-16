import { isPausable, type GameState } from './state'
import type { TouchBuffer } from './touch'
import {
  createPlayer, updatePlayer, renderPlayer, canFire, resetFireTimer,
  hitPlayer, isPlayerInvincible, resetPlayerPosition, applyUpgrade,
  firePlayerBullets, PLAYER_RADIUS,
} from './player'
import {
  createNormalEnemy, createAttackEnemy, createBoss, createHealEnemy,
  updateEnemies, removeOffscreenEnemies, renderEnemies, enemyColor, type Enemy,
} from './enemy'
import {
  spawnExplosion, updateParticles, renderParticles, createScreenShake, triggerShake,
  updateShake, shakeOffset, EXPLOSION_SMALL, EXPLOSION_MEDIUM, EXPLOSION_LARGE,
  SHAKE_PLAYER_HIT, SHAKE_BOSS_DEFEAT, type Particle,
} from './effects'
import {
  updateBullets, removeOffscreenBullets, renderBullets, type Bullet,
} from './bullet'
import { circlesOverlap, applyPlayerBulletHits, findTouchedEnemies } from './collision'
import {
  getDifficulty, getStageCount, getStageClearBonus,
  type BossVariant, type DifficultyMode, type DifficultyParams,
} from './difficulty'
import { createScoreState, saveHighScore, unlockExtra, type ScoreState } from './score'
import { createKillCounts, saveGameRecord, type KillCounts } from './stats'
import { createStars, updateStars, renderStars } from './background'
import {
  createGuardGauge, chargeGuard, consumeGuard, isGuardReady, renderGuardAura,
  GUARD_COLOR, GUARD_INVINCIBLE_DURATION, type GuardGauge,
} from './guard'
import { generatePowerUpOptions } from './powerup'
import {
  renderBossAppearing, renderStageClear, renderPowerUpSelect, renderCountdown,
} from './overlays'
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_CENTER_X } from './constants'
import { createSeededRng, createRandomSeed, type Rng } from './random'

const BOSS_APPEARING_DURATION = 1500
const BOSS_APPEARING_INVINCIBLE_DURATION = BOSS_APPEARING_DURATION + 200
const STAGE_CLEAR_DURATION = 2000
const RESUME_COUNTDOWN_DURATION = 2000
const MAX_FRAME_DELTA = 100
const HEAL_SPAWN_MIN_INTERVAL = 15000
const HEAL_SPAWN_INTERVAL_RANGE = 10000

type StateOf<T extends GameState['type']> = Extract<GameState, { type: T }>

export interface GameEngine {
  state: GameState
  score: ScoreState
  lives: number
  guard: GuardGauge
  seed: number
  start: (seed?: number) => void
  stop: () => void
  pause: () => void
  resume: () => void
}

export function createGameEngine(
  canvas: HTMLCanvasElement,
  touch: TouchBuffer,
  onStateChange: (state: GameState, score: ScoreState) => void,
  mode: DifficultyMode = 'NORMAL'
): GameEngine {
  const ctx = canvas.getContext('2d')!
  const stars = createStars()

  let state: GameState = { type: 'IDLE' }
  let score = createScoreState(0)
  const stageCount = getStageCount(mode)
  let player = createPlayer(mode)
  let guard = createGuardGauge(mode)
  let bossVariant: BossVariant = 'normal'
  let enemies: Enemy[] = []
  let bullets: Bullet[] = []
  let particles: Particle[] = []
  const shake = createScreenShake()
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  let stageScore = 0
  let killCounts: KillCounts = createKillCounts()
  let enemySpawnTimer = 0
  let normalsSinceLastAttack = 0
  let animId = 0
  let prevTime = 0
  let running = false
  let prevTouchActive = false
  let tapX = 0
  let hasTap = false
  let healSpawnTimer = 0
  let powerUpCanAcceptTap = false
  let seed = 0
  let rng: Rng = Math.random

  function notify(): void {
    onStateChange(state, score)
  }

  function setState(next: GameState): void {
    state = next
    notify()
  }

  function startStage(stage: number): void {
    particles = []
    stageScore = 0
    enemySpawnTimer = 0
    normalsSinceLastAttack = 0
    healSpawnTimer = nextHealSpawnInterval()
    enemies = []
    bullets = []
    setState({ type: 'PLAYING', stage })
  }

  function nextHealSpawnInterval(): number {
    return HEAL_SPAWN_MIN_INTERVAL + rng() * HEAL_SPAWN_INTERVAL_RANGE
  }

  function clearEnemyBullets(): void {
    bullets = bullets.filter((b) => !b.isEnemy)
  }

  function commitHighScore(): void {
    if (score.total <= score.highScore) return
    score.highScore = score.total
    saveHighScore(score.highScore, mode)
  }

  function recordPlay(stage: number): void {
    saveGameRecord({ score: score.total, stage, playedAt: Date.now(), kills: { ...killCounts }, mode })
  }

  function explodeEnemy(e: Enemy): void {
    if (e.kind === 'boss') {
      spawnExplosion(particles, e.x, e.y, enemyColor(e), EXPLOSION_LARGE)
      spawnExplosion(particles, e.x, e.y, '#FFFFFF', { ...EXPLOSION_MEDIUM, count: 30 })
      triggerShake(shake, SHAKE_BOSS_DEFEAT.intensity, SHAKE_BOSS_DEFEAT.duration)
    } else {
      const options = e.kind === 'attack' ? EXPLOSION_MEDIUM : EXPLOSION_SMALL
      spawnExplosion(particles, e.x, e.y, enemyColor(e), options)
    }
  }

  function damagePlayer(): void {
    hitPlayer(player)
    spawnExplosion(particles, player.x, player.y, '#FFFFFF', EXPLOSION_SMALL)
    triggerShake(shake, SHAKE_PLAYER_HIT.intensity, SHAKE_PLAYER_HIT.duration)
  }

  function activateGuard(): void {
    clearEnemyBullets()
    player.invincibleTimer = GUARD_INVINCIBLE_DURATION
    spawnExplosion(particles, player.x, player.y, GUARD_COLOR, EXPLOSION_LARGE)
    triggerShake(shake, SHAKE_PLAYER_HIT.intensity, SHAKE_PLAYER_HIT.duration)
  }

  function takeHit(stage: number): boolean {
    if (consumeGuard(guard)) {
      activateGuard()
      return false
    }
    damagePlayer()
    if (player.lives > 0) return false
    triggerGameOver(stage)
    return true
  }

  function triggerGameOver(stage: number): void {
    commitHighScore()
    recordPlay(stage)
    setState({ type: 'GAME_OVER', score: score.total, stage })
  }

  function startLoop(): void {
    running = true
    prevTime = 0
    animId = requestAnimationFrame((t) => {
      prevTime = t
      animId = requestAnimationFrame(loop)
    })
  }

  function stopLoop(): void {
    running = false
    cancelAnimationFrame(animId)
  }

  function loop(currentTime: number): void {
    if (!running) return
    const delta = Math.min(currentTime - prevTime, MAX_FRAME_DELTA)
    prevTime = currentTime

    update(delta)
    render()

    animId = requestAnimationFrame(loop)
  }

  function update(delta: number): void {
    updateStars(stars, delta)

    if (prevTouchActive && !touch.active) {
      hasTap = true
      tapX = touch.x
    }
    prevTouchActive = touch.active

    if (state.type === 'COUNTDOWN') {
      updateCountdown(state, delta)
      return
    }
    if (state.type === 'PAUSED' || state.type === 'IDLE' || state.type === 'GAME_OVER' || state.type === 'GAME_CLEAR') return

    particles = updateParticles(particles, delta)
    updateShake(shake, delta)

    if (state.type === 'POWER_UP_SELECT') {
      updatePowerUpSelect(state)
      return
    }

    updatePlayer(player, touch, delta)

    if (state.type === 'BOSS_APPEARING') updateBossAppearing(state, delta)
    else if (state.type === 'STAGE_CLEAR') updateStageClear(state, delta)
    else updateBattle(state, delta)
  }

  function updateCountdown(current: StateOf<'COUNTDOWN'>, delta: number): void {
    hasTap = false
    const remaining = current.remaining - delta
    if (remaining > 0) {
      setState({ ...current, remaining })
      return
    }
    const { resumeTo } = current
    if (resumeTo.type === 'BOSS_APPEARING' || resumeTo.type === 'STAGE_CLEAR') {
      setState({ ...resumeTo, elapsed: 0 })
    } else {
      setState(resumeTo)
    }
  }

  function updatePowerUpSelect(current: StateOf<'POWER_UP_SELECT'>): void {
    if (!powerUpCanAcceptTap && !touch.active) {
      powerUpCanAcceptTap = true
      hasTap = false
    }
    if (!powerUpCanAcceptTap || !hasTap) return
    hasTap = false
    const chosen = tapX < CANVAS_CENTER_X ? current.options[0] : current.options[1]
    applyUpgrade(player, chosen.kind)
    resetPlayerPosition(player)
    startStage(current.stage + 1)
  }

  function updateBossAppearing(current: StateOf<'BOSS_APPEARING'>, delta: number): void {
    const elapsed = current.elapsed + delta
    if (elapsed >= BOSS_APPEARING_DURATION) {
      setState({ type: 'BOSS_FIGHT', stage: current.stage })
    } else {
      setState({ ...current, elapsed })
    }
  }

  function updateStageClear(current: StateOf<'STAGE_CLEAR'>, delta: number): void {
    const elapsed = current.elapsed + delta
    if (elapsed < STAGE_CLEAR_DURATION) {
      setState({ ...current, elapsed })
      return
    }
    hasTap = false
    const { stage } = current
    if (stage >= stageCount) {
      setState({ type: 'GAME_CLEAR', score: score.total, stage })
      return
    }
    powerUpCanAcceptTap = !touch.active
    setState({ type: 'POWER_UP_SELECT', stage, options: generatePowerUpOptions(stage, player.weaponLevel, mode, rng) })
  }

  function updateBattle(current: StateOf<'PLAYING' | 'BOSS_FIGHT'>, delta: number): void {
    const { stage } = current
    const diff = current.type === 'PLAYING' ? getDifficulty(stage, mode) : null

    if (canFire(player)) {
      bullets.push(...firePlayerBullets(player))
      resetFireTimer(player)
    }
    if (diff) spawnEnemies(diff, delta)

    updateEnemies(enemies, delta, player.x, bullets)
    updateBullets(bullets, delta)
    bullets = removeOffscreenBullets(bullets)
    enemies = removeOffscreenEnemies(enemies)
    bullets = applyPlayerBulletHits(bullets, enemies)

    if (resolveDefeatedEnemies(stage)) return
    if (diff && stageScore >= diff.bossScoreThreshold) {
      summonBoss(diff, stage)
      return
    }
    collectTouchedHealEnemies()
    if (resolvePlayerHits(stage)) return

    notify()
  }

  function spawnEnemies(diff: DifficultyParams, delta: number): void {
    enemySpawnTimer -= delta
    if (enemySpawnTimer <= 0) {
      enemySpawnTimer = diff.normalEnemyInterval
      const ratio = diff.attackEnemySpawnRatio
      if (ratio > 0 && normalsSinceLastAttack >= ratio) {
        enemies.push(createAttackEnemy(diff, rng))
        normalsSinceLastAttack = 0
      } else {
        enemies.push(createNormalEnemy(diff, rng))
        normalsSinceLastAttack++
      }
    }

    healSpawnTimer -= delta
    if (healSpawnTimer <= 0) {
      healSpawnTimer = nextHealSpawnInterval()
      enemies.push(createHealEnemy(rng))
    }
  }

  function resolveDefeatedEnemies(stage: number): boolean {
    for (const e of enemies) {
      if (e.hp > 0) continue
      explodeEnemy(e)
      score.total += e.score
      stageScore += e.score
      killCounts[e.kind]++
      chargeGuard(guard, e.kind)
      if (e.kind === 'heal') player.lives += 1
      if (e.kind === 'boss') {
        defeatBoss(stage)
        return true
      }
    }
    enemies = enemies.filter((e) => e.hp > 0)
    return false
  }

  function defeatBoss(stage: number): void {
    score.total += getStageClearBonus(stage, mode)
    commitHighScore()
    if (stage >= stageCount) {
      recordPlay(stage)
      if (mode === 'NORMAL') unlockExtra()
    }
    setState({ type: 'STAGE_CLEAR', stage, elapsed: 0 })
    enemies = []
    clearEnemyBullets()
  }

  function summonBoss(diff: DifficultyParams, stage: number): void {
    bossVariant = diff.bossVariant
    enemies = [createBoss(diff)]
    clearEnemyBullets()
    setState({ type: 'BOSS_APPEARING', stage, elapsed: 0 })
    player.invincibleTimer = BOSS_APPEARING_INVINCIBLE_DURATION
  }

  function collectTouchedHealEnemies(): void {
    const collected = findTouchedEnemies(enemies, player.x, player.y, PLAYER_RADIUS, 'heal')
    if (collected.length === 0) return
    for (const e of collected) {
      explodeEnemy(e)
      player.lives += 1
      killCounts.heal++
    }
    enemies = enemies.filter((e) => !collected.includes(e))
  }

  function resolvePlayerHits(stage: number): boolean {
    if (!isPlayerInvincible(player)) {
      const hitBullet = bullets.find((b) =>
        b.isEnemy && circlesOverlap(b.x, b.y, b.radius, player.x, player.y, PLAYER_RADIUS)
      )
      if (hitBullet) {
        bullets = bullets.filter((b) => b !== hitBullet)
        if (takeHit(stage)) return true
      }
    }

    if (!isPlayerInvincible(player)) {
      const hitEnemy = enemies.find((e) =>
        e.kind !== 'boss' && circlesOverlap(e.x, e.y, e.radius, player.x, player.y, PLAYER_RADIUS)
      )
      if (hitEnemy) {
        explodeEnemy(hitEnemy)
        enemies = enemies.filter((e) => e !== hitEnemy)
        if (takeHit(stage)) return true
      }
    }

    return false
  }

  function render(): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const offset = reduceMotion ? { x: 0, y: 0 } : shakeOffset(shake)
    ctx.save()
    ctx.translate(offset.x, offset.y)

    renderStars(ctx, stars)

    if (state.type !== 'IDLE' && state.type !== 'GAME_OVER' && state.type !== 'GAME_CLEAR') {
      renderEnemies(ctx, enemies)
      renderParticles(ctx, particles)
      renderBullets(ctx, bullets)
      if (isGuardReady(guard)) renderGuardAura(ctx, player.x, player.y, prevTime)
      renderPlayer(ctx, player)
    }

    ctx.restore()

    if (state.type === 'BOSS_APPEARING') renderBossAppearing(ctx, bossVariant)
    if (state.type === 'STAGE_CLEAR') renderStageClear(ctx, state.elapsed, getStageClearBonus(state.stage, mode))
    if (state.type === 'POWER_UP_SELECT') renderPowerUpSelect(ctx, state.options)
    if (state.type === 'COUNTDOWN') renderCountdown(ctx, state.remaining)
  }

  return {
    get state() { return state },
    get score() { return score },
    get lives() { return player.lives },
    get guard() { return guard },
    get seed() { return seed },

    start(initialSeed = createRandomSeed()) {
      seed = initialSeed
      rng = createSeededRng(seed)
      hasTap = false
      player = createPlayer(mode)
      guard = createGuardGauge(mode)
      score = createScoreState(score.highScore)
      killCounts = createKillCounts()
      startStage(1)
      startLoop()
    },

    stop() {
      stopLoop()
      enemies = []
      bullets = []
      particles = []
    },

    pause() {
      const resumeTo = state.type === 'COUNTDOWN' ? state.resumeTo : isPausable(state.type) ? state : null
      if (!resumeTo) return
      stopLoop()
      setState({ type: 'PAUSED', resumeTo })
    },

    resume() {
      if (state.type !== 'PAUSED') return
      setState({ type: 'COUNTDOWN', resumeTo: state.resumeTo, remaining: RESUME_COUNTDOWN_DURATION })
      startLoop()
    },
  }
}
