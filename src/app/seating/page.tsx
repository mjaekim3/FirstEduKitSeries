'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'

interface Student { id:string;number:number;name:string;gender:'남'|'여';height:'작음'|'보통'|'큰 편';vision:'양호'|'나쁨';leadership:string;special:string }
interface Desk { id:string;x:number;y:number;studentId:string|null;rotation?:number }
interface Furniture { id:string;x:number;y:number;w:number;h:number;label:string;bg:string;border:string;tc?:string;rotation?:number }
interface ConflictPair { a:string;b:string }

const AUTOSAVE_KEY = 'fek_seating_autosave'
const DW=100,DH=85

const PRESETS:{[k:string]:Omit<Desk,'studentId'>[]} = {
  'HIFS 기본 1 (20명)':[
    {id:'d1',x:120,y:240},{id:'d2',x:220,y:240},{id:'d3',x:120,y:360},{id:'d4',x:220,y:360},
    {id:'d5',x:120,y:480},{id:'d6',x:220,y:480},{id:'d7',x:360,y:240},{id:'d8',x:460,y:240},
    {id:'d9',x:360,y:360},{id:'d10',x:460,y:360},{id:'d11',x:360,y:480},{id:'d12',x:460,y:480},
    {id:'d13',x:560,y:480},{id:'d14',x:560,y:360},{id:'d15',x:560,y:240},
    {id:'d16',x:700,y:240},{id:'d17',x:700,y:360},{id:'d18',x:800,y:360},{id:'d19',x:700,y:480},{id:'d20',x:800,y:480},
  ],
  'HIFS 기본 2 (20명)':[
    {id:'d1',x:119,y:240},{id:'d2',x:233,y:240},{id:'d3',x:119,y:335},{id:'d4',x:233,y:335},
    {id:'d5',x:119,y:430},{id:'d6',x:233,y:430},{id:'d7',x:393,y:240},{id:'d8',x:507,y:240},
    {id:'d9',x:393,y:335},{id:'d10',x:507,y:335},{id:'d11',x:393,y:430},{id:'d12',x:507,y:430},
    {id:'d13',x:393,y:525},{id:'d14',x:507,y:525},
    {id:'d15',x:667,y:240},{id:'d16',x:781,y:240},{id:'d17',x:667,y:335},{id:'d18',x:781,y:335},
    {id:'d19',x:667,y:430},{id:'d20',x:781,y:430},
  ],
  'HIFS 평가 대형 (20명)':[
    {id:'d1',x:50,y:240},{id:'d2',x:250,y:240},{id:'d3',x:450,y:240},{id:'d4',x:650,y:240},{id:'d5',x:850,y:240},
    {id:'d6',x:50,y:352},{id:'d7',x:250,y:352},{id:'d8',x:450,y:352},{id:'d9',x:650,y:352},{id:'d10',x:850,y:352},
    {id:'d11',x:50,y:463},{id:'d12',x:250,y:463},{id:'d13',x:450,y:463},{id:'d14',x:650,y:463},{id:'d15',x:850,y:463},
    {id:'d16',x:50,y:575},{id:'d17',x:250,y:575},{id:'d18',x:450,y:575},{id:'d19',x:650,y:575},{id:'d20',x:850,y:575},
  ],
}

function getPresetFurniture(name:string):Furniture[] {
  const base:Furniture[] = [
    {id:'wb_l',x:160,y:0,w:180,h:40,label:'화이트보드',bg:'#F8F8F6',border:'#BBBBBB'},
    {id:'sb',x:340,y:0,w:320,h:40,label:'삼성 스마트보드',bg:'#2C3E6B',border:'#7B8FC7',tc:'#FFFFFF'},
    {id:'wb_r',x:660,y:0,w:180,h:40,label:'화이트보드',bg:'#F8F8F6',border:'#BBBBBB'},
    {id:'td',x:160,y:80,w:180,h:80,label:'교탁',bg:'#F5E6C8',border:'#C8A96E'},
    {id:'stor2',x:920,y:0,w:80,h:200,label:'여닫이 사물함',bg:'#EDEAE3',border:'#AAAAAA'},
  ]
  if(name==='HIFS 기본 2 (20명)') return [
    ...base,
    {id:'win',x:6,y:80,w:18,h:610,label:'창문',bg:'#D6EEFF',border:'#7AB8E8'},
    {id:'door',x:880,y:0,w:120,h:20,label:'문',bg:'#1A237E',border:'#3949AB',tc:'#FFFFFF'},
    {id:'shoe',x:1000,y:40,w:80,h:200,label:'신발장',bg:'#F5F3EE',border:'#CCCCCC'},
    {id:'stor1',x:1000,y:240,w:80,h:300,label:'여닫이 사물함',bg:'#EDEAE3',border:'#AAAAAA'},
    {id:'stor_open',x:100,y:680,w:800,h:80,label:'개방형 사물함',bg:'#F8F7F4',border:'#CCCCCC'},
  ]
  return [
    ...base,
    {id:'win',x:0,y:80,w:20,h:600,label:'창문',bg:'#D6EEFF',border:'#7AB8E8'},
    {id:'door',x:980,y:680,w:18,h:120,label:'문',bg:'#1A237E',border:'#3949AB',tc:'#FFFFFF'},
    {id:'stor_open',x:110,y:720,w:800,h:80,label:'개방형 사물함',bg:'#F8F7F4',border:'#CCCCCC'},
    {id:'stor1',x:10,y:720,w:100,h:80,label:'여닫이 사물함',bg:'#EDEAE3',border:'#AAAAAA'},
  ]
}

function makeDesks(preset='HIFS 기본 1 (20명)'):Desk[] {
  return (PRESETS[preset]||PRESETS['HIFS 기본 1 (20명)']).map(d=>({...d,studentId:null}))
}

function isAdjConflict(conflicts:ConflictPair[],da:Desk,db:Desk):boolean {
  if(!da.studentId||!db.studentId) return false
  const adj=Math.abs(da.x-db.x)<=DW+22&&Math.abs(da.y-db.y)<=DH+22&&!(Math.abs(da.x-db.x)<4&&Math.abs(da.y-db.y)<4)
  if(!adj) return false
  const sa=da.studentId,sb=db.studentId
  return conflicts.some(c=>(c.a===sa&&c.b===sb)||(c.a===sb&&c.b===sa))
}

function isLight(hex:string):boolean {
  try{const c=parseInt(hex.replace('#',''),16);const r=(c>>16)&255,g=(c>>8)&255,b=c&255;return 0.299*r+0.587*g+0.114*b>140}catch{return true}
}

const btnStyle=(bg:string,extra?:React.CSSProperties):React.CSSProperties=>({padding:'7px 10px',background:bg,color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,width:'100%',...extra})
const iconBtn:React.CSSProperties={background:'none',border:'none',cursor:'pointer',fontSize:11,padding:'1px 3px'}

export default function SeatingPage() {
  const [mounted,setMounted]=useState(false)
  const [preset,setPreset]=useState('HIFS 기본 1 (20명)')
  const [desks,setDesks]=useState<Desk[]>(()=>makeDesks())
  const [students,setStudents]=useState<Student[]>([])
  const [conflicts,setConflicts]=useState<ConflictPair[]>([])
  const [furniture,setFurniture]=useState<Furniture[]>(()=>getPresetFurniture('HIFS 기본 1 (20명)'))
  const [selected,setSelected]=useState<string|null>(null)
  const [sideTab,setSideTab]=useState<'student'|'furniture'>('student')
  const [studentModal,setStudentModal]=useState<{student:Student|null}|null>(null)
  const [conflictModal,setConflictModal]=useState(false)
  const [dragOverDesk,setDragOverDesk]=useState<string|null>(null)
  const dragState=useRef<{type:'desk'|'furniture';id:string;startX:number;startY:number;origX:number;origY:number}|null>(null)

  useEffect(()=>{
    setMounted(true)
    try{
      const raw=localStorage.getItem(AUTOSAVE_KEY)
      if(raw){
        const s=JSON.parse(raw)
        if(s.desks) setDesks(s.desks)
        if(s.students) setStudents(s.students)
        if(s.conflicts) setConflicts(s.conflicts)
        if(s.preset){setPreset(s.preset);setFurniture(getPresetFurniture(s.preset))}
        else if(s.furniture) setFurniture(s.furniture)
      }
    }catch{}
  },[])

  useEffect(()=>{
    if(!mounted) return
    try{localStorage.setItem(AUTOSAVE_KEY,JSON.stringify({desks,students,conflicts,furniture,preset}))}catch{}
  },[mounted,desks,students,conflicts,furniture,preset])

  const onItemMouseDown=useCallback((e:React.MouseEvent,type:'desk'|'furniture',id:string,origX:number,origY:number)=>{
    if(e.button!==0) return
    e.stopPropagation(); e.preventDefault()
    setSelected(id)
    dragState.current={type,id,startX:e.clientX,startY:e.clientY,origX,origY}
    const onMove=(ev:MouseEvent)=>{
      if(!dragState.current) return
      const dx=ev.clientX-dragState.current.startX
      const dy=ev.clientY-dragState.current.startY
      const snap=10
      const nx=Math.round(Math.max(0,dragState.current.origX+dx)/snap)*snap
      const ny=Math.round(Math.max(0,dragState.current.origY+dy)/snap)*snap
      if(type==='desk') setDesks(prev=>prev.map(d=>d.id===id?{...d,x:nx,y:ny}:d))
      else setFurniture(prev=>prev.map(f=>f.id===id?{...f,x:nx,y:ny}:f))
    }
    const onUp=()=>{dragState.current=null;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
    window.addEventListener('mousemove',onMove)
    window.addEventListener('mouseup',onUp)
  },[])

  const onRightClick=useCallback((e:React.MouseEvent,type:'desk'|'furniture',id:string)=>{
    e.preventDefault();e.stopPropagation()
    if(type==='desk') setDesks(prev=>prev.map(d=>d.id===id?{...d,rotation:((d.rotation||0)+90)%360}:d))
    else setFurniture(prev=>prev.map(f=>f.id===id?{...f,rotation:((f.rotation||0)+90)%360}:f))
  },[])

  const onRotateHandleMouseDown=useCallback((e:React.MouseEvent,type:'desk'|'furniture',id:string,cx:number,cy:number,currentRot:number)=>{
    e.stopPropagation();e.preventDefault()
    const startAngleMouse=Math.atan2(e.clientY-cy,e.clientX-cx)*(180/Math.PI)
    const startRot=currentRot
    let lastAngle=startAngleMouse
    const onMove=(ev:MouseEvent)=>{
      const curAngle=Math.atan2(ev.clientY-cy,ev.clientX-cx)*(180/Math.PI)
      let delta=curAngle-lastAngle
      if(delta>180) delta-=360
      if(delta<-180) delta+=360
      lastAngle=curAngle
      if(type==='desk') setDesks(prev=>prev.map(d=>d.id===id?{...d,rotation:(d.rotation||0)+delta*0.6}:d))
      else setFurniture(prev=>prev.map(f=>f.id===id?{...f,rotation:(f.rotation||0)+delta*0.6}:f))
    }
    const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
    window.addEventListener('mousemove',onMove)
    window.addEventListener('mouseup',onUp)
  },[])

  const onStudentDragStart=(e:React.DragEvent,sid:string)=>{e.dataTransfer.setData('studentId',sid)}
  const onDeskDrop=(e:React.DragEvent,deskId:string)=>{
    e.preventDefault()
    const sid=e.dataTransfer.getData('studentId')
    if(!sid) return
    setDesks(prev=>{
      let next=prev.map(d=>d.studentId===sid?{...d,studentId:null}:d)
      next=next.map(d=>d.id===deskId?{...d,studentId:sid}:d)
      return next
    })
    setDragOverDesk(null)
  }

  const conflictDesks=new Set<string>()
  desks.forEach(da=>desks.forEach(db=>{
    if(da.id!==db.id&&isAdjConflict(conflicts,da,db)){conflictDesks.add(da.id);conflictDesks.add(db.id)}
  }))

  const studentMap=new Map(students.map(s=>[s.id,s]))
  const assignedIds=new Set(desks.filter(d=>d.studentId).map(d=>d.studentId as string))

  function applyPreset(p:string){
    const newDesks=makeDesks(p)
    const oldAssigned=desks.filter(d=>d.studentId)
    newDesks.forEach((nd,i)=>{if(oldAssigned[i]) nd.studentId=oldAssigned[i].studentId})
    setPreset(p); setDesks(newDesks); setFurniture(getPresetFurniture(p))
  }

  function autoAssign(){
    const unassigned=students.filter(s=>!assignedIds.has(s.id))
    const shuffled=[...unassigned].sort(()=>Math.random()-0.5)
    setDesks(prev=>{
      const next=[...prev]
      shuffled.forEach(s=>{const idx=next.findIndex(d=>!d.studentId);if(idx>=0) next[idx]={...next[idx],studentId:s.id}})
      return next
    })
  }

  function downloadTemplate(){
    const wb=XLSX.utils.book_new()
    const ws=XLSX.utils.aoa_to_sheet([['번호','이름','성별','키','시력','리더십','특이사항'],[1,'홍길동','남','보통','양호','','']])
    XLSX.utils.book_append_sheet(wb,ws,'학생목록')
    XLSX.writeFile(wb,'학생_템플릿.xlsx')
  }

  function uploadExcel(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file) return
    const reader=new FileReader()
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target?.result,{type:'array'})
      const rows=XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]],{header:1}) as string[][]
      const newStudents:Student[]=[]
      rows.slice(1).forEach(r=>{
        if(!r[0]&&!r[1]) return
        const num=Number(r[0])||0
        const existing=students.find(s=>s.number===num)
        newStudents.push({id:existing?.id||crypto.randomUUID(),number:num,name:String(r[1]||''),
          gender:(r[2]==='여'?'여':'남'),
          height:(['작음','보통','큰 편'].includes(r[3])?r[3]:'보통') as Student['height'],
          vision:(r[4]==='나쁨'?'나쁨':'양호'),leadership:String(r[5]||''),special:String(r[6]||'')})
      })
      setStudents(prev=>{const map=new Map(prev.map(s=>[s.id,s]));newStudents.forEach(s=>map.set(s.id,s));return[...map.values()]})
    }
    reader.readAsArrayBuffer(file);e.target.value=''
  }

  function deleteStudent(sid:string){
    setStudents(prev=>prev.filter(s=>s.id!==sid))
    setDesks(prev=>prev.map(d=>d.studentId===sid?{...d,studentId:null}:d))
  }

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:'Malgun Gothic,sans-serif',background:'#F5F4F0',overflow:'hidden'}}>
      <div style={{width:220,background:'#FFFFFF',borderRight:'1px solid #E0E0E0',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
        <div style={{padding:'12px 14px',background:'#1A1A2E',color:'white',flexShrink:0}}>
          <div style={{fontWeight:'bold',fontSize:14}}>시팅차트</div>
          <div style={{fontSize:10,color:'#90CAF9',marginTop:2}}>FirstEduKit</div>
        </div>
        <div style={{padding:'8px 10px',borderBottom:'1px solid #eee',flexShrink:0}}>
          <div style={{fontSize:10,color:'#757575',marginBottom:3}}>프리셋</div>
          <select value={preset} onChange={e=>applyPreset(e.target.value)}
            style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:5,fontSize:11,background:'white',color:'#1A1A2E',marginBottom:5}}>
            {Object.keys(PRESETS).map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <button onClick={autoAssign} style={btnStyle('#1976D2')}>자동 배치</button>
            <button onClick={()=>setDesks(prev=>prev.map(d=>({...d,studentId:null})))} style={btnStyle('#E53935')}>배치 초기화</button>
            <button onClick={()=>setStudentModal({student:null})} style={btnStyle('#2E7D32')}>+ 학생 추가</button>
            <div style={{display:'flex',gap:4}}>
              <button onClick={downloadTemplate} style={btnStyle('#546E7A',{flex:1,fontSize:10})}>템플릿 ↓</button>
              <label style={{...btnStyle('#546E7A',{flex:1,fontSize:10}),textAlign:'center',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                엑셀↑<input type='file' accept='.xlsx,.xls' onChange={uploadExcel} style={{display:'none'}}/>
              </label>
            </div>
            <button onClick={()=>setConflictModal(true)} style={btnStyle('#F57F17')}>갈등 관리 ({conflicts.length})</button>
          </div>
        </div>
        {selected&&(()=>{
          const selDesk=desks.find(d=>d.id===selected)
          const selFurn=furniture.find(f=>f.id===selected)
          const item=selDesk||selFurn
          if(!item) return null
          const isDesk=!!selDesk
          const rot=Math.round((item.rotation||0))
          const spinStyle:React.CSSProperties={width:54,padding:'2px 4px',border:'1px solid #ddd',borderRadius:4,fontSize:11,textAlign:'center',background:'white',color:'#1A1A2E'}
          return (
            <div style={{padding:'8px 10px',borderBottom:'1px solid #eee',flexShrink:0,background:'#FAFAFA'}}>
              <div style={{fontSize:10,color:'#888',marginBottom:4}}>선택 속성</div>
              <div style={{display:'grid',gridTemplateColumns:'20px 1fr',gap:'4px 6px',alignItems:'center',fontSize:11}}>
                <span style={{color:'#222',fontWeight:'bold'}}>X</span><input type='number' value={Math.round(item.x)} onChange={e=>{const v=Number(e.target.value);isDesk?setDesks(p=>p.map(d=>d.id===selected?{...d,x:v}:d)):setFurniture(p=>p.map(f=>f.id===selected?{...f,x:v}:f))}} style={spinStyle}/>
                <span style={{color:'#222',fontWeight:'bold'}}>Y</span><input type='number' value={Math.round(item.y)} onChange={e=>{const v=Number(e.target.value);isDesk?setDesks(p=>p.map(d=>d.id===selected?{...d,y:v}:d)):setFurniture(p=>p.map(f=>f.id===selected?{...f,y:v}:f))}} style={spinStyle}/>
                {!isDesk&&<><span style={{color:'#222',fontWeight:'bold'}}>W</span><input type='number' value={Math.round((selFurn as Furniture).w)} onChange={e=>{const v=Number(e.target.value);setFurniture(p=>p.map(f=>f.id===selected?{...f,w:v}:f))}} style={spinStyle}/></>}
                {!isDesk&&<><span style={{color:'#222',fontWeight:'bold'}}>H</span><input type='number' value={Math.round((selFurn as Furniture).h)} onChange={e=>{const v=Number(e.target.value);setFurniture(p=>p.map(f=>f.id===selected?{...f,h:v}:f))}} style={spinStyle}/></>}
                <span style={{color:'#222',fontWeight:'bold'}}>∠</span><input type='number' value={((rot%360)+360)%360} onChange={e=>{const v=Number(e.target.value);isDesk?setDesks(p=>p.map(d=>d.id===selected?{...d,rotation:v}:d)):setFurniture(p=>p.map(f=>f.id===selected?{...f,rotation:v}:f))}} style={spinStyle}/>
              </div>
              <div style={{display:'flex',gap:3,marginTop:5}}>
                {[0,90,180,270].map(deg=><button key={deg} onClick={()=>{isDesk?setDesks(p=>p.map(d=>d.id===selected?{...d,rotation:deg}:d)):setFurniture(p=>p.map(f=>f.id===selected?{...f,rotation:deg}:f))}}
                  style={{flex:1,padding:'3px 0',fontSize:10,background:'#E8EAF6',color:'#1A1A2E',border:'1px solid #C5CAE9',borderRadius:4,cursor:'pointer'}}>{deg}°</button>)}
              </div>
            </div>
          )
        })()}
        <div style={{display:'flex',borderBottom:'1px solid #eee',flexShrink:0}}>
          {(['student','furniture'] as const).map(t=>(
            <button key={t} onClick={()=>setSideTab(t)} style={{flex:1,padding:'6px 0',fontSize:11,border:'none',cursor:'pointer',
              background:sideTab===t?'#1976D2':'#f5f5f5',color:sideTab===t?'white':'#555',fontWeight:sideTab===t?'bold':'normal'}}>
              {t==='student'?`학생 (${students.length}명)`:'가구 배치'}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'6px 10px'}}>
          {sideTab==='furniture'&&<>
            <div style={{fontSize:10,color:'#757575',marginBottom:5}}>가구 추가</div>
            {[
              {label:'화이트보드',w:180,h:40,bg:'#F8F8F6',border:'#BBBBBB'},
              {label:'삼성 스마트보드',w:320,h:40,bg:'#2C3E6B',border:'#7B8FC7',tc:'#FFFFFF'},
              {label:'교탁',w:180,h:80,bg:'#F5E6C8',border:'#C8A96E'},
              {label:'창문',w:20,h:200,bg:'#D6EEFF',border:'#7AB8E8'},
              {label:'문',w:80,h:20,bg:'#1A237E',border:'#3949AB',tc:'#FFFFFF'},
              {label:'신발장',w:80,h:200,bg:'#F5F3EE',border:'#CCCCCC'},
              {label:'여닫이 사물함',w:80,h:200,bg:'#EDEAE3',border:'#AAAAAA'},
              {label:'개방형 사물함',w:300,h:80,bg:'#F8F7F4',border:'#CCCCCC'},
            ].map(f=>(
              <div key={f.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 6px',marginBottom:2,background:'#fff',border:'1px solid #eee',borderRadius:4,fontSize:10}}>
                <span>{f.label}</span>
                <button onClick={()=>setFurniture(p=>[...p,{...f,id:'f'+Date.now(),x:200,y:200,tc:f.tc}])}
                  style={{padding:'2px 7px',background:'#1976D2',color:'white',border:'none',borderRadius:3,fontSize:10,cursor:'pointer'}}>+</button>
              </div>
            ))}
            <div style={{borderTop:'1px solid #eee',marginTop:6,paddingTop:6,fontSize:10,color:'#757575'}}>배치된 가구</div>
            {furniture.map(f=>(
              <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 6px',marginBottom:2,background:selected===f.id?'#E3F2FD':'#fafafa',border:'1px solid #eee',borderRadius:4,fontSize:10,cursor:'pointer'}} onClick={()=>setSelected(f.id)}>
                <span>{f.label}</span>
                <button onClick={e=>{e.stopPropagation();setFurniture(p=>p.filter(x=>x.id!==f.id));if(selected===f.id)setSelected(null)}}
                  style={{background:'none',border:'none',color:'#E53935',cursor:'pointer',fontSize:12}}>✕</button>
              </div>
            ))}
          </>}
          {sideTab==='student'&&<>
          <div style={{fontSize:10,color:'#757575',marginBottom:5}}>학생 ({students.length}명)</div>
          {students.map(s=>{
            const tags:string[]=[]
            if(s.height==='작음') tags.push('↓키')
            if(s.height==='큰 편') tags.push('↑키')
            if(s.vision==='나쁨') tags.push('↓시력')
            if(s.special) tags.push('★')
            return (
              <div key={s.id} draggable onDragStart={e=>onStudentDragStart(e,s.id)}
                style={{padding:'5px 7px',marginBottom:3,
                  background:assignedIds.has(s.id)?'#E8F5E9':'#FFF9C4',
                  border:'1px solid #E0E0E0',borderRadius:5,cursor:'grab',fontSize:11,
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>
                  <span style={{color:'#999',fontSize:9}}>{s.number}번 </span>
                  <b>{s.name}</b>
                  <span style={{color:s.gender==='남'?'#1976D2':'#E53935',fontSize:9}}> {s.gender}</span>
                  {tags.length>0&&<span style={{color:'#888',fontSize:8}}> {tags.join(' ')}</span>}
                  {s.leadership&&<span style={{color:'#5C6BC0',fontSize:8}}> [{s.leadership}]</span>}
                </span>
                <div style={{display:'flex',gap:2}}>
                  <button onClick={()=>setStudentModal({student:s})} style={iconBtn}>✏️</button>
                  <button onClick={()=>deleteStudent(s.id)} style={iconBtn}>🗑</button>
                </div>
              </div>
            )
          })}
          </>}
        </div>
      </div>

      <div style={{flex:1,overflow:'auto'}}>
        <div style={{position:'relative',width:1000,height:800,margin:'12px auto',
          background:'#F5F4F0',border:'1px solid #E0E0E0',borderRadius:8,
          backgroundImage:'linear-gradient(#E4E2DC 1px,transparent 1px),linear-gradient(90deg,#E4E2DC 1px,transparent 1px)',
          backgroundSize:'40px 40px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>

          {furniture.map(f=>{
            const textColor=f.tc||(isLight(f.bg)?'#1A1A2E':'#FFFFFF')
            return (
              <div key={f.id} onMouseDown={e=>onItemMouseDown(e,'furniture',f.id,f.x,f.y)}
                onContextMenu={e=>onRightClick(e,'furniture',f.id)}
                style={{position:'absolute',left:f.x,top:f.y,width:f.w,height:f.h,transform:`rotate(${f.rotation||0}deg)`,transformOrigin:'center center',
                  background:f.bg,border:`1.5px solid ${f.border}`,borderRadius:4,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:textColor,fontWeight:'bold',fontSize:Math.min(12,Math.max(8,f.w/f.label.length*1.2)),
                  cursor:'grab',userSelect:'none',zIndex:1,
                  boxShadow:selected===f.id?'0 0 0 2px #90CAF9':'none',
                  overflow:'visible',whiteSpace:'nowrap'}}>
                <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:4}}>{f.label}</div>
                {selected===f.id&&<div
                  onMouseDown={e=>{const r=(e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();onRotateHandleMouseDown(e,'furniture',f.id,r.left+r.width/2,r.top+r.height/2,f.rotation||0)}}
                  style={{position:'absolute',top:-24,left:'50%',transform:'translateX(-50%)',width:14,height:14,borderRadius:'50%',background:'#FF6F00',border:'2px solid #E65100',cursor:'crosshair',zIndex:10}}/>}
              </div>
            )
          })}

          {desks.map(d=>{
            const stu=d.studentId?studentMap.get(d.studentId):undefined
            const isConf=conflictDesks.has(d.id)
            const isSel=selected===d.id
            const isDO=dragOverDesk===d.id
            const bg=isConf?'#FFEBEE':isDO?'#E8F5E9':stu?'#E8F4FD':'#FFFFFF'
            const bd=isConf?'#E53935':isSel?'#1976D2':isDO?'#43A047':stu?'#1976D2':'#C8C5BC'
            const bdW=isConf||isSel||isDO?2:stu?1.5:1
            return (
              <div key={d.id}
                onMouseDown={e=>onItemMouseDown(e,'desk',d.id,d.x,d.y)}
                onContextMenu={e=>onRightClick(e,'desk',d.id)}
                onDragOver={e=>{e.preventDefault();setDragOverDesk(d.id)}}
                onDragLeave={()=>setDragOverDesk(null)}
                onDrop={e=>onDeskDrop(e,d.id)}
                onDoubleClick={()=>stu&&setStudentModal({student:stu})}
                style={{position:'absolute',left:d.x,top:d.y,width:DW,height:DH,transform:`rotate(${d.rotation||0}deg)`,transformOrigin:'center center',
                  border:`${bdW}px solid ${bd}`,borderRadius:5,background:bg,
                  cursor:'grab',userSelect:'none',zIndex:2,
                  boxShadow:isSel?'0 0 0 2px #90CAF9':'0 1px 3px rgba(0,0,0,0.08)',
                  overflow:'visible'}}>
                {stu ? <DeskContent stu={stu} onRemove={e=>{e.stopPropagation();setDesks(prev=>prev.map(dd=>dd.id===d.id?{...dd,studentId:null}:dd))}}/> :
                  <div style={{display:'flex',height:'100%',alignItems:'center',justifyContent:'center',color:'#C8C5BC',fontSize:9,overflow:'hidden',borderRadius:5}}>빈 자리</div>
                }
                {isSel&&<div
                  onMouseDown={e=>{const r=(e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();onRotateHandleMouseDown(e,'desk',d.id,r.left+r.width/2,r.top+r.height/2,d.rotation||0)}}
                  style={{position:'absolute',top:-24,left:'50%',transform:'translateX(-50%)',width:14,height:14,borderRadius:'50%',background:'#FF6F00',border:'2px solid #E65100',cursor:'crosshair',zIndex:10}}/>}
              </div>
            )
          })}
        </div>
      </div>

      {studentModal&&<StudentModal student={studentModal.student}
        onSave={s=>{setStudents(prev=>{const idx=prev.findIndex(p=>p.id===s.id);return idx>=0?prev.map(p=>p.id===s.id?s:p):[...prev,s]});setStudentModal(null)}}
        onClose={()=>setStudentModal(null)}/>}

      {conflictModal&&<ConflictModal students={students} conflicts={conflicts} setConflicts={setConflicts} onClose={()=>setConflictModal(false)}/>}
    </div>
  )
}

function DeskContent({stu,onRemove}:{stu:Student;onRemove:(e:React.MouseEvent)=>void}) {
  const parts:string[]=[]
  if(stu.height==='작음') parts.push('↓키')
  if(stu.height==='큰 편') parts.push('↑키')
  if(stu.vision==='나쁨') parts.push('↓시력')
  if(stu.special) parts.push('!')
  const genderColor=stu.gender==='남'?'#1976D2':'#E53935'
  return (
    <div style={{position:'relative',width:'100%',height:'100%',padding:'3px 6px',boxSizing:'border-box',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',height:13}}>
        <span style={{fontSize:8,color:'#111',lineHeight:1}}>{stu.number}번</span>
        <div style={{width:12,height:12,borderRadius:'50%',background:genderColor,
          display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:7,fontWeight:'bold',flexShrink:0}}>
          {stu.gender}
        </div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontWeight:'bold',fontSize:13,color:'#1A1A2E',textAlign:'center',lineHeight:1.1,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>
          {stu.name}
        </span>
      </div>
      {stu.leadership&&(
        <div style={{borderTop:'0.5px solid #DDD',paddingTop:1,textAlign:'center',fontSize:9,color:'#5C6BC0',
          height:14,lineHeight:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {stu.leadership}
        </div>
      )}
      {parts.length>0&&(
        <div style={{borderTop:'0.5px solid #EEE',paddingTop:1,textAlign:'center',fontSize:8,color:'#999',height:12,lineHeight:'12px'}}>
          {parts.join(' / ')}
        </div>
      )}
      <button onClick={onRemove}
        style={{position:'absolute',top:1,right:2,background:'none',border:'none',cursor:'pointer',fontSize:9,color:'#BBB',padding:0,lineHeight:1}}>✕</button>
    </div>
  )
}

function StudentModal({student,onSave,onClose}:{student:Student|null;onSave:(s:Student)=>void;onClose:()=>void}){
  const blank:Student={id:crypto.randomUUID(),number:0,name:'',gender:'남',height:'보통',vision:'양호',leadership:'',special:''}
  const [form,setForm]=useState<Student>(student??blank)
  const set=(k:keyof Student,v:string|number)=>setForm(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:24,width:320,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
        <h3 style={{margin:'0 0 14px',fontSize:15}}>{student?'학생 수정':'학생 추가'}</h3>
        {([['number','번호','number'],['name','이름','text'],['leadership','리더십','text'],['special','특이사항','text']] as [keyof Student,string,string][]).map(([k,label,type])=>(
          <div key={k} style={{marginBottom:8}}>
            <label style={{fontSize:11,color:'#555'}}>{label}</label>
            <input type={type} value={String(form[k])} onChange={e=>set(k,type==='number'?Number(e.target.value):e.target.value)}
              style={{display:'block',width:'100%',padding:'5px 8px',border:'1px solid #ddd',borderRadius:6,marginTop:2,fontSize:12,boxSizing:'border-box'}}/>
          </div>
        ))}
        {([['gender','성별',['남','여']],['height','키',['작음','보통','큰 편']],['vision','시력',['양호','나쁨']]] as [keyof Student,string,string[]][]).map(([k,label,opts])=>(
          <div key={k} style={{marginBottom:8}}>
            <label style={{fontSize:11,color:'#555'}}>{label}</label>
            <div style={{display:'flex',gap:5,marginTop:2}}>
              {opts.map(o=><button key={o} onClick={()=>set(k,o)}
                style={{flex:1,padding:'4px',border:`1px solid ${form[k]===o?'#1976D2':'#ddd'}`,borderRadius:6,background:form[k]===o?'#E3F2FD':'white',fontSize:11,cursor:'pointer'}}>{o}</button>)}
            </div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:14}}>
          <button onClick={onClose} style={{flex:1,padding:'8px',border:'1px solid #ddd',borderRadius:6,cursor:'pointer',fontSize:12}}>취소</button>
          <button onClick={()=>onSave(form)} style={{flex:1,padding:'8px',background:'#1976D2',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12}}>저장</button>
        </div>
      </div>
    </div>
  )
}

function ConflictModal({students,conflicts,setConflicts,onClose}:{students:Student[];conflicts:ConflictPair[];setConflicts:React.Dispatch<React.SetStateAction<ConflictPair[]>>;onClose:()=>void}){
  const [a,setA]=useState('');const [b,setB]=useState('')
  function add(){
    if(!a||!b||a===b) return
    setConflicts(p=>[...p.filter(c=>!(c.a===a&&c.b===b)&&!(c.a===b&&c.b===a)),{a,b}])
    setA('');setB('')
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:12,padding:24,width:340,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
        <h3 style={{margin:'0 0 14px',fontSize:15}}>갈등 학생 관리</h3>
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          <select value={a} onChange={e=>setA(e.target.value)} style={{flex:1,padding:'5px',border:'1px solid #ddd',borderRadius:6,fontSize:12}}>
            <option value=''>학생 A</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.number}번)</option>)}
          </select>
          <select value={b} onChange={e=>setB(e.target.value)} style={{flex:1,padding:'5px',border:'1px solid #ddd',borderRadius:6,fontSize:12}}>
            <option value=''>학생 B</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.number}번)</option>)}
          </select>
          <button onClick={add} style={{padding:'5px 10px',background:'#E53935',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12}}>추가</button>
        </div>
        {conflicts.map((c,i)=>{
          const sa=students.find(s=>s.id===c.a);const sb=students.find(s=>s.id===c.b)
          return (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 8px',background:'#FFEBEE',borderRadius:6,marginBottom:4,fontSize:12}}>
              <span style={{color:'#B71C1C'}}>{sa?.name??'?'} ↔ {sb?.name??'?'}</span>
              <button onClick={()=>setConflicts(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#E53935'}}>✕</button>
            </div>
          )
        })}
        {conflicts.length===0&&<div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'10px 0'}}>갈등 쌍 없음</div>}
        <button onClick={onClose} style={{width:'100%',marginTop:12,padding:'8px',border:'1px solid #ddd',borderRadius:6,cursor:'pointer',fontSize:12}}>닫기</button>
      </div>
    </div>
  )
}
