import type { GameState, PowerUpOption } from './state'
import type { TouchBuffer } from './touch'
import {
  createPlayer, updatePlayer, renderPlayer, canFire, resetFireTimer,
  hitPlayer, isPlayerInvincible, resetPlayerPosition, applyUpgrade,
  PLAYER_RADIUS,
} from './player'
import {
  createNormalEnemy, createAttackEnemy, createBoss, createHealEnemy,
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
const CANVAS_W = 390
const CANVAS_H = 844
const CANVAS_CX = CANVAS_W / 2

interface Star {
  x: number
  y: number
  r: number
  speed: number
}

function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    r: 0.5 + Math.random() * 1.5,
    speed: 20 + Math.random() * 40,
  }))
}

function updateStars(stars: Star[], delta: number): void {
  const dt = delta / 1000
  for (const s of stars) {
    s.y += s.speed * dt
    if (s.y > CANVAS_H) {
      s.y = -2
      s.x = Math.random() * CANVAS_W
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

function generateOptions(): [PowerUpOption, PowerUpOption] {
  const left: PowerUpOption = { kind: 'HP', label: 'HP +1', sub: '残機を1回復' }
  const candidates: PowerUpOption[] = [
    { kind: 'FIRE_RATE', label: '連射強化', sub: '発射間隔 -30ms' },
    { kind: 'BULLET_SPEED', label: '弾速強化', sub: '弾速 +20%' },
  ]
  const right = candidates[Math.floor(Math.random() * candidates.length)]
  return [left, right]
}

function drawOptionBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opt: PowerUpOption, color: string
): void {
  ctx.fillStyle = color
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(opt.label, x + w / 2, y + h / 2 - 10)
  ctx.font = '16px sans-serif'
  ctx.fillText(opt.sub, x + w / 2, y + h / 2 + 20)
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
  let prevTouchActive = false
  let tapX = 0
  let tapY = 0
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
    stageScore = 0
    enemySpawnTimer = 0
    normalsSinceLastAttack = 0
    healSpawnTimer = 15000 + Math.random() * 10000
    enemies = []
    bullets = []
    setState({ type: 'PLAYING', stage })
  }

  function triggerGameOver(stage: number): void {
    if (score.total > score.highScore) {
      score.highScore = score.total
      saveHighScore(score.highScore)
    }
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
      tapY = touch.y
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

    if (state.type === 'POWER_UP_SELECT') {
      if (!powerUpCanAcceptTap && !touch.active) {
        powerUpCanAcceptTap = true
        hasTap = false
      }
      if (powerUpCanAcceptTap && hasTap) {
        hasTap = false
        const chosen = tapX < CANVAS_CX ? state.options[0] : state.options[1]
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
        bullets.push(createPlayerBullet(player.x, player.y - 15, player.bulletSpeed))
        resetFireTimer(player)
      }

      if (state.type === 'PLAYING') {
        const diff = getDifficulty(stage)
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

      const deadEnemies = enemies.filter((e) => e.hp <= 0)
      for (const e of deadEnemies) {
        score.total += e.score
        stageScore += e.score
        if (e.kind === 'heal') {
          player.lives += 1
        }
        if (e.kind === 'boss') {
          score.total += stage * 100
          if (score.total > score.highScore) {
            score.highScore = score.total
            saveHighScore(score.highScore)
          }
          setState({ type: 'STAGE_CLEAR', stage, elapsed: 0 })
          enemies = []
          bullets = bullets.filter((b) => !b.isEnemy)
          return
        }
      }
      enemies = enemies.filter((e) => e.hp > 0)

      if (state.type === 'PLAYING') {
        const diff = getDifficulty(stage)
        if (stageScore >= diff.bossScoreThreshold) {
          const bossEnemy = createBoss(stage, diff)
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
            hitPlayer(player)
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
            hitPlayer(player)
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
        if (state.stage >= 10) {
          setState({ type: 'GAME_CLEAR', score: score.total, stage: state.stage })
        } else {
          powerUpCanAcceptTap = !touch.active
          setState({ type: 'POWER_UP_SELECT', stage: state.stage, options: generateOptions() })
        }
      } else {
        setState({ ...state, elapsed })
      }
    }
  }

  function render(): void {
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    renderStars(ctx, stars)

    if (state.type !== 'IDLE' && state.type !== 'GAME_OVER' && state.type !== 'GAME_CLEAR') {
      renderEnemies(ctx, enemies)
      renderBullets(ctx, bullets)
      renderPlayer(ctx, player)
    }

    if (state.type === 'BOSS_APPEARING') {
      ctx.fillStyle = 'rgba(170,0,255,0.3)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('BOSS!', CANVAS_CX, 422)
    }

    if (state.type === 'STAGE_CLEAR') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 42px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('STAGE CLEAR!', CANVAS_CX, 400)
      ctx.font = '24px sans-serif'
      ctx.fillText(`BONUS +${state.stage * 100}`, CANVAS_CX, 450)
    }

    if (state.type === 'POWER_UP_SELECT') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('POWER UP!', CANVAS_CX, 200)
      ctx.font = '18px sans-serif'
      ctx.fillText('どちらかを選んでタップ', CANVAS_CX, 240)
      drawOptionBox(ctx, 20, 300, 165, 220, state.options[0], '#1A4488')
      drawOptionBox(ctx, 205, 300, 165, 220, state.options[1], '#885500')
    }

    if (state.type === 'COUNTDOWN') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 72px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(Math.ceil(state.remaining / 1000)), CANVAS_CX, 450)
    }

    void dpr
  }

  return {
    get state() { return state },
    get score() { return score },
    get lives() { return player.lives },

    start() {
      hasTap = false
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
