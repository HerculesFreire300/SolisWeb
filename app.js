var fabBtn=document.getElementById('fab-timer');
if(window.innerWidth<=860&&fabBtn){fabBtn.style.display='flex';fabBtn.addEventListener('click',function(){navigate('timer');});}
// ===== STORAGE =====
var DB = {
  data: { subjects:[], sessions:[], theme:'theme-dark', streakDays:[], weekBlocks:{}, planPts:{}, planConfig:null, ltConfig:null, ltSubWeights:{} },
  load: function(){ try{ var s=localStorage.getItem('sf3'); if(s) this.data=JSON.parse(s); }catch(e){} },
  save: function(){ try{ localStorage.setItem('sf3',JSON.stringify(this.data)); }catch(e){} }
};

// ===== UTILS =====
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function fmtTime(m){ return Math.floor(m/60)+'h '+( m%60)+'m'; }
function fmtDate(d){ if(!d) return ''; var p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function getVar(n){ return getComputedStyle(document.body).getPropertyValue(n).trim(); }

var _toastT;
function toast(msg,type){
  var el=document.getElementById('toast');
  el.className='toast '+(type||'info');
  el.textContent=msg;
  el.classList.remove('hidden');
  clearTimeout(_toastT);
  _toastT=setTimeout(function(){ el.classList.add('hidden'); },3000);
}

var _confirmCb=null;
function confirm2(title,body,cb){
  document.getElementById('modal-confirm-title').textContent=title;
  document.getElementById('modal-confirm-body').textContent=body;
  document.getElementById('modal-confirm-overlay').classList.remove('hidden');
  _confirmCb=cb;
}
function closeConfirm(){ document.getElementById('modal-confirm-overlay').classList.add('hidden'); }

// ===== SUBJECTS =====
var COLORS=['#5b8ef5','#7c5bf5','#34c985','#f5a623','#f55b5b','#00d4ff','#ff6b9d','#a0f563','#ff9063','#c863f5','#63f5e8','#fbbf24'];
var selColor=COLORS[0];

function getSub(id){ return DB.data.subjects.find(function(s){ return s.id===id; }); }

function minsPerSub(){
  var m={};
  DB.data.subjects.forEach(function(s){ m[s.id]=0; });
  DB.data.sessions.forEach(function(s){ m[s.sid]=(m[s.sid]||0)+s.mins; });
  return m;
}

function weekMins(){
  var ago=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  return DB.data.sessions.filter(function(s){ return s.date>=ago; }).reduce(function(a,s){ return a+s.mins; },0);
}

function renderColorOptions(){
  var c=document.getElementById('color-options');
  c.innerHTML=COLORS.map(function(col,i){
    return '<div class="color-dot'+(i===0?' selected':'')+'" style="background:'+col+'" data-color="'+col+'"></div>';
  }).join('');
  c.querySelectorAll('.color-dot').forEach(function(d){
    d.addEventListener('click',function(){
      c.querySelectorAll('.color-dot').forEach(function(x){ x.classList.remove('selected'); });
      d.classList.add('selected');
      selColor=d.dataset.color;
    });
  });
}

function renderSubjects(){
  var list=document.getElementById('subjects-list');
  var cnt=DB.data.subjects.length;
  document.getElementById('subject-count').textContent=cnt;
  document.getElementById('subject-limit-hint').textContent=cnt>=12?'Limite de 12 matérias atingido.':'';
  if(!cnt){ list.innerHTML='<p class="empty-hint">Nenhuma matéria adicionada.</p>'; return; }
  var mps=minsPerSub();
  list.innerHTML=DB.data.subjects.map(function(s){
    return '<div class="subject-item">'+
      '<div class="subject-color" style="background:'+s.color+'"></div>'+
      '<div class="subject-name">'+s.name+'</div>'+
      '<div class="subject-time">'+fmtTime(mps[s.id]||0)+'</div>'+
      '<div class="subject-actions">'+
        '<button class="subject-btn edit" data-id="'+s.id+'"><i class="fa-solid fa-pen"></i></button>'+
        '<button class="subject-btn del" data-id="'+s.id+'"><i class="fa-solid fa-trash"></i></button>'+
      '</div></div>';
  }).join('');
  list.querySelectorAll('.subject-btn.edit').forEach(function(b){
    b.addEventListener('click',function(){ editSubject(b.dataset.id); });
  });
  list.querySelectorAll('.subject-btn.del').forEach(function(b){
    b.addEventListener('click',function(){ deleteSubject(b.dataset.id); });
  });
}

function addSubject(){
  var inp=document.getElementById('new-subject-name');
  var name=inp.value.trim();
  if(!name){ toast('Digite o nome da matéria.','error'); return; }
  if(DB.data.subjects.length>=12){ toast('Limite de 12 matérias atingido.','error'); return; }
  if(DB.data.subjects.find(function(s){ return s.name.toLowerCase()===name.toLowerCase(); })){ toast('Matéria já existe.','error'); return; }
  DB.data.subjects.push({id:uid(),name:name,color:selColor});
  DB.save(); inp.value='';
  renderSubjects(); syncSelects(); syncFilterSub();
  toast('"'+name+'" adicionada!','success');
}

function editSubject(id){
  var s=getSub(id); if(!s) return;
  var n=prompt('Novo nome:',s.name);
  if(!n||!n.trim()) return;
  s.name=n.trim(); DB.save();
  renderSubjects(); syncSelects();
  toast('Matéria renomeada.','success');
}

function deleteSubject(id){
  var s=getSub(id);
  confirm2('Excluir matéria','Deseja excluir "'+s.name+'"?',function(){
    DB.data.subjects=DB.data.subjects.filter(function(x){ return x.id!==id; });
    DB.save(); renderSubjects(); syncSelects(); syncFilterSub();
    toast('Matéria excluída.','info');
  });
}

// ===== SESSIONS =====
function addSession(sid,mins,date,mode){
  var s=getSub(sid);
  DB.data.sessions.push({id:uid(),sid:sid,sname:s?s.name:'—',mins:mins,date:date,mode:mode});
  var days=DB.data.streakDays||[];
  if(days.indexOf(date)<0){ days.push(date); DB.data.streakDays=days; }
  DB.save();
}

function calcStreak(){
  var days=DB.data.streakDays||[]; if(!days.length) return 0;
  var sorted=days.slice().sort().reverse();
  var t=todayStr(), y=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(sorted[0]!==t&&sorted[0]!==y) return 0;
  var streak=1;
  for(var i=1;i<sorted.length;i++){
    var diff=(new Date(sorted[i-1])-new Date(sorted[i]))/86400000;
    if(diff===1) streak++; else break;
  }
  return streak;
}

function todaySessions(){ var t=todayStr(); return DB.data.sessions.filter(function(s){ return s.date===t; }); }

function renderTodaySessions(){
  var cont=document.getElementById('today-sessions');
  var sess=todaySessions().slice().reverse();
  var total=sess.reduce(function(a,s){ return a+s.mins; },0);
  document.getElementById('today-total').textContent=fmtTime(total);
  if(!sess.length){ cont.innerHTML='<p class="empty-hint">Nenhuma sessão hoje.</p>'; return; }
  cont.innerHTML=sess.map(function(s){
    var sub=getSub(s.sid); var color=sub?sub.color:'#888'; var name=sub?sub.name:s.sname;
    return '<div class="session-item">'+
      '<div class="session-dot" style="background:'+color+'"></div>'+
      '<div class="session-name">'+name+'</div>'+
      '<div class="session-time">'+fmtTime(s.mins)+'</div>'+
      '<button class="session-del" data-id="'+s.id+'"><i class="fa-solid fa-xmark"></i></button>'+
      '</div>';
  }).join('');
  updateGoalBar();
  cont.querySelectorAll('.session-del').forEach(function(b){
    b.addEventListener('click',function(){
      DB.data.sessions=DB.data.sessions.filter(function(x){ return x.id!==b.dataset.id; });
      DB.save(); renderTodaySessions(); refreshDashboard();
      toast('Sessão removida.','info');
    });
  });
}

// ===== HISTORY =====
var hFilter={sid:'',from:'',to:''};
function renderHistory(){
  var all=DB.data.sessions.filter(function(s){
    if(hFilter.sid&&s.sid!==hFilter.sid) return false;
    if(hFilter.from&&s.date<hFilter.from) return false;
    if(hFilter.to&&s.date>hFilter.to) return false;
    return true;
  }).sort(function(a,b){ return b.date.localeCompare(a.date)||b.id.localeCompare(a.id); });
  var tbody=document.getElementById('history-body');
  var empty=document.getElementById('history-empty');
  if(!all.length){ tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML=all.map(function(s){
    var sub=getSub(s.sid); var color=sub?sub.color:'#aaa'; var name=sub?sub.name:s.sname;
    return '<tr>'+
      '<td>'+fmtDate(s.date)+'</td>'+
      '<td><span class="hist-dot" style="background:'+color+'"></span>'+name+'</td>'+
      '<td><strong>'+fmtTime(s.mins)+'</strong></td>'+
      '<td><span class="mode-badge'+(s.mode==='manual'?' manual':'')+'">'+( s.mode==='manual'?'Manual':'Cronômetro')+'</span></td>'+
      '<td><button class="btn-del-row" data-id="'+s.id+'"><i class="fa-solid fa-trash"></i></button></td>'+
      '</tr>';
  }).join('');
  tbody.querySelectorAll('.btn-del-row').forEach(function(b){
    b.addEventListener('click',function(){
      confirm2('Excluir sessão','Remover esta sessão?',function(){
        DB.data.sessions=DB.data.sessions.filter(function(x){ return x.id!==b.dataset.id; });
        DB.save(); renderHistory(); renderTodaySessions();
        toast('Sessão removida.','info');
      });
    });
  });
}

function syncFilterSub(){
  var sel=document.getElementById('filter-subject');
  var v=sel.value;
  sel.innerHTML='<option value="">Todas as matérias</option>'+
    DB.data.subjects.map(function(s){ return '<option value="'+s.id+'">'+s.name+'</option>'; }).join('');
  sel.value=v;
}

function syncSelects(){
  ['timer-subject','manual-subject'].forEach(function(id){
    var sel=document.getElementById(id); if(!sel) return;
    var v=sel.value;
    sel.innerHTML='<option value="">— Selecione a matéria —</option>'+
      DB.data.subjects.map(function(s){ return '<option value="'+s.id+'">'+s.name+'</option>'; }).join('');
    if(v) sel.value=v;
  });
}

function exportCSV(){
  if(!DB.data.sessions.length){ toast('Sem sessões para exportar.','error'); return; }
  var rows=[['Data','Matéria','Horas','Minutos','Total Min','Modo']];
  DB.data.sessions.slice().sort(function(a,b){ return a.date.localeCompare(b.date); }).forEach(function(s){
    var sub=getSub(s.sid);
    rows.push([fmtDate(s.date),sub?sub.name:s.sname,Math.floor(s.mins/60),s.mins%60,s.mins,s.mode==='manual'?'Manual':'Cronômetro']);
  });
  var csv=rows.map(function(r){ return r.map(function(c){ return '"'+c+'"'; }).join(','); }).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='studyflow_'+todayStr()+'.csv'; a.click();
  toast('CSV exportado!','success');
}

// ===== DASHBOARD =====
var MOTIV=[
  'A disciplina é a ponte entre objetivos e realizações.',
  'Cada hora de estudo é um tijolo na construção da sua aprovação.',
  'Você está mais perto da aprovação do que estava ontem. Continue.',
  'É justamente nas matérias mais difíceis que seu crescimento acontece.',
  'Todo concurseiro aprovado foi um estudante que não desistiu.',
  'Estude como se sua aprovação dependesse só de você — porque depende.',
  'Pequenos avanços diários criam grandes resultados.',
  'A aprovação pertence a quem transforma disciplina em hábito.',
  'Foque no processo. A aprovação é consequência da disciplina diária.',
  'A diferença entre aprovado e reprovado está nas horas difíceis.'
];

var chartInst={};
function destroyCh(k){ if(chartInst[k]){ chartInst[k].destroy(); delete chartInst[k]; } }

function refreshDashboard(){
  var h=new Date().getHours();
  document.getElementById('dash-greeting').textContent=(h<12?'Bom dia':h<18?'Boa tarde':'Boa noite')+'!';
  var total=DB.data.sessions.reduce(function(a,s){ return a+s.mins; },0);
  document.getElementById('stat-total').textContent=fmtTime(total);
  document.getElementById('stat-week').textContent=fmtTime(weekMins());
  var mps=minsPerSub();
  var subs=DB.data.subjects.filter(function(s){ return (mps[s.id]||0)>0; });
  if(subs.length){
    var sorted=subs.slice().sort(function(a,b){ return (mps[b.id]||0)-(mps[a.id]||0); });
    var best=sorted[0],weak=sorted[sorted.length-1];
    document.getElementById('stat-best').textContent=best.name;
    document.getElementById('stat-weak').textContent=weak.name;
    var bPct=total?Math.round(mps[best.id]/total*100):0;
    var wPct=total?Math.round(mps[weak.id]/total*100):0;
    document.getElementById('msg-best').textContent='Parabéns! Você está se dedicando muito em '+best.name+' ('+bPct+'% do tempo total).';
    document.getElementById('msg-weak').textContent=best.id===weak.id?'Diversifique seus estudos!':weak.name+' está com '+wPct+'% do tempo. Aumente o foco nela.';
  } else {
    document.getElementById('stat-best').textContent='—';
    document.getElementById('stat-weak').textContent='—';
    document.getElementById('msg-best').textContent='Registre seus estudos para ver insights.';
    document.getElementById('msg-weak').textContent='Adicione matérias e comece a estudar.';
  }
  document.getElementById('msg-motive').textContent='"'+MOTIV[Math.floor(Math.random()*MOTIV.length)]+'"';
  var sc=calcStreak();
  document.getElementById('streak-count').textContent=sc;
  document.getElementById('streak-top').textContent=sc;
  renderRanking(); renderCharts(); renderHeatmap();
}

function renderRanking(){
  var mps=minsPerSub();
  var total=Object.values(mps).reduce(function(a,b){ return a+b; },0);
  var sorted=DB.data.subjects.map(function(s){ return {s:s,m:mps[s.id]||0}; }).sort(function(a,b){ return b.m-a.m; });
  var el=document.getElementById('ranking-list');
  if(!sorted.length){ el.innerHTML='<p class="empty-hint">Adicione matérias e registre estudos.</p>'; return; }
  el.innerHTML=sorted.map(function(item,i){
    var pct=total?Math.round(item.m/total*100):0;
    var pc=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    return '<div class="rank-item">'+
      '<div class="rank-pos '+pc+'">#'+(i+1)+'</div>'+
      '<div class="rank-name">'+item.s.name+'</div>'+
      '<div class="rank-bar-wrap"><div class="rank-bar" style="width:'+pct+'%;background:'+item.s.color+'"></div></div>'+
      '<div class="rank-time">'+fmtTime(item.m)+' <span style="color:var(--text-muted)">('+pct+'%)</span></div>'+
      '</div>';
  }).join('');
}

function renderCharts(){
  var mps=minsPerSub(), subs=DB.data.subjects;
  var tC=getVar('--text-secondary'), gC=getVar('--border'), acc=getVar('--accent'), suc=getVar('--success');

  // PIE
  destroyCh('pie');
  var pSubs=subs.filter(function(s){ return (mps[s.id]||0)>0; });
  var pCtx=document.getElementById('chart-pie'), pEmp=document.getElementById('pie-empty');
  if(pSubs.length){
    pCtx.style.display=''; pEmp.style.display='none';
    chartInst.pie=new Chart(pCtx,{type:'doughnut',
      data:{labels:pSubs.map(function(s){return s.name;}),
        datasets:[{data:pSubs.map(function(s){return mps[s.id];}),
          backgroundColor:pSubs.map(function(s){return s.color+'cc';}),
          borderColor:pSubs.map(function(s){return s.color;}),borderWidth:2,hoverOffset:10}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
        plugins:{legend:{position:'right',labels:{color:tC,font:{family:"'Sora',sans-serif",size:11},padding:14,boxWidth:12}},
          tooltip:{callbacks:{label:function(c){var t=c.dataset.data.reduce(function(a,b){return a+b;},0);return ' '+fmtTime(c.raw)+' ('+Math.round(c.raw/t*100)+'%)';}}}}}});
  } else { pCtx.style.display='none'; pEmp.style.display='flex'; }

  // BAR
  destroyCh('bar');
  var bCtx=document.getElementById('chart-bar'), bEmp=document.getElementById('bar-empty');
  var bSorted=subs.slice().sort(function(a,b){return (mps[b.id]||0)-(mps[a.id]||0);});
  if(bSorted.some(function(s){return (mps[s.id]||0)>0;})){
    bCtx.style.display=''; bEmp.style.display='none';
    chartInst.bar=new Chart(bCtx,{type:'bar',
      data:{labels:bSorted.map(function(s){return s.name.length>12?s.name.slice(0,12)+'…':s.name;}),
        datasets:[{data:bSorted.map(function(s){return +((mps[s.id]||0)/60).toFixed(2);}),
          backgroundColor:bSorted.map(function(s){return s.color+'aa';}),
          borderColor:bSorted.map(function(s){return s.color;}),borderWidth:2,borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return ' '+fmtTime(Math.round(c.raw*60));}}}},
        scales:{x:{grid:{color:gC},ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"}}},
          y:{grid:{color:gC},ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"},callback:function(v){return v+'h';}}}}}});
  } else { bCtx.style.display='none'; bEmp.style.display='flex'; }

  // LINE
  destroyCh('line');
  var lCtx=document.getElementById('chart-line');
  var days=[],labels=[];
  for(var i=13;i>=0;i--){ var d=new Date(Date.now()-i*86400000); days.push(d.toISOString().slice(0,10)); labels.push(d.getDate()+'/'+(d.getMonth()+1)); }
  var lData=days.map(function(day){ return +(DB.data.sessions.filter(function(s){return s.date===day;}).reduce(function(a,s){return a+s.mins;},0)/60).toFixed(2); });
  chartInst.line=new Chart(lCtx,{type:'line',
    data:{labels:labels,datasets:[{data:lData,borderColor:acc,backgroundColor:acc+'22',fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:acc,pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return ' '+fmtTime(Math.round(c.raw*60));}}}},
      scales:{x:{grid:{color:gC},ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"}}},
        y:{grid:{color:gC},min:0,ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"},callback:function(v){return v+'h';}}}}}});

  // RADAR
  destroyCh('radar');
  var rCtx=document.getElementById('chart-radar'), rEmp=document.getElementById('radar-empty');
  var rSubs=subs.filter(function(s){return (mps[s.id]||0)>0;});
  if(rSubs.length>=3){
    rCtx.style.display=''; rEmp.style.display='none';
    var maxM=Math.max.apply(null,rSubs.map(function(s){return mps[s.id]||0;}));
    chartInst.radar=new Chart(rCtx,{type:'radar',
      data:{labels:rSubs.map(function(s){return s.name.length>10?s.name.slice(0,10)+'…':s.name;}),
        datasets:[{data:rSubs.map(function(s){return Math.round((mps[s.id]||0)/maxM*100);}),
          backgroundColor:acc+'33',borderColor:acc,borderWidth:2,pointBackgroundColor:acc,pointRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return ' '+c.raw+'%';}}}},
        scales:{r:{grid:{color:gC},angleLines:{color:gC},ticks:{display:false},
          pointLabels:{color:tC,font:{size:10,family:"'Sora',sans-serif"}},min:0,max:100}}}});
  } else { rCtx.style.display='none'; rEmp.style.display='flex'; }
}

// ===== TIMER =====
var tmrStart=null,tmrElapsed=0,tmrRunning=false,tmrPaused=false,tmrRaf=null;
function fmtMs(ms){ var s=Math.floor(ms/1000); return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor((s%3600)/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function tmrTick(){ if(!tmrRunning) return; document.getElementById('clock-display').textContent=fmtMs(tmrElapsed+(Date.now()-tmrStart)); tmrRaf=requestAnimationFrame(tmrTick); }

function tmrStartFn(){
  var sid=document.getElementById('timer-subject').value;
  if(!sid){ toast('Selecione a matéria.','error'); return; }
  tmrStart=Date.now(); tmrRunning=true; tmrPaused=false;
  document.getElementById('clock-display').classList.add('running');
  document.getElementById('btn-start').classList.add('hidden');
  document.getElementById('btn-pause').classList.remove('hidden');
  document.getElementById('btn-stop').classList.remove('hidden');
  document.getElementById('timer-status').textContent='⏱ Sessão em andamento...';
  document.getElementById('btn-pause').innerHTML='<i class="fa-solid fa-pause"></i> Pausar';
  tmrRaf=requestAnimationFrame(tmrTick);
}
function tmrPauseFn(){
  if(!tmrRunning){ tmrStartFn(); return; }
  tmrElapsed+=Date.now()-tmrStart; tmrRunning=false; tmrPaused=true;
  cancelAnimationFrame(tmrRaf);
  document.getElementById('clock-display').classList.remove('running');
  document.getElementById('btn-pause').innerHTML='<i class="fa-solid fa-play"></i> Retomar';
  document.getElementById('timer-status').textContent='⏸ Pausado';
}
function tmrStopFn(){
  var total=tmrElapsed+(tmrRunning?Date.now()-tmrStart:0);
  cancelAnimationFrame(tmrRaf); tmrRunning=false; tmrPaused=false;
  var mins=Math.round(total/60000);
  if(mins<1){ toast('Sessão muito curta (mín. 1 min).','error'); tmrReset(); return; }
  var sid=document.getElementById('timer-subject').value;
  var sub=getSub(sid);
  addSession(sid,mins,todayStr(),'live');
  toast('Sessão salva: '+fmtTime(mins)+(sub?' em '+sub.name:'')+' !','success');
  tmrReset(); renderTodaySessions(); refreshDashboard();
}
function tmrReset(){
  tmrElapsed=0; tmrStart=null; tmrRunning=false; tmrPaused=false;
  document.getElementById('clock-display').textContent='00:00:00';
  document.getElementById('clock-display').classList.remove('running');
  document.getElementById('btn-start').classList.remove('hidden');
  document.getElementById('btn-pause').classList.add('hidden');
  document.getElementById('btn-stop').classList.add('hidden');
  document.getElementById('timer-status').textContent='';
  document.getElementById('timer-subject').value='';
}
function saveManual(){
  var sid=document.getElementById('manual-subject').value;
  var hrs=parseInt(document.getElementById('manual-hours').value)||0;
  var mns=parseInt(document.getElementById('manual-minutes').value)||0;
  var date=document.getElementById('manual-date').value;
  if(!sid){ toast('Selecione a matéria.','error'); return; }
  if(!hrs&&!mns){ toast('Informe o tempo.','error'); return; }
  if(!date){ toast('Informe a data.','error'); return; }
  var sub=getSub(sid);
  addSession(sid,hrs*60+mns,date,'manual');
  document.getElementById('manual-hours').value='';
  document.getElementById('manual-minutes').value='';
  toast('Salvo: '+fmtTime(hrs*60+mns)+(sub?' em '+sub.name:'')+' !','success');
  renderTodaySessions(); refreshDashboard();
}

// ===== WEEKLY PLANNER =====
var weekOff=0, pendingDay=null, wCharts={};
var DAYS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function getWeekDates(off){
  var d=new Date(), day=d.getDay(), mon=new Date(d);
  mon.setDate(d.getDate()-((day+6)%7)+off*7); mon.setHours(0,0,0,0);
  var dates=[];
  for(var i=0;i<7;i++){ var x=new Date(mon); x.setDate(mon.getDate()+i); dates.push(x); }
  return dates;
}
function dStr(d){ return d.toISOString().slice(0,10); }
function getBlocks(ds){ return (DB.data.weekBlocks||{})[ds]||[]; }
function saveBlock(ds,block){
  if(!DB.data.weekBlocks) DB.data.weekBlocks={};
  if(!DB.data.weekBlocks[ds]) DB.data.weekBlocks[ds]=[];
  DB.data.weekBlocks[ds].push(block); DB.save();
}
function delBlock(ds,idx){
  if(!DB.data.weekBlocks||!DB.data.weekBlocks[ds]) return;
  DB.data.weekBlocks[ds].splice(idx,1); DB.save();
}

function renderWeekPage(){
  var dates=getWeekDates(weekOff), td=todayStr();
  var fmt=function(d){ return d.getDate()+'/'+(d.getMonth()+1); };
  document.getElementById('week-label').textContent=fmt(dates[0])+' — '+fmt(dates[6])+' ('+dates[0].getFullYear()+')';
  var totPlanned=0,totStudied=0,activeDays=0;
  dates.forEach(function(d){
    var ds=dStr(d);
    var blocks=getBlocks(ds);
    var pm=blocks.reduce(function(a,b){return a+(b.hours*60+b.mins);},0);
    var sm=DB.data.sessions.filter(function(s){return s.date===ds;}).reduce(function(a,s){return a+s.mins;},0);
    totPlanned+=pm; totStudied+=sm;
    if(pm>0||sm>0) activeDays++;
  });
  document.getElementById('wstat-planned').textContent=+(totPlanned/60).toFixed(1)+'h';
  document.getElementById('wstat-studied').textContent=+(totStudied/60).toFixed(1)+'h';
  document.getElementById('wstat-pct').textContent=totPlanned>0?Math.round(totStudied/totPlanned*100)+'%':'—';
  document.getElementById('wstat-days').textContent=activeDays+'/7';

  // Grid
  var grid=document.getElementById('week-grid');
  grid.innerHTML=dates.map(function(d,di){
    var ds=dStr(d), blocks=getBlocks(ds), isToday=ds===td;
    var dayMins=blocks.reduce(function(a,b){return a+(b.hours*60+b.mins);},0);
    var blocksHtml=blocks.map(function(b,bi){
      var sub=getSub(b.sid); var color=sub?sub.color:'#888'; var name=sub?sub.name:b.sname||'—';
      var tStr=(b.hours>0?b.hours+'h ':'')+( b.mins>0?b.mins+'m':'');
      return '<div class="week-block" style="background:'+color+'">'+
        '<div class="week-block-name">'+name+'</div>'+
        '<div class="week-block-time">'+tStr+(b.note?' · '+b.note:'')+'</div>'+
        '<button class="week-block-del" data-ds="'+ds+'" data-idx="'+bi+'"><i class="fa-solid fa-xmark"></i></button>'+
        '</div>';
    }).join('');
    return '<div class="week-day-col'+(isToday?' today-col':'')+'">'+
      '<div class="week-day-header">'+
        '<div class="week-day-name">'+DAYS[di]+'</div>'+
        '<div class="week-day-num">'+d.getDate()+'</div>'+
        '<div class="week-day-total">'+(dayMins>0?+(dayMins/60).toFixed(1)+'h plan.':'')+'</div>'+
      '</div>'+
      blocksHtml+
      '<button class="week-add-btn" data-ds="'+ds+'"><i class="fa-solid fa-plus"></i> Adicionar</button>'+
      '</div>';
  }).join('');

  // Events on grid
  grid.querySelectorAll('.week-add-btn').forEach(function(b){
    b.addEventListener('click',function(){ openBlockModal(b.dataset.ds); });
  });
  grid.querySelectorAll('.week-block-del').forEach(function(b){
    b.addEventListener('click',function(){
      delBlock(b.dataset.ds,parseInt(b.dataset.idx));
      renderWeekPage();
    });
  });

  renderWeekChart(dates);
}

function renderWeekChart(dates){
  if(wCharts.compare){ wCharts.compare.destroy(); delete wCharts.compare; }
  var tC=getVar('--text-secondary'),gC=getVar('--border'),acc=getVar('--accent'),suc=getVar('--success');
  var labels=dates.map(function(d,i){ return DAYS[i]+' '+d.getDate(); });
  var planned=dates.map(function(d){ var ds=dStr(d); return +(getBlocks(ds).reduce(function(a,b){return a+b.hours*60+b.mins;},0)/60).toFixed(2); });
  var studied=dates.map(function(d){ var ds=dStr(d); return +(DB.data.sessions.filter(function(s){return s.date===ds;}).reduce(function(a,s){return a+s.mins;},0)/60).toFixed(2); });
  wCharts.compare=new Chart(document.getElementById('week-chart'),{type:'bar',
    data:{labels:labels,datasets:[
      {label:'Planejado',data:planned,backgroundColor:acc+'44',borderColor:acc,borderWidth:2,borderRadius:5},
      {label:'Estudado', data:studied, backgroundColor:suc+'bb',borderColor:suc,borderWidth:2,borderRadius:5}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:tC,font:{family:"'Sora',sans-serif",size:11},boxWidth:12,padding:14}},
        tooltip:{callbacks:{label:function(c){return ' '+c.dataset.label+': '+c.raw+'h';}}}},
      scales:{x:{grid:{color:gC},ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"}}},
        y:{grid:{color:gC},min:0,ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"},callback:function(v){return v+'h';}}}}}});
}

function openBlockModal(ds){
  pendingDay=ds;
  var sel=document.getElementById('block-subject');
  sel.innerHTML='<option value="">— Selecione —</option>'+
    DB.data.subjects.map(function(s){ return '<option value="'+s.id+'" data-color="'+s.color+'">'+s.name+'</option>'; }).join('');
  document.getElementById('block-hours').value=1;
  document.getElementById('block-mins').value=0;
  document.getElementById('block-note').value='';
  document.getElementById('block-color-bar').style.background='var(--border)';
  document.getElementById('modal-block').classList.remove('hidden');
}
function closeBlockModal(){
  document.getElementById('modal-block').classList.add('hidden');
  pendingDay=null;
}
function confirmBlock(){
  var sid=document.getElementById('block-subject').value;
  var hrs=parseInt(document.getElementById('block-hours').value)||0;
  var mns=parseInt(document.getElementById('block-mins').value)||0;
  var note=document.getElementById('block-note').value.trim();
  if(!sid){ toast('Selecione a matéria.','error'); return; }
  if(!hrs&&!mns){ toast('Informe o tempo.','error'); return; }
  var sub=getSub(sid);
  saveBlock(pendingDay,{sid:sid,sname:sub?sub.name:'—',hours:hrs,mins:mns,note:note});
  closeBlockModal(); renderWeekPage();
  toast('Bloco adicionado!','success');
}

// ===== LONGTERM PLANNER =====
function renderLtSubList(){
  var wrap=document.getElementById('lt-sub-list');
  if(!DB.data.subjects.length){ wrap.innerHTML='<p class="plan-no-subjects">Adicione matérias primeiro.</p>'; return; }
  var saved=DB.data.ltSubWeights||{};
  wrap.innerHTML=DB.data.subjects.map(function(s){
    var w=saved[s.id]?saved[s.id].weight:'', p=saved[s.id]?saved[s.id].priority:'2';
    return '<div class="lt-sub-row">'+
      '<div class="lt-sub-label"><div class="plan-subject-dot" style="background:'+s.color+'"></div><span>'+s.name+'</span></div>'+
      '<input type="number" min="1" max="100" placeholder="%" data-sid="'+s.id+'" data-f="w" value="'+w+'"/>'+
      '<select data-sid="'+s.id+'" data-f="p">'+
        '<option value="1"'+(p==='1'?' selected':'')+'>Alta</option>'+
        '<option value="2"'+(p==='2'?' selected':'')+'>Média</option>'+
        '<option value="3"'+(p==='3'?' selected':'')+'>Baixa</option>'+
      '</select></div>';
  }).join('');
}

function calcLtPlan(){
  var start=document.getElementById('lt-start').value;
  var end=document.getElementById('lt-end').value;
  var hpw=parseFloat(document.getElementById('lt-hours-week').value)||30;
  var rpct=parseFloat(document.getElementById('lt-review-pct').value)||30;
  if(!start){ toast('Informe a data de início.','error'); return; }
  if(!end){ toast('Informe a data da prova.','error'); return; }
  var sD=new Date(start+'T00:00:00'), eD=new Date(end+'T00:00:00');
  if(eD<=sD){ toast('A data da prova deve ser após o início.','error'); return; }
  var totalDays=Math.round((eD-sD)/86400000);
  var totalWeeks=+(totalDays/7).toFixed(1);
  var totalH=Math.round(totalWeeks*hpw);
  var reviewH=Math.round(totalH*rpct/100);
  var studyH=totalH-reviewH;
  // Save config
  var weights={};
  document.querySelectorAll('#lt-sub-list [data-sid]').forEach(function(el){
    var sid=el.dataset.sid;
    if(!weights[sid]) weights[sid]={weight:0,priority:'2'};
    if(el.dataset.f==='w') weights[sid].weight=parseFloat(el.value)||0;
    if(el.dataset.f==='p') weights[sid].priority=el.value;
  });
  DB.data.ltSubWeights=weights;
  DB.data.ltConfig={start:start,end:end,hoursWeek:hpw,reviewPct:rpct};
  DB.save();
  // Build subject rows
  var subs=DB.data.subjects;
  var adjs=subs.map(function(s){
    var w=(weights[s.id]&&weights[s.id].weight)||1;
    var p=parseInt((weights[s.id]&&weights[s.id].priority)||'2');
    var mult=p===1?1.3:p===3?0.7:1.0;
    return {s:s,adj:w*mult};
  });
  var adjSum=adjs.reduce(function(a,b){return a+b.adj;},0)||1;
  var mps=minsPerSub();
  var rows=adjs.map(function(x){
    var pct=x.adj/adjSum, idealH=+(pct*studyH).toFixed(1);
    var realH=+((mps[x.s.id]||0)/60).toFixed(1);
    var doneP=idealH>0?Math.min(100,Math.round(realH/idealH*100)):0;
    return {s:x.s,idealH:idealH,realH:realH,doneP:doneP};
  });
  // KPIs
  document.getElementById('ltkpi-weeks').textContent=Math.ceil(totalWeeks)+'sem';
  document.getElementById('ltkpi-total-h').textContent=totalH+'h';
  document.getElementById('ltkpi-study-h').textContent=studyH+'h';
  document.getElementById('ltkpi-review-h').textContent=reviewH+'h';
  // Gantt
  var maxH=Math.max.apply(null,rows.map(function(r){return r.idealH;}))||1;
  document.getElementById('lt-gantt').innerHTML=rows.map(function(r){
    var fw=r.idealH/maxH*100, dw=fw*r.doneP/100;
    return '<div class="lt-gantt-row">'+
      '<div class="lt-gantt-label"><div class="lt-gantt-dot" style="background:'+r.s.color+'"></div>'+(r.s.name.length>14?r.s.name.slice(0,14)+'…':r.s.name)+'</div>'+
      '<div class="lt-gantt-bar-wrap"><div class="lt-gantt-track"></div>'+
        '<div class="lt-gantt-fill" style="width:'+fw+'%;background:'+r.s.color+'">'+r.idealH+'h</div>'+
        '<div class="lt-gantt-done" style="width:'+dw+'%;background:var(--success)"></div></div>'+
      '<div class="lt-gantt-pct">'+r.doneP+'%</div>'+
      '</div>';
  }).join('');
  // Phases
  var fmtD=function(d){ return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear(); };
  var p1=new Date(sD); p1.setDate(sD.getDate()+Math.round(totalDays*.5));
  var p2=new Date(sD); p2.setDate(sD.getDate()+Math.round(totalDays*.8));
  var phases=[
    {color:'var(--accent)',name:'Fase 1 — Aprendizado',note:'Conteúdo novo e base teórica',period:fmtD(sD)+' a '+fmtD(p1),hrs:Math.round(studyH*.5)+'h'},
    {color:'var(--warn)',  name:'Fase 2 — Consolidação',note:'Aprofundamento e exercícios',period:fmtD(p1)+' a '+fmtD(p2),hrs:Math.round(studyH*.3)+'h'},
    {color:'var(--success)',name:'Fase 3 — Revisão Final',note:'Revisão geral + simulados',period:fmtD(p2)+' a '+fmtD(eD),hrs:Math.round(studyH*.2+reviewH)+'h'}
  ];
  document.getElementById('lt-phases').innerHTML=phases.map(function(ph){
    return '<div class="lt-phase-item"><div class="lt-phase-dot" style="background:'+ph.color+'"></div>'+
      '<div><div class="lt-phase-name">'+ph.name+'</div><div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">'+ph.note+'</div></div>'+
      '<div class="lt-phase-right"><div class="lt-phase-period">'+ph.period+'</div><div class="lt-phase-hrs">'+ph.hrs+'</div></div>'+
      '</div>';
  }).join('');
  document.getElementById('lt-empty').classList.add('hidden');
  document.getElementById('lt-results').classList.remove('hidden');
  toast('Plano gerado!','success');
}

function initLtPage(){
  renderLtSubList();
  var cfg=DB.data.ltConfig;
  if(cfg){
    if(cfg.start) document.getElementById('lt-start').value=cfg.start;
    if(cfg.end)   document.getElementById('lt-end').value=cfg.end;
    if(cfg.hoursWeek) document.getElementById('lt-hours-week').value=cfg.hoursWeek;
    if(cfg.reviewPct) document.getElementById('lt-review-pct').value=cfg.reviewPct;
    renderLtSubList();
  }
  if(!document.getElementById('lt-start').value) document.getElementById('lt-start').value=todayStr();
}

// ===== CALCULADORA =====
var planCharts={};
function destroyPCh(k){ if(planCharts[k]){ planCharts[k].destroy(); delete planCharts[k]; } }

function renderPlanInputs(){
  var wrap=document.getElementById('plan-subjects-inputs');
  if(!DB.data.subjects.length){ wrap.innerHTML='<p class="plan-no-subjects">Adicione matérias primeiro.</p>'; return; }
  var saved=DB.data.planPts||{};
  wrap.innerHTML=DB.data.subjects.map(function(s){
    return '<div class="plan-subject-row">'+
      '<div class="plan-subject-label"><div class="plan-subject-dot" style="background:'+s.color+'"></div>'+s.name+'</div>'+
      '<input type="number" min="0" placeholder="pts" data-sid="'+s.id+'" value="'+(saved[s.id]||'')+'"/>'+
      '</div>';
  }).join('');
  wrap.querySelectorAll('input').forEach(function(inp){ inp.addEventListener('input',updatePtsTotal); });
  updatePtsTotal();
}

function updatePtsTotal(){
  var inputs=document.querySelectorAll('#plan-subjects-inputs input[data-sid]');
  var tot=0; inputs.forEach(function(inp){ tot+=parseFloat(inp.value)||0; });
  var el=document.getElementById('plan-pts-used'); el.textContent=tot;
  var max=parseFloat(document.getElementById('plan-total-pts').value)||0;
  el.className='plan-total-val'+(max&&tot>max?' over':'');
}

function calcPlan(){
  var hours=parseFloat(document.getElementById('plan-hours').value)||0;
  var totPts=parseFloat(document.getElementById('plan-total-pts').value)||0;
  if(hours<1){ toast('Informe as horas semanais.','error'); return; }
  if(totPts<1){ toast('Informe o total de pontos.','error'); return; }
  var inputs=document.querySelectorAll('#plan-subjects-inputs input[data-sid]');
  if(!inputs.length){ toast('Adicione matérias primeiro.','error'); return; }
  var saved={}, rows=[], ptsSum=0;
  inputs.forEach(function(inp){
    var pts=parseFloat(inp.value)||0;
    saved[inp.dataset.sid]=pts; ptsSum+=pts;
    rows.push({sid:inp.dataset.sid,pts:pts});
  });
  if(ptsSum===0){ toast('Informe a pontuação de ao menos uma matéria.','error'); return; }
  DB.data.planPts=saved; DB.data.planConfig={hours:hours,totPts:totPts}; DB.save();
  var mps=minsPerSub();
  var ago=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  var planData=rows.filter(function(r){return r.pts>0;}).map(function(r){
    var sub=getSub(r.sid);
    var pct=r.pts/ptsSum;
    var idealH=+(pct*hours).toFixed(2);
    var realWeekH=+(DB.data.sessions.filter(function(s){return s.sid===r.sid&&s.date>=ago;}).reduce(function(a,s){return a+s.mins;},0)/60).toFixed(2);
    return {sid:r.sid,name:sub?sub.name:'—',color:sub?sub.color:'#888',pts:r.pts,pct:pct,idealH:idealH,realWeekH:realWeekH,ptsW:(totPts>0?r.pts/totPts*100:0).toFixed(1)};
  });
  document.getElementById('pkpi-hours').textContent=hours+'h';
  document.getElementById('pkpi-pts').textContent=totPts;
  document.getElementById('pkpi-mats').textContent=planData.length;
  var maxH=Math.max.apply(null,planData.map(function(r){return r.idealH;}))||1;
  function getStatus(r){
    if(r.idealH===0) return {cls:'status-zero',label:'Sem meta'};
    if(r.realWeekH===0) return {cls:'status-zero',label:'Não estudou'};
    var ratio=r.realWeekH/r.idealH;
    if(ratio>=0.85&&ratio<=1.25) return {cls:'status-ok',label:'✓ Ideal'};
    if(ratio<0.85) return {cls:'status-low',label:'↓ Abaixo'};
    return {cls:'status-over',label:'↑ Acima'};
  }
  document.getElementById('plan-table-body').innerHTML=planData.map(function(r){
    var st=getStatus(r);
    var bI=r.idealH/maxH*100, bR=Math.min(100,r.realWeekH/maxH*100);
    return '<tr>'+
      '<td><span class="plan-dot" style="background:'+r.color+'"></span>'+r.name+'</td>'+
      '<td>'+r.pts+'</td><td>'+r.ptsW+'%</td><td><strong>'+r.idealH+'h</strong></td>'+
      '<td>'+(r.realWeekH>0?r.realWeekH+'h':'<span style="color:var(--text-muted)">0h</span>')+'</td>'+
      '<td><div class="plan-bar-track"><div class="plan-bar-ideal" style="width:'+bI+'%;background:'+r.color+'"></div><div class="plan-bar-real" style="width:'+bR+'%;background:'+r.color+'"></div></div></td>'+
      '<td><span class="plan-status-badge '+st.cls+'">'+st.label+'</span></td>'+
      '</tr>';
  }).join('');
  document.getElementById('plan-empty-state').style.display='none';
  document.getElementById('plan-table-wrap').style.display='';
  // Charts
  var tC=getVar('--text-secondary'),gC=getVar('--border'),acc=getVar('--accent'),suc=getVar('--success');
  destroyPCh('compare');
  planCharts.compare=new Chart(document.getElementById('plan-chart-compare'),{type:'bar',
    data:{labels:planData.map(function(r){return r.name.length>12?r.name.slice(0,12)+'…':r.name;}),
      datasets:[
        {label:'Meta Ideal',data:planData.map(function(r){return r.idealH;}),backgroundColor:planData.map(function(r){return r.color+'44';}),borderColor:planData.map(function(r){return r.color;}),borderWidth:2,borderRadius:6},
        {label:'Estudado',  data:planData.map(function(r){return r.realWeekH;}),backgroundColor:planData.map(function(r){return r.color+'bb';}),borderColor:planData.map(function(r){return r.color;}),borderWidth:2,borderRadius:6}
      ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:tC,font:{family:"'Sora',sans-serif",size:11},boxWidth:12,padding:12}},
        tooltip:{callbacks:{label:function(c){return ' '+c.dataset.label+': '+c.raw+'h';}}}},
      scales:{x:{grid:{color:gC},ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"}}},
        y:{grid:{color:gC},ticks:{color:tC,font:{size:10,family:"'Sora',sans-serif"},callback:function(v){return v+'h';}}}}}});
  destroyPCh('radar');
  if(planData.length>=3){
    planCharts.radar=new Chart(document.getElementById('plan-chart-radar'),{type:'radar',
      data:{labels:planData.map(function(r){return r.name.length>10?r.name.slice(0,10)+'…':r.name;}),
        datasets:[
          {label:'Meta',data:planData.map(function(){return 100;}),backgroundColor:acc+'22',borderColor:acc+'88',borderWidth:1.5,pointRadius:3,borderDash:[5,3]},
          {label:'Real',data:planData.map(function(r){return r.idealH>0?Math.min(150,Math.round(r.realWeekH/r.idealH*100)):0;}),backgroundColor:suc+'33',borderColor:suc,borderWidth:2,pointRadius:4}
        ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:tC,font:{family:"'Sora',sans-serif",size:11},boxWidth:12,padding:12}}},
        scales:{r:{grid:{color:gC},angleLines:{color:gC},ticks:{display:false},
          pointLabels:{color:tC,font:{size:10,family:"'Sora',sans-serif"}},min:0,max:150}}}});
  }
  // Alerts
  var alerts=[];
  planData.filter(function(r){return r.realWeekH===0&&r.idealH>0;}).forEach(function(r){
    alerts.push({cls:'alert-zero',icon:'fa-solid fa-circle-exclamation',title:'Negligenciada',text:r.name+' não foi estudada esta semana. Meta: '+r.idealH+'h.'});
  });
  planData.filter(function(r){return r.realWeekH>0&&r.realWeekH<r.idealH*.85;}).forEach(function(r){
    alerts.push({cls:'alert-low',icon:'fa-solid fa-arrow-trend-down',title:'Abaixo da meta',text:r.name+' está '+(r.idealH-r.realWeekH).toFixed(1)+'h abaixo da meta ('+r.idealH+'h).'});
  });
  planData.filter(function(r){return r.realWeekH>r.idealH*1.25;}).forEach(function(r){
    alerts.push({cls:'alert-over',icon:'fa-solid fa-arrow-trend-up',title:'Acima da meta',text:r.name+' teve '+(r.realWeekH-r.idealH).toFixed(1)+'h acima do necessário.'});
  });
  var okList=planData.filter(function(r){var rt=r.idealH>0?r.realWeekH/r.idealH:0; return rt>=0.85&&rt<=1.25;});
  if(okList.length>0&&planData.filter(function(r){return r.realWeekH<r.idealH*.85||r.realWeekH===0;}).length===0){
    alerts.push({cls:'alert-ok',icon:'fa-solid fa-circle-check',title:'Excelente equilíbrio',text:'Todas as matérias estão dentro da meta ideal!'});
  }
  if(!alerts.length) alerts.push({cls:'alert-ok',icon:'fa-solid fa-circle-info',title:'Análise OK',text:'Nenhum alerta crítico no momento.'});
  document.getElementById('plan-alerts-grid').innerHTML=alerts.map(function(a,i){
    return '<div class="plan-alert '+a.cls+'" style="animation-delay:'+(i*.07)+'s">'+
      '<div class="plan-alert-icon"><i class="'+a.icon+'"></i></div>'+
      '<div><div class="plan-alert-title">'+a.title+'</div><div class="plan-alert-text">'+a.text+'</div></div>'+
      '</div>';
  }).join('');
  toast('Plano calculado!','success');
}

// ===== THEME =====
function applyTheme(t){
  document.body.className=t; DB.data.theme=t; DB.save();
  document.querySelectorAll('[data-theme]').forEach(function(b){ b.classList.toggle('active',b.dataset.theme===t); });
  Object.keys(chartInst).forEach(function(k){ if(chartInst[k]){chartInst[k].destroy();delete chartInst[k];} });
  Object.keys(wCharts).forEach(function(k){ if(wCharts[k]){wCharts[k].destroy();delete wCharts[k];} });
  Object.keys(planCharts).forEach(function(k){ if(planCharts[k]){planCharts[k].destroy();delete planCharts[k];} });
  setTimeout(function(){
    var activePage=document.querySelector('.page-content.active');
    if(activePage&&activePage.id==='page-dashboard') renderCharts();
    if(activePage&&activePage.id==='page-weekly') renderWeekPage();
  },50);
}

// ===== NAVIGATION =====
var PAGE_TITLES={dashboard:'Dashboard',timer:'Cronômetro',subjects:'Matérias',history:'Histórico',weekly:'Plano Semanal',longterm:'Plano Total',planner:'Calculadora',settings:'Configurações'};

function navigate(page){
  document.querySelectorAll('.page-content').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-link').forEach(function(a){ a.classList.remove('active'); });
  var el=document.getElementById('page-'+page);
  if(el) el.classList.add('active');
  var lnk=document.querySelector('.nav-link[data-page="'+page+'"]');
  if(lnk) lnk.classList.add('active');
  document.getElementById('topbar-title').textContent=PAGE_TITLES[page]||page;
  if(page==='dashboard') refreshDashboard();
  if(page==='timer'){ syncSelects(); renderTodaySessions(); }
  if(page==='subjects') renderSubjects();
  if(page==='history'){ syncFilterSub(); renderHistory(); }
  if(page==='weekly') renderWeekPage();
  if(page==='longterm') initLtPage();
  if(page==='planner') renderPlanInputs();
  closeSidebar();
}

function openSidebar(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('visible'); }
function closeSidebar(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('visible'); }


// ===== HEATMAP =====
function renderHeatmap(){
  var grid=document.getElementById('heatmap-grid');
  var months=document.getElementById('heatmap-months');
  if(!grid)return;
  var today=new Date();
  var startD=new Date(today);
  startD.setFullYear(today.getFullYear()-1);
  var dow=(startD.getDay()+6)%7;
  startD.setDate(startD.getDate()-dow);
  var dayMap={};
  DB.data.sessions.forEach(function(s){dayMap[s.date]=(dayMap[s.date]||0)+s.mins;});
  var maxMins=Math.max.apply(null,Object.values(dayMap).concat([1]));
  var mLabels=[],prevMonth=-1;
  var d=new Date(startD);
  grid.innerHTML='';
  while(d<=today){
    var ds=d.toISOString().slice(0,10);
    var m=dayMap[ds]||0;
    var lvl=m===0?0:m<maxMins*.25?1:m<maxMins*.5?2:m<maxMins*.75?3:4;
    var opacs=[0,.25,.5,.75,1];
    var el=document.createElement('div');
    el.title=ds+(m?': '+fmtTime(m):'');
    el.style.cssText='width:100%;aspect-ratio:1;border-radius:2px;transition:transform .15s;';
    if(lvl===0){el.style.background='var(--bg-elevated)';}
    else{el.style.background='var(--accent)';el.style.opacity=opacs[lvl];}
    (function(e){
      e.addEventListener('mouseenter',function(){e.style.transform='scale(1.5)';e.style.position='relative';e.style.zIndex='2';});
      e.addEventListener('mouseleave',function(){e.style.transform='';e.style.position='';e.style.zIndex='';});
    })(el);
    grid.appendChild(el);
    var mo=d.getMonth();
    if(mo!==prevMonth){mLabels.push(['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mo]);prevMonth=mo;}
    d.setDate(d.getDate()+1);
  }
  if(months){months.innerHTML=mLabels.map(function(l){return '<span>'+l+'</span>';}).join('');}
}

// ===== POMODORO =====
var pomoState={running:false,isBreak:false,remaining:0,interval:null,sessions:0,total:4};
function pomoReset(){
  clearInterval(pomoState.interval);
  pomoState.running=false;pomoState.isBreak=false;
  pomoState.remaining=(parseInt(document.getElementById('pomo-work').value)||25)*60;
  pomoState.sessions=0;
  updatePomoDisplay();updatePomoDots();
  var lbl=document.getElementById('pomo-label');
  if(lbl){lbl.textContent='Foco';lbl.style.color='var(--danger)';}
  var btn=document.getElementById('btn-pomo-start');
  if(btn)btn.innerHTML='<i class="fa-solid fa-play"></i> Iniciar';
}
function updatePomoDisplay(){
  var el=document.getElementById('pomo-display'); if(!el)return;
  var m=Math.floor(pomoState.remaining/60),s=pomoState.remaining%60;
  el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function updatePomoDots(){
  var el=document.getElementById('pomo-dots'); if(!el)return;
  el.innerHTML='';
  for(var i=0;i<pomoState.total;i++){
    var d=document.createElement('div');
    d.style.cssText='width:8px;height:8px;border-radius:50%;border:1px solid var(--border);background:'+(i<pomoState.sessions?'var(--danger)':'var(--bg-elevated)');
    el.appendChild(d);
  }
}
function pomoToggle(){
  if(pomoState.running){
    clearInterval(pomoState.interval);pomoState.running=false;
    var btn=document.getElementById('btn-pomo-start');
    if(btn)btn.innerHTML='<i class="fa-solid fa-play"></i> Retomar';
  } else {
    if(!pomoState.remaining) pomoReset();
    pomoState.running=true;
    var btn=document.getElementById('btn-pomo-start');
    if(btn)btn.innerHTML='<i class="fa-solid fa-pause"></i> Pausar';
    pomoState.interval=setInterval(function(){
      pomoState.remaining--;
      updatePomoDisplay();
      if(pomoState.remaining<=0){
        clearInterval(pomoState.interval);pomoState.running=false;
        if(!pomoState.isBreak){
          pomoState.sessions=Math.min(pomoState.sessions+1,pomoState.total);
          updatePomoDots();
          toast('Pomodoro concluído! Hora de descansar.','success');
          pomoState.isBreak=true;
          pomoState.remaining=(parseInt(document.getElementById('pomo-break').value)||5)*60;
          var lbl=document.getElementById('pomo-label');
          if(lbl){lbl.textContent='Pausa';lbl.style.color='var(--success)';}
        } else {
          toast('Pausa encerrada! Hora de focar.','info');
          pomoState.isBreak=false;
          pomoState.remaining=(parseInt(document.getElementById('pomo-work').value)||25)*60;
          var lbl=document.getElementById('pomo-label');
          if(lbl){lbl.textContent='Foco';lbl.style.color='var(--danger)';}
        }
        updatePomoDisplay();
        var btn=document.getElementById('btn-pomo-start');
        if(btn)btn.innerHTML='<i class="fa-solid fa-play"></i> Iniciar';
      }
    },1000);
  }
}

// ===== DAILY GOAL =====
function getDailyGoalMins(){
  return Math.round((parseFloat(DB.data.dailyGoalHours||4))*60);
}
function updateGoalBar(){
  var bar=document.getElementById('goal-bar');
  var pctEl=document.getElementById('goal-pct');
  if(!bar||!pctEl)return;
  var todayMins=todaySessions().reduce(function(a,s){return a+s.mins;},0);
  var goal=getDailyGoalMins();
  var pct=goal>0?Math.min(100,Math.round(todayMins/goal*100)):0;
  bar.style.width=pct+'%';
  bar.style.background=pct>=100?'var(--success)':'var(--accent)';
  pctEl.textContent=pct+'%';
  pctEl.style.color=pct>=100?'var(--success)':'var(--accent)';
}

// ===== KEYBOARD SHORTCUTS =====
function initKeyboard(){
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA')return;
    if(e.code==='Space'){
      e.preventDefault();
      var page=document.querySelector('.page.active');
      if(page&&page.id==='page-timer'){
        if(tmrRunning)tmrPause();
        else if(tmrPaused)tmrPause(); // resume
        else tmrStart2();
      }
    }
    if(e.code==='KeyS'&&!e.ctrlKey&&!e.metaKey){
      var page=document.querySelector('.page.active');
      if(page&&page.id==='page-timer'&&(tmrRunning||tmrPaused))tmrStop();
    }
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',function(){
  DB.load();
  applyTheme(DB.data.theme||'theme-dark');
  renderColorOptions();
  syncSelects(); syncFilterSub();
  document.getElementById('manual-date').value=todayStr();
  refreshDashboard(); renderTodaySessions();

  document.querySelectorAll('.nav-link').forEach(function(a){
    a.addEventListener('click',function(e){ e.preventDefault(); navigate(a.dataset.page); });
  });
  document.getElementById('btn-menu-toggle').addEventListener('click',openSidebar);
  document.getElementById('btn-sidebar-close').addEventListener('click',closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click',closeSidebar);
  document.querySelectorAll('[data-theme]').forEach(function(b){
    b.addEventListener('click',function(){ applyTheme(b.dataset.theme); });
  });
  document.getElementById('btn-add-subject').addEventListener('click',addSubject);
  document.getElementById('new-subject-name').addEventListener('keydown',function(e){ if(e.key==='Enter') addSubject(); });
  document.getElementById('btn-start').addEventListener('click',tmrStartFn);
  document.getElementById('btn-pause').addEventListener('click',tmrPauseFn);
  document.getElementById('btn-stop').addEventListener('click',tmrStopFn);
  document.getElementById('btn-manual-save').addEventListener('click',saveManual);
  document.querySelectorAll('.timer-tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('.timer-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.timer-mode').forEach(function(m){ m.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('timer-'+tab.dataset.mode).classList.add('active');
    });
  });
  document.getElementById('btn-filter').addEventListener('click',function(){
    hFilter={sid:document.getElementById('filter-subject').value,from:document.getElementById('filter-from').value,to:document.getElementById('filter-to').value};
    renderHistory();
  });
  document.getElementById('btn-clear-filter').addEventListener('click',function(){
    document.getElementById('filter-subject').value='';
    document.getElementById('filter-from').value='';
    document.getElementById('filter-to').value='';
    hFilter={sid:'',from:'',to:''}; renderHistory();
  });
  document.getElementById('btn-export').addEventListener('click',exportCSV);
  document.getElementById('week-prev').addEventListener('click',function(){ weekOff--; renderWeekPage(); });
  document.getElementById('week-next').addEventListener('click',function(){ weekOff++; renderWeekPage(); });
  document.getElementById('btn-block-cancel').addEventListener('click',closeBlockModal);
  document.getElementById('btn-block-confirm').addEventListener('click',confirmBlock);
  document.getElementById('modal-block').addEventListener('click',function(e){ if(e.target===this) closeBlockModal(); });
  document.getElementById('block-subject').addEventListener('change',function(){
    var opt=this.options[this.selectedIndex];
    document.getElementById('block-color-bar').style.background=opt&&opt.dataset.color?opt.dataset.color:'var(--border)';
  });
  document.getElementById('btn-lt-calc').addEventListener('click',calcLtPlan);
  document.getElementById('btn-calc-plan').addEventListener('click',calcPlan);
  document.getElementById('plan-hours').addEventListener('input',updatePtsTotal);
  document.getElementById('plan-total-pts').addEventListener('input',updatePtsTotal);
  document.getElementById('btn-clear-sessions').addEventListener('click',function(){
    confirm2('Apagar sessões','Remover TODAS as sessões? Irreversível.',function(){
      DB.data.sessions=[]; DB.data.streakDays=[]; DB.save();
      refreshDashboard(); renderTodaySessions(); renderHistory();
      toast('Sessões apagadas.','info');
    });
  });
  document.getElementById('btn-reset-app').addEventListener('click',function(){
    confirm2('Resetar tudo','Todos os dados apagados. Continuar?',function(){
      localStorage.removeItem('sf3'); location.reload();
    });
  });
  document.getElementById('btn-modal-confirm').addEventListener('click',function(){ if(_confirmCb) _confirmCb(); closeConfirm(); });
  document.getElementById('btn-modal-cancel').addEventListener('click',closeConfirm);
  document.getElementById('modal-confirm-overlay').addEventListener('click',function(e){ if(e.target===this) closeConfirm(); });
  // Pomodoro
  var btnPStart=document.getElementById('btn-pomo-start');
  var btnPStop=document.getElementById('btn-pomo-stop');
  if(btnPStart) btnPStart.addEventListener('click', pomoToggle);
  if(btnPStop) btnPStop.addEventListener('click', pomoReset);
  pomoReset();
  // Daily goal settings
  var goalInput=document.getElementById('daily-goal-input');
  var goalSave=document.getElementById('btn-save-goal');
  if(goalInput&&DB.data.dailyGoalHours) goalInput.value=DB.data.dailyGoalHours;
  if(goalSave) goalSave.addEventListener('click',function(){
    var v=parseFloat(goalInput.value)||4;
    DB.data.dailyGoalHours=v; DB.save();
    updateGoalBar();
    toast('Meta diária salva: '+v+'h!','success');
  });
  updateGoalBar();
  // Keyboard shortcuts
  initKeyboard();
  // Heatmap on dashboard load
  renderHeatmap();
});