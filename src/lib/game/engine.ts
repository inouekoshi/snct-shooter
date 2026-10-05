import type { GameState } from './state'
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
import { circlesOverlap, applyPlayerBulletHits } from './collision'
import {
  getDifficulty, getStageCount, getStageClearBonus, type BossVariant, type DifficultyMode,
} from './difficulty'
import { createScoreState, saveHighScore, unlockExtra, type ScoreState } from './score'
import { createKillCounts, saveGameRecord, type KillCounts } from './stats'
import { createStars, updateStars, renderStars } from './background'
import { generatePowerUpOptions } from './powerup'
import {
  renderBossAppearing, renderStageClear, renderPowerUpSelect, renderCountdown,
} from './overlays'
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_CENTER_X } from './constants'

const BOSS_APPEARING_DURATION = 1500
const STAGE_CLEAR_DURATION = 2000

export interface GameEngine {
  state: GameState
  score: ScoreState
  lives: number
  start: () => void
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
    healSpawnTimer = 15000 + Math.random() * 10000
    enemies = []
    bullets = []
    setState({ type: 'PLAYING', stage })
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

  function triggerGameOver(stage: number): void {
    if (score.total > score.highScore) {
      score.highScore = score.total
      saveHighScore(score.highScore, mode)
    }
    saveGameRecord({ score: score.total, stage, playedAt: Date.now(), kills: { ...killCounts }, mode })
    setState({ type: 'GAME_OVER', score: score.total, stage })
  }

  function loop(currentTime: number): void {
    if (!running) return
    const delta = Math.min(currentTime - prevTime, 100)
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
      const next = state.remaining - delta
      if (next <= 0) {
        const resumeTo = state.resumeTo
        if (resumeTo.type === 'BOSS_APPEARING') {
          setState({ type: 'BOSS_APPEARING', stage: resumeTo.stage, elapsed: 0 })
        } else if (resumeTo.type === 'STAGE_CLEAR') {
          setState({ type: 'STAGE_CLEAR', stage: resumeTo.stage, elapsed: 0 })
        } else {
          setState(resumeTo)
        }
      } else {
        setState({ ...state, remaining: next })
      }
      hasTap = false
      return
    }

    if (state.type === 'PAUSED') return
    if (state.type === 'IDLE' || state.type === 'GAME_OVER' || state.type === 'GAME_CLEAR') return

    particles = updateParticles(particles, delta)
    updateShake(shake, delta)

    if (state.type === 'POWER_UP_SELECT') {
      if (!powerUpCanAcceptTap && !touch.active) {
        powerUpCanAcceptTap = true
        hasTap = false
      }
      if (powerUpCanAcceptTap && hasTap) {
        hasTap = false
        const chosen = tapX < CANVAS_CENTER_X ? state.options[0] : state.options[1]
        applyUpgrade(player, chosen.kind)
        resetPlayerPosition(player)
        startStage(state.stage + 1)
      }
      return
    }

    updatePlayer(player, touch, delta)

    if (state.type === 'PLAYING' || state.type === 'BOSS_FIGHT') {
      const stage = (state as { stage: number }).stage

      if (canFire(player)) {
        bullets.push(...firePlayerBullets(player))
        resetFireTimer(player)
      }

      if (state.type === 'PLAYING') {
        const diff = getDifficulty(stage, mode)
        enemySpawnTimer -= delta
        if (enemySpawnTimer <= 0) {
          enemySpawnTimer = diff.normalEnemyInterval
          const ratio = diff.attackEnemySpawnRatio
          if (ratio > 0 && normalsSinceLastAttack >= ratio) {
            enemies.push(createAttackEnemy(diff))
            normalsSinceLastAttack = 0
          } else {
            enemies.push(createNormalEnemy(diff))
            normalsSinceLastAttack++
          }
        }

        healSpawnTimer -= delta
        if (healSpawnTimer <= 0) {
          healSpawnTimer = 15000 + Math.random() * 10000
          enemies.push(createHealEnemy())
        }
      }

      updateEnemies(enemies, delta, player.x, bullets)
      updateBullets(bullets, delta)
      bullets = removeOffscreenBullets(bullets)
      enemies = removeOffscreenEnemies(enemies)

      bullets = applyPlayerBulletHits(bullets, enemies)

      const deadEnemies = enemies.filter((e) => e.hp <= 0)
      for (const e of deadEnemies) {
        explodeEnemy(e)
        score.total += e.score
        stageScore += e.score
        killCounts[e.kind]++
        if (e.kind === 'heal') {
          player.lives += 1
        }
        if (e.kind === 'boss') {
          score.total += getStageClearBonus(stage, mode)
          if (score.total > score.highScore) {
            score.highScore = score.total
            saveHighScore(score.highScore, mode)
          }
          if (stage >= stageCount) {
            saveGameRecord({ score: score.total, stage, playedAt: Date.now(), kills: { ...killCounts }, mode })
            if (mode === 'NORMAL') unlockExtra()
          }
          setState({ type: 'STAGE_CLEAR', stage, elapsed: 0 })
          enemies = []
          bullets = bullets.filter((b) => !b.isEnemy)
          return
        }
      }
      enemies = enemies.filter((e) => e.hp > 0)

      if (state.type === 'PLAYING') {
        const diff = getDifficulty(stage, mode)
        if (stageScore >= diff.bossScoreThreshold) {
          const bossEnemy = createBoss(diff)
          bossVariant = diff.bossVariant
          enemies = []
          bullets = bullets.filter((b) => !b.isEnemy)
          enemies.push(bossEnemy)
          setState({ type: 'BOSS_APPEARING', stage, elapsed: 0 })
          player.invincibleTimer = BOSS_APPEARING_DURATION + 200
          return
        }
      }

      if (!isPlayerInvincible(player)) {
        for (const b of bullets) {
          if (!b.isEnemy) continue
          if (circlesOverlap(b.x, b.y, b.radius, player.x, player.y, PLAYER_RADIUS)) {
            damagePlayer()
            bullets = bullets.filter((x) => x !== b)
            if (player.lives <= 0) {
              triggerGameOver(stage)
              return
            }
            break
          }
        }

        for (const e of enemies) {
          if (e.kind === 'boss') continue
          if (circlesOverlap(e.x, e.y, e.radius, player.x, player.y, PLAYER_RADIUS)) {
            explodeEnemy(e)
            damagePlayer()
            enemies = enemies.filter((x) => x !== e)
            if (player.lives <= 0) {
              triggerGameOver(stage)
              return
            }
            break
          }
        }
      }

      notify()
    }

    if (state.type === 'BOSS_APPEARING') {
      const elapsed = state.elapsed + delta
      if (elapsed >= BOSS_APPEARING_DURATION) {
        setState({ type: 'BOSS_FIGHT', stage: state.stage })
      } else {
        setState({ ...state, elapsed })
      }
    }

    if (state.type === 'STAGE_CLEAR') {
      const elapsed = state.elapsed + delta
      if (elapsed >= STAGE_CLEAR_DURATION) {
        hasTap = false
        if (state.stage >= stageCount) {
          setState({ type: 'GAME_CLEAR', score: score.total, stage: state.stage })
        } else {
          powerUpCanAcceptTap = !touch.active
          setState({ type: 'POWER_UP_SELECT', stage: state.stage, options: generatePowerUpOptions(state.stage, player.weaponLevel, mode) })
        }
      } else {
        setState({ ...state, elapsed })
      }
    }
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

    start() {
      hasTap = false
      player = createPlayer(mode)
      score = createScoreState(score.highScore)
      killCounts = createKillCounts()
      startStage(1)
      running = true
      prevTime = 0
      animId = requestAnimationFrame((t) => {
        prevTime = t
        animId = requestAnimationFrame(loop)
      })
    },

    stop() {
      running = false
      cancelAnimationFrame(animId)
      enemies = []
      bullets = []
      particles = []
    },

    pause() {
      if (
        state.type === 'PLAYING' ||
        state.type === 'BOSS_APPEARING' ||
        state.type === 'BOSS_FIGHT' ||
        state.type === 'STAGE_CLEAR' ||
        state.type === 'POWER_UP_SELECT'
      ) {
        cancelAnimationFrame(animId)
        running = false
        setState({ type: 'PAUSED', resumeTo: state })
      }
    },

    resume() {
      if (state.type === 'PAUSED') {
        setState({ type: 'COUNTDOWN', resumeTo: state.resumeTo, remaining: 2000 })
        running = true
        prevTime = 0
        animId = requestAnimationFrame((t) => {
          prevTime = t
          animId = requestAnimationFrame(loop)
        })
      }
    },
  }
}
