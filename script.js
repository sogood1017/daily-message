const START_DATE = '2026-09-15'; // 1번 글귀가 표시될 한국 날짜
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function kstDayNumber(date=new Date()) { return Math.floor((date.getTime()+KST_OFFSET_MS)/86400000); }
function dateStringToKstDayNumber(s){ const [y,m,d]=s.split('-').map(Number); return Math.floor(Date.UTC(y,m-1,d)/86400000); }
function parseCSV(text){
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){ if(c==='"' && text[i+1]==='"'){field+='"';i++;} else if(c==='"'){quoted=false;} else field+=c; }
    else { if(c==='"') quoted=true; else if(c===','){row.push(field);field='';} else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';} else field+=c; }
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);} return rows;
}
async function init(){
 const el=document.getElementById('message');
 try{
  const res=await fetch('./message.csv',{cache:'no-store'}); if(!res.ok) throw new Error('CSV load failed');
  const rows=parseCSV(await res.text()); const header=rows.shift().map(v=>v.trim().toUpperCase());
  const idIndex=header.indexOf('ID'), msgIndex=header.indexOf('MESSAGE');
  const messages=rows.map(r=>({id:Number(r[idIndex]),message:(r[msgIndex]||'').trim()})).filter(x=>Number.isFinite(x.id)&&x.message).sort((a,b)=>a.id-b.id);
  const dayIndex=kstDayNumber()-dateStringToKstDayNumber(START_DATE);
  if(dayIndex<0){el.textContent='아직 첫 번째 글을 기다리고 있어요.';return;}
  const item=messages.find(x=>x.id===dayIndex+1);
  el.textContent=item ? item.message : '새로운 글을 준비하고 있어요.';
 }catch(e){el.textContent='글을 불러오지 못했어요. 잠시 후 다시 열어 주세요.';console.error(e);}
}
init();
