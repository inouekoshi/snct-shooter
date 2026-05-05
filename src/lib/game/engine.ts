import type { GameState } from './state'
import type { TouchBuffer } from './touch'
import {
  createPlayer, updatePlayer, renderPlayer, canFire, resetFireTimer,
  hitPlayer, isPlayerInvincible, resetPlayerPosition, PLAYER_RADIUS,
} from './player'
import {
  createNormalEnemy, createAttackEnemy, createBoss,
  updateEnemies, removeOffscreenEnemies, renderEnemies, type Enemy,
} from './enemy'
import {
  createPlayerBullet, updateBullets, removeOffscreenBullets, renderBullets, type Bullet,
} from './bullet'
import { circlesOverlap } from './collision'
import { getDifficulty } from './difficulty'
import { createScoreState, saveHighScore, type ScoreState } from './score'

const STAR_COUNT = 80
const BOSS_APPEARING_DURATION = 1500
const STAGE_CLEAR_DURATION = 2000

interface Star {
  x: number
  y: number
  r: number
  speed: number
}

function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * 390,
    y: Math.random() * 844,
    r: 0.5 + Math.random() * 1.5,
    speed: 20 + Math.random() * 40,
  }))
}

function updateStars(stars: Star[], delta: number): void {
  const dt = delta / 1000
  for (const s of stars) {
    s.y += s.speed * dt
    if (s.y > 844) {
      s.y = -2
      s.x = Math.random() * 390
    }
  }
}

function renderStars(ctx: CanvasRenderingContext2D, stars: Star[]): void {
  ctx.fillStyle = '#FFFFFF'
  for (const s of stars) {
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

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
  onStateChange: (state: GameState, score: ScoreState) => void
): GameEngine {
  const ctx = canvas.getContext('2d')!
  const stars = createStars()

  let state: GameState = { type: 'IDLE' }
  let score = createScoreState(0)
  let player = createPlayer()
  let enemies: Enemy[] = []
  let bullets: Bullet[] = []
  let stageScore = 0
  let enemySpawnTimer = 0
  let normalsSinceLastAttack = 0
  let animId = 0
  let prevTime = 0
  let running = false

  function notify(): void {
    onStateChange(state, score)
  }

  function setState(next: GameState): void {
    state = next
    notify()
  }

  function startStage(stage: number): void {
    stageScore = 0
    enemySpawnTimer = 0
    normalsSinceLastAttack = 0
    enemies = []
    bullets = []
    setState({ type: 'PLAYING', stage })
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
      return
    }

    if (state.type === 'PAUSED') return
    if (state.type === 'IDLE' || state.type === 'GAME_OVER') return

    updatePlayer(player, touch, delta)

    if (state.type === 'PLAYING' || state.type === 'BOSS_FIGHT') {
      // Fire
      if (canFire(player)) {
        bullets.push(createPlayerBullet(player.x, player.y - 15))
        resetFireTimer(player)
      }

      // Spawn enemies (PLAYING only)
      if (state.type === 'PLAYING') {
        const diff = getDifficulty(state.stage)
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
      }

      updateEnemies(enemies, delta, player.x, bullets)
      updateBullets(bullets, delta)
      bullets = removeOffscreenBullets(bullets)
      enemies = removeOffscreenEnemies(enemies)

      // Player bullets vs enemies
      const remainingBullets: Bullet[] = []
      for (const b of bullets) {
        if (b.isEnemy) {
          remainingBullets.push(b)
          continue
        }
        let hit = false
        for (const e of enemies) {
          if (circlesOverlap(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
            e.hp -= b.damage
            hit = true
            break
          }
        }
        if (!hit) remainingBullets.push(b)
      }
      bullets = remainingBullets

      // Remove dead enemies & add score
      const deadEnemies = enemies.filter((e) => e.hp <= 0)
      for (const e of deadEnemies) {
        score.total += e.score
        stageScore += e.score
        if (e.kind === 'boss') {
          score.total += state.stage * 100 // stage clear bonus
          if (score.total > score.highScore) {
            score.highScore = score.total
            saveHighScore(score.highScore)
          }
          setState({ type: 'STAGE_CLEAR', stage: state.stage, elapsed: 0 })
          enemies = []
          bullets = bullets.filter((b) => !b.isEnemy)
          return
        }
      }
      enemies = enemies.filter((e) => e.hp > 0)

      // Check boss threshold
      if (state.type === 'PLAYING') {
        const diff = getDifficulty(state.stage)
        if (stageScore >= diff.bossScoreThreshold) {
          const bossEnemy = createBoss(state.stage, diff)
          enemies = []
          bullets = bullets.filter((b) => !b.isEnemy)
          enemies.push(bossEnemy)
          setState({ type: 'BOSS_APPEARING', stage: state.stage, elapsed: 0 })
          player.invincibleTimer = BOSS_APPEARING_DURATION + 200
          return
        }
      }

      // Enemy bullets vs player
      if (!isPlayerInvincible(player)) {
        for (const b of bullets) {
          if (!b.isEnemy) continue
          if (circlesOverlap(b.x, b.y, b.radius, player.x, player.y, PLAYER_RADIUS)) {
            hitPlayer(player)
            bullets = bullets.filter((x) => x !== b)
            if (player.lives <= 0) {
              if (score.total > score.highScore) {
                score.highScore = score.total
                saveHighScore(score.highScore)
              }
              setState({ type: 'GAME_OVER', score: score.total, stage: (state as { stage: number }).stage })
              return
            }
            break
          }
        }

        // Enemy body vs player
        for (const e of enemies) {
          if (e.kind === 'boss') continue
          if (circlesOverlap(e.x, e.y, e.radius, player.x, player.y, PLAYER_RADIUS)) {
            hitPlayer(player)
            enemies = enemies.filter((x) => x !== e)
            if (player.lives <= 0) {
              if (score.total > score.highScore) {
                score.highScore = score.total
                saveHighScore(score.highScore)
              }
              setState({ type: 'GAME_OVER', score: score.total, stage: (state as { stage: number }).stage })
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
        resetPlayerPosition(player)
        startStage(state.stage + 1)
      } else {
        setState({ ...state, elapsed })
      }
    }
  }

  function render(): void {
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, 390, 844)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 390, 844)

    renderStars(ctx, stars)

    if (state.type !== 'IDLE' && state.type !== 'GAME_OVER') {
      renderEnemies(ctx, enemies)
      renderBullets(ctx, bullets)
      renderPlayer(ctx, player)
    }

    if (state.type === 'BOSS_APPEARING') {
      ctx.fillStyle = 'rgba(170,0,255,0.3)'
      ctx.fillRect(0, 0, 390, 844)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('BOSS!', 195, 422)
    }

    if (state.type === 'STAGE_CLEAR') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, 390, 844)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 42px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('STAGE CLEAR!', 195, 400)
      ctx.font = '24px sans-serif'
      ctx.fillText(`BONUS +${(state as { stage: number }).stage * 100}`, 195, 450)
    }

    if (state.type === 'COUNTDOWN') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, 390, 844)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 72px sans-serif'
      ctx.textAlign = 'center'
      const remaining = (state as { remaining: number }).remaining
      ctx.fillText(String(Math.ceil(remaining / 1000)), 195, 450)
    }

    void dpr // used via ctx.scale in parent
  }

  return {
    get state() { return state },
    get score() { return score },
    get lives() { return player.lives },

    start() {
      player = createPlayer()
      score = createScoreState(score.highScore)
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
    },

    pause() {
      if (
        state.type === 'PLAYING' ||
        state.type === 'BOSS_APPEARING' ||
        state.type === 'BOSS_FIGHT' ||
        state.type === 'STAGE_CLEAR'
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
