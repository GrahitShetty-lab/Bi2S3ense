import React, { useState, useCallback, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupScreen = 'dashboard' | 'workers' | 'alerts' | 'reports' | 'workerDetail' | 'alertDetail'
type WorkerFilter = Status | 'all'
type Status = 'safe' | 'caution' | 'danger'
type SortKey = 'name' | 'status' | 'lastScan' | 'ppmHours'
type SortDir = 'asc' | 'desc'

export interface WorkerRecord {
  id: string
  name: string
  zone: string
  status: Status
  lastScan: Date
  badgeId: string
  badgeValid: boolean
  ppmHours: number
  scans: ScanEntry[]
}

export interface AlertRecord {
  id: string
  workerId: string
  workerName: string
  zone: string
  ppmHours: number
  time: Date
  acknowledged: boolean
  status: Status
}

interface ScanEntry {
  id: string
  timestamp: Date
  status: Status
  ppmHours: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mkScan = (hoursAgo: number, status: Status, ppm: number, idx: number): ScanEntry => ({
  id: String(idx),
  timestamp: new Date(Date.now() - hoursAgo * 3600000),
  status,
  ppmHours: ppm,
})

export const mockWorkers: WorkerRecord[] = [
  {
    id: 'w1', name: 'James Okafor', zone: 'Zone A — Refinery', status: 'safe',
    lastScan: new Date(Date.now() - 1.5 * 3600000), badgeId: 'Bi2S3-2847', badgeValid: true, ppmHours: 1.2,
    scans: [mkScan(1.5, 'safe', 1.2, 1), mkScan(5, 'caution', 4.8, 2), mkScan(9, 'safe', 0.9, 3), mkScan(25, 'safe', 1.5, 4)],
  },
  {
    id: 'w2', name: 'Maria Santos', zone: 'Zone B — Processing', status: 'caution',
    lastScan: new Date(Date.now() - 0.8 * 3600000), badgeId: 'Bi2S3-3091', badgeValid: true, ppmHours: 5.3,
    scans: [mkScan(0.8, 'caution', 5.3, 5), mkScan(4, 'caution', 4.1, 6), mkScan(8, 'safe', 1.8, 7), mkScan(24, 'safe', 2.0, 8)],
  },
  {
    id: 'w3', name: 'Kwame Asante', zone: 'Zone C — Pipeline', status: 'danger',
    lastScan: new Date(Date.now() - 0.25 * 3600000), badgeId: 'Bi2S3-1644', badgeValid: true, ppmHours: 9.7,
    scans: [mkScan(0.25, 'danger', 9.7, 9), mkScan(3, 'caution', 6.2, 10), mkScan(7, 'caution', 5.5, 11), mkScan(23, 'safe', 1.1, 12)],
  },
  {
    id: 'w4', name: 'Priya Nair', zone: 'Zone A — Refinery', status: 'safe',
    lastScan: new Date(Date.now() - 2 * 3600000), badgeId: 'Bi2S3-4422', badgeValid: false, ppmHours: 0.8,
    scans: [mkScan(2, 'safe', 0.8, 13), mkScan(6, 'safe', 1.0, 14), mkScan(10, 'safe', 0.5, 15)],
  },
  {
    id: 'w5', name: 'Tyler Brooks', zone: 'Zone B — Processing', status: 'caution',
    lastScan: new Date(Date.now() - 1.2 * 3600000), badgeId: 'Bi2S3-5503', badgeValid: true, ppmHours: 4.1,
    scans: [mkScan(1.2, 'caution', 4.1, 16), mkScan(5, 'safe', 1.7, 17), mkScan(9, 'safe', 0.9, 18)],
  },
  {
    id: 'w6', name: 'Amara Diallo', zone: 'Zone D — Storage', status: 'safe',
    lastScan: new Date(Date.now() - 3 * 3600000), badgeId: 'Bi2S3-6612', badgeValid: true, ppmHours: 1.5,
    scans: [mkScan(3, 'safe', 1.5, 19), mkScan(7, 'safe', 1.2, 20), mkScan(11, 'safe', 0.8, 21)],
  },
  {
    id: 'w7', name: 'Leon Ferreira', zone: 'Zone C — Pipeline', status: 'safe',
    lastScan: new Date(Date.now() - 4 * 3600000), badgeId: 'Bi2S3-7741', badgeValid: true, ppmHours: 1.9,
    scans: [mkScan(4, 'safe', 1.9, 22), mkScan(8, 'caution', 3.2, 23), mkScan(12, 'safe', 1.1, 24)],
  },
]

export const mockAlerts: AlertRecord[] = [
  { id: 'a1', workerId: 'w3', workerName: 'Kwame Asante', zone: 'Zone C — Pipeline', ppmHours: 9.7, time: new Date(Date.now() - 15 * 60000), acknowledged: false, status: 'danger' },
  { id: 'a2', workerId: 'w2', workerName: 'Maria Santos', zone: 'Zone B — Processing', ppmHours: 5.3, time: new Date(Date.now() - 48 * 60000), acknowledged: false, status: 'caution' },
  { id: 'a3', workerId: 'w5', workerName: 'Tyler Brooks', zone: 'Zone B — Processing', ppmHours: 4.1, time: new Date(Date.now() - 90 * 60000), acknowledged: true, status: 'caution' },
]

const siteWeekData = [
  { day: 'Mon', safe: 12, caution: 3, danger: 0, avg: 1.4 },
  { day: 'Tue', safe: 9, caution: 5, danger: 2, avg: 4.2 },
  { day: 'Wed', safe: 14, caution: 2, danger: 0, avg: 1.1 },
  { day: 'Thu', safe: 11, caution: 4, danger: 1, avg: 2.8 },
  { day: 'Fri', safe: 10, caution: 3, danger: 1, avg: 3.1 },
  { day: 'Sat', safe: 7, caution: 2, danger: 0, avg: 1.8 },
  { day: 'Sun', safe: 5, caution: 1, danger: 0, avg: 0.9 },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtTime(d: Date) { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(d: Date) { return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) }
function fmtRelative(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`
}

const STATUS_CFG = {
  safe: { label: 'SAFE', bg: 'bg-green-safe', text: 'text-white', dim: 'bg-green-dim', border: 'border-green-safe/30', col: '#22c55e' },
  caution: { label: 'CAUTION', bg: 'bg-amber-warn', text: 'text-white', dim: 'bg-amber-dim', border: 'border-amber-warn/30', col: '#f59e0b' },
  danger: { label: 'DANGER', bg: 'bg-red-danger', text: 'text-white', dim: 'bg-red-dim', border: 'border-red-danger/30', col: '#ef4444' },
}

// ─── Shared icons (re-defined locally to avoid cross-file import complexity) ──

function IcoShield({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="currentColor" /><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IcoGrid({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".9" /><rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".6" /><rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".6" /><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".4" /></svg>
}
function IcoUsers({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function IcoBell({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function IcoChart({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><rect x="3" y="12" width="4" height="9" rx="1" fill="currentColor" opacity=".5" /><rect x="10" y="7" width="4" height="14" rx="1" fill="currentColor" opacity=".75" /><rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" /></svg>
}
function IcoArrowLeft({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IcoCheck({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IcoPhone({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
}
function IcoMenu({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function IcoClose({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function IcoWarning({ size = 20, cls = '' }: { size?: number; cls?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cls}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: Status }) {
  const c = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono tracking-wider ${c.bg} ${c.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
      {c.label}
    </span>
  )
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard' as SupScreen, label: 'Dashboard', Icon: IcoGrid },
  { id: 'workers' as SupScreen, label: 'Workers', Icon: IcoUsers },
  { id: 'alerts' as SupScreen, label: 'Alerts', Icon: IcoBell },
  { id: 'reports' as SupScreen, label: 'Reports', Icon: IcoChart },
]

function Sidebar({ active, navigate, alertCount }: { active: SupScreen; navigate: (s: SupScreen) => void; alertCount: number }) {
  const topLevel: SupScreen[] = ['dashboard', 'workers', 'alerts', 'reports']
  const activeTop = topLevel.includes(active) ? active : active === 'workerDetail' ? 'workers' : active === 'alertDetail' ? 'alerts' : 'dashboard'

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-navy-800 border-r border-navy-border min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-border">
        <div className="w-9 h-9 rounded-xl bg-blue-primary flex items-center justify-center shrink-0">
          <IcoShield size={18} cls="text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-fg text-sm leading-none">Bi₂S₃ense</p>
          <p className="text-xs text-slate-muted mt-0.5">Supervisor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTop === id
          return (
            <button key={id} onClick={() => navigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors text-left min-h-[44px] relative ${isActive ? 'bg-blue-primary text-white' : 'text-slate-muted hover:bg-navy-700 hover:text-slate-fg'}`}>
              <Icon size={18} cls="shrink-0" />
              {label}
              {id === 'alerts' && alertCount > 0 && (
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-red-danger text-white'}`}>
                  {alertCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-navy-border">
        <p className="text-xs text-slate-dim font-mono">Site: Midway Refinery</p>
        <p className="text-xs text-slate-dim font-mono">Shift: Day · {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
      </div>
    </aside>
  )
}

// ─── Mobile bottom nav + drawer ───────────────────────────────────────────────

function MobileNav({ active, navigate, alertCount, menuOpen, setMenuOpen }: {
  active: SupScreen; navigate: (s: SupScreen) => void; alertCount: number; menuOpen: boolean; setMenuOpen: (v: boolean) => void
}) {
  const topLevel: SupScreen[] = ['dashboard', 'workers', 'alerts', 'reports']
  const activeTop = topLevel.includes(active) ? active : active === 'workerDetail' ? 'workers' : 'alerts'

  return (
    <>
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy-800 border-t border-navy-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeTop === id
            return (
              <button key={id} onClick={() => { navigate(id); setMenuOpen(false) }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] relative transition-colors ${isActive ? 'text-blue-light' : 'text-slate-muted'}`}>
                <Icon size={22} />
                <span className="text-xs font-semibold">{label}</span>
                {id === 'alerts' && alertCount > 0 && (
                  <span className="absolute top-2 right-[calc(50%-18px)] w-4 h-4 rounded-full bg-red-danger text-white text-[10px] font-bold flex items-center justify-center">
                    {alertCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type IconFC = (props: { size?: number; cls?: string }) => React.ReactElement

function StatCard({ label, value, sub, color, Icon, onClick }: {
  label: string; value: number; sub?: string; color: string
  Icon: IconFC; onClick?: () => void
}) {
  const inner = (
    <>
      <div className={`p-3 rounded-xl shrink-0 ${color}`}>
        <Icon size={22} cls="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold font-mono text-slate-fg mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-dim mt-0.5">{sub}</p>}
      </div>
      {onClick && <div className="ml-auto self-center text-slate-dim text-xs">→</div>}
    </>
  )
  if (onClick) {
    return (
      <button onClick={onClick}
        className="bg-navy-700 border border-navy-border rounded-2xl p-5 flex items-start gap-4 w-full text-left hover:bg-navy-600 transition-colors min-h-[44px]">
        {inner}
      </button>
    )
  }
  return <div className="bg-navy-700 border border-navy-border rounded-2xl p-5 flex items-start gap-4">{inner}</div>
}

// ─── Worker table row (desktop) ───────────────────────────────────────────────

function WorkerRow({ worker, onClick, even }: { worker: WorkerRecord; onClick: () => void; even: boolean }) {
  return (
    <tr onClick={onClick} className={`cursor-pointer transition-colors hover:bg-navy-600 ${even ? 'bg-navy-800' : 'bg-navy-700'}`}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-600 border border-navy-border flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-slate-muted">{worker.name.split(' ').map(p => p[0]).join('')}</span>
          </div>
          <span className="text-sm font-semibold text-slate-fg">{worker.name}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-muted">{worker.zone}</td>
      <td className="px-4 py-3.5"><StatusChip status={worker.status} /></td>
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm text-slate-fg">{worker.ppmHours.toFixed(1)}</span>
        <span className="text-xs text-slate-dim ml-1">ppm·h</span>
      </td>
      <td className="px-4 py-3.5 text-xs text-slate-muted font-mono">{fmtRelative(worker.lastScan)}</td>
      <td className="px-4 py-3.5">
        <span className={`text-xs font-bold font-mono px-2 py-1 rounded-full ${worker.badgeValid ? 'bg-green-dim text-green-light' : 'bg-red-dim text-red-light'}`}>
          {worker.badgeValid ? '✓ VALID' : '✗ EXPIRED'}
        </span>
      </td>
    </tr>
  )
}

// ─── Worker card (mobile) ─────────────────────────────────────────────────────

function WorkerCard({ worker, onClick }: { worker: WorkerRecord; onClick: () => void }) {
  const cfg = STATUS_CFG[worker.status]
  return (
    <button onClick={onClick} className="w-full text-left bg-navy-700 border border-navy-border rounded-2xl p-4 flex items-center gap-4 hover:bg-navy-600 transition-colors min-h-[72px]">
      <div className={`w-2 self-stretch rounded-full ${cfg.bg}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-fg text-sm">{worker.name}</span>
          <StatusChip status={worker.status} />
        </div>
        <p className="text-xs text-slate-muted mt-1">{worker.zone}</p>
        <p className="text-xs text-slate-dim font-mono mt-0.5">{worker.badgeId} · {fmtRelative(worker.lastScan)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-sm text-slate-fg">{worker.ppmHours.toFixed(1)}</p>
        <p className="text-xs text-slate-dim font-mono">ppm·h</p>
      </div>
    </button>
  )
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert, onClick }: { alert: AlertRecord; onClick: () => void }) {
  const cfg = STATUS_CFG[alert.status]
  return (
    <button onClick={onClick}
      className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-colors hover:brightness-110 ${cfg.dim} ${cfg.border} ${alert.acknowledged ? 'opacity-60' : ''}`}>
      <div className={`p-2 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
        <IcoWarning size={16} cls="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-fg text-sm">{alert.workerName}</span>
          <StatusChip status={alert.status} />
          {alert.acknowledged && <span className="text-xs text-slate-dim font-mono">Acknowledged</span>}
        </div>
        <p className="text-xs text-slate-muted mt-1">{alert.zone}</p>
        <p className="text-xs text-slate-dim font-mono mt-0.5">{fmtDate(alert.time)} · {fmtTime(alert.time)} · {fmtRelative(alert.time)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-sm text-slate-fg">{alert.ppmHours.toFixed(1)}</p>
        <p className="text-xs text-slate-dim font-mono">ppm·h</p>
      </div>
    </button>
  )
}

// ─── Screen: Dashboard ────────────────────────────────────────────────────────

function DashboardMain({ workers, alerts, navigate, onFilterWorkers }: {
  workers: WorkerRecord[]; alerts: AlertRecord[]
  navigate: (s: SupScreen, id?: string) => void
  onFilterWorkers: (f: WorkerFilter) => void
}) {
  const safeCount = workers.filter(w => w.status === 'safe').length
  const cautionCount = workers.filter(w => w.status === 'caution').length
  const dangerCount = workers.filter(w => w.status === 'danger').length
  const activeAlerts = alerts.filter(a => !a.acknowledged)

  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const statusOrder: Record<Status, number> = { danger: 0, caution: 1, safe: 2 }

  const sorted = [...workers].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortKey === 'status') cmp = statusOrder[a.status] - statusOrder[b.status]
    else if (sortKey === 'lastScan') cmp = b.lastScan.getTime() - a.lastScan.getTime()
    else if (sortKey === 'ppmHours') cmp = b.ppmHours - a.ppmHours
    return sortDir === 'asc' ? cmp : -cmp
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortArrow({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-slate-dim ml-1">↕</span>
    return <span className="text-blue-light ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-navy-700 border border-navy-border rounded-xl px-3 py-2 text-xs">
        <p className="text-slate-muted font-bold mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.fill }} className="font-mono">{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 scroll-visible">
      {/* Page title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-fg">Site Dashboard</h1>
        <p className="text-sm text-slate-muted mt-0.5">Midway Refinery · {workers.length} workers on shift</p>
      </div>

      {/* Stat cards — 2×2 on mobile, 4-col on desktop — each navigates to Workers with a filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Workers" value={workers.length} sub="on shift" color="bg-blue-primary" Icon={IcoUsers}
          onClick={() => { onFilterWorkers('all'); navigate('workers') }} />
        <StatCard label="Safe" value={safeCount} sub="within limits" color="bg-green-safe" Icon={IcoShield}
          onClick={() => { onFilterWorkers('safe'); navigate('workers') }} />
        <StatCard label="Caution" value={cautionCount} sub="monitoring" color="bg-amber-warn" Icon={IcoWarning}
          onClick={() => { onFilterWorkers('caution'); navigate('workers') }} />
        <StatCard label="Danger" value={dangerCount} sub="action required" color="bg-red-danger" Icon={IcoBell}
          onClick={() => { onFilterWorkers('danger'); navigate('workers') }} />
      </div>

      {/* Main grid — stack on mobile, side-by-side on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Worker table — 2/3 width on xl */}
        <div className="xl:col-span-2 bg-navy-700 border border-navy-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-border flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-fg text-sm uppercase tracking-wider">Workers</h2>
            <span className="text-xs text-slate-muted font-mono">{workers.length} total</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-navy-border bg-navy-800/60">
                  {[['name', 'Worker'], ['status', 'Status'], ['ppmHours', 'Exposure'], ['lastScan', 'Last Scan']].map(([k, label]) => (
                    <th key={k} className="px-4 py-3 text-xs font-bold text-slate-muted uppercase tracking-wider cursor-pointer hover:text-slate-fg transition-colors whitespace-nowrap"
                      onClick={() => handleSort(k as SortKey)}>
                      {label}<SortArrow k={k as SortKey} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-bold text-slate-muted uppercase tracking-wider">Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-border">
                {sorted.map((w, i) => (
                  <WorkerRow key={w.id} worker={w} even={i % 2 === 0} onClick={() => navigate('workerDetail', w.id)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-navy-border">
            {sorted.map(w => (
              <div key={w.id} className="p-3">
                <WorkerCard worker={w} onClick={() => navigate('workerDetail', w.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* Alerts panel — 1/3 width on xl */}
        <div className="bg-navy-700 border border-navy-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-border flex items-center justify-between">
            <h2 className="font-bold text-slate-fg text-sm uppercase tracking-wider">Active Alerts</h2>
            {activeAlerts.length > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-danger text-white font-mono">
                {activeAlerts.length}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8">
                <IcoShield size={28} cls="text-green-light mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-light">All Clear</p>
                <p className="text-xs text-slate-dim mt-1">No active alerts</p>
              </div>
            ) : (
              activeAlerts.map(a => (
                <AlertRow key={a.id} alert={a} onClick={() => navigate('alertDetail', a.id)} />
              ))
            )}
          </div>
          {alerts.filter(a => a.acknowledged).length > 0 && (
            <div className="px-5 py-3 border-t border-navy-border">
              <p className="text-xs text-slate-dim font-mono">{alerts.filter(a => a.acknowledged).length} acknowledged alerts today</p>
            </div>
          )}
        </div>
      </div>

      {/* Site-wide trend chart */}
      <div className="bg-navy-700 border border-navy-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-fg text-sm uppercase tracking-wider">Site Exposure — This Week</h2>
          <span className="text-xs text-slate-muted font-mono">Scans by status per day</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={siteWeekData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a6e" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,58,110,0.4)' }} />
            <Bar dataKey="safe" name="Safe" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="caution" name="Caution" fill="#d97706" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="danger" name="Danger" fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-2">
          {[['Safe', '#16a34a'], ['Caution', '#d97706'], ['Danger', '#dc2626']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
              <span className="text-xs text-slate-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Workers list ─────────────────────────────────────────────────────

function WorkersMain({ workers, navigate, initialFilter = 'all' }: {
  workers: WorkerRecord[]; navigate: (s: SupScreen, id?: string) => void; initialFilter?: WorkerFilter
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<WorkerFilter>(initialFilter)

  useEffect(() => { setFilter(initialFilter) }, [initialFilter])

  const filtered = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || w.zone.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filter === 'all' || w.status === filter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scroll-visible">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-fg">Workers</h1>
        <p className="text-sm text-slate-muted mt-0.5">{workers.length} workers on shift</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Search name or zone…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-navy-700 border border-navy-border text-slate-fg rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-light transition-colors placeholder:text-slate-dim" />
        <div className="flex gap-1 bg-navy-700 rounded-xl p-1 border border-navy-border">
          {(['all', 'safe', 'caution', 'danger'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors min-h-[36px] capitalize ${filter === f ? 'bg-blue-primary text-white' : 'text-slate-muted'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-navy-700 border border-navy-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-navy-border bg-navy-800/60">
              {['Worker', 'Zone', 'Status', 'Exposure', 'Last Scan', 'Badge'].map(label => (
                <th key={label} className="px-4 py-3 text-xs font-bold text-slate-muted uppercase tracking-wider whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-border">
            {filtered.map((w, i) => (
              <WorkerRow key={w.id} worker={w} even={i % 2 === 0} onClick={() => navigate('workerDetail', w.id)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <IcoUsers size={28} cls="text-slate-dim mx-auto mb-2" />
            <p className="text-sm text-slate-muted">No workers match your filter</p>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-navy-700 rounded-2xl border border-navy-border">
            <IcoUsers size={28} cls="text-slate-dim mx-auto mb-2" />
            <p className="text-sm text-slate-muted">No workers match your filter</p>
          </div>
        ) : (
          filtered.map(w => <WorkerCard key={w.id} worker={w} onClick={() => navigate('workerDetail', w.id)} />)
        )}
      </div>
    </div>
  )
}

// ─── Screen: Alerts list ──────────────────────────────────────────────────────

function AlertsMain({ alerts, navigate }: { alerts: AlertRecord[]; navigate: (s: SupScreen, id?: string) => void }) {
  const active = alerts.filter(a => !a.acknowledged)
  const acked = alerts.filter(a => a.acknowledged)

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scroll-visible">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-fg">Alerts</h1>
          <p className="text-sm text-slate-muted mt-0.5">{active.length} active · {acked.length} acknowledged</p>
        </div>
        {active.length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-red-danger text-white text-xs font-bold font-mono shrink-0">{active.length} ACTIVE</span>
        )}
      </div>

      {active.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-muted uppercase tracking-wider mb-3">Active Alerts</h2>
          <div className="space-y-2">
            {active.map(a => <AlertRow key={a.id} alert={a} onClick={() => navigate('alertDetail', a.id)} />)}
          </div>
        </div>
      )}

      {acked.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-muted uppercase tracking-wider mb-3">Acknowledged</h2>
          <div className="space-y-2">
            {acked.map(a => <AlertRow key={a.id} alert={a} onClick={() => navigate('alertDetail', a.id)} />)}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="text-center py-16 bg-navy-700 border border-navy-border rounded-2xl">
          <IcoShield size={36} cls="text-green-light mx-auto mb-3" />
          <p className="font-bold text-green-light">All Clear</p>
          <p className="text-sm text-slate-dim mt-1">No alerts today</p>
        </div>
      )}
    </div>
  )
}

// ─── Screen: Reports (placeholder) ───────────────────────────────────────────

function ReportsMain() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-visible">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-fg">Reports</h1>
        <p className="text-sm text-slate-muted mt-0.5">Export shift and compliance data</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Shift Summary', desc: 'All workers, exposure totals, scan counts', period: 'Today' },
          { label: 'Weekly Exposure', desc: 'Aggregated ppm·h by zone and worker', period: 'This week' },
          { label: 'Compliance Report', desc: 'Badge validity, missed scans, alerts', period: 'This month' },
          { label: 'Incident Log', desc: 'Danger-level events with timestamps', period: 'Last 30 days' },
        ].map(r => (
          <div key={r.label} className="bg-navy-700 border border-navy-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-bold text-slate-fg text-sm">{r.label}</h3>
              <span className="text-xs font-mono text-slate-dim shrink-0">{r.period}</span>
            </div>
            <p className="text-xs text-slate-muted mb-4">{r.desc}</p>
            <button className="w-full py-2.5 rounded-xl bg-blue-primary hover:bg-blue-dim text-white text-sm font-bold transition-colors min-h-[44px]">
              Export PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Worker Detail ────────────────────────────────────────────────────

function WorkerDetailMain({ worker, onBack, backLabel }: { worker: WorkerRecord; onBack: () => void; backLabel: string }) {
  const cfg = STATUS_CFG[worker.status]
  const chartData = worker.scans.map(s => ({ time: fmtRelative(s.timestamp), ppm: s.ppmHours })).reverse()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const val = payload[0].value as number
    const status: Status = val < 2 ? 'safe' : val < 8 ? 'caution' : 'danger'
    return (
      <div className="bg-navy-700 border border-navy-border rounded-xl px-3 py-2">
        <p className="text-xs text-slate-muted mb-1">{label}</p>
        <p className="font-mono font-bold text-sm">{val.toFixed(1)} ppm·h</p>
        <StatusChip status={status} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scroll-visible">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-muted hover:text-slate-fg transition-colors min-h-[44px]">
        <IcoArrowLeft size={18} cls="shrink-0" />
        <span className="text-sm font-semibold">Back to {backLabel}</span>
      </button>

      {/* Worker header */}
      <div className={`rounded-2xl p-5 border ${cfg.dim} ${cfg.border}`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-navy-600 border border-navy-border flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-slate-muted">{worker.name.split(' ').map(p => p[0]).join('')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-fg">{worker.name}</h1>
              <StatusChip status={worker.status} />
            </div>
            <p className="text-sm text-slate-muted mt-1">{worker.zone}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <div>
                <p className="text-xs text-slate-dim">Current Exposure</p>
                <p className="font-mono font-bold text-slate-fg">{worker.ppmHours.toFixed(1)} <span className="text-xs text-slate-dim">ppm·h</span></p>
              </div>
              <div>
                <p className="text-xs text-slate-dim">Badge</p>
                <p className="font-mono text-sm text-slate-fg">{worker.badgeId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-dim">Badge Status</p>
                <p className={`font-mono text-sm font-bold ${worker.badgeValid ? 'text-green-light' : 'text-red-light'}`}>
                  {worker.badgeValid ? '✓ Valid' : '✗ Expired'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-dim">Last Scan</p>
                <p className="font-mono text-sm text-slate-fg">{fmtRelative(worker.lastScan)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exposure history chart */}
      <div className="bg-navy-700 border border-navy-border rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-fg uppercase tracking-wider mb-4">Exposure History</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a6e" />
            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
            <ReferenceLine y={2} stroke="#d97706" strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={8} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="ppm" stroke="#3b82f6" strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#60a5fa' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scan log */}
      <div>
        <h2 className="text-sm font-bold text-slate-fg uppercase tracking-wider mb-3">Scan Log</h2>
        <div className="space-y-2">
          {worker.scans.map(scan => {
            const c = STATUS_CFG[scan.status]
            return (
              <div key={scan.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-navy-700 border border-navy-border">
                <div className={`w-2 self-stretch rounded-full ${c.bg}`} />
                <div className="flex-1 min-w-0">
                  <StatusChip status={scan.status} />
                  <p className="text-xs text-slate-muted font-mono mt-1">
                    {fmtDate(scan.timestamp)} · {fmtTime(scan.timestamp)} · {fmtRelative(scan.timestamp)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-sm text-slate-fg">{scan.ppmHours.toFixed(1)}</p>
                  <p className="text-xs text-slate-dim font-mono">ppm·h</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Alert Detail ─────────────────────────────────────────────────────

function AlertDetailMain({ alert, onBack, onAcknowledge }: { alert: AlertRecord; onBack: () => void; onAcknowledge: (id: string) => void }) {
  const cfg = STATUS_CFG[alert.status]
  const [contacted, setContacted] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scroll-visible">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-muted hover:text-slate-fg transition-colors min-h-[44px]">
        <IcoArrowLeft size={18} cls="shrink-0" />
        <span className="text-sm font-semibold">Back to Alerts</span>
      </button>

      {/* Alert card */}
      <div className={`rounded-2xl p-6 border ${cfg.dim} ${cfg.border}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-3 rounded-xl ${cfg.bg}`}>
            <IcoWarning size={24} cls="text-white" />
          </div>
          <div>
            <StatusChip status={alert.status} />
            <p className="text-xs text-slate-muted font-mono mt-1">{fmtDate(alert.time)} · {fmtTime(alert.time)}</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-fg mb-1">{alert.workerName}</h1>
        <p className="text-slate-muted text-sm mb-5">{alert.zone}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ['Exposure Level', `${alert.ppmHours.toFixed(1)} ppm·h`],
            ['Time', `${fmtRelative(alert.time)}`],
            ['Status', alert.acknowledged ? 'Acknowledged' : 'Active'],
          ].map(([label, value]) => (
            <div key={label} className="bg-navy-900/40 rounded-xl p-3">
              <p className="text-xs text-slate-dim">{label}</p>
              <p className="font-mono font-bold text-sm text-slate-fg mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exposure gauge */}
      <div className="bg-navy-700 border border-navy-border rounded-2xl p-5">
        <p className="text-xs font-bold text-slate-muted uppercase tracking-wider mb-3">Exposure Level (0–10 ppm·h)</p>
        <div className="relative h-5 rounded-full overflow-hidden bg-navy-600">
          <div className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(to right, #16a34a 0%, #16a34a 20%, #d97706 20%, #d97706 80%, #dc2626 80%, #dc2626 100%)' }} />
          <div className="absolute top-0 bottom-0 right-0 bg-navy-700/70"
            style={{ left: `${Math.min(alert.ppmHours / 10, 1) * 100}%` }} />
          <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ left: `calc(${Math.min(alert.ppmHours / 10, 1) * 100}% - 2px)` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-green-light font-mono">Safe</span>
          <span className="text-xs text-amber-warn font-mono">Caution</span>
          <span className="text-xs text-red-light font-mono">Danger</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!alert.acknowledged ? (
          <button onClick={() => onAcknowledge(alert.id)}
            className="w-full flex items-center justify-center gap-2 bg-green-safe hover:bg-green-dim text-white font-bold py-4 rounded-2xl transition-colors min-h-[56px]">
            <IcoCheck size={20} cls="text-white" />
            Acknowledge Alert
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-navy-700 border border-navy-border text-green-light font-bold py-4 rounded-2xl min-h-[56px]">
            <IcoCheck size={20} cls="text-green-light" />
            Alert Acknowledged
          </div>
        )}
        <button
          onClick={() => setContacted(true)}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-colors min-h-[56px] ${contacted ? 'bg-navy-700 border border-navy-border text-blue-light' : 'bg-blue-primary hover:bg-blue-dim text-white'}`}>
          <IcoPhone size={20} />
          {contacted ? 'Contact Sent' : 'Contact Worker'}
        </button>
      </div>
    </div>
  )
}

// ─── Supervisor Shell ─────────────────────────────────────────────────────────

export function SupervisorShell({ onExitSupervisor }: { onExitSupervisor: () => void }) {
  const [screen, setScreen] = useState<SupScreen>('dashboard')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [workerDetailFrom, setWorkerDetailFrom] = useState<SupScreen>('dashboard')
  const [workerFilter, setWorkerFilter] = useState<WorkerFilter>('all')
  const [alerts, setAlerts] = useState<AlertRecord[]>(mockAlerts)
  const [menuOpen, setMenuOpen] = useState(false)

  const workers = mockWorkers
  const activeAlertCount = alerts.filter(a => !a.acknowledged).length

  const navigate = useCallback((s: SupScreen, id?: string) => {
    if (s === 'workerDetail' && id) {
      setSelectedWorkerId(id)
      setWorkerDetailFrom(prev => (prev === 'workers' || prev === 'dashboard') ? prev : 'dashboard')
    }
    if (s === 'alertDetail' && id) setSelectedAlertId(id)
    setScreen(prev => {
      if (s === 'workerDetail') setWorkerDetailFrom(prev)
      return s
    })
    setMenuOpen(false)
  }, [])

  const handleAcknowledge = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }, [])

  const handleFilterWorkers = useCallback((f: WorkerFilter) => {
    setWorkerFilter(f)
  }, [])

  const selectedWorker = workers.find(w => w.id === selectedWorkerId) ?? null
  const selectedAlert = alerts.find(a => a.id === selectedAlertId) ?? null
  const backLabel = workerDetailFrom === 'workers' ? 'Workers' : 'Dashboard'

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar active={screen} navigate={navigate} alertCount={activeAlertCount} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-navy-border bg-navy-800 shrink-0">
          {/* Mobile: logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-primary flex items-center justify-center">
              <IcoShield size={16} cls="text-white" />
            </div>
            <span className="font-bold text-slate-fg text-sm">Bi₂S₃ense</span>
          </div>
          {/* Desktop: spacer */}
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            {activeAlertCount > 0 && (
              <button onClick={() => navigate('alerts')}
                className="relative p-2.5 bg-red-dim border border-red-danger/30 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center">
                <IcoBell size={18} cls="text-red-light" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-danger text-white text-[10px] font-bold flex items-center justify-center">{activeAlertCount}</span>
              </button>
            )}
            <button onClick={onExitSupervisor}
              className="hidden lg:block text-xs font-semibold text-slate-muted hover:text-slate-fg px-3 py-2 rounded-lg border border-navy-border hover:border-navy-500 transition-colors min-h-[44px]">
              ← Worker App
            </button>
            <button onClick={onExitSupervisor}
              className="lg:hidden text-xs font-semibold text-slate-muted px-3 py-2 rounded-lg border border-navy-border transition-colors min-h-[44px]">
              Exit
            </button>
          </div>
        </header>

        {/* Screen content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden pb-14 lg:pb-0">
            {screen === 'dashboard' && (
              <DashboardMain workers={workers} alerts={alerts} navigate={navigate} onFilterWorkers={handleFilterWorkers} />
            )}
            {screen === 'workers' && (
              <WorkersMain workers={workers} navigate={navigate} initialFilter={workerFilter} />
            )}
            {screen === 'alerts' && <AlertsMain alerts={alerts} navigate={navigate} />}
            {screen === 'reports' && <ReportsMain />}
            {screen === 'workerDetail' && selectedWorker && (
              <WorkerDetailMain
                worker={selectedWorker}
                onBack={() => navigate(workerDetailFrom)}
                backLabel={backLabel}
              />
            )}
            {screen === 'alertDetail' && selectedAlert && (
              <AlertDetailMain alert={selectedAlert} onBack={() => navigate('alerts')} onAcknowledge={handleAcknowledge} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <MobileNav active={screen} navigate={navigate} alertCount={activeAlertCount} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
    </div>
  )
}
