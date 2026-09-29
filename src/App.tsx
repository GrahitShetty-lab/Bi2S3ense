import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { SupervisorShell } from './supervisor'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'login' | 'home' | 'qrScan' | 'stripCapture' | 'analysis' | 'result' | 'history' | 'profile'
type Status = 'safe' | 'caution' | 'danger'
type StripCapState = 'idle' | 'checking' | 'captured' | 'unclear'
type QrState = 'scanning' | 'success'
type DateFilter = 'day' | 'week' | 'month'

interface ScanRecord {
  id: string
  timestamp: Date
  status: Status
  ppmHours: number
  badgeId: string
}

interface AppState {
  workerName: string
  badgeId: string
  shiftStart: string
  badgeValid: boolean
  scans: ScanRecord[]
  latestResult: ScanRecord | null
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockScans: ScanRecord[] = [
  { id: '1', timestamp: new Date(Date.now() - 1.5 * 3600000), status: 'safe', ppmHours: 1.2, badgeId: 'Bi2S3-2847' },
  { id: '2', timestamp: new Date(Date.now() - 4 * 3600000), status: 'caution', ppmHours: 4.8, badgeId: 'Bi2S3-2847' },
  { id: '3', timestamp: new Date(Date.now() - 7 * 3600000), status: 'safe', ppmHours: 0.9, badgeId: 'Bi2S3-2847' },
  { id: '4', timestamp: new Date(Date.now() - 22 * 3600000), status: 'safe', ppmHours: 1.5, badgeId: 'Bi2S3-2847' },
  { id: '5', timestamp: new Date(Date.now() - 26 * 3600000), status: 'danger', ppmHours: 9.1, badgeId: 'Bi2S3-2847' },
  { id: '6', timestamp: new Date(Date.now() - 30 * 3600000), status: 'caution', ppmHours: 5.3, badgeId: 'Bi2S3-2847' },
  { id: '7', timestamp: new Date(Date.now() - 48 * 3600000), status: 'safe', ppmHours: 0.7, badgeId: 'Bi2S3-2847' },
]

const trendData = [
  { time: 'Mon 06:00', ppm: 0.9 },
  { time: 'Mon 10:00', ppm: 1.5 },
  { time: 'Mon 14:00', ppm: 2.1 },
  { time: 'Mon 18:00', ppm: 1.8 },
  { time: 'Tue 06:00', ppm: 4.8 },
  { time: 'Tue 10:00', ppm: 9.1 },
  { time: 'Tue 14:00', ppm: 5.3 },
  { time: 'Tue 18:00', ppm: 3.2 },
  { time: 'Wed 06:00', ppm: 1.2 },
  { time: 'Wed 10:00', ppm: 0.8 },
  { time: 'Wed 14:00', ppm: 1.1 },
]

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d: Date) {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtRelative(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const STATUS_CONFIG = {
  safe: { label: 'SAFE', bg: 'bg-green-safe', ring: 'ring-green-light', text: 'text-white', dim: 'bg-green-dim', dot: '#22c55e' },
  caution: { label: 'CAUTION', bg: 'bg-amber-warn', ring: 'ring-amber-light', text: 'text-white', dim: 'bg-amber-dim', dot: '#f59e0b' },
  danger: { label: 'DANGER', bg: 'bg-red-danger', ring: 'ring-red-light', text: 'text-white', dim: 'bg-red-dim', dot: '#ef4444' },
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconShield({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="currentColor" />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconQR({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="5" y="5" width="3" height="3" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="16" y="5" width="3" height="3" fill="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="5" y="16" width="3" height="3" fill="currentColor" />
      <path d="M14 14h2v2h-2v2h2v2h2v-2h2v-2h-2v-2h2v-2h-2v2h-2v-2h-2v2z" fill="currentColor" />
    </svg>
  )
}

function IconCamera({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconCloud({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IconChart({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconUser({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconBell({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconCheck({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconWarning({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconArrowLeft({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = STATUS_CONFIG[status]
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm', lg: 'px-4 py-2 text-base' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold font-mono tracking-widest ${cfg.bg} ${cfg.text} ${sizes[size]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block" />
      {cfg.label}
    </span>
  )
}

function ScanCard({ scan }: { scan: ScanRecord }) {
  const cfg = STATUS_CONFIG[scan.status]
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-700 border border-navy-border">
      <div className={`w-2 self-stretch rounded-full ${cfg.bg}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={scan.status} size="sm" />
          <span className="font-mono text-xs text-slate-muted">{scan.badgeId}</span>
        </div>
        <div className="text-xs text-slate-muted mt-1 font-mono">
          {fmtDate(scan.timestamp)} · {fmtTime(scan.timestamp)} · {fmtRelative(scan.timestamp)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono font-semibold text-sm text-slate-fg">{scan.ppmHours}</div>
        <div className="font-mono text-xs text-slate-muted">ppm·h</div>
      </div>
    </div>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ screen, navigate }: { screen: Screen; navigate: (s: Screen) => void }) {
  const tabs = [
    { id: 'home' as Screen, label: 'Home', Icon: IconShield },
    { id: 'qrScan' as Screen, label: 'Scan', Icon: IconCamera },
    { id: 'history' as Screen, label: 'History', Icon: IconChart },
    { id: 'profile' as Screen, label: 'Profile', Icon: IconUser },
  ]
  const active = ['home'].includes(screen) ? 'home'
    : ['qrScan', 'stripCapture', 'analysis', 'result'].includes(screen) ? 'qrScan'
    : screen === 'history' ? 'history'
    : screen === 'profile' ? 'profile' : screen

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-800 border-t border-navy-border safe-area-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => navigate(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] transition-colors ${isActive ? 'text-blue-light' : 'text-slate-muted'}`}>
              <Icon size={22} />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ─── Screen: Login ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onSupervisor }: {
  onLogin: (name: string, badgeId: string, shiftStart: string) => void
  onSupervisor: () => void
}) {
  const [name, setName] = useState('')
  const [shiftStart, setShiftStart] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [badgeId] = useState('Bi2S3-2847')
  const [mode, setMode] = useState<'worker' | 'supervisor'>('worker')

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-primary mb-4">
          <IconShield size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-fg tracking-tight">Bi₂S₃ense</h1>
        <p className="text-slate-muted text-sm mt-1">Industrial Exposure Monitoring</p>
      </div>

      {/* Mode toggle */}
      <div className="px-6 mb-5">
        <div className="flex gap-1 bg-navy-700 rounded-xl p-1 border border-navy-border">
          {(['worker', 'supervisor'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors min-h-[44px] capitalize ${mode === m ? 'bg-blue-primary text-white' : 'text-slate-muted'}`}>
              {m === 'worker' ? '👷 Worker' : '🛡 Supervisor'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        {mode === 'worker' ? (
          <>
            <div className="bg-navy-700 rounded-2xl border border-navy-border p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
                  Worker Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. James Okafor"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-navy-800 border border-navy-border text-slate-fg rounded-xl px-4 py-3 text-base outline-none focus:border-blue-light transition-colors placeholder:text-slate-dim"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
                  Shift Start Time
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={e => setShiftStart(e.target.value)}
                  className="w-full bg-navy-800 border border-navy-border text-slate-fg rounded-xl px-4 py-3 text-base outline-none focus:border-blue-light transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
                  Badge ID
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-navy-800 border border-navy-border rounded-xl px-4 py-3 font-mono text-sm text-slate-muted flex items-center">
                    {badgeId}
                  </div>
                  <button className="flex items-center gap-2 bg-blue-primary hover:bg-blue-dim text-white px-4 py-3 rounded-xl font-semibold text-sm transition-colors min-w-[44px]">
                    <IconQR size={18} />
                    <span>Scan QR</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => name.trim() && onLogin(name.trim(), badgeId, shiftStart)}
              disabled={!name.trim()}
              className="w-full mt-5 bg-blue-primary hover:bg-blue-dim disabled:opacity-40 text-white font-bold text-base py-4 rounded-2xl transition-colors min-h-[56px]">
              Start Shift
            </button>
            <p className="text-center text-xs text-slate-dim mt-4 leading-relaxed">
              Your cumulative exposure data will be recorded and uploaded to your employer's safety system.
            </p>
          </>
        ) : (
          <>
            <div className="bg-navy-700 rounded-2xl border border-navy-border p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
                  Supervisor ID
                </label>
                <input
                  type="text"
                  defaultValue="SUP-0042"
                  className="w-full bg-navy-800 border border-navy-border text-slate-fg rounded-xl px-4 py-3 text-base outline-none focus:border-blue-light transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
                  PIN
                </label>
                <input
                  type="password"
                  defaultValue="••••"
                  className="w-full bg-navy-800 border border-navy-border text-slate-fg rounded-xl px-4 py-3 text-base outline-none focus:border-blue-light transition-colors font-mono"
                />
              </div>
              <div className="bg-navy-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-green-light text-sm">🛡</span>
                <p className="text-xs text-slate-muted">Site: Midway Refinery · Day shift</p>
              </div>
            </div>

            <button
              onClick={onSupervisor}
              className="w-full mt-5 bg-blue-primary hover:bg-blue-dim text-white font-bold text-base py-4 rounded-2xl transition-colors min-h-[56px]">
              Open Supervisor Dashboard
            </button>
            <p className="text-center text-xs text-slate-dim mt-4">
              Access restricted to authorized supervisors only.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────

function HomeScreen({ state, navigate }: { state: AppState; navigate: (s: Screen) => void }) {
  const currentStatus: Status = state.latestResult?.status ?? 'safe'
  const cfg = STATUS_CONFIG[currentStatus]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const recentScans = state.scans.slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen bg-navy-900 pb-20">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-slate-muted text-sm">{greeting},</p>
          <h2 className="text-xl font-bold text-slate-fg">{state.workerName}</h2>
          <p className="text-xs text-slate-dim font-mono mt-0.5">Shift started {state.shiftStart}</p>
        </div>
        <button className="relative p-2.5 bg-navy-700 rounded-xl border border-navy-border min-w-[44px] min-h-[44px] flex items-center justify-center">
          <IconBell size={20} className="text-slate-muted" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-warn" />
        </button>
      </div>

      <div className="px-5 space-y-4 flex-1">
        {/* Exposure Status Card */}
        <div className={`rounded-2xl p-5 border ${currentStatus === 'safe' ? 'bg-green-dim border-green-safe/30' : currentStatus === 'caution' ? 'bg-amber-dim border-amber-warn/30' : 'bg-red-dim border-red-danger/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Current Exposure</span>
            <StatusBadge status={currentStatus} size="sm" />
          </div>
          <div className="flex items-end gap-3">
            <div>
              <span className="text-4xl font-bold font-mono text-white">
                {state.latestResult?.ppmHours.toFixed(1) ?? '—'}
              </span>
              <span className="text-sm font-mono text-white/60 ml-1">ppm·h</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <IconShield size={16} className="text-white/60" />
              <span className="text-xs text-white/60">
                {currentStatus === 'safe' ? 'TLV: &lt;1 ppm' : currentStatus === 'caution' ? 'Near threshold' : 'Above safe limit'}
              </span>
            </div>
          </div>
          {state.latestResult && (
            <p className="text-xs text-white/50 font-mono mt-2">
              Last scan {fmtRelative(state.latestResult.timestamp)} · {fmtTime(state.latestResult.timestamp)}
            </p>
          )}
        </div>

        {/* Badge shelf-life */}
        <div className="flex items-center gap-3 bg-navy-700 rounded-xl border border-navy-border p-4">
          <div className={`p-2 rounded-lg ${state.badgeValid ? 'bg-green-dim' : 'bg-red-dim'}`}>
            <IconShield size={18} className={state.badgeValid ? 'text-green-light' : 'text-red-light'} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-fg">Badge {state.badgeId}</p>
            <p className="text-xs text-slate-muted font-mono">Expires Oct 14, 2026</p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono ${state.badgeValid ? 'bg-green-dim text-green-light' : 'bg-red-dim text-red-light'}`}>
            {state.badgeValid ? '✓ VALID' : '✗ EXPIRED'}
          </span>
        </div>

        {/* Big Scan Button */}
        <button
          onClick={() => navigate('qrScan')}
          className="w-full bg-blue-primary hover:bg-blue-dim active:scale-[0.98] text-white font-bold text-lg py-5 rounded-2xl transition-all min-h-[64px] flex items-center justify-center gap-3">
          <IconCamera size={24} />
          Scan Bi₂S₃ Strip Now
        </button>

        {/* Recent scans */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-fg uppercase tracking-wider">Recent Scans</h3>
            <button onClick={() => navigate('history')} className="text-xs text-blue-light font-semibold min-h-[44px] flex items-center">
              View All
            </button>
          </div>

          {recentScans.length === 0 ? (
            <div className="bg-navy-700 rounded-2xl border border-navy-border p-8 text-center">
              <IconCamera size={32} className="text-slate-dim mx-auto mb-3" />
              <p className="text-slate-muted text-sm font-semibold">No scans yet</p>
              <p className="text-slate-dim text-xs mt-1">Tap "Scan Bi₂S₃ Strip Now" to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: QR Scan ─────────────────────────────────────────────────────────

function QrScanScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [qrState, setQrState] = useState<QrState>('scanning')

  useEffect(() => {
    const t = setTimeout(() => setQrState('success'), 2500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (qrState === 'success') {
      const t = setTimeout(() => navigate('stripCapture'), 1500)
      return () => clearTimeout(t)
    }
  }, [qrState, navigate])

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => navigate('home')} className="p-2.5 bg-navy-700 rounded-xl border border-navy-border min-w-[44px] min-h-[44px] flex items-center justify-center">
          <IconArrowLeft size={20} className="text-slate-fg" />
        </button>
        <h2 className="text-base font-bold text-slate-fg">Scan Badge QR</h2>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="relative w-full max-w-xs aspect-square bg-navy-800 rounded-2xl overflow-hidden border border-navy-border">
          {/* Simulated camera bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-navy-700 to-navy-900" />

          {qrState === 'scanning' && (
            <>
              {/* Corner guides */}
              {[['top-3 left-3', 'border-l-2 border-t-2'], ['top-3 right-3', 'border-r-2 border-t-2'], ['bottom-3 left-3', 'border-l-2 border-b-2'], ['bottom-3 right-3', 'border-r-2 border-b-2']].map(([pos, borders], i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8 ${borders} border-blue-light rounded-sm`} />
              ))}
              {/* Scan line */}
              <div className="animate-scan-line absolute left-4 right-4 h-0.5 bg-blue-light/80 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]" />
              {/* QR placeholder */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <IconQR size={80} className="text-white" />
              </div>
            </>
          )}

          {qrState === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-safe/20 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-green-safe flex items-center justify-center mb-3">
                <IconCheck size={32} className="text-white" />
              </div>
              <p className="text-green-light font-bold text-lg">Badge Verified</p>
              <p className="text-green-light/70 text-xs font-mono mt-1">Bi2S3-2847</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-slate-muted text-sm text-center">
          {qrState === 'scanning' ? 'Align QR code within the frame' : 'Badge successfully registered'}
        </p>

        {qrState === 'scanning' && (
          <div className="mt-8 flex items-center gap-3 bg-navy-700 border border-navy-border rounded-xl px-4 py-3 w-full max-w-xs">
            <IconWarning size={16} className="text-amber-warn shrink-0" />
            <p className="text-xs text-slate-muted">Ensure QR code is clean and unobstructed</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Screen: Strip Capture ────────────────────────────────────────────────────

// Attempts cycle: first capture succeeds, second is unclear, then repeats — gives
// a deterministic demo of both paths without randomness.
let _captureAttempt = 0

function StripCaptureScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [state, setState] = useState<StripCapState>('idle')

  const handleCapture = useCallback(() => {
    setState('checking')
    _captureAttempt++
    const willSucceed = _captureAttempt % 2 !== 0
    setTimeout(() => {
      setState(willSucceed ? 'captured' : 'unclear')
    }, 2000)
  }, [])

  const handleRetake = useCallback(() => setState('idle'), [])

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => navigate('qrScan')} className="p-2.5 bg-navy-700 rounded-xl border border-navy-border min-w-[44px] min-h-[44px] flex items-center justify-center">
          <IconArrowLeft size={20} className="text-slate-fg" />
        </button>
        <h2 className="text-base font-bold text-slate-fg">Capture Bi₂S₃ Strip</h2>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-24 gap-4">
        {/* Viewfinder */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-navy-border bg-navy-800" style={{ aspectRatio: '3/2' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-navy-700 to-navy-800" />

          {/* Alignment overlay — hidden once captured */}
          {state === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative border-2 border-dashed border-white/30 rounded-lg" style={{ width: '75%', height: '40%' }}>
                {[
                  ['top-0 left-0', '-translate-x-0.5 -translate-y-0.5', 'border-l-2 border-t-2'],
                  ['top-0 right-0', 'translate-x-0.5 -translate-y-0.5', 'border-r-2 border-t-2'],
                  ['bottom-0 left-0', '-translate-x-0.5 translate-y-0.5', 'border-l-2 border-b-2'],
                  ['bottom-0 right-0', 'translate-x-0.5 translate-y-0.5', 'border-r-2 border-b-2'],
                ].map(([pos, trans, borders], i) => (
                  <div key={i} className={`absolute ${pos} w-4 h-4 ${borders} ${trans} border-blue-light`} />
                ))}
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-white/60 whitespace-nowrap">
                  Align strip here
                </span>
              </div>
            </div>
          )}

          {/* Checking overlay */}
          {state === 'checking' && (
            <div className="absolute inset-0 bg-navy-900/80 flex flex-col items-center justify-center gap-3 animate-fade-in-up">
              <div className="w-10 h-10 rounded-full border-2 border-blue-light border-t-transparent animate-spin-slow" />
              <p className="text-blue-light font-semibold text-sm">Checking image quality…</p>
            </div>
          )}

          {/* Captured success overlay */}
          {state === 'captured' && (
            <div className="absolute inset-0 bg-green-safe/20 flex flex-col items-center justify-center gap-2 animate-fade-in-up">
              <div className="w-12 h-12 rounded-full bg-green-safe flex items-center justify-center">
                <IconCheck size={24} className="text-white" />
              </div>
              <p className="text-green-light font-bold text-sm">Photo accepted</p>
            </div>
          )}

          {/* Unclear error overlay */}
          {state === 'unclear' && (
            <div className="absolute inset-0 bg-red-danger/10 flex flex-col items-center justify-center gap-2 animate-fade-in-up">
              <div className="w-12 h-12 rounded-full bg-red-dim border border-red-danger/40 flex items-center justify-center">
                <IconWarning size={24} className="text-red-light" />
              </div>
              <p className="text-red-light font-bold text-sm">Image unclear</p>
            </div>
          )}
        </div>

        {/* Tips — only shown while idle */}
        {(state === 'idle' || state === 'checking') && (
          <div className="bg-navy-700 border border-navy-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-muted uppercase tracking-wider">Photo Tips</p>
            {['Keep strip flat against a surface', 'Avoid shadows and reflections', 'Ensure good, even lighting', 'Fill the alignment box with the strip'].map(tip => (
              <div key={tip} className="flex items-start gap-2">
                <span className="text-green-light mt-0.5">✓</span>
                <p className="text-sm text-slate-muted">{tip}</p>
              </div>
            ))}
          </div>
        )}

        {/* Unclear warning banner */}
        {state === 'unclear' && (
          <div className="flex items-start gap-3 bg-red-dim border border-red-danger/30 rounded-xl p-4 animate-fade-in-up">
            <IconWarning size={20} className="text-red-light shrink-0 mt-0.5" />
            <div>
              <p className="text-red-light font-bold text-sm">Photo unclear — please retake</p>
              <p className="text-red-light/70 text-xs mt-1">The strip color couldn't be read accurately. Ensure even lighting with no shadows.</p>
            </div>
          </div>
        )}

        {/* Captured success banner */}
        {state === 'captured' && (
          <div className="flex items-start gap-3 bg-green-dim border border-green-safe/30 rounded-xl p-4 animate-fade-in-up">
            <IconCheck size={20} className="text-green-light shrink-0 mt-0.5" />
            <div>
              <p className="text-green-light font-bold text-sm">Photo looks good</p>
              <p className="text-green-light/70 text-xs mt-1">Strip is clearly visible with good lighting. Ready to analyze.</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-auto">
          {state === 'idle' && (
            <button onClick={handleCapture}
              className="flex-1 bg-blue-primary hover:bg-blue-dim text-white font-bold py-4 rounded-2xl transition-colors min-h-[56px] flex items-center justify-center gap-2">
              <IconCamera size={20} />
              Take Photo
            </button>
          )}

          {state === 'checking' && (
            <button disabled
              className="flex-1 bg-blue-primary opacity-60 text-white font-bold py-4 rounded-2xl min-h-[56px] flex items-center justify-center gap-2 cursor-not-allowed">
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin-slow" />
              Checking…
            </button>
          )}

          {state === 'captured' && (
            <>
              <button onClick={handleRetake}
                className="flex-1 bg-navy-700 border border-navy-border text-slate-fg font-bold py-4 rounded-2xl transition-colors min-h-[56px]">
                Retake
              </button>
              <button onClick={() => navigate('analysis')}
                className="flex-1 bg-blue-primary hover:bg-blue-dim text-white font-bold py-4 rounded-2xl transition-colors min-h-[56px]">
                Use Photo
              </button>
            </>
          )}

          {state === 'unclear' && (
            <>
              <button onClick={handleRetake}
                className="flex-1 bg-navy-700 border border-navy-border text-slate-fg font-bold py-4 rounded-2xl transition-colors min-h-[56px]">
                Retake
              </button>
              <button onClick={() => navigate('analysis')}
                className="flex-1 bg-amber-warn hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-colors min-h-[56px]">
                Use Anyway
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Analysis ────────────────────────────────────────────────────────

const ANALYSIS_STEPS = ['Strip & Reference Detection', 'RGB/LAB/ΔE Match', 'Environmental Comp.', 'Calibration & Estimate']

function AnalysisScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1500)
    const t2 = setTimeout(() => setStep(2), 3000)
    const t3 = setTimeout(() => { setDone(true) }, 4500)
    const t4 = setTimeout(() => navigate('result'), 5200)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [navigate])

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        {/* Icon */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-primary/20 animate-pulse-ring" />
          <div className="w-20 h-20 rounded-full bg-blue-primary/30 flex items-center justify-center">
            <IconCloud size={36} className="text-blue-light animate-spin-slow" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-fg mb-2">Analyzing color with AI</h2>
        <p className="text-sm text-slate-muted mb-10">Processing your badge strip image</p>

        {/* Steps */}
        <div className="space-y-4 text-left">
          {ANALYSIS_STEPS.map((label, i) => {
            const isComplete = step > i || done
            const isActive = step === i && !done
            return (
              <div key={label} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isComplete ? 'bg-green-safe' : isActive ? 'bg-blue-primary' : 'bg-navy-600'}`}>
                  {isComplete ? (
                    <IconCheck size={14} className="text-white" />
                  ) : isActive ? (
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin-slow" />
                  ) : (
                    <span className="text-slate-dim text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isComplete ? 'text-green-light' : isActive ? 'text-slate-fg' : 'text-slate-dim'}`}>
                    {label}
                  </p>
                  {isActive && (
                    <div className="mt-1.5 h-1 rounded-full bg-navy-600 overflow-hidden">
                      <div className="h-full bg-blue-light rounded-full animate-[step-fill_1.4s_ease-out_forwards]" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Result ───────────────────────────────────────────────────────────

function ResultScreen({ result, navigate }: { result: ScanRecord | null; navigate: (s: Screen) => void }) {
  if (!result) return null
  const cfg = STATUS_CONFIG[result.status]
  const ppm = result.ppmHours

  // Gauge: 0–10 scale; safe <2, caution 2–8, danger >8
  const pct = Math.min(ppm / 10, 1)

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col pb-24">
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => navigate('home')} className="p-2.5 bg-navy-700 rounded-xl border border-navy-border min-w-[44px] min-h-[44px] flex items-center justify-center">
          <IconArrowLeft size={20} className="text-slate-fg" />
        </button>
        <h2 className="text-base font-bold text-slate-fg">Scan Result</h2>
      </div>

      <div className="flex-1 px-5 space-y-4">
        {/* Main status card */}
        <div className={`rounded-2xl p-6 text-center border ${result.status === 'safe' ? 'bg-green-dim border-green-safe/30' : result.status === 'caution' ? 'bg-amber-dim border-amber-warn/30' : 'bg-red-dim border-red-danger/30'} animate-fade-in-up`}>
          <div className="flex justify-center mb-4">
            <div className={`w-20 h-20 rounded-full ${cfg.bg} flex items-center justify-center`}>
              <IconShield size={36} className="text-white" />
            </div>
          </div>
          <StatusBadge status={result.status} size="lg" />
          <div className="mt-4">
            <span className="text-5xl font-bold font-mono text-white">{ppm.toFixed(1)}</span>
            <span className="text-lg font-mono text-white/60 ml-2">ppm·h</span>
          </div>
          <p className="text-white/50 text-sm mt-2">
            {result.status === 'safe' ? 'Exposure within safe limits' : result.status === 'caution' ? 'Approaching threshold — monitor closely' : 'Exposure above safe limit — take action'}
          </p>
        </div>

        {/* Gauge */}
        <div className="bg-navy-700 border border-navy-border rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-muted uppercase tracking-wider mb-3">Exposure Gauge (0–10 ppm·h)</p>
          <div className="relative h-5 rounded-full overflow-hidden bg-navy-600">
            {/* Track gradient */}
            <div className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(to right, #16a34a 0%, #16a34a 20%, #d97706 20%, #d97706 80%, #dc2626 80%, #dc2626 100%)' }} />
            {/* Indicator */}
            <div className="absolute top-0 bottom-0 right-0 bg-navy-700/70 rounded-r-full transition-all duration-700"
              style={{ left: `${pct * 100}%` }} />
            {/* Thumb */}
            <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ left: `calc(${pct * 100}% - 2px)` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-green-light font-mono">Safe</span>
            <span className="text-xs text-amber-warn font-mono">Caution</span>
            <span className="text-xs text-red-light font-mono">Danger</span>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-navy-700 border border-navy-border rounded-2xl p-5 space-y-3">
          {[
            ['Timestamp', `${fmtDate(result.timestamp)} at ${fmtTime(result.timestamp)}`],
            ['Badge ID', result.badgeId],
            ['Scan ID', `SCN-${result.id.padStart(6, '0')}`],
            ['Confidence', '98%'],
            ['Temp / Hum.', '24°C / 45%'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-slate-muted">{label}</span>
              <span className="text-sm font-mono text-slate-fg">{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate('history')} className="flex-1 bg-navy-700 border border-navy-border text-slate-fg font-bold py-4 rounded-2xl min-h-[56px] flex items-center justify-center gap-2">
            <IconChart size={18} />
            View Trend
          </button>
          <button onClick={() => navigate('home')} className="flex-1 bg-blue-primary hover:bg-blue-dim text-white font-bold py-4 rounded-2xl transition-colors min-h-[56px]">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: History ─────────────────────────────────────────────────────────

function HistoryScreen({ scans }: { scans: ScanRecord[] }) {
  const [filter, setFilter] = useState<DateFilter>('week')

  const chartData = filter === 'day'
    ? trendData.slice(-4)
    : filter === 'week'
    ? trendData
    : [...trendData, { time: 'Thu 06:00', ppm: 2.3 }, { time: 'Thu 12:00', ppm: 1.1 }, { time: 'Fri 06:00', ppm: 0.6 }]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const val = payload[0].value as number
    const status: Status = val < 2 ? 'safe' : val < 8 ? 'caution' : 'danger'
    return (
      <div className="bg-navy-700 border border-navy-border rounded-xl px-3 py-2">
        <p className="text-xs text-slate-muted mb-1">{label}</p>
        <p className="font-mono font-bold text-sm text-slate-fg">{val.toFixed(1)} ppm·h</p>
        <StatusBadge status={status} size="sm" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col pb-20">
      <div className="px-5 pt-12 pb-4">
        <h2 className="text-xl font-bold text-slate-fg">Exposure History</h2>
        <p className="text-sm text-slate-muted mt-0.5">Badge Bi2S3-2847 · James Okafor</p>
      </div>

      <div className="px-5 space-y-4 flex-1">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-navy-700 rounded-xl p-1 border border-navy-border">
          {(['day', 'week', 'month'] as DateFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors min-h-[44px] capitalize ${filter === f ? 'bg-blue-primary text-white' : 'text-slate-muted'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-navy-700 border border-navy-border rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-muted uppercase tracking-wider mb-4">ppm·h over time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a6e" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
              <ReferenceLine y={2} stroke="#d97706" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={8} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ppm" stroke="#3b82f6" strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#60a5fa' }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-amber-warn" />
              <span className="text-xs text-slate-muted">Caution (2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-red-danger" />
              <span className="text-xs text-slate-muted">Danger (8)</span>
            </div>
          </div>
        </div>

        {/* Scan list */}
        <div>
          <h3 className="text-sm font-bold text-slate-fg uppercase tracking-wider mb-3">All Scans</h3>
          {scans.length === 0 ? (
            <div className="bg-navy-700 rounded-2xl border border-navy-border p-8 text-center">
              <IconChart size={32} className="text-slate-dim mx-auto mb-3" />
              <p className="text-slate-muted text-sm font-semibold">No scan history</p>
              <p className="text-slate-dim text-xs mt-1">Complete your first scan to see history here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Profile ─────────────────────────────────────────────────────────

function ProfileScreen({ state, onLogout }: { state: AppState; onLogout: () => void }) {
  const safeCount = state.scans.filter(s => s.status === 'safe').length
  const cautionCount = state.scans.filter(s => s.status === 'caution').length
  const dangerCount = state.scans.filter(s => s.status === 'danger').length

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col pb-20">
      <div className="px-5 pt-12 pb-4">
        <h2 className="text-xl font-bold text-slate-fg">Profile</h2>
      </div>

      <div className="px-5 space-y-4">
        {/* Worker info */}
        <div className="bg-navy-700 border border-navy-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-primary flex items-center justify-center shrink-0">
            <IconUser size={28} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-fg text-lg">{state.workerName}</p>
            <p className="text-slate-muted text-sm font-mono">{state.badgeId}</p>
            <p className="text-slate-dim text-xs mt-0.5">Shift started {state.shiftStart}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Safe', count: safeCount, color: 'text-green-light', bg: 'bg-green-dim border-green-safe/20' },
            { label: 'Caution', count: cautionCount, color: 'text-amber-warn', bg: 'bg-amber-dim border-amber-warn/20' },
            { label: 'Danger', count: dangerCount, color: 'text-red-light', bg: 'bg-red-dim border-red-danger/20' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold font-mono ${color}`}>{count}</p>
              <p className="text-xs text-white/50 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Settings list */}
        <div className="bg-navy-700 border border-navy-border rounded-2xl overflow-hidden divide-y divide-navy-border">
          {[
            { icon: IconBell, label: 'Notifications', value: 'On' },
            { icon: IconCloud, label: 'Auto-sync', value: 'Enabled' },
            { icon: IconShield, label: 'Safety threshold', value: '2 ppm·h' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4 min-h-[56px]">
              <Icon size={18} className="text-slate-muted shrink-0" />
              <span className="flex-1 text-sm text-slate-fg">{label}</span>
              <span className="text-sm text-slate-muted font-mono">{value}</span>
            </div>
          ))}
        </div>

        <button onClick={onLogout}
          className="w-full bg-navy-700 border border-red-danger/30 text-red-light font-bold py-4 rounded-2xl min-h-[56px] hover:bg-red-dim transition-colors">
          End Shift &amp; Sign Out
        </button>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [appState, setAppState] = useState<AppState>({
    workerName: '',
    badgeId: '',
    shiftStart: '',
    badgeValid: true,
    scans: [],
    latestResult: null,
  })

  const navigate = useCallback((s: Screen) => setScreen(s), [])

  const handleLogin = useCallback((name: string, badgeId: string, shiftStart: string) => {
    setAppState(prev => ({ ...prev, workerName: name, badgeId, shiftStart, scans: mockScans, latestResult: mockScans[0] }))
    setScreen('home')
  }, [])

  const handleLogout = useCallback(() => {
    setAppState({ workerName: '', badgeId: '', shiftStart: '', badgeValid: true, scans: [], latestResult: null })
    setScreen('login')
  }, [])

  // When analysis completes, add a new result — cycles through safe/caution/danger
  // so demo users can see all three result states without waiting.
  const scanCountRef = { current: 0 }
  const handleAnalysisComplete = useCallback(() => {
    const cycle = [
      { status: 'safe' as Status, ppmHours: 1.2 },
      { status: 'caution' as Status, ppmHours: 5.6 },
      { status: 'safe' as Status, ppmHours: 0.8 },
      { status: 'danger' as Status, ppmHours: 9.3 },
    ]
    scanCountRef.current += 1
    const { status, ppmHours } = cycle[scanCountRef.current % cycle.length]
    const newResult: ScanRecord = {
      id: String(Date.now()),
      timestamp: new Date(),
      status,
      ppmHours,
      badgeId: appState.badgeId,
    }
    setAppState(prev => ({
      ...prev,
      scans: [newResult, ...prev.scans],
      latestResult: newResult,
    }))
  }, [appState.badgeId])

  // Intercept analysis → result navigation to add scan
  const handleNavigate = useCallback((s: Screen) => {
    if (s === 'result') handleAnalysisComplete()
    navigate(s)
  }, [navigate, handleAnalysisComplete])

  const [supervisorMode, setSupervisorMode] = useState(false)
  const showNav = screen !== 'login'

  if (supervisorMode) {
    return <SupervisorShell onExitSupervisor={() => setSupervisorMode(false)} />
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen relative bg-navy-900">
      {screen === 'login' && (
        <LoginScreen
          onLogin={handleLogin}
          onSupervisor={() => setSupervisorMode(true)}
        />
      )}
      {screen === 'home' && <HomeScreen state={appState} navigate={handleNavigate} />}
      {screen === 'qrScan' && <QrScanScreen navigate={handleNavigate} />}
      {screen === 'stripCapture' && <StripCaptureScreen navigate={handleNavigate} />}
      {screen === 'analysis' && <AnalysisScreen navigate={handleNavigate} />}
      {screen === 'result' && <ResultScreen result={appState.latestResult} navigate={handleNavigate} />}
      {screen === 'history' && <HistoryScreen scans={appState.scans} />}
      {screen === 'profile' && <ProfileScreen state={appState} onLogout={handleLogout} />}
      {showNav && <BottomNav screen={screen} navigate={handleNavigate} />}
    </div>
  )
}
