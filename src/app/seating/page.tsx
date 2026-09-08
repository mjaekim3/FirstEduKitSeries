'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────────────────
interface Student {
  id: string
  number: number
  name: string
  gender: '남' | '여'
  height: '작음' | '보통' | '큰 편'
  vision: '양호' | '나쁨'
  leadership: string
  special: string
}

interface Desk {
  id: string
  x: number
  y: number
  w: number
  h: number
  studentId: string | null
  groupId: number
}

interface Furniture {
  id: string
  ftype: string
  x: number
  y: number
  w: number
  h: number
  label: string
  bg: string
  border: string
}

interface ConflictPair {
  a: string
  b: string
}

// ── Constants ──────────────────────────────────────────────────────────────
const DESK_W = 100, DESK_H = 85, GRID = 10
const GROUP_COLORS = ['#E3F2FD','#E8F5E9','#FFF3E0','#FCE4EC','#F3E5F5']

// ── Presets ────────────────────────────────────────────────────────────────
const PRESETS: Record<string, Array<[number,number,number]>> = {
  'HIFS 기본 1 (20명)': [
    [120,240,0],[220,240,0],[120,360,0],[220,360,0],[120,480,0],[220,480,0],
    [360,240,0],[460,240,0],[360,360,0],[460,360,0],[360,480,0],[460,480,0],
    [560,480,0],[560,360,0],[560,240,0],
    [700,240,0],[700,360,0],[800,360,0],[700,480,0],[800,480,0],
  ],
  'HIFS 기본 2 (20명)': [
    [119,240,0],[233,240,0],[119,335,0],[233,335,0],[119,430,0],[233,430,0],
    [393,240,0],[507,240,0],[393,335,0],[507,335,0],[393,430,0],[507,430,0],
    [393,525,0],[507,525,0],
    [667,240,0],[781,240,0],[667,335,0],[781,335,0],[667,430,0],[781,430,0],
  ],
  'HIFS 평가 대형 (20명)': [
    [50,240,0],[250,240,0],[450,240,0],[650,240,0],[850,240,0],
    [50,352,0],[250,352,0],[450,352,0],[650,352,0],[850,352,0],
    [50,463,0],[250,463,0],[450,463,0],[650,463,0],[850,463,0],
    [50,575,0],[250,575,0],[450,575,0],[650,575,0],[850,575,0],
  ],
}

const DEFAULT_FURNITURE: Furniture[] = [
  { id:'f1', ftype:'whiteboard',  x:160, y:0,  w:180, h:40, label:'화이트보드',    bg:'#F8F8F6', border:'#BBBBBB' },
  { id:'f2', ftype:'smartboard',  x:340, y:0,  w:320, h:40, label:'삼성 스마트보드',bg:'#2C3E6B', border:'#7B8FC7' },
  { id:'f3', ftype:'whiteboard',  x:660, y:0,  w:180, h:40, label:'화이트보드',    bg:'#F8F8F6', border:'#BBBBBB' },
  { id:'f4', ftype:'teacher_desk',x:160, y:80, w:180, h:80, label:'교탁',          bg:'#F5E6C8', border:'#C8A96E' },
  { id:'f5', ftype:'window',      x:0,   y:80, w:20,  h:600,label:'창문',          bg:'#D6EEFF', border:'#7AB8E8' },
  { id:'f6', ftype:'door',        x:980, y:680,w:18,  h:120,label:'문',            bg:'#1A237E', border:'#3949AB' },
  { id:'f7', ftype:'custom',      x:110, y:720,w:780, h:80, label:'개방형 사물함', bg:'#F8F7F4', border:'#CCCCCC' },
  { id:'f8', ftype:'custom',      x:10,  y:720,w:100, h:80, label:'여닫이 사물함', bg:'#EDEAE3', border:'#AAAAAA' },
  { id:'f9', ftype:'custom',      x:920, y:0,  w:80,  h:200,label:'여닫이 사물함', bg:'#EDEAE3', border:'#AAAAAA' },
]

function makeDesks(preset: string): Desk[] {
  return (PRESETS[preset] || PRESETS['HIFS 기본 1 (20명)']).map(([x,y,g], i) => ({
    id: `desk_${i+1}`, x, y, w: DESK_W, h: DESK_H, studentId: null, groupId: g
  }))
}

function snapGrid(v: number) { return Math.round(v / GRID) * GRID }

function isAdjacent(a: Desk, b: Desk) {
  return Math.abs(a.x - b.x) <= DESK_W + 22 && Math.abs(a.y - b.y) <= DESK_H + 22
    && !(Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4)
}

// ── Student Dialog ─────────────────────────────────────────────────────────
function StudentDialog({ student, onSave, onClose }: {
  student: Partial<Student> | null
  onSave: (s: Student) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Student>>(student || { gender:'남', height:'보통', vision:'양호', leadership:'', special:'' })
  const set = (k: keyof Student, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#1A1A2E] px-4 py-3">
          <h3 className="text-white font-bold">{student?.id ? '학생 수정' : '학생 추가'}</h3>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-500 text-xs">학번</label>
              <input type="number" value={form.number || ''} onChange={e => set('number', +e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1" placeholder="1" />
            </div>
            <div className="flex-[2]">
              <label className="text-gray-500 text-xs">이름 *</label>
              <input value={form.name || ''} onChange={e => set('name', e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1" placeholder="홍길동" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-500 text-xs">성별</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full border rounded px-2 py-1 mt-1">
                <option>남</option><option>여</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-gray-500 text-xs">키</label>
              <select value={form.height} onChange={e => set('height', e.target.value)} className="w-full border rounded px-2 py-1 mt-1">
                <option>작음</option><option>보통</option><option>큰 편</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-gray-500 text-xs">시력</label>
              <select value={form.vision} onChange={e => set('vision', e.target.value)} className="w-full border rounded px-2 py-1 mt-1">
                <option>양호</option><option>나쁨</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-gray-500 text-xs">역할 (예: Line Leader)</label>
            <input value={form.leadership || ''} onChange={e => set('leadership', e.target.value)}
              className="w-full border rounded px-2 py-1 mt-1" />
          </div>
          <div>
            <label className="text-gray-500 text-xs">특이사항</label>
            <input value={form.special || ''} onChange={e => set('special', e.target.value)}
              className="w-full border rounded px-2 py-1 mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button onClick={onClose} className="px-4 py-1.5 border rounded text-sm">취소</button>
          <button onClick={() => {
            if (!form.name?.trim()) return
            onSave({ id: form.id || `s_${Date.now()}`, number: form.number || 0,
              name: form.name, gender: form.gender || '남', height: form.height || '보통',
              vision: form.vision || '양호', leadership: form.leadership || '', special: form.special || '' })
          }} className="px-4 py-1.5 bg-[#1A1A2E] text-white rounded text-sm font-bold">저장</button>
        </div>
      </div>
    </div>
  )
}

// ── Desk Component ─────────────────────────────────────────────────────────
function DeskCard({ desk, student, conflict, selected, onMouseDown, onDrop, onDragOver, onDragLeave, onClick }: {
  desk: Desk; student: Student | undefined; conflict: boolean; selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onClick: (e: React.MouseEvent) => void
}) {
  const [hover, setHover] = useState(false)
  let bg = '#FFFFFF', border = '#C8C5BC', bw = '1px'
  if (conflict)         { bg = '#FFEBEE'; border = '#E53935'; bw = '2px' }
  else if (selected)    { bg = '#BBDEFB'; border = '#0D47A1'; bw = '2px' }
  else if (student) {
    bg = desk.groupId > 0 ? GROUP_COLORS[(desk.groupId-1) % GROUP_COLORS.length] : '#E8F4FD'
    border = '#1976D2'; bw = '1.5px'
  } else if (hover)     { bg = '#E3F2FD'; border = '#1976D2'; bw = '1.5px' }

  return (
    <div
      style={{ position:'absolute', left:desk.x, top:desk.y, width:desk.w, height:desk.h,
        background:bg, border:`${bw} solid ${border}`, borderRadius:6, cursor:'grab',
        userSelect:'none', transition:'background 0.1s' }}
      onMouseDown={onMouseDown}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={e => { setHover(false); onDragLeave(e) }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {student ? (
        <div style={{ padding:'4px 6px', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:9, color:'#555' }}>{student.number || ''}</span>
            <span style={{ fontSize:8, fontWeight:'bold', color: student.gender==='남' ? '#1976D2':'#E53935',
              background: student.gender==='남' ? '#E3F2FD':'#FCE4EC', borderRadius:'50%',
              width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>{student.gender}</span>
          </div>
          <div style={{ textAlign:'center', fontWeight:'bold', fontSize:13, color:'#1A1A2E' }}>{student.name}</div>
          {student.leadership && <div style={{ textAlign:'center', fontSize:9, color:'#5C6BC0' }}>{student.leadership}</div>}
          <div style={{ textAlign:'center', fontSize:8, color:'#999' }}>
            {[student.height==='작음'?'↓키':student.height==='큰 편'?'↑키':'',
              student.vision==='나쁨'?'↓시력':'', student.special?'!':''].filter(Boolean).join(' ')}
          </div>
        </div>
      ) : (
        <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, color:'#AAAAAA' }}>빈 자리</div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SeatingPage() {
  const [preset, setPreset] = useState('HIFS 기본 1 (20명)')
  const [desks, setDesks] = useState<Desk[]>(() => makeDesks('HIFS 기본 1 (20명)'))
  const [furniture] = useState<Furniture[]>(DEFAULT_FURNITURE)
  const [students, setStudents] = useState<Student[]>([])
  const [conflicts, setConflicts] = useState<ConflictPair[]>([])
  const [selectedDesk, setSelectedDesk] = useState<string | null>(null)
  const [draggingDesk, setDraggingDesk] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x:0, y:0 })
  const [showStudentDialog, setShowStudentDialog] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const dragStudentIdRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [scale, setScale] = useState(0.85)
  const [teacherView, setTeacherView] = useState(false)
  const [conflictMode, setConflictMode] = useState(false)
  const [conflictFirst, setConflictFirst] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)

  // Check conflicts
  const checkConflicts = useCallback((deskList: Desk[], conflictPairs: ConflictPair[]) => {
    // placeholder: no conflict pairs by default, just check adjacency rule violations
    return conflictPairs.filter(pair => {
      const da = deskList.find(d => d.studentId === pair.a)
      const db = deskList.find(d => d.studentId === pair.b)
      return da && db && isAdjacent(da, db)
    })
  }, [])

  const conflictDeskIds = new Set(
    conflicts.flatMap(p => {
      const da = desks.find(d => d.studentId === p.a)
      const db = desks.find(d => d.studentId === p.b)
      return [da?.id, db?.id].filter(Boolean) as string[]
    })
  )

  // Desk drag (move desk)
  const handleDeskMouseDown = (deskId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const desk = desks.find(d => d.id === deskId)!
    const canvas = canvasRef.current!.getBoundingClientRect()
    setDraggingDesk(deskId)
    setDragOffset({ x: e.clientX - canvas.left - desk.x * scale, y: e.clientY - canvas.top - desk.y * scale })
    setSelectedDesk(deskId)
  }

  useEffect(() => {
    if (!draggingDesk) return
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current!.getBoundingClientRect()
      const nx = snapGrid((e.clientX - canvas.left - dragOffset.x) / scale)
      const ny = snapGrid((e.clientY - canvas.top - dragOffset.y) / scale)
      setDesks(prev => prev.map(d => d.id === draggingDesk ? { ...d, x: Math.max(0,nx), y: Math.max(0,ny) } : d))
    }
    const onUp = () => setDraggingDesk(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [draggingDesk, dragOffset, scale])

  // Student drag to desk
  const handleDrop = (deskId: string, e: React.DragEvent) => {
    e.preventDefault()
    setDropTarget(null)
    const sid = dragStudentIdRef.current
    if (!sid) return
    dragStudentIdRef.current = null
    setDesks(prev => prev.map(d => {
      if (d.id === deskId) return { ...d, studentId: sid }
      if (d.studentId === sid) return { ...d, studentId: null }
      return d
    }))
  }

  const handleRemoveStudent = (deskId: string) => {
    setDesks(prev => prev.map(d => d.id === deskId ? { ...d, studentId: null } : d))
    setSelectedDesk(null)
  }

  const shuffleStudents = () => {
    const placed = desks.filter(d => d.studentId).map(d => d.studentId!)
    if (!placed.length) {
      // place all students randomly
      const sids = [...students].map(s => s.id).sort(() => Math.random() - 0.5)
      setDesks(prev => {
        const next = [...prev]
        sids.forEach((sid, i) => { if (next[i]) next[i] = { ...next[i], studentId: sid } })
        return next
      })
    } else {
      const shuffled = placed.sort(() => Math.random() - 0.5)
      let i = 0
      setDesks(prev => prev.map(d => d.studentId ? { ...d, studentId: shuffled[i++] } : d))
    }
  }

  const clearAll = () => setDesks(prev => prev.map(d => ({ ...d, studentId: null })))

  const loadPreset = (name: string) => {
    setPreset(name)
    setDesks(makeDesks(name))
    setSelectedDesk(null)
  }

  const saveJSON = () => {
    const data = { preset, desks, students, conflicts }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `seating_${new Date().toISOString().slice(0,10)}.json`; a.click()
  }

  const loadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.desks) setDesks(data.desks)
        if (data.students) setStudents(data.students)
        if (data.conflicts) setConflicts(data.conflicts)
        if (data.preset) setPreset(data.preset)
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ''
  }


  const toggleConflictPair = (studentId: string) => {
    if (!conflictFirst) {
      setConflictFirst(studentId)
    } else {
      if (conflictFirst !== studentId) {
        const exists = conflicts.some(p => (p.a===conflictFirst&&p.b===studentId)||(p.a===studentId&&p.b===conflictFirst))
        if (!exists) setConflicts(prev => [...prev, { a: conflictFirst, b: studentId }])
      }
      setConflictFirst(null)
      setConflictMode(false)
    }
  }

  const removeConflict = (i: number) => setConflicts(prev => prev.filter((_,idx) => idx !== i))

  const handlePrint = () => window.print()

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string,string>>(ws)
        setStudents(prev => {
          const next = [...prev]
          rows.forEach(row => {
            const num = Number(row['학번'] || row['번호'] || 0)
            const name = (row['이름'] || row['성명'] || '').trim()
            if (!name) return
            const gender = (row['성별'] || '남').includes('여') ? '여' : '남' as '남'|'여'
            const heightRaw = row['키'] || row['신장'] || '보통'
            const height = heightRaw.includes('작') ? '작음' : heightRaw.includes('큰') || heightRaw.includes('크') ? '큰 편' : '보통' as '작음'|'보통'|'큰 편'
            const vision = (row['시력'] || '양호').includes('나쁨') ? '나쁨' : '양호' as '양호'|'나쁨'
            const leadership = row['역할'] || ''
            const special = row['특이사항'] || ''
            const existing = next.findIndex(s => s.number === num && num > 0)
            if (existing >= 0) {
              next[existing] = { ...next[existing], name, gender, height, vision, leadership, special }
            } else {
              next.push({ id: `s_${Date.now()}_${num}`, number: num, name, gender, height, vision, leadership, special })
            }
          })
          return next
        })
      } catch(err) { alert('Excel 파일 형식을 확인해주세요.') }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const unplacedStudents = students.filter(s => !desks.some(d => d.studentId === s.id))
  const selectedStudent = selectedDesk ? students.find(s => s.id === desks.find(d => d.id === selectedDesk)?.studentId) : null

  return (
    <>
    <style>{`
      @media print {
        body { margin: 0; }
        .no-print { display: none !important; }
        .print-canvas { transform: none !important; }
      }
    `}</style>
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#F5F4F0', fontFamily:'Malgun Gothic, sans-serif' }}>
      {/* Top Bar */}
      <div className="no-print" style={{ background:'#1A1A2E', color:'white', padding:'8px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <span style={{ fontWeight:'bold', fontSize:15, marginRight:8 }}>🪑 Seating Chart</span>
        <select value={preset} onChange={e => loadPreset(e.target.value)}
          style={{ background:'#2a2a4e', color:'white', border:'1px solid #444', borderRadius:4, padding:'4px 8px', fontSize:12 }}>
          {Object.keys(PRESETS).map(k => <option key={k}>{k}</option>)}
        </select>
        <button onClick={shuffleStudents} style={{ background:'#1976D2', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>🔀 랜덤 배치</button>
        <button onClick={clearAll} style={{ background:'#455A64', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>🗑 초기화</button>
        <button onClick={saveJSON} style={{ background:'#2E7D32', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>💾 저장</button>
        <button onClick={() => fileInputRef.current?.click()} style={{ background:'#F57F17', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>📂 불러오기</button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={loadJSON} style={{ display:'none' }} />
        <button onClick={() => excelInputRef.current?.click()} style={{ background:'#1B5E20', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>📊 Excel 업로드</button>
        <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{ display:'none' }} />
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'#aaa' }}>확대:</span>
          <input type="range" min={50} max={130} value={scale*100} onChange={e => setScale(+e.target.value/100)}
            style={{ width:80 }} />
          <span style={{ fontSize:11, color:'#aaa' }}>{Math.round(scale*100)}%</span>
        </div>
        <button onClick={handlePrint} style={{ background:'#4527A0', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>🖨 내보내기</button>
        <button onClick={() => setTeacherView(v => !v)}
          style={{ background: teacherView ? '#E65100':'#546E7A', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>
          {teacherView ? '🎓 교사뷰 ON':'👁 교사뷰'}
        </button>
        <button onClick={() => { setConflictMode(v => !v); setConflictFirst(null) }}
          style={{ background: conflictMode ? '#B71C1C':'#37474F', color:'white', border:'none', borderRadius:4, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>
          {conflictMode ? (conflictFirst ? '⚡ 2번째 학생 선택':'⚡ 1번째 학생 선택') : '⚠ 충돌 설정'}
        </button>
        <a href="/" style={{ color:'#aaa', fontSize:12, marginLeft:8 }}>← 홈</a>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar */}
        <div className="no-print" style={{ width:200, background:'white', borderRight:'1px solid #E0E0E0', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:'bold', fontSize:13 }}>학생 ({students.length})</span>
            <div style={{ display:'flex', gap:4 }}>
              <button onClick={() => { setEditingStudent(null); setShowStudentDialog(true) }}
                style={{ background:'#1A1A2E', color:'white', border:'none', borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer' }}>+ 추가</button>
              <button onClick={() => { if (confirm('학생 전체를 삭제할까요?')) { setStudents([]); setDesks(prev => prev.map(d => ({ ...d, studentId: null }))) } }}
                style={{ background:'#B71C1C', color:'white', border:'none', borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer' }}>전체삭제</button>
            </div>
          </div>
          <div style={{ padding:'6px 8px', borderBottom:'1px solid #eee', fontSize:11, color:'#888' }}>
            미배치: {unplacedStudents.length}명
          </div>
          {conflictMode && (
            <div style={{ padding:'6px 8px', background:'#FFF3E0', borderBottom:'1px solid #FFE0B2', fontSize:11, color:'#E65100', fontWeight:'bold' }}>
              {conflictFirst ? `⚡ "${students.find(s=>s.id===conflictFirst)?.name}" 선택됨 — 2번째 클릭` : '⚡ 충돌 설정: 학생 클릭'}
            </div>
          )}
          {conflicts.length > 0 && (
            <div style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>
              <div style={{ fontSize:10, color:'#888', marginBottom:4 }}>충돌 쌍</div>
              {conflicts.map((p,i) => {
                const sa = students.find(s=>s.id===p.a), sb = students.find(s=>s.id===p.b)
                return sa && sb ? (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    fontSize:11, background:'#FFEBEE', borderRadius:4, padding:'2px 6px', marginBottom:2 }}>
                    <span>{sa.name} ↔ {sb.name}</span>
                    <button onClick={() => removeConflict(i)}
                      style={{ background:'none', border:'none', color:'#E53935', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                  </div>
                ) : null
              })}
            </div>
          )}
          <div style={{ flex:1, overflowY:'auto', padding:6 }}>
            {students.sort((a,b) => a.number - b.number).map(s => {
              const placed = desks.some(d => d.studentId === s.id)
              return (
                <div key={s.id}
                  draggable={!placed}
                  onDragStart={() => { dragStudentIdRef.current = s.id }}
                  onDragEnd={() => { dragStudentIdRef.current = null }}
                  onClick={() => { if (conflictMode) { toggleConflictPair(s.id) } }}
                  onDoubleClick={() => { if (!conflictMode) { setEditingStudent(s); setShowStudentDialog(true) } }}
                  style={{ padding:'5px 8px', marginBottom:3, borderRadius:5, cursor: placed ? 'default':'grab',
                    background: placed ? '#F5F5F5':'#EEF3FA', border:'1px solid #ddd',
                    opacity: placed ? 0.5:1, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>
                    <span style={{ color:'#888', marginRight:4, fontSize:10 }}>{s.number}</span>
                    <span style={{ fontWeight:'bold' }}>{s.name}</span>
                  </span>
                  <span style={{ fontSize:9, color: s.gender==='남'?'#1976D2':'#E53935' }}>{s.gender}</span>
                </div>
              )
            })}
          </div>
          {selectedDesk && selectedStudent && (
            <div style={{ borderTop:'1px solid #eee', padding:10 }}>
              <div style={{ fontWeight:'bold', fontSize:12, marginBottom:6 }}>{selectedStudent.name}</div>
              <button onClick={() => handleRemoveStudent(selectedDesk)}
                style={{ width:'100%', background:'#FFEBEE', color:'#C62828', border:'1px solid #FFCDD2', borderRadius:4, padding:'4px', fontSize:11, cursor:'pointer' }}>
                자리 비우기
              </button>
              <button onClick={() => { setEditingStudent(selectedStudent); setShowStudentDialog(true) }}
                style={{ width:'100%', marginTop:4, background:'#E3F2FD', color:'#1565C0', border:'1px solid #BBDEFB', borderRadius:4, padding:'4px', fontSize:11, cursor:'pointer' }}>
                학생 수정
              </button>
              <button onClick={() => setStudents(prev => prev.filter(s => s.id !== selectedStudent.id))}
                style={{ width:'100%', marginTop:4, background:'#F5F5F5', color:'#555', border:'1px solid #ddd', borderRadius:4, padding:'4px', fontSize:11, cursor:'pointer' }}>
                학생 삭제
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex:1, overflow:'auto', padding:16 }}>
          <div ref={canvasRef}
            style={{ position:'relative', width:1000*scale, height:800*scale, background:'#F5F4F0', cursor:'default',
              transform: teacherView ? 'rotate(180deg)' : 'none', transformOrigin:'center center' }}
            onClick={() => setSelectedDesk(null)}>
            {/* Grid (CSS bg) */}
            <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, #C8C5BC 1px, transparent 1px)',
              backgroundSize:`${40*scale}px ${40*scale}px`, opacity:0.5, pointerEvents:'none' }} />

            {/* Furniture */}
            {furniture.map(f => (
              <div key={f.id} style={{ position:'absolute', left:f.x*scale, top:f.y*scale,
                width:f.w*scale, height:f.h*scale, background:f.bg, border:`1.5px solid ${f.border}`,
                borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:Math.max(8, 9*scale), fontWeight:'bold',
                color: f.bg === '#2C3E6B' || f.bg === '#1A237E' ? 'white':'#333',
                pointerEvents:'none', zIndex:1 }}>
                {f.h*scale > 20 ? f.label : ''}
              </div>
            ))}

            {/* Desks */}
            {desks.map(desk => {
              const student = students.find(s => s.id === desk.studentId)
              return (
                <div key={desk.id} style={{ transform:`scale(${scale})`, transformOrigin:'top left',
                  position:'absolute', left:desk.x*scale, top:desk.y*scale, zIndex: draggingDesk===desk.id ? 100:2 }}
                  onDragOver={e => { e.preventDefault(); setDropTarget(desk.id) }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={e => handleDrop(desk.id, e)}>
                  <DeskCard
                    desk={{ ...desk, x:0, y:0 }}
                    student={student}
                    conflict={conflictDeskIds.has(desk.id)}
                    selected={selectedDesk === desk.id}
                    onMouseDown={e => { e.stopPropagation(); handleDeskMouseDown(desk.id, e) }}
                    onDrop={e => handleDrop(desk.id, e)}
                    onDragOver={e => e.preventDefault()}
                    onDragLeave={() => {}}
                    onClick={e => { e.stopPropagation(); setSelectedDesk(desk.id) }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Student Dialog */}
      {showStudentDialog && (
        <StudentDialog
          student={editingStudent}
          onSave={s => {
            setStudents(prev => editingStudent ? prev.map(x => x.id===s.id ? s : x) : [...prev, s])
            setShowStudentDialog(false)
          }}
          onClose={() => setShowStudentDialog(false)}
        />
      )}
    </div>
    </>
  )
}