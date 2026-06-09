import type { Category, CategoryId } from './types'

export const CATEGORIES: Category[] = [
  {
    id: 'sleep',
    name: '睡觉',
    color: '#cfe9be',
    strongColor: '#9bcf80',
    textColor: '#263e20',
  },
  {
    id: 'study',
    name: '学习',
    color: '#b7c8ea',
    strongColor: '#7f9dd6',
    textColor: '#1e3155',
  },
  {
    id: 'entertainment',
    name: '娱乐',
    color: '#fff2c4',
    strongColor: '#e5ca6f',
    textColor: '#4c3d0b',
  },
  {
    id: 'routine',
    name: '日常',
    color: '#f4b2bc',
    strongColor: '#dc7e8d',
    textColor: '#55212a',
  },
]

export const CATEGORY_MAP = CATEGORIES.reduce(
  (map, category) => {
    map[category.id] = category
    return map
  },
  {} as Record<CategoryId, Category>,
)

export const DEFAULT_LABELS: Record<CategoryId, string[]> = {
  sleep: ['睡觉', '午睡'],
  study: ['开题', '上课', '组会', '看论文', '写作'],
  entertainment: ['B站', '看综艺', '小红书', '刷手机'],
  routine: ['吃饭', '洗漱', '收拾', '洗衣', '在路上'],
}
