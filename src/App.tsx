import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  PencilLine,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { CATEGORIES, CATEGORY_MAP, DEFAULT_LABELS } from './categories'
import {
  SLOTS_PER_DAY,
  addDays,
  createBlockId,
  dateKey,
  displayDate,
  durationLabel,
  formatRange,
  formatSlot,
  hasOverlap,
  totalsForDate,
  weekDates,
  weekdayName,
} from './time'
import type { CategoryId, TimeBlock } from './types'
import {
  clearBlocks,
  deleteBlock,
  loadBlocks,
  makeBackup,
  parseBackup,
  replaceBlocks,
  saveBlock,
} from './storage'
import './index.css'

type View = 'today' | 'week' | 'stats' | 'settings'

type Draft =
  | {
      kind: 'new'
      date: string
      startSlot: number
      slotCount: number
      category: CategoryId
      label: string
    }
  | {
      kind: 'edit'
      block: TimeBlock
      date: string
      startSlot: number
      slotCount: number
      category: CategoryId
      label: string
    }

type DragSelection = {
  startSlot: number
  endSlot: number
  pointerType: string
  startY: number
}

const timeSlots = Array.from({ length: SLOTS_PER_DAY }, (_, slot) => slot)

function App() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [activeView, setActiveView] = useState<View>('today')
  const [activeDate, setActiveDate] = useState(dateKey(new Date()))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [selection, setSelection] = useState<DragSelection | null>(null)
  const [isDrawMode, setIsDrawMode] = useState(false)
  const [notice, setNotice] = useState('已准备记录今天')
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => block.date === activeDate)
        .sort((a, b) => a.startSlot - b.startSlot),
    [activeDate, blocks],
  )

  const week = useMemo(() => weekDates(activeDate), [activeDate])

  useEffect(() => {
    loadBlocks()
      .then(setBlocks)
      .catch(() => setNotice('读取本机数据失败，请刷新后重试'))
  }, [])

  useEffect(() => {
    const release = () => {
      if (!selection) {
        return
      }

      const startSlot = Math.min(selection.startSlot, selection.endSlot)
      const endSlot = Math.max(selection.startSlot, selection.endSlot)
      openDraft({
        kind: 'new',
        date: activeDate,
        startSlot,
        slotCount: endSlot - startSlot + 1,
        category: 'study',
        label: DEFAULT_LABELS.study[0],
      })
      setSelection(null)
    }

    const cancel = () => setSelection(null)

    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [activeDate, selection])

  function slotFromPointer(clientY: number): number {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) {
      return 0
    }
    const rowHeight = rect.height / SLOTS_PER_DAY
    return Math.max(
      0,
      Math.min(SLOTS_PER_DAY - 1, Math.floor((clientY - rect.top) / rowHeight)),
    )
  }

  function openDraft(nextDraft: Draft) {
    setDraft(nextDraft)
  }

  async function persistDraft() {
    if (!draft) {
      return
    }

    const candidate = {
      date: draft.date,
      startSlot: draft.startSlot,
      slotCount: draft.slotCount,
    }
    const ignoreId = draft.kind === 'edit' ? draft.block.id : undefined

    if (hasOverlap(blocks, candidate, ignoreId)) {
      setNotice('这个时间段和已有记录重叠了')
      return
    }

    const now = new Date().toISOString()
    const block: TimeBlock =
      draft.kind === 'edit'
        ? {
            ...draft.block,
            startSlot: draft.startSlot,
            slotCount: draft.slotCount,
            category: draft.category,
            label: draft.label.trim() || CATEGORY_MAP[draft.category].name,
            updatedAt: now,
          }
        : {
            id: createBlockId(),
            date: draft.date,
            startSlot: draft.startSlot,
            slotCount: draft.slotCount,
            category: draft.category,
            label: draft.label.trim() || CATEGORY_MAP[draft.category].name,
            createdAt: now,
            updatedAt: now,
          }

    await saveBlock(block)
    setBlocks((current) =>
      current
        .filter((item) => item.id !== block.id)
        .concat(block)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startSlot - b.startSlot),
    )
    setDraft(null)
    setNotice('已保存')
  }

  async function removeDraftBlock() {
    if (!draft || draft.kind !== 'edit') {
      return
    }
    await deleteBlock(draft.block.id)
    setBlocks((current) => current.filter((block) => block.id !== draft.block.id))
    setDraft(null)
    setNotice('已删除')
  }

  function downloadBackup() {
    const backup = makeBackup(blocks)
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `time-block-backup-${dateKey(new Date())}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('备份已导出')
  }

  async function importBackup(file: File) {
    try {
      const nextBlocks = parseBackup(await file.text())
      await replaceBlocks(nextBlocks)
      setBlocks(nextBlocks)
      setNotice('备份已恢复')
    } catch {
      setNotice('导入失败，请确认是本应用导出的 JSON')
    }
  }

  async function clearAll() {
    const confirmed = window.confirm('确定清空所有本机记录吗？')
    if (!confirmed) {
      return
    }
    await clearBlocks()
    setBlocks([])
    setNotice('本机记录已清空')
  }

  return (
    <main className="app-shell">
      <div className="top-controls">
        <header className="app-header">
          <div>
            <p className="eyebrow">时间块</p>
            <h1>{activeView === 'today' ? '今天怎么过' : viewTitle(activeView)}</h1>
          </div>
          <div className="header-actions">
            {activeView === 'today' && (
              <button
                type="button"
                className={isDrawMode ? 'icon-button active' : 'icon-button'}
                aria-label="涂块记录"
                aria-pressed={isDrawMode}
                title="涂块记录"
                onClick={() => {
                  setIsDrawMode((current) => !current)
                  setSelection(null)
                  setNotice(isDrawMode ? '已退出涂块模式' : '涂块模式已开启')
                }}
              >
                <PencilLine size={20} />
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="新增记录"
              onClick={() =>
                openDraft({
                  kind: 'new',
                  date: activeDate,
                  startSlot: 18,
                  slotCount: 2,
                  category: 'study',
                  label: DEFAULT_LABELS.study[0],
                })
              }
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        <section className="date-strip" aria-label="日期选择">
          <button
            type="button"
            className="icon-button"
            aria-label="前一天"
            onClick={() => setActiveDate(addDays(activeDate, -1))}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="date-pill"
            onClick={() => setActiveDate(dateKey(new Date()))}
          >
            <strong>{displayDate(activeDate)}</strong>
            <span>{weekdayName(activeDate)}</span>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="后一天"
            onClick={() => setActiveDate(addDays(activeDate, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </section>

        <div className="notice" role="status">
          {notice}
        </div>
      </div>

      {activeView === 'today' && (
        <TodayView
          blocks={dayBlocks}
          gridRef={gridRef}
          isDrawMode={isDrawMode}
          selection={selection}
          onPointerDown={(clientY, pointerType) => {
            const slot = slotFromPointer(clientY)
            setSelection({ startSlot: slot, endSlot: slot, pointerType, startY: clientY })
          }}
          onPointerMove={(clientY) => {
            if (selection) {
              if (
                selection.pointerType === 'touch' &&
                !isDrawMode &&
                Math.abs(clientY - selection.startY) > 18
              ) {
                setSelection(null)
                return
              }
              setSelection({ ...selection, endSlot: slotFromPointer(clientY) })
            }
          }}
          onEdit={(block) =>
            openDraft({
              kind: 'edit',
              block,
              date: block.date,
              startSlot: block.startSlot,
              slotCount: block.slotCount,
              category: block.category,
              label: block.label,
            })
          }
        />
      )}

      {activeView === 'week' && (
        <WeekView
          blocks={blocks}
          dates={week}
          onEdit={(block) =>
            openDraft({
              kind: 'edit',
              block,
              date: block.date,
              startSlot: block.startSlot,
              slotCount: block.slotCount,
              category: block.category,
              label: block.label,
            })
          }
        />
      )}

      {activeView === 'stats' && <StatsView blocks={blocks} dates={week} />}

      {activeView === 'settings' && (
        <SettingsView
          blocks={blocks}
          fileInputRef={fileInputRef}
          onExport={downloadBackup}
          onImport={importBackup}
          onClear={clearAll}
        />
      )}

      <nav className="bottom-nav" aria-label="主导航">
        <NavButton
          label="今日"
          active={activeView === 'today'}
          icon={<CalendarDays size={19} />}
          onClick={() => setActiveView('today')}
        />
        <NavButton
          label="本周"
          active={activeView === 'week'}
          icon={<CalendarDays size={19} />}
          onClick={() => setActiveView('week')}
        />
        <NavButton
          label="统计"
          active={activeView === 'stats'}
          icon={<BarChart3 size={19} />}
          onClick={() => setActiveView('stats')}
        />
        <NavButton
          label="设置"
          active={activeView === 'settings'}
          icon={<Settings size={19} />}
          onClick={() => setActiveView('settings')}
        />
      </nav>

      {draft && (
        <EditorSheet
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={persistDraft}
          onDelete={removeDraftBlock}
        />
      )}
    </main>
  )
}

function TodayView({
  blocks,
  gridRef,
  isDrawMode,
  selection,
  onPointerDown,
  onPointerMove,
  onEdit,
}: {
  blocks: TimeBlock[]
  gridRef: RefObject<HTMLDivElement | null>
  isDrawMode: boolean
  selection: DragSelection | null
  onPointerDown: (clientY: number, pointerType: string) => void
  onPointerMove: (clientY: number) => void
  onEdit: (block: TimeBlock) => void
}) {
  return (
    <section className="today-panel">
      <div
        ref={gridRef}
        className={isDrawMode ? 'day-grid is-drawing' : 'day-grid'}
        onPointerDown={(event) => {
          if (isDrawMode) {
            event.preventDefault()
          }
          onPointerDown(event.clientY, event.pointerType)
        }}
        onPointerMove={(event) => onPointerMove(event.clientY)}
      >
        {timeSlots.map((slot) => (
          <div className="time-row" key={slot}>
            <span>{formatSlot(slot)}</span>
          </div>
        ))}

        {blocks.map((block) => (
          <TimeBlockItem key={block.id} block={block} onClick={() => onEdit(block)} />
        ))}

        {selection && <SelectionBlock selection={selection} />}
      </div>
    </section>
  )
}

function TimeBlockItem({
  block,
  onClick,
}: {
  block: TimeBlock
  onClick: () => void
}) {
  const category = CATEGORY_MAP[block.category]
  return (
    <button
      type="button"
      className="time-block"
      style={{
        top: `${(block.startSlot / SLOTS_PER_DAY) * 100}%`,
        height: `${(block.slotCount / SLOTS_PER_DAY) * 100}%`,
        background: category.color,
        color: category.textColor,
        borderColor: category.strongColor,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      <strong>{block.label}</strong>
      <span>{formatRange(block.startSlot, block.slotCount)}</span>
    </button>
  )
}

function SelectionBlock({ selection }: { selection: DragSelection }) {
  const startSlot = Math.min(selection.startSlot, selection.endSlot)
  const endSlot = Math.max(selection.startSlot, selection.endSlot)
  const slotCount = endSlot - startSlot + 1

  return (
    <div
      className="selection-block"
      style={{
        top: `${(startSlot / SLOTS_PER_DAY) * 100}%`,
        height: `${(slotCount / SLOTS_PER_DAY) * 100}%`,
      }}
    />
  )
}

function WeekView({
  blocks,
  dates,
  onEdit,
}: {
  blocks: TimeBlock[]
  dates: string[]
  onEdit: (block: TimeBlock) => void
}) {
  return (
    <section className="week-scroller" aria-label="本周时间网格">
      <div className="week-grid">
        <div className="week-time-header">时间</div>
        {dates.map((date) => (
          <div className="week-day-header" key={date}>
            <strong>{displayDate(date)}</strong>
            <span>{weekdayName(date)}</span>
          </div>
        ))}

        {timeSlots.map((slot) => (
          <div className="week-time-cell" key={slot}>
            {formatSlot(slot)}
          </div>
        ))}

        {dates.map((date, columnIndex) => (
          <div className="week-day-column" key={date} style={{ gridColumn: columnIndex + 2 }}>
            {blocks
              .filter((block) => block.date === date)
              .map((block) => {
                const category = CATEGORY_MAP[block.category]
                return (
                  <button
                    type="button"
                    key={block.id}
                    className="week-block"
                    style={{
                      top: `${(block.startSlot / SLOTS_PER_DAY) * 100}%`,
                      height: `${(block.slotCount / SLOTS_PER_DAY) * 100}%`,
                      background: category.color,
                      color: category.textColor,
                    }}
                    onClick={() => onEdit(block)}
                  >
                    {block.label}
                  </button>
                )
              })}
          </div>
        ))}
      </div>
    </section>
  )
}

function StatsView({ blocks, dates }: { blocks: TimeBlock[]; dates: string[] }) {
  const weekTotals = CATEGORIES.reduce(
    (totals, category) => {
      totals[category.id] = dates.reduce(
        (sum, date) => sum + totalsForDate(blocks, date)[category.id],
        0,
      )
      return totals
    },
    {} as Record<CategoryId, number>,
  )

  return (
    <section className="stats-panel">
      <div className="category-summary">
        {CATEGORIES.map((category) => (
          <article
            className="summary-card"
            key={category.id}
            style={{ borderColor: category.strongColor }}
          >
            <span style={{ background: category.color }}>{category.name}</span>
            <strong>{durationLabel(weekTotals[category.id])}</strong>
          </article>
        ))}
      </div>

      <div className="daily-stats">
        {dates.map((date) => {
          const totals = totalsForDate(blocks, date)
          return (
            <article className="daily-row" key={date}>
              <div>
                <strong>{displayDate(date)}</strong>
                <span>{weekdayName(date)}</span>
              </div>
              <div className="daily-bars">
                {CATEGORIES.map((category) => (
                  <div className="daily-bar" key={category.id}>
                    <span>{category.name}</span>
                    <meter
                      min="0"
                      max="48"
                      value={totals[category.id]}
                      style={{ ['--meter-color' as string]: category.strongColor }}
                    />
                    <strong>{durationLabel(totals[category.id])}</strong>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SettingsView({
  blocks,
  fileInputRef,
  onExport,
  onImport,
  onClear,
}: {
  blocks: TimeBlock[]
  fileInputRef: RefObject<HTMLInputElement | null>
  onExport: () => void
  onImport: (file: File) => void
  onClear: () => void
}) {
  return (
    <section className="settings-panel">
      <div className="settings-actions">
        <button type="button" className="action-button" onClick={onExport}>
          <Download size={18} />
          导出 JSON 备份
        </button>
        <button
          type="button"
          className="action-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          导入 JSON 备份
        </button>
        <button type="button" className="action-button danger" onClick={onClear}>
          <RotateCcw size={18} />
          清空本机记录
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) {
            onImport(file)
          }
          event.currentTarget.value = ''
        }}
      />
      <div className="storage-note">
        <strong>{blocks.length}</strong>
        <span>条记录保存在这台设备上。导入备份会替换当前本机数据。</span>
      </div>
    </section>
  )
}

function EditorSheet({
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft
  onChange: (draft: Draft) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const maxSlotCount = SLOTS_PER_DAY - draft.startSlot

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="editor-sheet" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">{draft.kind === 'new' ? '新记录' : '编辑记录'}</p>
            <h2>{formatRange(draft.startSlot, draft.slotCount)}</h2>
          </div>
          {draft.kind === 'edit' && (
            <button
              type="button"
              className="icon-button danger"
              aria-label="删除记录"
              onClick={onDelete}
            >
              <Trash2 size={18} />
            </button>
          )}
        </header>

        <label className="field-label">
          事项
          <input
            value={draft.label}
            onChange={(event) => onChange({ ...draft, label: event.target.value })}
            placeholder="比如 开题、睡觉、吃饭"
          />
        </label>

        <div className="category-picker" aria-label="分类">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category.id}
              className={draft.category === category.id ? 'selected' : ''}
              style={{
                background: category.color,
                color: category.textColor,
                borderColor:
                  draft.category === category.id ? category.strongColor : 'transparent',
              }}
              onClick={() =>
                onChange({
                  ...draft,
                  category: category.id,
                  label: draft.label || DEFAULT_LABELS[category.id][0],
                })
              }
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="quick-labels">
          {DEFAULT_LABELS[draft.category].map((label) => (
            <button
              type="button"
              key={label}
              onClick={() => onChange({ ...draft, label })}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="range-controls">
          <label className="field-label">
            开始
            <select
              value={draft.startSlot}
              onChange={(event) => {
                const startSlot = Number(event.target.value)
                onChange({
                  ...draft,
                  startSlot,
                  slotCount: Math.min(draft.slotCount, SLOTS_PER_DAY - startSlot),
                })
              }}
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatSlot(slot)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            时长
            <select
              value={draft.slotCount}
              onChange={(event) =>
                onChange({ ...draft, slotCount: Number(event.target.value) })
              }
            >
              {Array.from({ length: maxSlotCount }, (_, index) => index + 1).map(
                (count) => (
                  <option key={count} value={count}>
                    {durationLabel(count)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <div className="sheet-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            保存
          </button>
        </div>
      </section>
    </div>
  )
}

function NavButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string
  active: boolean
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className={active ? 'active' : ''} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

function viewTitle(view: View): string {
  return {
    today: '今天怎么过',
    week: '本周复盘',
    stats: '时间统计',
    settings: '本机备份',
  }[view]
}

export default App
