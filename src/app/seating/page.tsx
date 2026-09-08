'use client'
import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface Student { id:string;number:number;name:string;gender:'남'|'여';height:'작음'|'보통'|'큰 편';vision:'양호'|'나쁨';leadership:string;special:string }
interface Desk { id:string;x:number;y:number;studentId:string|null }
interface Furniture { id:string;x:number;y:number;w:number;h:number;label:string;bg:string;border:string }
interface ConflictPair { a:string;b:string }

const AUTOSAVE_KEY = 'fek_seating_autosave'

const PRESET: Omit<Desk,'studentId'>[] = [
  {id:'d1',x:80,y:80},{id:'d2',x:160,y:80},{id:'d3',x:240,y:80},{id:'d4',x:320,y:80},{id:'d5',x:400,y:80},
  {id:'d6',x:80,y:180},{id:'d7',x:160,y:180},{id:'d8',x:240,y:180},{id:'d9',x:320,y:180},{id:'d10',x:400,y:180},
  {id:'d11',x:80,y:280},{id:'d12',x:160,y:280},{id:'d13',x:240,y:280},{id:'d14',x:320,y:280},{id:'d15',x:400,y:280},
  {id:'d16',x:80,y:380},{id:'d17',x:160,y:380},{id:'d18',x:240,y:380},{id:'d19',x:320,y:380},{id:'d20',x:400,y:380},
]

const FURNITURE: Furniture[] = [
  {id:'board',x:350,y:10,w:280,h:40,label:'칠판',bg:'#2C3E6B',border:'#1A2A4A'},
  {id:'teacher',x:390,y:60,w:120,h:50,label:'교사 책상',bg:'#795548',border:'#4E342E'},
]

function makeDesks(): Desk[] { return PRESET.map(d=>({...d,studentId:null})) }

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    return (saved[key] ?? fallback) as T
  } catch { return fallback }
}

function DeskCard({desk,student,conflict,selected,onMouseDown,onClick,onDrop,onDragOver}:{
  desk:Desk;student:Student|undefined;conflict:boolean;selected:boolean;
  onMouseDown:(e:React.MouseEvent)=>void;onClick:(e:React.MouseEvent)=>void;
  onDrop:(e:React.DragEvent)=>void;onDragOver:(e:React.DragEvent)=>void
}) {
  return (
    <div onMouseDown={onMouseDown} onClick={onClick} onDrop={onDrop} onDragOver={onDragOver}
      style={{width:72,height:56,border:`2px solid ${conflict?'#E53935':selected?'#1976D2':'#B0BEC5'}`,
        borderRadius:6,background:student?'#E8F5E9':'#FAFAFA',cursor:'grab',
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        boxShadow:selected?'0 0 0 3px #90CAF9':'0 1px 3px rgba(0,0,0,0.1)',userSelect:'none',fontSize:11}}>
      {student ? <>
        <span style={{fontWeight:'bold',fontSize:12}}>{student.name}</span>
        <span style={{fontSize:9,color:'#888'}}>{student.number}번</span>
      </> : <span style={{color:'#CCC',fontSize:10}}>빈자리</span>}
    </div>
  )
}

function StudentDialog({student,onSave,onClose}:{student:Student|null;onSave:(s:Student)=>void;onClose:()=>void}) {
  const blank: Student = {id:crypto.randomUUID(),number:0,name:'',gender:'남',height:'보통',vision:'양호',leadership:'',special:''}
  const [form,setForm] = useState<Student>(student??blank)
  const set = (k: keyof Student, v: string|number) => setForm(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:24,width:320,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
        <h3 style={{margin:'0 0 16px',fontSize:15}}>{student?'학생 수정':'학생 추가'}</h3>
        {([['number','번호','number'],['name','이름','text'],['leadership','리더십','text'],['special','특이사항','text']] as [keyof Student,string,string][]).map(([k,label,type])=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={{fontSize:12,color:'#555'}}>{label}</label>
            <input type={type} value={String(form[k])} onChange={e=>set(k,type==='number'?Number(e.target.value):e.target.value)}
              style={{display:'block',width:'100%',padding:'6px 8px',border:'1px solid #ddd',borderRadius:6,marginTop:3,fontSize:13,boxSizing:'border-box'}}/>
          </div>
        ))}
        {([['gender','성별',['남','여']],['height','키',['작음','보통','큰 편']],['vision','시력',['양호','나쁨']]] as [keyof Student,string,string[]][]).map(([k,label,opts])=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={{fontSize:12,color:'#555'}}>{label}</label>
            <div style={{display:'flex',gap:6,marginTop:3}}>
              {opts.map(o=><button key={o} onClick={()=>set(k,o)}
                style={{flex:1,padding:'5px',border:`1px solid ${form[k]===o?'#1976D2':'#ddd'}`,borderRadius:6,background:form[k]===o?'#E3F2FD':'white',fontSize:12,cursor:'pointer'}}>{o}</button>)}
            </div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'8px',border:'1px solid #ddd',borderRadius:6,cursor:'pointer',fontSize:13}}>취소</button>
          <button onClick={()=>onSave(form)} style={{flex:1,padding:'8px',background:'#1976D2',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:13}}>저장</button>
        </div>
      </div>
    </div>
  )
}

export default function SeatingPage() {
  const [desks,setDesks] = useState<Desk[]>(()=>load('desks',makeDesks()))
  const [students,setStudents] = useState<Student[]>(()=>load('students',[]))
  const [conflicts,setConflicts] = useState<ConflictPair[]>(()=>load('conflicts',[]))
  const [selectedDesk,setSelectedDesk] = useState<string|null>(null)
  const [showDialog,setShowDialog] = useState(false)
  const [editingStudent,setEditingStudent] = useState<Student|null>(null)
  const [teacherView,setTeacherView] = useState(false)
  const [scale] = useState(1)
  const [lastSaved,setLastSaved] = useState<string|null>(null)
  const draggingDesk = useRef<string|null>(null)
  const dragOffset = useRef({x:0,y:0})
  const draggingStudent = useRef<string|null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // 자동저장
  useEffect(()=>{
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({desks,students,conflicts}))
      const now = new Date()
      setLastSaved(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`)
    } catch {}
  },[desks,students,conflicts])

  const conflictDesks = new Set(conflicts.flatMap(c=>{
    const sa=students.find(s=>s.name===c.a), sb=students.find(s=>s.name===c.b)
    const da=desks.find(d=>d.studentId===sa?.id), db=desks.find(d=>d.studentId===sb?.id)
    return [da?.id,db?.id].filter(Boolean) as string[]
  }))

  const selStudent = selectedDesk ? students.find(s=>s.id===desks.find(d=>d.id===selectedDesk)?.studentId) : undefined

  function startDeskDrag(id:string, e:React.MouseEvent) {
    e.preventDefault()
    draggingDesk.current = id
    const desk = desks.find(d=>d.id===id)!
    dragOffset.current = {x: e.clientX - desk.x*scale, y: e.clientY - desk.y*scale}
    const move = (ev:MouseEvent) => {
      if(!draggingDesk.current) return
      setDesks(p=>p.map(d=>d.id===draggingDesk.current?{...d,x:Math.round((ev.clientX-dragOffset.current.x)/scale),y:Math.round((ev.clientY-dragOffset.current.y)/scale)}:d))
    }
    const up = () => { draggingDesk.current=null; window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up) }
    window.addEventListener('mousemove',move)
    window.addEventListener('mouseup',up)
  }

  function drop(deskId:string, e:React.DragEvent) {
    e.preventDefault()
    const sid = draggingStudent.current
    if(!sid) return
    setDesks(p=>p.map(d=>d.id===deskId?{...d,studentId:sid}:d.studentId===sid?{...d,studentId:null}:d))
    draggingStudent.current = null
  }

  function randomize() {
    const ids = students.map(s=>s.id)
    const shuffled = [...ids].sort(()=>Math.random()-0.5)
    setDesks(p=>p.map((d,i)=>({...d,studentId:shuffled[i]??null})))
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['학번','이름','성별(남/여)','키(작음/보통/큰 편)','시력(양호/나쁨)','리더십','특이사항'],
      ['※ 이 행은 힌트입니다. 삭제 후 입력하세요','','','','','',''],
      [1,'홍길동','남','보통','양호','',''],
    ])
    ws['!cols'] = [{wch:8},{wch:10},{wch:12},{wch:16},{wch:14},{wch:10},{wch:16}]
    XLSX.utils.book_append_sheet(wb,ws,'학생명부')
    XLSX.writeFile(wb,'학생명부_입력양식.xlsx')
  }

  function uploadExcel(e:React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, {type:'binary'})
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, {header:1}).slice(2)
      const parsed: Student[] = rows
        .filter((r:any[])=>r[1]&&r[1]!=='홍길동')
        .map((r:any[])=>({
          id: crypto.randomUUID(),
          number: Number(r[0])||0,
          name: String(r[1]||''),
          gender: r[2]==='여'?'여':'남',
          height: ['작음','보통','큰 편'].includes(r[3])?r[3]:'보통',
          vision: r[4]==='나쁨'?'나쁨':'양호',
          leadership: String(r[5]||''),
          special: String(r[6]||''),
        }))
      setStudents(p=>{
        const updated = [...p]
        for(const s of parsed) {
          const idx = updated.findIndex(x=>x.number===s.number)
          if(idx>=0) updated[idx]={...s,id:updated[idx].id}
          else updated.push(s)
        }
        return updated
      })
    }
    reader.readAsBinaryString(file)
    e.target.value=''
  }

  function saveJSON() {
    const blob = new Blob([JSON.stringify({desks,students,conflicts},null,2)],{type:'application/json'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='seating.json'; a.click()
  }

  function loadJSON(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=ev=>{
      try { const d=JSON.parse(ev.target?.result as string); setDesks(d.desks); setStudents(d.students); setConflicts(d.conflicts||[]) } catch {}
    }
    reader.readAsText(file); e.target.value=''
  }

  const xlsxRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)

  return (
    <>
    <div style={{fontFamily:'system-ui,sans-serif',height:'100vh',display:'flex',flexDirection:'column',background:'#F0EEE9'}}>
      {/* 상단 바 */}
      <div style={{background:'#2C3E6B',color:'white',padding:'8px 16px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <a href="/" style={{color:'#90CAF9',fontSize:12,textDecoration:'none'}}>← 홈</a>
        <span style={{fontWeight:'bold',fontSize:14}}>🪑 좌석 배치</span>
        <div style={{flex:1}}/>
        {lastSaved&&<span style={{fontSize:10,color:'#90CAF9'}}>✓ 자동저장 {lastSaved}</span>}
        <button onClick={randomize} style={{background:'#3F51B5',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>🔀 랜덤</button>
        <button onClick={()=>setDesks(makeDesks())} style={{background:'#F44336',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>🗑 자리초기화</button>
        <button onClick={downloadTemplate} style={{background:'#4CAF50',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>📋 템플릿 다운</button>
        <button onClick={()=>xlsxRef.current?.click()} style={{background:'#009688',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>📊 Excel 업로드</button>
        <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={uploadExcel}/>
        <button onClick={saveJSON} style={{background:'#FF9800',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>💾 저장</button>
        <button onClick={()=>jsonRef.current?.click()} style={{background:'#607D8B',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>📂 불러오기</button>
        <input ref={jsonRef} type="file" accept=".json" style={{display:'none'}} onChange={loadJSON}/>
        <button onClick={()=>window.print()} style={{background:'#795548',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>🖨 인쇄</button>
        <button onClick={()=>setTeacherView(p=>!p)} style={{background:teacherView?'#E91E63':'#455A64',color:'white',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>👁 교사뷰</button>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* 좌측 패널 */}
        <div style={{width:180,background:'white',borderRight:'1px solid #ddd',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:10,borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:'bold',fontSize:12}}>학생 ({students.length})</span>
            <button onClick={()=>{setEditingStudent(null);setShowDialog(true)}} style={{background:'#1976D2',color:'white',border:'none',borderRadius:4,padding:'2px 8px',fontSize:11,cursor:'pointer'}}>+추가</button>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {students.sort((a,b)=>a.number-b.number).map(s=>{
              const seated = desks.some(d=>d.studentId===s.id)
              return <div key={s.id} draggable onDragStart={()=>{draggingStudent.current=s.id}}
                style={{padding:'6px 10px',borderBottom:'1px solid #f5f5f5',cursor:'grab',background:seated?'#F1F8E9':'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span><span style={{color:'#888',marginRight:4,fontSize:10}}>{s.number}</span><span style={{fontWeight:'bold'}}>{s.name}</span></span>
                <span style={{fontSize:9,color:s.gender==='남'?'#1976D2':'#E53935'}}>{s.gender}</span>
              </div>
            })}
          </div>
          {selectedDesk&&selStudent&&<div style={{borderTop:'1px solid #eee',padding:10}}>
            <div style={{fontWeight:'bold',fontSize:12,marginBottom:6}}>{selStudent.name}</div>
            <button onClick={()=>{setDesks(p=>p.map(d=>d.id===selectedDesk?{...d,studentId:null}:d));setSelectedDesk(null)}} style={{width:'100%',background:'#FFEBEE',color:'#C62828',border:'1px solid #FFCDD2',borderRadius:4,padding:'4px',fontSize:11,cursor:'pointer',marginBottom:3}}>자리 비우기</button>
            <button onClick={()=>{setEditingStudent(selStudent);setShowDialog(true)}} style={{width:'100%',background:'#E3F2FD',color:'#1565C0',border:'1px solid #BBDEFB',borderRadius:4,padding:'4px',fontSize:11,cursor:'pointer',marginBottom:3}}>학생 수정</button>
            <button onClick={()=>setStudents(p=>p.filter(s=>s.id!==selStudent.id))} style={{width:'100%',background:'#F5F5F5',color:'#555',border:'1px solid #ddd',borderRadius:4,padding:'4px',fontSize:11,cursor:'pointer'}}>학생 삭제</button>
          </div>}
        </div>

        {/* 캔버스 */}
        <div style={{flex:1,overflow:'auto',padding:16}}>
          <div ref={canvasRef} style={{position:'relative',width:1000*scale,height:800*scale,background:'#F5F4F0',transform:teacherView?'rotate(180deg)':'none',transformOrigin:'center center'}} onClick={()=>setSelectedDesk(null)}>
            <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, #C8C5BC 1px, transparent 1px)',backgroundSize:`${40*scale}px ${40*scale}px`,opacity:0.5,pointerEvents:'none'}}/>
            {FURNITURE.map(f=><div key={f.id} style={{position:'absolute',left:f.x*scale,top:f.y*scale,width:f.w*scale,height:f.h*scale,background:f.bg,border:`1.5px solid ${f.border}`,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.max(8,9*scale),fontWeight:'bold',color:'white',pointerEvents:'none',zIndex:1}}>{f.label}</div>)}
            {desks.map(desk=>(
              <div key={desk.id} style={{transform:`scale(${scale})`,transformOrigin:'top left',position:'absolute',left:desk.x*scale,top:desk.y*scale,zIndex:draggingDesk.current===desk.id?100:2}} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(desk.id,e)}>
                <DeskCard desk={{...desk,x:0,y:0}} student={students.find(s=>s.id===desk.studentId)} conflict={conflictDesks.has(desk.id)} selected={selectedDesk===desk.id}
                  onMouseDown={e=>{e.stopPropagation();startDeskDrag(desk.id,e)}} onDrop={e=>drop(desk.id,e)} onDragOver={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();setSelectedDesk(desk.id)}}/>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showDialog&&<StudentDialog student={editingStudent} onSave={s=>{setStudents(p=>editingStudent?p.map(x=>x.id===s.id?s:x):[...p,s]);setShowDialog(false)}} onClose={()=>setShowDialog(false)}/>}
    </div>
    </>
  )
}
