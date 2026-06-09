import { describe, expect, it } from 'vitest'
import {
  durationLabel,
  formatRange,
  hasOverlap,
  totalsForDate,
  weekDates,
} from './time'
import type { TimeBlock } from './types'

const baseBlocks: TimeBlock[] = [
  {
    id: 'a',
    date: '2026-06-08',
    startSlot: 0,
    slotCount: 16,
    category: 'sleep',
    label: '睡觉',
    createdAt: '2026-06-08T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
  {
    id: 'b',
    date: '2026-06-08',
    startSlot: 20,
    slotCount: 3,
    category: 'study',
    label: '开题',
    createdAt: '2026-06-08T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
  {
    id: 'c',
    date: '2026-06-09',
    startSlot: 20,
    slotCount: 2,
    category: 'routine',
    label: '吃饭',
    createdAt: '2026-06-08T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
]

describe('time utilities', () => {
  it('formats half-hour ranges and durations', () => {
    expect(formatRange(21, 3)).toBe('10:30-12:00')
    expect(durationLabel(1)).toBe('0.5h')
    expect(durationLabel(4)).toBe('2h')
  })

  it('detects overlaps only on the same date', () => {
    expect(
      hasOverlap(baseBlocks, {
        date: '2026-06-08',
        startSlot: 15,
        slotCount: 2,
      }),
    ).toBe(true)
    expect(
      hasOverlap(baseBlocks, {
        date: '2026-06-08',
        startSlot: 16,
        slotCount: 4,
      }),
    ).toBe(false)
    expect(
      hasOverlap(baseBlocks, {
        date: '2026-06-09',
        startSlot: 15,
        slotCount: 2,
      }),
    ).toBe(false)
  })

  it('ignores the edited block id during overlap checks', () => {
    expect(
      hasOverlap(
        baseBlocks,
        {
          date: '2026-06-08',
          startSlot: 0,
          slotCount: 16,
        },
        'a',
      ),
    ).toBe(false)
  })

  it('calculates daily category totals as slots', () => {
    expect(totalsForDate(baseBlocks, '2026-06-08')).toEqual({
      sleep: 16,
      study: 3,
      entertainment: 0,
      routine: 0,
      game: 0,
    })
  })

  it('builds a Monday-first week', () => {
    expect(weekDates('2026-06-14')).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ])
  })
})
