import { describe, it, expect } from 'vitest'
import { containsNgWord, normalizeForNgCheck, parseNgWords } from '../ngWords'

describe('normalizeForNgCheck', () => {
  it('カタカナをひらがなに、全角英数を半角小文字にそろえる', () => {
    expect(normalizeForNgCheck('チンコ')).toBe('ちんこ')
    expect(normalizeForNgCheck('ＦＵＣＫ')).toBe('fuck')
  })

  it('半角カタカナもひらがなにそろえる', () => {
    expect(normalizeForNgCheck('ｼﾈ')).toBe('しね')
  })

  it('空白と -_. は無視する', () => {
    expect(normalizeForNgCheck('f u-c_k.')).toBe('fuck')
  })
})

describe('containsNgWord', () => {
  it.each(['ちんこ', 'うんちんこ', 'チンポ', 'ｾｯｸｽ', 'FuckYou', 'f.u.c.k', 'しね', 'シネ', 'Sex', 'KILL'])('%s は弾く', (name) => {
    expect(containsNgWord(name)).toBe(true)
  })

  it.each(['たろう', 'PLAYER', 'シネマ', 'しねま', 'Toshitaka', 'Peacock', 'class', 'Sussex', 'grape', 'skill', 'diet'])('%s は通す', (name) => {
    expect(containsNgWord(name)).toBe(false)
  })

  it('追加のNGワードも部分一致で弾く', () => {
    const extra = parseNgWords('ほげ, ＦＯＯ')
    expect(containsNgWord('ほげほげ', extra)).toBe(true)
    expect(containsNgWord('xFooY', extra)).toBe(true)
    expect(containsNgWord('たろう', extra)).toBe(false)
  })
})

describe('parseNgWords', () => {
  it('未設定なら空配列', () => {
    expect(parseNgWords(undefined)).toEqual([])
    expect(parseNgWords('')).toEqual([])
  })

  it('カンマ区切りを正規化し、空要素は捨てる', () => {
    expect(parseNgWords('アイウ, ,ABC,')).toEqual(['あいう', 'abc'])
  })
})
