const NG_SUBSTRINGS = [
  'ちんこ', 'ちんぽ', 'まんこ', 'せっくす', 'おなにー', 'れいぷ',
  'きちがい', 'がいじ', 'しんでしまえ', 'ころしてやる',
  'fuck', 'bitch', 'nigger', 'nigga', 'porn', 'pussy',
]

const NG_EXACT = [
  'しね', 'しねよ', 'ころす', 'くそ', 'うんこ', 'ちんちん', 'えろ', 'ぶす',
  'sex', 'ass', 'rape', 'die', 'kill', 'kys', 'shit', 'dick', 'cock',
]

const IGNORED_CHARS = /[\s\-_.]/g

function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

export function normalizeForNgCheck(name: string): string {
  return toHiragana(name.normalize('NFKC').toLowerCase()).replace(IGNORED_CHARS, '')
}

export function parseNgWords(value: string | undefined): string[] {
  if (!value) return []
  return value.split(',').map(normalizeForNgCheck).filter((w) => w.length > 0)
}

export function containsNgWord(name: string, extraSubstrings: string[] = []): boolean {
  const normalized = normalizeForNgCheck(name)
  if (NG_EXACT.includes(normalized)) return true
  return [...NG_SUBSTRINGS, ...extraSubstrings].some((word) => normalized.includes(word))
}
