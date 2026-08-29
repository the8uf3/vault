const DATA_KEY='bodysignal-data-v1',PROFILE_KEY='bodysignal-profile-v1',THEME_KEY='bodysignal-theme';
let entries=[],demo=false,demoPreview=false,chart=null,waistChart=null,profile={},installPrompt=null,calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
const $=id=>document.getElementById(id), num=v=>v===''||v==null?null:Number(v), dayMs=86400000;
const iso=value=>{const d=value instanceof Date?value:new Date(value),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}, parse=d=>new Date(d+'T00:00:00'), fmt=d=>parse(d).toLocaleDateString('th-TH',{day:'numeric',month:'short'});
function mean(a){const v=a.filter(Number.isFinite);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null} function median(a){const v=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2}
function dateShift(date,days){const d=parse(typeof date==='string'?date:iso(date));d.setDate(d.getDate()+days);return iso(d)}
function inWindow(data,endDate,days,offset=0){const end=dateShift(endDate,-offset),start=dateShift(end,-days+1);return data.filter(e=>e.date>=start&&e.date<=end)}
function mondayOf(date){const d=parse(typeof date==='string'?date:iso(date)),day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return iso(d)}
function rolling(data,key,days=7){return data.map(e=>mean(inWindow(data,e.date,days).map(x=>num(x[key]))))}
function rollingMedian(data,key,days=7){return data.map(e=>median(inWindow(data,e.date,days).map(x=>num(x[key]))))}
function load(e){return [1,2,3,4,5].reduce((s,z)=>s+(num(e['z'+z])||0)*z,0)}
function sessionMinutes(e){return Math.max(1,num(e.duration_min)||[1,2,3,4,5].reduce((s,z)=>s+(num(e['z'+z])||0),0))}
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2400)}
function demoData(){const out=[],base=67.0,totalDays=400;for(let i=totalDays-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const train=i%3===0;const hard=i%9===0;const longTrend=(totalDays-1-i)*.0012,recentTrend=i<35?(35-i)*.015:0,seasonal=Math.sin(i/18)*.16,recoveryWater=train?.22:0;out.push({id:'d'+i,date:iso(d),weight:+(base+longTrend+recentTrend+seasonal+recoveryWater+Math.sin(i*1.7)*.08).toFixed(1),waist:+(32.8+Math.sin(i/23)*.1+Math.sin(i)*.04).toFixed(1),sleep_hours:+(6.6+(i%4)*.3).toFixed(1),sleep_quality:3+(i%3===0?1:0),soreness:train?(hard?7:3):1,resting_hr:61+(hard?4:0),bloating:i%8===0?2:0,did_workout:train,workout_type:hard?'strength':'cardio',duration_min:train?35:0,rpe:train?(hard?8:4):null,z1:train?6:0,z2:train?(hard?8:25):0,z3:train?(hard?10:3):0,z4:hard?7:0,z5:hard?2:0,note:i%8===0?'กินเค็มเมื่อคืน':null})}return out}
async function init(){setToday();setupZoneSettings();initTheme();bind();try{entries=JSON.parse(localStorage.getItem(DATA_KEY)||'[]');profile=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch(e){entries=[];profile={}}demoPreview=new URLSearchParams(location.search).get('demo')==='1';if(demoPreview){demo=true;entries=demoData();$('setupNotice').textContent='โหมดเดโม่ — แสดงข้อมูลตัวอย่างย้อนหลัง 400 วัน โดยไม่กระทบข้อมูลจริงในอุปกรณ์';$('setupNotice').classList.remove('hide')}else if(!entries.length){demo=true;entries=demoData();$('setupNotice').classList.remove('hide')}if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);render()}
function setupZoneSettings(){const box=document.createElement('div');box.className='zone-settings';box.innerHTML=`<div class="title-row"><b>ช่วง Heart Rate Zones ส่วนตัว</b><button type="button" class="info-btn" data-info="personalZones">i</button></div><div class="sub">กรอกตามช่วง bpm ที่นาฬิกาหรืออุปกรณ์ของคุณใช้</div><div class="zone-range-grid">${[1,2,3,4,5].map(z=>`<div class="zone-range-row"><b>Zone ${z}</b><input id="zone${z}Min" type="number" min="30" max="240" placeholder="เริ่ม" aria-label="Zone ${z} เริ่มต้น"><span>ถึง</span><input id="zone${z}Max" type="number" min="30" max="240" placeholder="สิ้นสุด" aria-label="Zone ${z} สิ้นสุด"><span>bpm</span></div>`).join('')}</div>`;$('profileForm').insertBefore(box,$('profileForm').querySelector('.actions'))}
function initTheme(){const styleKey='bodysignal-navy-theme-v1';if(!localStorage.getItem(styleKey)){localStorage.setItem(styleKey,'1');localStorage.setItem(THEME_KEY,'dark')}const saved=localStorage.getItem(THEME_KEY),dark=saved?saved==='dark':true;document.documentElement.classList.toggle('dark',dark);updateThemeButton()}
function toggleTheme(){const dark=document.documentElement.classList.toggle('dark');localStorage.setItem(THEME_KEY,dark?'dark':'light');updateThemeButton();renderChart();renderWaistChart()}
function updateThemeButton(){const dark=document.documentElement.classList.contains('dark'),b=$('themeBtn');if(b){b.textContent=dark?'☀':'☾';b.setAttribute('aria-label',dark?'ใช้โหมดสว่าง':'ใช้โหมดมืด')}document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#070d20':'#f4f5fb')}
function persist(){if(demoPreview)return;localStorage.setItem(DATA_KEY,JSON.stringify(demo?[]:entries));localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}
function bind(){
  document.querySelectorAll('.tab[data-page]').forEach(b=>b.onclick=()=>show(b.dataset.page));
  $('themeBtn').onclick=toggleTheme;
  document.addEventListener('click',e=>{const b=e.target.closest('[data-info]');if(b){e.preventDefault();openInfo(b.dataset.info)}});
  $('infoClose').onclick=()=> $('infoDialog').close();$('infoDialog').onclick=e=>{if(e.target===$('infoDialog'))$('infoDialog').close()};
  $('didWorkout').onchange=e=>$('workoutFields').classList.toggle('hide',!e.target.checked);$('entryForm').onsubmit=saveEntry;$('profileForm').onsubmit=saveProfile;
  $('profileEditBtn').onclick=()=>{fillProfile();$('profileForm').classList.remove('hide');$('profileEditBtn').classList.add('hide')};$('profileCancelBtn').onclick=()=>{$('profileForm').classList.add('hide');$('profileEditBtn').classList.remove('hide')};
  $('cancelEdit').onclick=()=>{$('entryForm').reset();setToday();$('workoutFields').classList.add('hide');$('entryEditor').classList.add('hide')};$('exportBtn').onclick=exportData;$('restoreInput').onchange=restoreData;
  $('calPrev').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar()};$('calNext').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar()};
  ['sleepQuality','bloating','measurementTime'].forEach(id=>$(id)?.closest('.field')?.classList.add('hide'));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').classList.remove('hide')});$('installBtn').onclick=installApp;
}
function show(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='checkin'){$('entryEditor').classList.add('hide');$('profileForm').classList.add('hide');$('profileEditBtn').classList.remove('hide');renderProfileCard();renderCalendar()}scrollTo({top:0,behavior:'smooth'})}
function setToday(){$('date').value=iso(new Date())}
function field(id){return num($(id).value)}
async function saveEntry(ev){ev.preventDefault();if(demoPreview){toast('โหมดเดโม่ดูอย่างเดียว เปิดแอปปกติเพื่อบันทึกข้อมูลจริง');return}const did=$('didWorkout').checked;const row={id:'local'+Date.now(),date:$('date').value,weight:field('weight'),waist:field('waist'),sleep_hours:field('sleep'),sleep_quality:field('sleepQuality'),soreness:field('soreness'),resting_hr:field('restingHr'),bloating:field('bloating'),measurement_time:$('measurementTime').value,did_workout:did,workout_type:did?$('workoutType').value:null,duration_min:did?field('duration'):null,rpe:did?field('rpe'):null,z1:did?field('z1'):0,z2:did?field('z2'):0,z3:did?field('z3'):0,z4:did?field('z4'):0,z5:did?field('z5'):0,note:$('note').value.trim()||null};if(did&&row.duration_min&&[1,2,3,4,5].reduce((s,z)=>s+(row['z'+z]||0),0)>row.duration_min+1){toast('เวลาในโซนรวมมากกว่าระยะเวลา workout');return}if(demo){entries=[];demo=false;$('setupNotice').classList.add('hide')}entries=entries.filter(x=>x.date!==row.date).concat(row).sort((a,b)=>a.date.localeCompare(b.date));try{persist()}catch(e){toast('พื้นที่จัดเก็บของอุปกรณ์เต็ม กรุณาสำรองข้อมูล');return}toast('บันทึกไว้ในอุปกรณ์นี้แล้ว');render();show('dashboard')}
async function saveProfile(ev){ev.preventDefault();const zones=[1,2,3,4,5].map(z=>({min:field(`zone${z}Min`),max:field(`zone${z}Max`)}));for(let i=0;i<zones.length;i++){const z=zones[i];if((z.min==null)!==(z.max==null)){toast(`กรอกค่าเริ่มต้นและสิ้นสุดของ Zone ${i+1} ให้ครบ`);return}if(z.min!=null&&z.min>z.max){toast(`ช่วง Zone ${i+1} เริ่มต้นต้องไม่สูงกว่าสิ้นสุด`);return}if(i>0&&z.min!=null&&zones[i-1].max!=null&&z.min<=zones[i-1].max){toast(`Zone ${i+1} ต้องเริ่มสูงกว่า Zone ${i} และช่วงต้องไม่ซ้อนกัน`);return}}profile={...profile,height_cm:field('height'),sex:$('sex').value,hr_zones:zones};persist();$('profileForm').classList.add('hide');$('profileEditBtn').classList.remove('hide');renderProfileCard();renderSimpleStatus();toast('บันทึกข้อมูลส่วนตัวและ Heart Rate Zones แล้ว')}
function fillProfile(){$('height').value=profile.height_cm||'';$('sex').value=profile.sex||'unspecified';[1,2,3,4,5].forEach(z=>{const zone=profile.hr_zones?.[z-1]||{};$(`zone${z}Min`).value=zone.min??'';$(`zone${z}Max`).value=zone.max??''})}
function updateZoneLabels(){[1,2,3,4,5].forEach(z=>{const zone=profile.hr_zones?.[z-1],label=document.querySelector(`label[for="z${z}"]`);if(!label)return;const text=zone?.min!=null&&zone?.max!=null?`Zone ${z} (${zone.min}–${zone.max} bpm) · นาที`:`Zone ${z} (นาที)`;label.childNodes[0].textContent=text+' '})}
function renderProfileCard(){const h=num(profile.height_cm),sexLabel=profile.sex==='female'?'ผู้หญิง':profile.sex==='male'?'ผู้ชาย':'ไม่ระบุ',latestWeight=[...entries].reverse().find(e=>num(e.weight)!=null),weightText=latestWeight?`${num(latestWeight.weight).toFixed(1)} kg`:'ยังไม่มีน้ำหนัก';$('profileSummary').textContent=`น้ำหนัก ${weightText} · เพศ ${sexLabel}`;$('profileEditBtn').textContent=h||profile.sex&&profile.sex!=='unspecified'?'แก้ไข':'ตั้งค่า';updateZoneLabels()}
function render(){entries.sort((a,b)=>a.date.localeCompare(b.date));renderSummary();renderSimpleStatus();renderWorkoutCounts();renderChart();renderWaistChart();renderInsights();renderLoad();renderProfileCard();renderCalendar()}
function setStatusCard(id,level){const c=$(id);c.classList.remove('caution','alert');if(level)c.classList.add(level)}
function renderSimpleStatus(){
  const anchor=iso(new Date()),recent=inWindow(entries,anchor,7),previous=inWindow(entries,anchor,7,7),latestWeight=[...entries].reverse().find(e=>num(e.weight)!=null),weights=recent.map(e=>num(e.weight)).filter(Number.isFinite),oldWeights=previous.map(e=>num(e.weight)).filter(Number.isFinite),avg=mean(weights),oldAvg=mean(oldWeights),diff=avg!=null&&oldAvg!=null?avg-oldAvg:null;
  const waistEntries=entries.filter(e=>num(e.waist)!=null),latestWaist=waistEntries.at(-1),waists=recent.map(e=>num(e.waist)).filter(Number.isFinite),oldWaists=previous.map(e=>num(e.waist)).filter(Number.isFinite),waistNow=median(waists),waistOld=median(oldWaists),firstWaistDate=waistEntries[0]?.date,baselineWaists=firstWaistDate?waistEntries.filter(e=>e.date>=firstWaistDate&&e.date<=dateShift(firstWaistDate,13)).map(e=>num(e.waist)):[],waistBase=median(baselineWaists),waistRise=waistNow!=null&&waistBase!=null?waistNow-waistBase:null,priorRise=waistOld!=null&&waistBase!=null?waistOld-waistBase:null,confirmedRise=waistRise>=1&&priorRise>=1,ratio=waistNow!=null&&num(profile.height_cm)?waistNow*2.54/num(profile.height_cm):null;
  $('weightStatusValue').textContent=latestWeight?`${num(latestWeight.weight).toFixed(1)} kg`:'—';let wTitle='ยังบอกไม่ได้',wText='บันทึกน้ำหนักอย่างน้อยหนึ่งครั้งเพื่อเริ่มดูแนวโน้ม',wLevel='';if(latestWeight){if(!weights.length){wTitle='ยังไม่มีน้ำหนักใน 7 วันล่าสุด';wText=`ครั้งล่าสุดคือ ${fmt(latestWeight.date)}`}else if(diff==null){wTitle='มีข้อมูลน้ำหนักแล้ว';wText=`ค่าเฉลี่ยจาก ${weights.length} ครั้งใน 7 วันนี้ รอข้อมูลสัปดาห์ก่อนเพื่อเทียบ`}else{wText=`ค่าเฉลี่ย 7 วัน ${diff>=0?'เพิ่ม':'ลด'} ${Math.abs(diff).toFixed(1)} กก. จากสัปดาห์ก่อน`;if(diff>0&&waistRise!=null&&waistRise<.5){wTitle='น้ำหนักเพิ่ม แต่รอบเอวยังคงที่';wText+=' · ยังไม่มีหลักฐานว่าช่วงเอวขยาย อาจเป็นน้ำหรือการเปลี่ยนแปลงของมวลร่างกาย'}else if(diff>0&&waistRise!=null&&waistRise>=.5){wTitle=confirmedRise?'น้ำหนักและรอบเอวเพิ่มต่อเนื่อง':'น้ำหนักเพิ่มและเอวเริ่มขยับ';wLevel=confirmedRise?'alert':'caution';wText+=' · ดูการวัดรอบเอวยืนยันร่วมกัน'}else if(diff>0){wTitle='น้ำหนักเพิ่ม แต่ยังไม่มีรอบเอวให้เทียบ';wText+=' · บันทึกรอบเอวเพื่อแยกว่ารูปร่างเปลี่ยนหรือเป็นการแกว่งของน้ำหนัก'}else if(diff<0){wTitle='แนวโน้มน้ำหนักลดลง';wText+=waistRise!=null&&waistRise<.5?' · รอบเอวไม่ได้เพิ่ม':''}else{wTitle='น้ำหนักค่อนข้างคงที่'}}}$('weightStatusTitle').textContent=wTitle;$('weightStatusText').textContent=wText;setStatusCard('weightStatusCard',wLevel);
  $('waistStatusValue').textContent=latestWaist?`${num(latestWaist.waist).toFixed(1)} นิ้ว`:'—';let waTitle='ยังบอกไม่ได้',waText='บันทึกรอบเอวเพื่อดูว่าช่วงเอวกำลังขยายหรือไม่',waLevel='';if(latestWaist){if(waistNow==null){waTitle='ยังไม่มีรอบเอวใน 7 วันล่าสุด';waText=`ครั้งล่าสุดคือ ${fmt(latestWaist.date)}`}else if(waistRise==null){waTitle='มีข้อมูลรอบเอวแล้ว';waText='ระบบจะสร้างค่าฐานจากข้อมูลช่วง 14 วันแรก'}else if(confirmedRise){waTitle='รอบเอวเพิ่มต่อเนื่อง ควรระวัง';waLevel='alert';waText=`ค่ากลางสัปดาห์นี้สูงกว่าฐาน ${waistRise.toFixed(1)} นิ้ว และพบการเพิ่มต่อเนื่อง 2 สัปดาห์`}else if(waistRise>=1){waTitle='รอบเอวเพิ่มตั้งแต่ 1 นิ้ว วัดยืนยันอีกสัปดาห์';waLevel='caution';waText=`สูงกว่าค่าฐาน ${waistRise.toFixed(1)} นิ้ว แต่ยังไม่สรุปจากสัปดาห์เดียว`}else if(waistRise>=.5){waTitle='รอบเอวเริ่มขยับ ควรจับตา';waLevel='caution';waText=`สูงกว่าค่าฐาน ${waistRise.toFixed(1)} นิ้ว แนะนำวัดตำแหน่งเดิม 2–3 ครั้ง`}else{waTitle='รอบเอวยังคงที่';waText=`ต่างจากค่าฐาน ${waistRise>=0?'+':''}${waistRise.toFixed(1)} นิ้ว · ยังไม่ถึงเกณฑ์ 0.5 นิ้ว`}if(ratio!=null&&ratio>=.5){waLevel='alert';waTitle='รอบเอวถึงจุดที่ควรระวังด้านสุขภาพ';waText+=` · รอบเอวคิดเป็น ${(ratio*100).toFixed(0)}% ของส่วนสูง`}}$('waistStatusTitle').textContent=waTitle;$('waistStatusText').textContent=waText;setStatusCard('waistStatusCard',waLevel);
  const latest=entries.at(-1),fresh=latest&&latest.date>=dateShift(anchor,-2),priorHr=median(inWindow(entries,dateShift(anchor,-1),14).map(e=>num(e.resting_hr)).filter(Number.isFinite)),sleep=fresh?num(latest.sleep_hours):null,sore=fresh?num(latest.soreness):null,restHr=fresh?num(latest.resting_hr):null,acute=inWindow(entries,anchor,7).reduce((s,e)=>s+load(e),0),chronic=inWindow(entries,anchor,28).reduce((s,e)=>s+load(e),0)/4,acwr=chronic?acute/chronic:null;let score=0,reasons=[];if(sleep!=null&&sleep<6){score+=sleep<4?3:2;reasons.push(`นอน ${sleep} ชม.`)}if(sore!=null&&sore>=4){score+=sore>=7?2:1;reasons.push(`ปวดกล้ามเนื้อ ${sore}/10`)}if(restHr!=null&&priorHr!=null&&restHr-priorHr>=5){score+=restHr-priorHr>=8?2:1;reasons.push(`ชีพจรพักสูงกว่าปกติ ${Math.round(restHr-priorHr)}`)}if(acwr!=null&&acwr>=1.5){score+=1;reasons.push('ภาระออกกำลังเพิ่มสูง')}$('readyStatusValue').textContent=!fresh?'—':score>=3?'พักก่อน':score>=1?'เบาๆ':'พร้อม';let rTitle='ยังสรุปวันนี้ไม่ได้',rText='บันทึกการนอน อาการปวด หรือชีพจรพักของวันนี้ก่อน',rLevel='';if(fresh){if(score>=3){rTitle='วันนี้ควรพักหรือเน้นฟื้นตัว';rText=reasons.join(' · ');rLevel='alert'}else if(score>=1){rTitle='ออกได้ แต่ควรเบาลงและดูอาการ';rText=reasons.join(' · ');rLevel='caution'}else{rTitle='ร่างกายดูพร้อมตามปกติ';rText='ยังไม่พบสัญญาณเด่นจากการนอน ความล้า ชีพจรพัก และภาระการฝึก'}}$('readyStatusTitle').textContent=rTitle;$('readyStatusText').textContent=rText;setStatusCard('readyStatusCard',rLevel);
}
function renderSummary(){if(!entries.length)return;const latestWeightEntry=[...entries].reverse().find(e=>num(e.weight)!=null),anchor=iso(new Date()),current=inWindow(entries,anchor,7),previous=inWindow(entries,anchor,7,7),currentWeights=current.map(e=>num(e.weight)).filter(Number.isFinite),previousWeights=previous.map(e=>num(e.weight)).filter(Number.isFinite),t=mean(currentWeights),prev=mean(previousWeights),diff=t!=null&&prev!=null?t-prev:null,waists=current.map(e=>num(e.waist)).filter(Number.isFinite),waist=median(waists),l7=current.reduce((s,e)=>s+load(e),0),latestDelta=t!=null&&latestWeightEntry?num(latestWeightEntry.weight)-t:null;$('mWeight').textContent=latestWeightEntry?`${Number(latestWeightEntry.weight).toFixed(1)} kg`:'ยังไม่มี';$('mTrend').textContent=t!=null?`${t.toFixed(1)} kg`:'ยังไม่มีใน 7 วัน';$('mWaist').textContent=waist!=null?`${waist.toFixed(1)} นิ้ว`:'ยังไม่มีใน 7 วัน';$('mLoad').textContent=Math.round(l7);$('mWeightDelta').textContent=latestDelta!=null?`${latestDelta>=0?'+':''}${latestDelta.toFixed(1)} kg จากค่าเฉลี่ย 7 วัน`:latestWeightEntry?`ล่าสุด ${fmt(latestWeightEntry.date)}`:'เพิ่มน้ำหนักเมื่อพร้อม';$('mTrendDelta').textContent=diff==null?`คำนวณจาก ${currentWeights.length} ครั้ง · ยังไม่มีช่วงก่อนหน้าให้เทียบ`:`${diff>0?'+':''}${diff.toFixed(1)} kg เทียบ 7 วันก่อนหน้า (${currentWeights.length} vs ${previousWeights.length} ครั้ง)`}
function renderChart(){
  if(chart)chart.destroy();
  const ctx=$('weightChart'),data=entries,r=rolling(entries,'weight'),dark=document.documentElement.classList.contains('dark'),textColor=dark?'#9da9c1':'#71809d',gridColor=dark?'#27344d':'#e1e5f0';
  chart=new Chart(ctx,{
    type:'line',
    data:{
      labels:data.map(e=>fmt(e.date)),
      datasets:[
        {label:'น้ำหนักจริง',data:data.map(e=>num(e.weight)),borderColor:'rgba(129,126,255,.42)',backgroundColor:'rgba(119,116,255,.1)',pointRadius:2,borderWidth:1.5,tension:.25},
        {label:'แนวโน้ม 7 วัน',data:r,borderColor:dark?'#8582ff':'#6663e8',backgroundColor:'transparent',pointRadius:0,borderWidth:3,tension:.35}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{usePointStyle:true,boxWidth:8,color:textColor}}},
      scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7,color:textColor}},y:{grid:{color:gridColor},ticks:{color:textColor,callback:v=>v+' kg'}}}
    }
  });
}
function renderWorkoutCounts(){const now=new Date(),anchor=iso(now),weekStart=mondayOf(anchor),monthStart=iso(new Date(now.getFullYear(),now.getMonth(),1)),quarterStart=iso(new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1)),yearStart=`${now.getFullYear()}-01-01`,count=start=>entries.filter(e=>e.did_workout&&e.date>=start&&e.date<=anchor).length;$('workoutWeek').textContent=count(weekStart);$('workoutMonth').textContent=count(monthStart);$('workoutQuarter').textContent=count(quarterStart);$('workoutYear').textContent=count(yearStart);const acute=inWindow(entries,anchor,7).reduce((s,e)=>s+load(e),0),chronicWeekly=inWindow(entries,anchor,28).reduce((s,e)=>s+load(e),0)/4,ratio=chronicWeekly>0?acute/chronicWeekly:null,signal=$('trainingSignal');signal.classList.remove('caution','alert');let title='ยังประเมินไม่ได้',text='กรอกเวลาใน Heart Rate Zones ของวันที่ออกกำลังกายเพื่อสร้างฐานส่วนตัว';if(ratio!=null){if(ratio<.8){title='เบากว่าช่วงที่ผ่านมา';text='ภาระจากชีพจรใน 7 วันนี้ต่ำกว่าฐาน 28 วัน เหมาะกับช่วงผ่อน แต่ไม่ได้แปลว่าความฟิตลดลงทันที'}else if(ratio<=1.3){title='ใกล้เคียงระดับปกติของคุณ';text='ภาระจากชีพจรใน 7 วันนี้ใกล้กับระดับที่ร่างกายได้รับในช่วง 28 วันที่ผ่านมา'}else if(ratio<1.5){title='เพิ่มขึ้น ควรจับตาการฟื้นตัว';text='ภาระสูงกว่าฐานส่วนตัว ให้ดูการนอน อาการปวด และชีพจรพักร่วมด้วย';signal.classList.add('caution')}else{title='เพิ่มเร็ว ควรเบาลงหรือเพิ่มวันพัก';text='ภาระ 7 วันสูงกว่าฐานสะสมมาก ควรหลีกเลี่ยงการเร่งความหนักต่อเนื่องและดูอาการจริงของร่างกาย';signal.classList.add('alert')}}$('trainingSignalTitle').textContent=title;$('trainingSignalText').textContent=text}
function renderWaistChart(){
  if(waistChart)waistChart.destroy();
  const ctx=$('waistChart');if(!ctx)return;const data=entries,r=rollingMedian(entries,'waist'),dark=document.documentElement.classList.contains('dark'),textColor=dark?'#9da9c1':'#71809d',gridColor=dark?'#27344d':'#e1e5f0';
  waistChart=new Chart(ctx,{type:'line',data:{labels:data.map(e=>fmt(e.date)),datasets:[{label:'รอบเอวจริง',data:data.map(e=>num(e.waist)),borderColor:'rgba(43,213,160,.38)',backgroundColor:'rgba(43,213,160,.08)',pointRadius:2,borderWidth:1.5,tension:.25},{label:'ค่ากลาง 7 วัน',data:r,borderColor:dark?'#2bd5a0':'#15a879',backgroundColor:'transparent',pointRadius:0,borderWidth:3,tension:.35}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{usePointStyle:true,boxWidth:8,color:textColor}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7,color:textColor}},y:{grid:{color:gridColor},ticks:{color:textColor,callback:v=>v+' นิ้ว'}}}}});
}
function renderInsights(){const box=$('insights'),recent=inWindow(entries,iso(new Date()),7);if(!recent.length){box.innerHTML='<div class="empty">ยังไม่มีรายการใน 7 วันล่าสุด</div>';return}const e=recent.at(-1),weights=recent.map(x=>num(x.weight)).filter(Number.isFinite),t=mean(weights),items=[];if(num(e.weight)!=null&&t!=null&&e.weight-t>.35)items.push(['สูงกว่าแนวโน้ม',`ค่าล่าสุดสูงกว่าค่าเฉลี่ย 7 วัน ${(e.weight-t).toFixed(1)} kg จากน้ำหนัก ${weights.length} ครั้ง`]);if((e.soreness||0)>=5)items.push(['กล้ามเนื้อกำลังฟื้นตัว','อาการปวดค่อนข้างสูง น้ำหนักที่เด้งอาจสัมพันธ์กับของเหลวจากการฟื้นตัว']);if((e.sleep_hours||9)<6)items.push(['พักผ่อนน้อย','ข้อมูลล่าสุดนอนต่ำกว่า 6 ชั่วโมง ควรพิจารณาลดความหนัก']);if((e.bloating||0)>=2)items.push(['มีอาการบวมหรือท้องอืด','ใช้แนวโน้มหลายวันแทนรอบเอวและน้ำหนักครั้งนี้']);if(e.did_workout)items.push(['มีภาระการฝึกล่าสุด',`Edwards Load ${Math.round(load(e))} หน่วย${e.rpe?` และ RPE ${e.rpe}/10`:''}`]);if(!items.length)items.push(['สรุปจากข้อมูลล่าสุด',`มี ${recent.length} วันที่บันทึกในช่วง 7 วัน ระบบยังไม่พบเงื่อนไขที่ต้องเน้นเป็นพิเศษ`]);box.innerHTML=items.slice(0,3).map(x=>`<div class="insight"><b>${esc(x[0])} <button class="info-btn" data-info="insights">i</button></b><div class="sub">${esc(x[1])}</div></div>`).join('')}
function renderLoad(){const anchor=iso(new Date()),last=inWindow(entries,anchor,7),l=last.reduce((s,e)=>s+load(e),0),chronicTotal=inWindow(entries,anchor,28).reduce((s,e)=>s+load(e),0),chronicWeekly=chronicTotal/4,ratio=chronicWeekly>0?l/chronicWeekly:null;$('loadValue').textContent=Math.round(l)+' หน่วย';$('loadFill').style.width=Math.min(100,(ratio||0)*55)+'%';let status=l?'มีข้อมูล 7 วัน':'ยังไม่มี load',txt=l?`รวมจาก ${last.filter(e=>e.did_workout).length} session ใน 7 วันล่าสุด`:'กรอกเวลา Heart Rate Zones เพื่อเริ่มคำนวณ';if(ratio!=null){if(ratio<.8){status='ต่ำกว่าฐานสะสม'}else if(ratio<=1.3){status='ใกล้ฐานสะสม'}else if(ratio<1.5){status='สูงกว่าฐานสะสม'}else{status='เพิ่มสูงเมื่อเทียบฐาน'}txt+=` · ACWR ${ratio.toFixed(2)}`}$('loadStatus').textContent=status;$('loadExplain').textContent=txt;const zs=[1,2,3,4,5].map(z=>last.reduce((s,e)=>s+(num(e['z'+z])||0),0)),tot=zs.reduce((s,x)=>s+x,0);$('zoneSummary').innerHTML=tot?`<div class="zones">${zs.map(x=>`<span style="width:${x/tot*100}%"></span>`).join('')}</div><div class="sub">Zone 1 ${zs[0].toFixed(0)} · Zone 2 ${zs[1].toFixed(0)} · Zone 3 ${zs[2].toFixed(0)} · Zone 4 ${zs[3].toFixed(0)} · Zone 5 ${zs[4].toFixed(0)} นาที</div>`:'';renderTrainingAnalytics(anchor);renderPostWorkout()}
function renderTrainingAnalytics(anchor){
  const thisStart=mondayOf(anchor),thisEnd=dateShift(thisStart,6),prevStart=dateShift(thisStart,-7),prevEnd=dateShift(thisStart,-1),thisWeek=entries.filter(e=>e.date>=thisStart&&e.date<=thisEnd),prevWeek=entries.filter(e=>e.date>=prevStart&&e.date<=prevEnd),weekly=thisWeek.reduce((s,e)=>s+load(e),0),previous=prevWeek.reduce((s,e)=>s+load(e),0),change=previous>0?(weekly-previous)/previous:null;
  $('weeklyValue').textContent=Math.round(weekly)+' หน่วย';$('weeklyCompare').textContent=change==null?`สัปดาห์นี้ ${thisWeek.filter(e=>e.did_workout).length} session · ยังไม่มี load สัปดาห์ก่อน`:`${change>=0?'+':''}${Math.round(change*100)}% จากสัปดาห์ก่อน (${Math.round(previous)} หน่วย)`;
  const pastWeeks=[];for(let i=1;i<=6;i++){const end=dateShift(thisStart,-1-(i-1)*7);pastWeeks.push(inWindow(entries,end,7).reduce((s,e)=>s+load(e),0))}const peak=Math.max(0,...pastWeeks),drop=peak>0?(peak-weekly)/peak:null;let weeklyText=weekly?'มีข้อมูลสำหรับติดตาม volume แล้ว':'ยังไม่มีเวลาใน HR zones สัปดาห์นี้';let weeklyClass='';if(change!=null&&change>.1){weeklyText='เพิ่มเกิน 10% — ใช้เป็นสัญญาณให้ดู recovery ร่วมด้วย';weeklyClass='caution'}else if(drop!=null&&drop>=.3&&drop<=.4){weeklyText=`ลด ${Math.round(drop*100)}% จากสัปดาห์หนักสุด — ใกล้รูปแบบ deload`;weeklyClass='good'}$('weeklyStatus').textContent=weeklyText;$('weeklyStatus').className='status-line '+weeklyClass;
  const acute=inWindow(entries,anchor,7).reduce((s,e)=>s+load(e),0),chronicWeekly=inWindow(entries,anchor,28).reduce((s,e)=>s+load(e),0)/4,acwr=chronicWeekly>0?acute/chronicWeekly:null;$('acwrValue').textContent=acwr==null?'—':acwr.toFixed(2);$('acwrExplain').textContent=`Acute ${Math.round(acute)} ÷ Chronic ${Math.round(chronicWeekly)} หน่วย/สัปดาห์`;let acwrText='ยังไม่มี load ในช่วง 28 วัน';let acwrClass='';if(acwr!=null){if(acwr<.8){acwrText='ต่ำกว่าฐานภาระ 28 วัน';acwrClass='caution'}else if(acwr<=1.3){acwrText='ใกล้เคียงฐานภาระสะสม';acwrClass='good'}else if(acwr<1.5){acwrText='สูงกว่าฐานสะสม ควรดูอาการล้าร่วมด้วย';acwrClass='caution'}else{acwrText='เพิ่มสูงเมื่อเทียบฐาน ควรพิจารณาการฟื้นตัว';acwrClass='caution'}}$('acwrStatus').textContent=acwrText;$('acwrStatus').className='status-line '+acwrClass;
  const sessions=entries.filter(e=>e.did_workout&&num(e.rpe)!=null&&load(e)>0),latest=sessions.at(-1);if(!latest){$('rpeValue').textContent='—';$('rpeExplain').textContent='กรอกทั้ง HR zones และ RPE ใน session เดียวกัน';$('rpeStatus').textContent='ยังไม่มีคู่ข้อมูล';$('rpeStatus').className='status-line';return}const latestIntensity=load(latest)/sessionMinutes(latest),prior=sessions.slice(0,-1),medianIntensity=median(prior.map(e=>load(e)/sessionMinutes(e))),medianRpe=median(prior.map(e=>num(e.rpe)));$('rpeValue').textContent=`${Math.round(load(latest))} / ${latest.rpe}`;$('rpeExplain').textContent=`Edwards / RPE ล่าสุด · ${fmt(latest.date)} · ${latestIntensity.toFixed(2)} load/นาที`;let rpeText=prior.length?`เทียบ baseline ส่วนตัว ${prior.length} session`:'นี่คือ session แรก ใช้เป็น baseline เริ่มต้น',rpeClass='';if(prior.length&&latestIntensity>medianIntensity*1.15&&latest.rpe<=medianRpe-1){rpeText='ภาระชีพจรสูงกว่าปกติ แต่รู้สึกเหนื่อยน้อยลง — อาจเป็นการปรับตัวที่ดี';rpeClass='good'}else if(prior.length&&latestIntensity<medianIntensity*.85&&latest.rpe>=medianRpe+1){rpeText='ภาระชีพจรต่ำกว่าปกติ แต่รู้สึกเหนื่อยมากขึ้น — ดูการนอน ความเครียด หรืออาการป่วย';rpeClass='caution'}$('rpeStatus').textContent=rpeText;$('rpeStatus').className='status-line '+rpeClass;
}
function renderPostWorkout(){const vals=[];entries.forEach(e=>{if(!e.did_workout)return;const next=entries.find(x=>x.date===dateShift(e.date,1)),before=inWindow(entries,dateShift(e.date,-1),7),weights=before.map(x=>num(x.weight)).filter(Number.isFinite),baseline=mean(weights);if(next&&num(next.weight)!=null&&baseline!=null)vals.push({type:e.workout_type,delta:num(next.weight)-baseline,load:load(e)})});const box=$('postWorkout');if(!vals.length){box.className='empty';box.innerHTML='ยังไม่มี workout ที่มีน้ำหนักวันถัดไปและน้ำหนัก baseline ก่อนหน้า';return}const avg=mean(vals.map(v=>v.delta)),hard=vals.filter(v=>v.load>=median(vals.map(x=>x.load))),hardAvg=mean(hard.map(v=>v.delta));box.className='';box.innerHTML=`<div class="metric">${avg>=0?'+':''}${avg.toFixed(2)} kg</div><div class="sub">ค่าเฉลี่ยจาก ${vals.length} คู่ข้อมูล เทียบน้ำหนักที่มีใน 7 วันก่อน workout</div><div class="insight"><b>วันที่ load สูง</b><div class="sub">วันถัดไปเฉลี่ย ${hardAvg>=0?'+':''}${hardAvg.toFixed(2)} kg จาก ${hard.length} ครั้ง — เป็นความสัมพันธ์ ไม่ใช่ข้อพิสูจน์เหตุผล</div></div>`}
function renderCalendar(){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=iso(new Date());$('calTitle').textContent=calendarMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});const days=[];for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const date=iso(d),entry=entries.find(e=>e.date===date),isOut=d.getMonth()!==m,state=entry?(entry.did_workout?typeLabel(entry.workout_type):'วันพัก'):'';days.push(`<button class="cal-day ${isOut?'out ':''}${date===today?'today ':''}${entry?(entry.did_workout?'workout':'rest'):''}" data-cal-date="${date}" aria-label="${date}${state?' '+state:''}"><b>${d.getDate()}</b>${state?`<span class="state">${esc(state)}</span>`:''}</button>`)}$('calendarGrid').innerHTML=days.join('');$('calendarGrid').querySelectorAll('[data-cal-date]').forEach(b=>b.onclick=()=>openCalendarDate(b.dataset.calDate))}
function openCalendarDate(date){const e=entries.find(x=>x.date===date);$('entryForm').reset();$('date').value=date;if(e){const map={weight:'weight',waist:'waist',sleep_hours:'sleep',sleep_quality:'sleepQuality',soreness:'soreness',resting_hr:'restingHr',bloating:'bloating',measurement_time:'measurementTime',workout_type:'workoutType',duration_min:'duration',rpe:'rpe',z1:'z1',z2:'z2',z3:'z3',z4:'z4',z5:'z5',note:'note'};Object.entries(map).forEach(([key,id])=>{if(e[key]!=null)$(id).value=e[key]});$('didWorkout').checked=Boolean(e.did_workout)}else $('didWorkout').checked=false;$('workoutFields').classList.toggle('hide',!$('didWorkout').checked);document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='checkin'));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.page==='checkin'));$('entryEditor').classList.remove('hide');setTimeout(()=>$('entryEditor').scrollIntoView({behavior:'smooth',block:'start'}),30)}
function typeLabel(v){return({cardio:'Cardio',strength:'เวท/Strength',interval:'Interval',mixed:'ผสม',other:'อื่นๆ'})[v]||'Workout'}function esc(v){const d=document.createElement('div');d.textContent=String(v??'');return d.innerHTML}
function exportData(){const data={format:'BodySignal',version:1,exported_at:new Date().toISOString(),entries,profile};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='body-signal-'+iso(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);toast('ส่งออกข้อมูล JSON แล้ว')}
const INFO={
  personalZones:['ตั้งค่า Heart Rate Zones',`กรอกช่วงชีพจรต่ำสุดและสูงสุดของ Zone 1–5 ตามค่าที่ตั้งอยู่ในนาฬิกาหรือแอปสุขภาพของคุณ เพราะช่วง Zone ของแต่ละคนอาจไม่เท่ากัน

บันทึกเพียงครั้งเดียว ระบบจะนำช่วงที่ตั้งไว้ไปแสดงข้าง Zone ในแบบฟอร์มบันทึกทุกวัน เช่น “Zone 2 (116–134 bpm)” จากนั้นกรอกจำนวนนาทีตามที่นาฬิการายงาน

ช่วงที่ติดกันต้องไม่ซ้อนกัน และ Zone ถัดไปต้องเริ่มสูงกว่า Zone ก่อนหน้า

ระบบยังคำนวณ Edwards Load ด้วยน้ำหนัก Zone 1×1, Zone 2×2, Zone 3×3, Zone 4×4 และ Zone 5×5 การตั้งค่านี้ใช้กำหนดความหมายของแต่ละ Zone ให้ตรงกับตัวคุณ ไม่ได้แปลงข้อมูลชีพจรดิบให้อัตโนมัติ`],
  workoutCounts:['นับวันที่ออกกำลังกายอย่างไร',`นับเฉพาะวันที่มีเครื่องหมายว่า “วันนี้ออกกำลังกาย” วันละไม่เกิน 1 ครั้ง แม้วันนั้นจะออกหลายกิจกรรม

สัปดาห์นี้ = วันจันทร์ถึงวันนี้
เดือนนี้ = วันที่ 1 ของเดือนถึงวันนี้
ไตรมาสนี้ = ตั้งแต่วันแรกของไตรมาสปัจจุบันถึงวันนี้ โดย ม.ค.–มี.ค., เม.ย.–มิ.ย., ก.ค.–ก.ย. และ ต.ค.–ธ.ค.
ปีนี้ = วันที่ 1 มกราคมถึงวันนี้

วันที่ไม่มีการบันทึกจะไม่ถูกเดาว่าเป็นวันออกกำลังกาย`],
  trainingInterpretation:['แปลภาระการฝึกอย่างไร',`หน้าหลักไม่ใช้คะแนน Edwards ดิบตัดสินว่าหนักหรือเบา เพราะ 245 หน่วยของแต่ละคนมีความหมายไม่เท่ากัน ระบบจึงเทียบกับฐานส่วนตัว

Edwards Load = Zone 1×1 + Zone 2×2 + Zone 3×3 + Zone 4×4 + Zone 5×5
ภาระระยะสั้น = คะแนนรวม 7 วันล่าสุด
ฐานส่วนตัว = คะแนนรวม 28 วันล่าสุด ÷ 4
อัตราเปรียบเทียบ = ภาระระยะสั้น ÷ ฐานส่วนตัว

เกณฑ์ที่ใช้แปลข้อความ
• ต่ำกว่า 0.8 = เบากว่าช่วงที่ผ่านมา
• 0.8–1.3 = ใกล้เคียงระดับปกติ
• มากกว่า 1.3 แต่ต่ำกว่า 1.5 = เพิ่มขึ้น ควรจับตาการฟื้นตัว
• ตั้งแต่ 1.5 = เพิ่มเร็ว ควรเบาลงหรือเพิ่มวันพัก

เกณฑ์นี้ใช้สังเกตการเปลี่ยนภาระ ไม่ใช่การทำนายการบาดเจ็บ และควรดูการนอน อาการปวด ชีพจรพัก และความรู้สึกจริงร่วมด้วย`],
  simpleWeight:['น้ำหนักคำนวณอย่างไร',`ระบบไม่ตัดสินว่าอ้วนจากน้ำหนักที่เพิ่มเพียงอย่างเดียว แต่คำนวณร่วมกับรอบเอว

วิธีคำนวณ
1. ค่าเฉลี่ยปัจจุบัน = ผลรวมน้ำหนักที่บันทึกใน 7 วันล่าสุด ÷ จำนวนครั้งที่ชั่ง
2. ค่าเฉลี่ยช่วงก่อน = วิธีเดียวกัน แต่ใช้วันที่ 8–14 ย้อนหลัง
3. การเปลี่ยนแปลง = ค่าเฉลี่ยปัจจุบัน − ค่าเฉลี่ยช่วงก่อน
4. นำผลไปดูร่วมกับรอบเอวเทียบค่าฐาน

การแปลผล
• น้ำหนักเพิ่ม + เอวเพิ่มไม่ถึง 0.5 นิ้ว = ยังไม่มีหลักฐานว่าช่วงเอวขยาย
• น้ำหนักเพิ่ม + เอวเพิ่มตั้งแต่ 0.5 นิ้ว = เริ่มจับตา
• น้ำหนักและเอวเพิ่มตั้งแต่ 1 นิ้วต่อเนื่อง 2 สัปดาห์ = เตือนให้ระวัง

ระบบคำนวณจากข้อมูลเท่าที่บันทึกและไม่เติมค่าของวันที่ขาดหาย`],
  simpleWaist:['รอบเอวคำนวณอย่างไร',`ใช้หน่วยนิ้วและใช้ค่ามัธยฐานเพื่อลดผลจากค่าที่แกว่งผิดปกติ

วิธีสร้างค่าฐาน
1. นับตั้งแต่วันที่มีรอบเอวครั้งแรกไป 14 วันปฏิทิน
2. เรียงค่าทั้งหมดจากน้อยไปมาก
3. เลือกค่าตรงกลาง; ถ้ามีจำนวนคู่ ใช้ค่าเฉลี่ยของสองค่าตรงกลาง
4. ค่าฐานนี้จะไม่เลื่อนขึ้นตามข้อมูลใหม่

ค่าปัจจุบัน = มัธยฐานของรอบเอวที่มีใน 7 วันล่าสุด
ส่วนต่าง = ค่าปัจจุบัน − ค่าฐาน

• ต่ำกว่า +0.5 นิ้ว = คงที่
• +0.5 ถึงต่ำกว่า +1 นิ้ว = เริ่มจับตา
• ตั้งแต่ +1 นิ้ว = ต้องพบในสัปดาห์ปัจจุบันและสัปดาห์ก่อน จึงเตือนว่าเพิ่มต่อเนื่อง

ถ้าใส่ส่วนสูง: อัตราส่วนเอวต่อส่วนสูง = รอบเอว×2.54 ÷ ส่วนสูงเซนติเมตร และเตือนเมื่อผลตั้งแต่ 0.50`],
  simpleReady:['ความพร้อมคำนวณอย่างไร',`ใช้รายการล่าสุดที่บันทึกไม่เกิน 2 วันและรวมคะแนนสัญญาณล้า

คะแนนที่ใช้
• นอน 4–ต่ำกว่า 6 ชั่วโมง = +2
• นอนต่ำกว่า 4 ชั่วโมง = +3
• ปวดกล้ามเนื้อ 4–6/10 = +1
• ปวดตั้งแต่ 7/10 = +2
• ชีพจรพักสูงกว่าค่ากลาง 14 วัน 5–7 bpm = +1
• สูงตั้งแต่ 8 bpm = +2
• ACWR ตั้งแต่ 1.5 = +1

ผลรวม 0 = พร้อมตามปกติ
ผลรวม 1–2 = ออกได้แต่ควรเบาลง
ผลรวมตั้งแต่ 3 = ควรพักหรือเน้นฟื้นตัว

ACWR = Edwards Load 7 วัน ÷ (Edwards Load 28 วัน ÷ 4) และ Edwards Load = Zone 1×1 + Zone 2×2 + Zone 3×3 + Zone 4×4 + Zone 5×5

เป็นคำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์`],
  weight:['น้ำหนักล่าสุด','ค่าที่ชั่งล่าสุดจะแสดงคู่กับระยะห่างจากแนวโน้ม 7 วัน ตัวเลขวันนี้อาจเปลี่ยนจากน้ำ อาหาร โซเดียม การขับถ่าย และเวลาในการชั่ง จึงไม่ใช้ตัดสินไขมันจากวันเดียว'],
  trend:['แนวโน้ม 7 วัน','ใช้เฉพาะข้อมูลที่อยู่ใน 7 วันปฏิทินล่าสุดและคำนวณจากจำนวนที่มี แม้มีเพียง 1 ครั้งก็แสดงค่า พร้อมบอกจำนวนครั้งเสมอ การเปรียบเทียบจะเกิดขึ้นเมื่อช่วง 7 วันก่อนหน้ามีข้อมูลอย่างน้อย 1 ครั้ง'],
  waist:['รอบเอวรายสัปดาห์','ใช้ค่ามัธยฐาน (median) จากข้อมูลเท่าที่มีใน 7 วันปฏิทินล่าสุด หากมีหนึ่งครั้งจะแสดงค่านั้น หากมีหลายครั้งจะเรียงจากน้อยไปมากแล้วเลือกค่ากลางเพื่อลดผลจากค่าที่แกว่งผิดปกติ'],
  trainingLoad:['Training load','ใช้ Edwards summated zone load: นาที Zone 1×1 + Zone 2×2 + Zone 3×3 + Zone 4×4 + Zone 5×5 ตัวอย่าง Zone 1 จำนวน 7 นาทีและ Zone 2 จำนวน 21 นาที = 7 + 42 = 49 หน่วย ค่านี้ใช้เปรียบเทียบกับตัวคุณเอง ไม่ควรเทียบกับคนอื่น'],
  trendChart:['กราฟน้ำหนักคำนวณอย่างไร',`จุดบาง = น้ำหนักจริงของวันที่บันทึก

เส้นสีเขียว ณ วันที่ใด = ผลรวมน้ำหนักที่มีตั้งแต่วันนั้นย้อนหลังรวม 7 วันปฏิทิน ÷ จำนวนครั้งที่ชั่งในช่วงนั้น

ตัวอย่าง: ภายใน 7 วันมี 65.0, 65.4 และ 65.2 กก.
แนวโน้ม = (65.0 + 65.4 + 65.2) ÷ 3 = 65.2 กก.

ระบบไม่ถือว่าวันที่ไม่ได้ชั่งเป็นศูนย์ และไม่ดึงข้อมูลเก่ากว่า 7 วันมาเติม`],
  waistChart:['กราฟรอบเอวคำนวณอย่างไร',`จุดบาง = รอบเอวจริงของวันที่วัด หน่วยนิ้ว

เส้นสีเขียว ณ วันที่ใด = ค่ามัธยฐานของรอบเอวที่มีตั้งแต่วันนั้นย้อนหลังรวม 7 วันปฏิทิน

ตัวอย่าง: มีค่า 32.0, 32.8 และ 32.2 นิ้ว
เรียงเป็น 32.0, 32.2, 32.8 จึงได้ค่ากลาง 32.2 นิ้ว

ถ้ามีจำนวนข้อมูลเป็นเลขคู่ จะเฉลี่ยสองค่าตรงกลาง วิธีนี้ช่วยลดผลจากค่าที่วัดสูงหรือต่ำผิดปกติเพียงครั้งเดียว`],
  insights:['คำอธิบายผลวิเคราะห์','ระบบตรวจเงื่อนไขจากข้อมูลล่าสุด เช่น น้ำหนักสูงกว่าแนวโน้มเกิน 0.35 กก., soreness ตั้งแต่ 5, นอนต่ำกว่า 6 ชั่วโมง หรือบวมระดับ 2 ขึ้นไป สิ่งเหล่านี้เป็นสัญญาณประกอบ ไม่ใช่การวินิจฉัยหรือการพิสูจน์เหตุและผล'],
  loadBaseline:['ภาระ 7 วันเทียบ baseline','รวม Edwards Load ใน 7 วันล่าสุด ส่วนฐานสะสมคือ load รวม 28 วันล่าสุดหาร 4 ให้เป็นค่าเฉลี่ยต่อสัปดาห์ ระบบคำนวณจากข้อมูลเท่าที่มี หากวันที่ไม่ได้บันทึกจะถือว่าไม่มี load ที่ทราบ ไม่ได้เดาค่าเพิ่ม'],
  postWorkout:['ผลหลังออกกำลังกาย','จับคู่ workout กับน้ำหนักของวันถัดไปแบบวันที่ตรงกัน แล้วลบค่าเฉลี่ยน้ำหนักเท่าที่มีใน 7 วันก่อน workout แสดงผลตั้งแต่มี 1 คู่ และบอกจำนวนคู่ข้อมูลเพื่อให้เห็นว่าข้อสรุปยังอาศัยข้อมูลมากหรือน้อย'],
  weeklyLoad:['Weekly Edwards Load','รวม Edwards Load ตั้งแต่วันจันทร์ถึงอาทิตย์ของสัปดาห์นั้น แล้วเทียบกับสัปดาห์ก่อน ระบบแจ้งเมื่อเพิ่มเกิน 10% และตรวจรูปแบบ deload ที่ลด 30–40% จากสัปดาห์หนักสุดใน 6 สัปดาห์ก่อน ตัวเลข 10% และ 30–40% เป็นแนวทางวางแผน ไม่ใช่เส้นแบ่งการบาดเจ็บที่พิสูจน์แน่นอน'],
  acwr:['ACWR','Acute คือ Edwards Load รวม 7 วันล่าสุด Chronic คือ Edwards Load รวม 28 วันล่าสุดหาร 4 จากนั้น Acute ÷ Chronic ระบบแสดงช่วงอ้างอิง <0.8, 0.8–1.3, 1.3–1.5 และ ≥1.5 แต่ใช้เพื่อมองการเปลี่ยนภาระเท่านั้น ไม่ควรเรียกว่าโซนปลอดภัยหรือใช้ทำนายการบาดเจ็บโดยลำพัง'],
  loadRpe:['Edwards เทียบ RPE','เปรียบเทียบ load ต่อนาทีกับ RPE ของ session ล่าสุดเทียบค่ามัธยฐานส่วนตัว หาก load สูงกว่าปกติแต่ RPE ต่ำลง อาจสอดคล้องกับการปรับตัวที่ดี หาก load ต่ำลงแต่ RPE สูงขึ้น อาจสัมพันธ์กับการนอน ความเครียด หรืออาการป่วย ทั้งสองกรณีเป็นสัญญาณให้สังเกต ไม่ใช่ข้อวินิจฉัย'],
  calendar:['ปฏิทินกิจกรรม','สีเขียวคือวันที่บันทึกว่าออกกำลังกาย สีเทาคือวันที่มีข้อมูลแต่เป็นวันพัก และสีขาวคือยังไม่มีข้อมูล กดวันที่ใดก็ได้เพื่อเปิดแบบบันทึกของวันนั้น หากมีข้อมูลอยู่แล้ว ระบบจะเติมค่าเดิมให้แก้ไขและบันทึกทับตามวันที่'],
  heightProfile:['ทำไมกรอกส่วนสูงครั้งเดียว','ส่วนสูงใช้คำนวณอัตราส่วนรอบเอวต่อส่วนสูง โดยนำรอบเอวหน่วยนิ้วคูณ 2.54 แล้วหารด้วยส่วนสูงเซนติเมตร ระบบเก็บค่านี้แยกจากบันทึกรายวัน จึงกรอกเพียงครั้งเดียวและกลับมาแก้ไขเมื่อข้อมูลเปลี่ยนเท่านั้น'],
  waistRisk:['เกณฑ์สุขภาพรอบเอว','เก็บไว้เป็นข้อมูลส่วนตัวแบบกรอกครั้งเดียว เพื่อใช้อธิบายจุดอ้างอิงรอบเอวสำหรับผู้หญิงและผู้ชาย เกณฑ์หลักของแอปยังคงดูว่ารอบเอวของคุณเพิ่มจากค่าฐาน 0.5 หรือ 1 นิ้วหรือไม่ และไม่ใช้เพศเปลี่ยนค่าฐานส่วนตัว'],
  weightInput:['วิธีชั่งน้ำหนัก','ควรชั่งเวลาเดิมทุกวัน โดยเฉพาะตอนเช้าหลังเข้าห้องน้ำ ก่อนกินหรือดื่ม วางเครื่องชั่งบนพื้นแข็งและใช้เครื่องเดิม เพื่อให้การเปรียบเทียบสม่ำเสมอ'],
  waistInput:['วิธีวัดรอบเอว','วัดตำแหน่งเดิมทุกครั้ง ยืนตัวตรง วางสายวัดแนบรอบเอวโดยไม่รัด และอ่านค่าหลังหายใจออกตามปกติ แนะนำวัด 2–3 ครั้งแล้วใช้ค่ากลาง'],
  sleepQuality:['ระดับคุณภาพการนอน','1 แย่มาก: ตื่นบ่อยหรือไม่สดชื่น · 2 ไม่ค่อยดี · 3 พอใช้ · 4 ดี: หลับค่อนข้างต่อเนื่อง · 5 ดีมาก: หลับเต็มอิ่มและตื่นสดชื่น เป็นคะแนนความรู้สึกของคุณเอง'],
  soreness:['ระดับปวดกล้ามเนื้อ','0 ไม่ปวด · 1–3 เล็กน้อย ใช้ชีวิตปกติ · 4–6 ปานกลาง รู้สึกชัดเวลาเคลื่อนไหว · 7–8 มาก กระทบการเคลื่อนไหว · 9–10 รุนแรง หากปวดผิดปกติ บวมมาก หรือใช้งานไม่ได้ควรหยุดและปรึกษาผู้เชี่ยวชาญ'],
  restingHr:['Resting heart rate','วัดขณะพักจริง โดยเหมาะที่สุดคือตอนเช้าก่อนลุกจากเตียง ควรดูเทียบ baseline ส่วนตัวหลายวัน การสูงขึ้นวันเดียวอาจสัมพันธ์กับความเครียด นอนน้อย เจ็บป่วย หรือการฟื้นตัวยังไม่เต็มที่'],
  bloating:['ระดับท้องอืด/บวมน้ำ','0 ไม่มี · 1 สังเกตได้นิดหน่อย · 2 รู้สึกชัดหรือเสื้อผ้าแน่นขึ้น · 3 มากและรบกวนชีวิตประจำวัน ใช้ช่วยอธิบายน้ำหนักและรอบเอวที่เด้งชั่วคราว'],
  measurementTime:['ช่วงเวลาที่ชั่ง','น้ำหนักระหว่างวันเปลี่ยนได้จากอาหารและน้ำ การระบุว่าเป็นเช้าหรือเวลาอื่นช่วยเตือนว่าค่าอาจเทียบกันได้ไม่เต็มที่ ระบบแนะนำให้ใช้ค่าตอนเช้าเป็นหลัก'],
  workoutType:['ประเภทการออกกำลังกาย','Cardio คือกิจกรรมต่อเนื่อง เช่น เดิน วิ่ง ปั่น · Strength คือเวทหรือแรงต้าน · Interval/HIIT คือช่วงหนักสลับพัก · ผสมคือมีหลายรูปแบบใน session เดียว การแยกประเภทช่วยค้นหารูปแบบน้ำหนักหลังฝึกในอนาคต'],
  rpe:['RPE 1–10','1–2 เบามาก · 3–4 เบาและคุยได้ · 5–6 ปานกลาง · 7–8 หนัก พูดเป็นวลีสั้น · 9 หนักมาก · 10 เต็มความสามารถ ให้คะแนนจากความรู้สึกของทั้ง session หลังออกเสร็จ'],
  z1:['Heart Rate Zone 1','ความเข้มต่ำมาก ใช้วอร์มอัป คูลดาวน์ และ active recovery โดยทั่วไปหายใจสบายและสนทนาได้เต็มประโยค ให้ใส่นาทีตามโซนที่อุปกรณ์ของคุณรายงาน'],
  z2:['Heart Rate Zone 2','ความเข้มเบาถึงปานกลาง เน้นฐาน aerobic ควบคุมได้นานและยังพูดคุยได้ แต่คำจำกัดความของแต่ละนาฬิกาอาจต่างกัน ให้ใช้ค่าโซนจากอุปกรณ์เดิมอย่างสม่ำเสมอ'],
  z3:['Heart Rate Zone 3','ความเข้ม aerobic ปานกลางถึงค่อนข้างหนัก หายใจชัดขึ้นและพูดได้เป็นประโยคสั้น มีน้ำหนัก 3 เท่าในการคำนวณ load'],
  z4:['Heart Rate Zone 4','ใกล้ threshold รู้สึกหนัก รักษาได้เป็นช่วงจำกัดและพูดได้ไม่กี่คำ มีน้ำหนัก 4 เท่าในการคำนวณ load'],
  z5:['Heart Rate Zone 5','ความเข้มสูงสุดหรือใกล้สูงสุด ใช้ได้ช่วงสั้นและต้องการการฟื้นตัวมาก มีน้ำหนัก 5 เท่าในการคำนวณ load'],
  localData:['การเก็บข้อมูลบนเครื่อง','รายการทั้งหมดเก็บในพื้นที่ของเบราว์เซอร์บนอุปกรณ์นี้เท่านั้น แอปไม่มีบัญชีและไม่อัปโหลดข้อมูลสุขภาพ ปุ่มลูกศรขึ้นใช้ส่งออกข้อมูลทั้งหมดเป็นไฟล์ JSON ส่วนปุ่มลูกศรลงใช้นำไฟล์ JSON แบบเดียวกันกลับเข้าแอป ไฟล์นี้รวมทั้งประวัติการบันทึก ข้อมูลส่วนตัว และ Heart Rate Zones']
};
function openInfo(key){const item=INFO[key]||['รายละเอียด','ยังไม่มีคำอธิบายสำหรับหัวข้อนี้'];$('infoTitle').textContent=item[0];$('infoContent').textContent=item[1];$('infoDialog').showModal()}
function downloadJson(data,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function backupData(){downloadJson({app:'BodySignal',version:1,exported_at:new Date().toISOString(),entries:demo?[]:entries,profile},'bodysignal-backup-'+iso(new Date())+'.json');toast('สร้างไฟล์สำรองแล้ว')}
async function restoreData(e){const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.entries)||typeof data.profile!=='object')throw new Error('รูปแบบไม่ถูกต้อง');entries=data.entries;profile=data.profile||{};demo=false;persist();$('setupNotice').classList.add('hide');render();fillProfile();toast(`นำเข้า ${entries.length} รายการแล้ว`)}catch(err){toast('นำเข้าไม่สำเร็จ: ไฟล์ไม่ถูกต้อง')}finally{e.target.value=''}}
async function installApp(){if(!installPrompt){toast('ใช้เมนูเบราว์เซอร์ “เพิ่มไปยังหน้าจอหลัก”');return}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').classList.add('hide')}
init();
