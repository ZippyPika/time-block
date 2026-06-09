import type { CategoryId, TimeBlock } from './types'

export const SLOTS_PER_DAY = 48
export const MINUTES_PER_SLOT = 30

export function clampSlot(slot: number): number {
  return Math.max(0, Math.min(SLOTS_PER_DAY - 1, slot))
}

export function formatSlot(slot: number): string {
  const minutes = slot * MINUTES_PER_SLOT
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${hour}:${minute.toString().padStart(2, '0')}`
}

export function formatRange(startSlot: number, slotCount: number): string {
  return `${formatSlot(startSlot)}-${formatSlot(startSlot + slotCount)}`
}

export function durationLabel(slotCount: number): string {
  const hours = slotCount / 2
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

export function startOfWeekMonday(key: string): string {
  const date = parseDateKey(key)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return dateKey(date)
}

export function weekDates(anchorKey: string): string[] {
  const monday = startOfWeekMonday(anchorKey)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function displayDate(key: string): string {
  const date = parseDateKey(key)
  return `${date.getMonth() + 1}.${date.getDate()}`
}

export function weekdayName(key: string): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
    parseDateKey(key).getDay()
  ]
}

export function rangesOverlap(
  startA: number,
  countA: number,
  startB: number,
  countB: number,
): boolean {
  return startA < startB + countB && startB < startA + countA
}

export function hasOverlap(
  blocks: TimeBlock[],
  candidate: Pick<TimeBlock, 'date' | 'startSlot' | 'slotCount'>,
  ignoreId?: string,
): boolean {
  return blocks.some(
    (block) =>
      block.id !== ignoreId &&
      block.date === candidate.date &&
      rangesOverlap(
        block.startSlot,
        block.slotCount,
        candidate.startSlot,
        candidate.slotCount,
      ),
  )
}

export function totalsForDate(
  blocks: TimeBlock[],
  date: string,
): Record<CategoryId, number> {
  return blocks
    .filter((block) => block.date === date)
    .reduce(
      (totals, block) => {
        totals[block.category] += block.slotCount
        return totals
      },
      { sleep: 0, study: 0, entertainment: 0, routine: 0, game: 0 },
    )
}

export function createBlockId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}
