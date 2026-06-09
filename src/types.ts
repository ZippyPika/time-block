export type CategoryId = 'sleep' | 'study' | 'entertainment' | 'routine'

export interface Category {
  id: CategoryId
  name: string
  color: string
  strongColor: string
  textColor: string
}

export interface TimeBlock {
  id: string
  date: string
  startSlot: number
  slotCount: number
  category: CategoryId
  label: string
  createdAt: string
  updatedAt: string
}

export interface BackupPayload {
  version: 1
  exportedAt: string
  blocks: TimeBlock[]
}
