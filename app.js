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
  updateXPBar();
  checkAchievements();
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
var PAGE_TITLES={dashboard:'Dashboard',timer:'Cronômetro',subjects:'Matérias',history:'Histórico',weekly:'Plano Semanal',longterm:'Plano Total',planner:'Calculadora',achievements:'Conquistas & XP',ranking:'Ranking de Amigos',friends:'Amigos & Ranking',settings:'Configurações',progress:'Progresso por Matéria'};

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
  if(page==='achievements') renderAchievements();
  if(page==='friends') initFriendsPage();
  if(page==='ranking') initRankingPage();
  if(page==='settings') initNotifSettings();
  if(page==='weekly') renderWeekPage();
  if(page==='longterm') initLtPage();
  if(page==='planner') renderPlanInputs();
  if(page==='progress') initProgressPage();
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
function initApp(){
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
  updateXPBar();
  checkAchievements();
  // Pre-generate user code
  generateUserCode();
  // Init notifications if already permitted
  if(typeof initNotifSettings === 'function') initNotifSettings();

  // Scroll to top button
  var mainEl = document.querySelector('.main-content') || document.querySelector('.main');
  var scrollBtn = document.getElementById('scroll-top-btn');
  if(mainEl && scrollBtn){
    mainEl.addEventListener('scroll', function(){
      scrollBtn.classList.toggle('visible', mainEl.scrollTop > 300);
      document.querySelector('.topbar') && document.querySelector('.topbar').classList.toggle('scrolled', mainEl.scrollTop > 10);
    });
    scrollBtn.addEventListener('click', function(){
      mainEl.scrollTo({top:0,behavior:'smooth'});
    });
  }
}
// initApp() is called by the auth system (showApp)

// ===== FIREBASE AUTH & LOGIN =====
var firebaseConfig = {
  // Substitua com suas credenciais: console.firebase.google.com
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000000000"
};

var fbApp = null, fbAuth = null, currentUser = null, isGuest = false;

function initFirebase(){
  try {
    fbApp = firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbAuth.onAuthStateChanged(function(user){
      if(user){ currentUser=user; isGuest=false; loadUserData(user.uid); showApp(user); }
      else if(!isGuest){ showLoginScreen(); }
    });
  } catch(e){
    console.warn('[Auth] Firebase not configured, running local mode');
    showApp(null);
  }
}

function showLoginScreen(){
  var ls=document.getElementById('login-screen');
  var app=document.getElementById('app');
  if(ls) ls.style.display='flex';
  if(app) app.style.display='none';
}

function showApp(user){
  var ls=document.getElementById('login-screen');
  var app=document.getElementById('app');
  if(ls) ls.style.display='none';
  if(app) app.style.display='';
  updateUserUI(user);
  initApp();
}

function updateUserUI(user){
  var btn=document.getElementById('user-avatar-btn'); if(!btn) return;
  var umAvatar=document.getElementById('um-avatar');
  var umName=document.getElementById('um-name');
  var umEmail=document.getElementById('um-email');
  if(user && user.photoURL){
    btn.innerHTML='<img src="'+user.photoURL+'" style="width:30px;height:30px;border-radius:50%;border:2px solid var(--border-focus);object-fit:cover"/>';
    if(umAvatar) umAvatar.innerHTML='<img src="'+user.photoURL+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover"/>';
  } else {
    var init=user?(user.displayName||user.email||'U')[0].toUpperCase():'G';
    btn.innerHTML='<span style="font-weight:700;font-size:.8rem">'+init+'</span>';
    if(umAvatar) umAvatar.innerHTML='<span style="font-weight:700">'+init+'</span>';
  }
  if(umName) umName.textContent=DB.data.displayName||(user?user.displayName:'Modo Local')||'Usuário';
  if(umEmail) umEmail.textContent=user?user.email:'dados salvos localmente';
}

function loadUserData(uid){
  var key='sf4_'+uid;
  try {
    var saved=localStorage.getItem(key);
    if(saved){ DB.data=JSON.parse(saved); }
    else {
      var generic=localStorage.getItem('sf4');
      if(generic){ DB.data=JSON.parse(generic); }
    }
  } catch(e){}
  DB._uid=uid;
  DB.save=function(){ try{ localStorage.setItem('sf4_'+this._uid,JSON.stringify(this.data)); }catch(e){} };
}

function loginWithGoogle(){
  if(!fbAuth){ toast('Firebase não configurado. Configure primeiro.','error'); return; }
  document.getElementById('login-content').classList.add('hidden');
  document.getElementById('login-loading').classList.remove('hidden');
  var provider=new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  fbAuth.signInWithPopup(provider).catch(function(err){
    document.getElementById('login-content').classList.remove('hidden');
    document.getElementById('login-loading').classList.add('hidden');
    toast('Erro ao entrar com Google.','error');
    console.error('[Auth]',err);
  });
}

function guestLogin(){
  isGuest=true; currentUser=null; DB.load(); showApp(null);
}

function logout(){
  closeUserMenu();
  var reset=function(){
    currentUser=null; isGuest=false;
    DB._uid=null;
    DB.load=function(){ try{ var s=localStorage.getItem('sf4'); if(s) this.data=JSON.parse(s); }catch(e){} };
    DB.save=function(){ try{ localStorage.setItem('sf4',JSON.stringify(this.data)); }catch(e){} };
    showLoginScreen();
    toast('Saiu da conta.','info');
  };
  if(fbAuth && currentUser){ fbAuth.signOut().then(reset); } else { reset(); }
}

function editDisplayName(){
  closeUserMenu();
  var cur=DB.data.displayName||(currentUser?currentUser.displayName:'')||'';
  var n=prompt('Seu nome de exibição:',cur);
  if(n&&n.trim()){ DB.data.displayName=n.trim(); DB.save(); updateUserUI(currentUser); toast('Nome salvo!','success'); }
}

function openUserMenu(){ var m=document.getElementById('user-menu'); if(m) m.classList.toggle('hidden'); }
function closeUserMenu(){ var m=document.getElementById('user-menu'); if(m) m.classList.add('hidden'); }

// Init on page load
document.addEventListener('DOMContentLoaded',function(){
  var btnGoogle=document.getElementById('btn-google-login');
  var btnGuest=document.getElementById('btn-guest-login');
  var btnAvatar=document.getElementById('user-avatar-btn');
  var btnProfile=document.getElementById('um-profile');
  var btnLogout=document.getElementById('um-logout');
  if(btnGoogle) btnGoogle.addEventListener('click',loginWithGoogle);
  if(btnGuest)  btnGuest.addEventListener('click',guestLogin);
  if(btnAvatar) btnAvatar.addEventListener('click',function(e){ e.stopPropagation(); openUserMenu(); });
  if(btnProfile) btnProfile.addEventListener('click',editDisplayName);
  if(btnLogout)  btnLogout.addEventListener('click',logout);
  document.addEventListener('click',function(e){
    var menu=document.getElementById('user-menu');
    var btn=document.getElementById('user-avatar-btn');
    if(menu&&!menu.classList.contains('hidden')&&!menu.contains(e.target)&&!btn.contains(e.target)){closeUserMenu();}
  });
  initFirebase();
});

// ══════════════════════════════════════════════════════════════
//  GAMIFICAÇÃO — XP, Níveis, Conquistas
// ══════════════════════════════════════════════════════════════

// ── LEVELS ────────────────────────────────────────────────────
var LEVELS = [
  { min:0,     max:500,   num:1,  name:'Iniciante',      icon:'🌱' },
  { min:500,   max:1200,  num:2,  name:'Estudante',      icon:'📖' },
  { min:1200,  max:2500,  num:3,  name:'Dedicado',       icon:'🎯' },
  { min:2500,  max:4500,  num:4,  name:'Focado',         icon:'🔥' },
  { min:4500,  max:7000,  num:5,  name:'Persistente',    icon:'⚡' },
  { min:7000,  max:10000, num:6,  name:'Disciplinado',   icon:'🏆' },
  { min:10000, max:14000, num:7,  name:'Estrategista',   icon:'🧠' },
  { min:14000, max:19000, num:8,  name:'Expert',         icon:'💎' },
  { min:19000, max:25000, num:9,  name:'Mestre',         icon:'🌟' },
  { min:25000, max:Infinity, num:10, name:'Lendário',    icon:'👑' }
];

function getLevelInfo(xp){
  for(var i=LEVELS.length-1;i>=0;i--){
    if(xp>=LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

// ── XP CALCULATION ─────────────────────────────────────────────
function calcTotalXP(){
  var xp = 0;
  var mps = minsPerSub();
  // 1 XP per minute studied
  xp += DB.data.sessions.reduce(function(a,s){ return a+s.mins; }, 0);
  // Streak bonus: 50 XP per streak day
  xp += calcStreak() * 50;
  // Session count bonus: 10 XP per session
  xp += DB.data.sessions.length * 10;
  // Subject diversity: 100 XP per subject with >60min
  DB.data.subjects.forEach(function(s){
    if((mps[s.id]||0) >= 60) xp += 100;
  });
  // Achievement bonuses counted separately
  var achBonus = 0;
  ACHIEVEMENTS.forEach(function(a){
    if(isUnlocked(a.id)) achBonus += a.xp;
  });
  xp += achBonus;
  return xp;
}

// ── ACHIEVEMENTS DEFINITION ────────────────────────────────────
var ACHIEVEMENTS = [
  // Sessões
  { id:'first_session',   icon:'🎉', name:'Primeira Sessão',    desc:'Registre sua primeira sessão de estudo',          xp:100, check:function(){ return DB.data.sessions.length >= 1; } },
  { id:'sessions_10',     icon:'📚', name:'10 Sessões',         desc:'Complete 10 sessões de estudo',                   xp:200, check:function(){ return DB.data.sessions.length >= 10; } },
  { id:'sessions_50',     icon:'🏅', name:'50 Sessões',         desc:'Complete 50 sessões de estudo',                   xp:500, check:function(){ return DB.data.sessions.length >= 50; } },
  { id:'sessions_100',    icon:'💯', name:'Centenário',         desc:'Complete 100 sessões de estudo',                  xp:1000, check:function(){ return DB.data.sessions.length >= 100; } },
  // Horas
  { id:'hours_10',        icon:'⏰', name:'10 Horas',           desc:'Acumule 10 horas de estudo',                      xp:150, check:function(){ return DB.data.sessions.reduce(function(a,s){return a+s.mins;},0) >= 600; } },
  { id:'hours_50',        icon:'🕐', name:'50 Horas',           desc:'Acumule 50 horas de estudo',                      xp:400, check:function(){ return DB.data.sessions.reduce(function(a,s){return a+s.mins;},0) >= 3000; } },
  { id:'hours_100',       icon:'⌚', name:'100 Horas',          desc:'Acumule 100 horas de estudo',                     xp:800, check:function(){ return DB.data.sessions.reduce(function(a,s){return a+s.mins;},0) >= 6000; } },
  { id:'hours_500',       icon:'🌌', name:'500 Horas',          desc:'Acumule 500 horas — você é lendário!',            xp:3000, check:function(){ return DB.data.sessions.reduce(function(a,s){return a+s.mins;},0) >= 30000; } },
  // Streak
  { id:'streak_3',        icon:'🔥', name:'Chama Acesa',        desc:'Mantenha 3 dias seguidos de estudo',              xp:150, check:function(){ return calcStreak() >= 3; } },
  { id:'streak_7',        icon:'🌶️', name:'Semana Perfeita',    desc:'7 dias seguidos estudando',                       xp:350, check:function(){ return calcStreak() >= 7; } },
  { id:'streak_30',       icon:'🏆', name:'Mês Invicto',        desc:'30 dias seguidos sem falhar',                     xp:1500, check:function(){ return calcStreak() >= 30; } },
  { id:'streak_100',      icon:'💥', name:'Imparável',          desc:'100 dias seguidos — fenomenal!',                  xp:5000, check:function(){ return calcStreak() >= 100; } },
  // Matérias
  { id:'sub_3',           icon:'📂', name:'Multi-disciplinar',  desc:'Adicione 3 matérias diferentes',                  xp:100, check:function(){ return DB.data.subjects.length >= 3; } },
  { id:'sub_all',         icon:'🗂️', name:'Currículo Completo', desc:'Adicione 8 ou mais matérias',                     xp:300, check:function(){ return DB.data.subjects.length >= 8; } },
  { id:'sub_balanced',    icon:'⚖️', name:'Equilibrado',        desc:'Estude 5 matérias diferentes na mesma semana',    xp:400, check:function(){
    var ago=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    var sids=new Set(DB.data.sessions.filter(function(s){return s.date>=ago;}).map(function(s){return s.sid;}));
    return sids.size >= 5;
  }},
  // Sessão longa
  { id:'long_2h',         icon:'🎓', name:'Maratona 2h',        desc:'Complete uma sessão de 2 horas ou mais',          xp:200, check:function(){ return DB.data.sessions.some(function(s){return s.mins>=120;}); } },
  { id:'long_4h',         icon:'🦁', name:'Maratona 4h',        desc:'Complete uma sessão de 4 horas ou mais',          xp:500, check:function(){ return DB.data.sessions.some(function(s){return s.mins>=240;}); } },
  // Planejamento
  { id:'plan_weekly',     icon:'📅', name:'Planejador',         desc:'Adicione blocos em todos os 7 dias da semana',     xp:250, check:function(){
    var days = Object.keys(DB.data.weekBlocks||{});
    return days.filter(function(d){return (DB.data.weekBlocks[d]||[]).length>0;}).length >= 7;
  }},
  { id:'plan_longterm',   icon:'🗺️', name:'Visionário',         desc:'Gere seu Plano Total pela primeira vez',           xp:200, check:function(){ return !!DB.data.ltConfig; } },
  { id:'plan_calculator', icon:'🧮', name:'Estrategista',       desc:'Use a Calculadora de Horas',                      xp:150, check:function(){ return !!DB.data.planConfig; } },
  // Especiais
  { id:'night_owl',       icon:'🦉', name:'Coruja',             desc:'Registre uma sessão após as 22h',                  xp:200, check:function(){
    return DB.data.sessions.some(function(s){ return s.hour !== undefined && s.hour >= 22; });
  }},
  { id:'early_bird',      icon:'🌅', name:'Madrugador',         desc:'Registre uma sessão antes das 6h',                 xp:200, check:function(){
    return DB.data.sessions.some(function(s){ return s.hour !== undefined && s.hour < 6; });
  }},
  { id:'weekend',         icon:'🏖️', name:'Sem Descanso',       desc:'Estude em um sábado E em um domingo',             xp:300, check:function(){
    var hasSat=false, hasSun=false;
    DB.data.sessions.forEach(function(s){
      var d=new Date(s.date+'T12:00:00'); var dow=d.getDay();
      if(dow===6) hasSat=true; if(dow===0) hasSun=true;
    });
    return hasSat && hasSun;
  }},
  { id:'comeback',        icon:'💪', name:'Retorno Épico',      desc:'Retome os estudos após 7+ dias parado',            xp:300, check:function(){ return DB.data.gameFlags && DB.data.gameFlags.comeback; } },
];

// ── UNLOCK LOGIC ───────────────────────────────────────────────
function isUnlocked(id){
  return !!(DB.data.unlockedAchs && DB.data.unlockedAchs[id]);
}

function checkAchievements(){
  if(!DB.data.unlockedAchs) DB.data.unlockedAchs = {};
  var newlyUnlocked = [];
  ACHIEVEMENTS.forEach(function(a){
    if(!isUnlocked(a.id) && a.check()){
      DB.data.unlockedAchs[a.id] = todayStr();
      newlyUnlocked.push(a);
    }
  });
  if(newlyUnlocked.length){
    DB.save();
    newlyUnlocked.forEach(function(a, i){
      setTimeout(function(){
        showXPPopup(a.icon+' '+a.name+' desbloqueada! +'+a.xp+' XP');
      }, i * 1800);
    });
  }
  updateXPBar();
}

// ── XP BAR UPDATE ──────────────────────────────────────────────
function updateXPBar(){
  var totalXP = calcTotalXP();
  var lv = getLevelInfo(totalXP);
  var next = LEVELS.find(function(l){ return l.num === lv.num + 1; });
  var pct = next ? Math.round((totalXP - lv.min) / (next.min - lv.min) * 100) : 100;

  // Topbar bar
  var fill = document.getElementById('xp-bar-fill');
  var lvTop = document.getElementById('xp-level-top');
  var lbTop = document.getElementById('xp-label-top');
  if(fill) fill.style.width = Math.min(pct,100) + '%';
  if(lvTop) lvTop.textContent = 'Nv ' + lv.num;
  if(lbTop) lbTop.textContent = totalXP + ' XP';

  // Streak count in sidebar
  var sc = calcStreak();
  var scEl = document.getElementById('streak-count');
  var stEl = document.getElementById('streak-top');
  if(scEl) scEl.textContent = sc;
  if(stEl) stEl.textContent = sc;
}

// ── RENDER ACHIEVEMENTS PAGE ───────────────────────────────────
function renderAchievements(){
  var totalXP = calcTotalXP();
  var lv = getLevelInfo(totalXP);
  var next = LEVELS.find(function(l){ return l.num === lv.num+1; });
  var pct = next ? Math.round((totalXP - lv.min) / (next.min - lv.min) * 100) : 100;
  var unlocked = ACHIEVEMENTS.filter(function(a){ return isUnlocked(a.id); }).length;
  var totalMins = DB.data.sessions.reduce(function(a,s){ return a+s.mins; }, 0);

  // ── Banner ──
  var $= function(id){ return document.getElementById(id); };
  if($('ach-banner-icon'))  $('ach-banner-icon').textContent  = lv.icon;
  if($('ach-banner-level')) $('ach-banner-level').textContent = 'Nível ' + lv.num;
  if($('ach-banner-name'))  $('ach-banner-name').textContent  = lv.name;
  if($('ach-banner-sub'))   $('ach-banner-sub').textContent   = totalXP + ' XP · ' + unlocked + '/' + ACHIEVEMENTS.length + ' conquistas';
  if($('ach-banner-xp-cur'))  $('ach-banner-xp-cur').textContent  = totalXP;
  if($('ach-banner-xp-next')) $('ach-banner-xp-next').textContent = next ? next.min : '∞';
  if($('ach-banner-bar'))     $('ach-banner-bar').style.width = Math.min(pct,100) + '%';
  if($('ach-banner-next-lv')) $('ach-banner-next-lv').textContent = next ? 'Próximo: Nv' + next.num + ' ' + next.name : '🏆 Nível máximo!';

  // ── Stats ──
  if($('ach-s-xp'))       $('ach-s-xp').textContent       = totalXP;
  if($('ach-s-streak'))   $('ach-s-streak').textContent   = calcStreak();
  if($('ach-s-badges'))   $('ach-s-badges').textContent   = unlocked + '/' + ACHIEVEMENTS.length;
  if($('ach-s-hours'))    $('ach-s-hours').textContent    = Math.floor(totalMins/60) + 'h';
  if($('ach-s-sessions')) $('ach-s-sessions').textContent = DB.data.sessions.length;

  // ── Filter state ──
  var activeFilter = 'all';
  var tabs = document.querySelectorAll('.ach-filter-tab');
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      activeFilter = t.dataset.filter;
      renderAchGrid(activeFilter);
    });
  });
  renderAchGrid(activeFilter);

  // ── Roadmap ──
  var roadmap = document.getElementById('ach-roadmap');
  if(roadmap){
    roadmap.innerHTML = LEVELS.map(function(l){
      var state = lv.num > l.num ? 'done' : lv.num === l.num ? 'current' : '';
      return '<div class="ach-roadmap-step ' + state + '">' +
        '<div class="ach-roadmap-node">' + l.icon + '</div>' +
        '<div class="ach-roadmap-lv">Nv ' + l.num + '</div>' +
        '<div class="ach-roadmap-name">' + l.name + '</div>' +
        '</div>';
    }).join('');
  }
}

function renderAchGrid(filter){
  var grid = document.getElementById('achievements-grid');
  if(!grid) return;

  // Rarity map
  var rarities = {
    first_session:'common', sessions_10:'common', sessions_50:'rare', sessions_100:'epic',
    hours_10:'common', hours_50:'rare', hours_100:'epic', hours_500:'legendary',
    streak_3:'common', streak_7:'rare', streak_30:'epic', streak_100:'legendary',
    sub_3:'common', sub_all:'rare', sub_balanced:'rare',
    long_2h:'common', long_4h:'rare',
    plan_weekly:'common', plan_longterm:'common', plan_calculator:'common',
    night_owl:'rare', early_bird:'rare', weekend:'common', comeback:'rare'
  };

  // Progress hints for locked achievements
  function getProgress(a){
    var sessions = DB.data.sessions;
    var totalMins = sessions.reduce(function(x,s){ return x+s.mins; }, 0);
    var streak = calcStreak();
    if(a.id==='sessions_10')  return { cur: Math.min(sessions.length,10), max:10 };
    if(a.id==='sessions_50')  return { cur: Math.min(sessions.length,50), max:50 };
    if(a.id==='sessions_100') return { cur: Math.min(sessions.length,100), max:100 };
    if(a.id==='hours_10')  return { cur: Math.min(Math.floor(totalMins/60),10), max:10 };
    if(a.id==='hours_50')  return { cur: Math.min(Math.floor(totalMins/60),50), max:50 };
    if(a.id==='hours_100') return { cur: Math.min(Math.floor(totalMins/60),100), max:100 };
    if(a.id==='hours_500') return { cur: Math.min(Math.floor(totalMins/60),500), max:500 };
    if(a.id==='streak_3')  return { cur: Math.min(streak,3), max:3 };
    if(a.id==='streak_7')  return { cur: Math.min(streak,7), max:7 };
    if(a.id==='streak_30') return { cur: Math.min(streak,30), max:30 };
    if(a.id==='streak_100')return { cur: Math.min(streak,100), max:100 };
    if(a.id==='sub_3')     return { cur: Math.min(DB.data.subjects.length,3), max:3 };
    if(a.id==='sub_all')   return { cur: Math.min(DB.data.subjects.length,8), max:8 };
    return null;
  }

  var sorted = ACHIEVEMENTS.slice().sort(function(a,b){
    var ra = rarityOrder(rarities[a.id]||'common');
    var rb = rarityOrder(rarities[b.id]||'common');
    var ua = isUnlocked(a.id) ? 1 : 0;
    var ub = isUnlocked(b.id) ? 1 : 0;
    if(ua !== ub) return ub - ua;
    return rb - ra;
  });

  function rarityOrder(r){ return {legendary:4,epic:3,rare:2,common:1}[r]||1; }

  var filtered = sorted.filter(function(a){
    if(filter === 'unlocked') return isUnlocked(a.id);
    if(filter === 'locked')   return !isUnlocked(a.id);
    return true;
  });

  var rarityLabel = { common:'Comum', rare:'Raro', epic:'Épico', legendary:'Lendário' };

  grid.innerHTML = filtered.map(function(a){
    var unlk = isUnlocked(a.id);
    var rarity = rarities[a.id] || 'common';
    var dateStr = unlk && DB.data.unlockedAchs && DB.data.unlockedAchs[a.id] ? fmtDate(DB.data.unlockedAchs[a.id]) : '';
    var prog = !unlk ? getProgress(a) : null;
    var progHtml = '';
    if(prog){
      var pp = Math.round(prog.cur/prog.max*100);
      progHtml = '<div class="ach-item-progress">' +
        '<div class="ach-item-prog-track"><div class="ach-item-prog-fill" style="width:'+pp+'%"></div></div>' +
        '<div class="ach-item-prog-label">'+prog.cur+'/'+prog.max+'</div>' +
        '</div>';
    }
    return '<div class="ach-item '+(unlk?'unlocked':'locked')+' '+rarity+'">' +
      '<span class="ach-item-rarity rarity-'+rarity+'">'+rarityLabel[rarity]+'</span>' +
      '<div class="ach-item-check"><i class="fa-solid fa-check"></i></div>' +
      '<div class="ach-item-emoji">'+a.icon+'</div>' +
      '<div class="ach-item-name">'+a.name+'</div>' +
      '<div class="ach-item-desc">'+a.desc+'</div>' +
      '<div class="ach-item-xp">+'+a.xp+' XP</div>' +
      (dateStr ? '<div class="ach-item-date">'+dateStr+'</div>' : '') +
      progHtml +
      '</div>';
  }).join('');

  if(!filtered.length){
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-trophy" style="font-size:2rem;opacity:.2;display:block;margin-bottom:10px"></i><p style="font-size:.88rem">Nenhuma conquista nesta categoria ainda.</p></div>';
  }
}

function showXPPopup(msg){
  var existing = document.getElementById('xp-popup-el');
  if(existing) existing.remove();
  var el = document.createElement('div');
  el.id = 'xp-popup-el';
  el.className = 'xp-popup';
  el.innerHTML = '<i class="fa-solid fa-bolt"></i><span>'+msg+'</span>';
  document.body.appendChild(el);
  clearTimeout(xpPopupTimeout);
  xpPopupTimeout = setTimeout(function(){
    if(el.parentNode) el.remove();
  }, 3500);
}

// ── HOOK INTO EXISTING FUNCTIONS ───────────────────────────────
// Wrap addSession to tag hour and trigger gamification
var _origAddSession = addSession;
addSession = function(sid, mins, date, mode){
  _origAddSession(sid, mins, date, mode);
  // Tag hour on last session
  var last = DB.data.sessions[DB.data.sessions.length-1];
  if(last) last.hour = new Date().getHours();
  // Comeback detection
  if(DB.data.sessions.length >= 2){
    var sorted = DB.data.sessions.slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
    if(sorted.length >= 2){
      var gap = (new Date(sorted[0].date) - new Date(sorted[1].date)) / 86400000;
      if(gap >= 7){
        if(!DB.data.gameFlags) DB.data.gameFlags = {};
        DB.data.gameFlags.comeback = true;
      }
    }
  }
  DB.save();
  checkAchievements();
  updateXPBar();
};

// ══════════════════════════════════════════════════════════════
//  RANKING DE AMIGOS + NOTIFICAÇÕES PUSH
// ══════════════════════════════════════════════════════════════

// ── CÓDIGO ÚNICO ──────────────────────────────────────────────
function generateUserCode(){
  if(DB.data.userCode) return DB.data.userCode;
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code='';
  for(var i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  DB.data.userCode=code; DB.save();
  return code;
}

// ── FRIENDS DATA ──────────────────────────────────────────────
// DB.data.friends = [{code,name,photo,weekMins,totalXP,streak,addedAt}]
function getFriends(){ return DB.data.friends||[]; }

function buildMeEntry(){
  var totalMins=DB.data.sessions.reduce(function(a,s){return a+s.mins;},0);
  var ago=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  var weekMins=DB.data.sessions.filter(function(s){return s.date>=ago;}).reduce(function(a,s){return a+s.mins;},0);
  return {
    code: generateUserCode(),
    name: DB.data.displayName || (currentUser&&currentUser.displayName) || 'Você',
    photo: currentUser&&currentUser.photoURL ? currentUser.photoURL : null,
    weekMins: weekMins,
    totalXP: calcTotalXP(),
    streak: calcStreak(),
    isMe: true
  };
}

function addFriend(code){
  code=code.trim().toUpperCase();
  if(!code||code.length!==6){ return {ok:false,msg:'Código inválido. Use 6 caracteres.'}; }
  if(code===generateUserCode()){ return {ok:false,msg:'Esse é o seu próprio código!'}; }
  var friends=getFriends();
  if(friends.find(function(f){return f.code===code;})){ return {ok:false,msg:'Amigo já adicionado.'}; }
  if(friends.length>=20){ return {ok:false,msg:'Limite de 20 amigos atingido.'}; }
  // For demo: create a simulated friend entry
  // In production with backend, would fetch from server
  var names=['Ana Júlia','Carlos Eduardo','Fernanda Lima','Rafael Souza','Beatriz Costa','Thiago Mendes','Larissa Oliveira','Pedro Alves'];
  var n=names[Math.floor(Math.random()*names.length)];
  var newFriend={
    code:code,
    name:n,
    photo:null,
    weekMins:Math.floor(Math.random()*600+60),
    totalXP:Math.floor(Math.random()*8000+500),
    streak:Math.floor(Math.random()*30),
    addedAt:todayStr(),
    isDemo:true
  };
  if(!DB.data.friends) DB.data.friends=[];
  DB.data.friends.push(newFriend);
  DB.save();
  return {ok:true,friend:newFriend};
}

function removeFriend(code){
  DB.data.friends=(DB.data.friends||[]).filter(function(f){return f.code!==code;});
  DB.save();
}

// ── RENDER RANKING PAGE ───────────────────────────────────────
var rankTab='week';
function renderRankingPage(){
  // Show user code
  var codeEl=document.getElementById('my-rank-code');
  if(codeEl) codeEl.textContent=generateUserCode();

  renderFriendList();

  // Tab handlers
  document.querySelectorAll('.rank-tab').forEach(function(t){
    t.addEventListener('click',function(){
      document.querySelectorAll('.rank-tab').forEach(function(x){x.classList.remove('active');});
      t.classList.add('active');
      rankTab=t.dataset.rtab;
      renderFriendList();
    });
  });
}

function renderFriendList(){
  var list=document.getElementById('friend-rank-list'); if(!list) return;
  var me=buildMeEntry();
  var friends=getFriends();
  var all=[me].concat(friends);

  // Sort by selected tab
  all.sort(function(a,b){
    return rankTab==='week'?(b.weekMins-a.weekMins):(b.totalXP-a.totalXP);
  });

  if(all.length<=1&&!friends.length){
    list.innerHTML='<div class="fr-empty"><i class="fa-solid fa-users"></i><p>Nenhum amigo adicionado ainda</p><span>Use o código acima para convidar seus amigos!</span></div>';
    return;
  }

  list.innerHTML=all.map(function(f,i){
    var pos=i+1;
    var pc=pos===1?'gold':pos===2?'silver':pos===3?'bronze':'';
    var posStr=pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':'#'+pos;
    var score=rankTab==='week'?+(f.weekMins/60).toFixed(1)+'h':f.totalXP+' XP';
    var scoreLbl=rankTab==='week'?'esta semana':'XP total';
    var avatarHtml=f.photo?
      '<img src="'+f.photo+'" alt=""/>':
      '<span>'+((f.name||'?')[0]).toUpperCase()+'</span>';
    var removeBtn=f.isMe?'':'<button class="fr-remove" data-code="'+f.code+'" title="Remover"><i class="fa-solid fa-user-minus"></i></button>';
    return '<div class="friend-rank-item'+(f.isMe?' me':'')+'">'+
      '<div class="fr-pos '+pc+'">'+posStr+'</div>'+
      '<div class="fr-avatar">'+avatarHtml+'</div>'+
      '<div class="fr-info">'+
        '<div class="fr-name">'+(f.isMe?'Você ('+f.name+')':f.name)+(f.isDemo?' <span style="font-size:.65rem;opacity:.5">(demo)</span>':'')+'</div>'+
        '<div class="fr-detail">'+
          '<span class="fr-streak"><i class="fa-solid fa-fire"></i>'+f.streak+'</span>'+
          '<span>Cód: '+f.code+'</span>'+
        '</div>'+
      '</div>'+
      '<div><div class="fr-score">'+score+'</div><div class="fr-score-lbl">'+scoreLbl+'</div></div>'+
      removeBtn+
      '</div>';
  }).join('');

  // Remove friend buttons
  list.querySelectorAll('.fr-remove').forEach(function(b){
    b.addEventListener('click',function(){
      confirm2('Remover amigo','Remover este amigo do ranking?',function(){
        removeFriend(b.dataset.code);
        renderFriendList();
        toast('Amigo removido.','info');
      });
    });
  });
}

// ── NOTIFICATIONS ──────────────────────────────────────────────
var notifCheckInterval=null;

function getNotifConfig(){
  return DB.data.notifConfig||{daily:false,goal:true,streak:true,time:'20:00'};
}
function saveNotifConfig(cfg){
  DB.data.notifConfig=cfg; DB.save();
}

function updateNotifStatusBadge(){
  var badge=document.getElementById('notif-status-badge'); if(!badge) return;
  var perm=Notification.permission;
  if(perm==='granted'){
    badge.className='notif-status granted';
    badge.innerHTML='<i class="fa-solid fa-circle-check"></i> Notificações ativadas';
  } else if(perm==='denied'){
    badge.className='notif-status denied';
    badge.innerHTML='<i class="fa-solid fa-circle-xmark"></i> Bloqueadas pelo navegador';
  } else {
    badge.className='notif-status default';
    badge.innerHTML='<i class="fa-solid fa-circle-info"></i> Clique em "Ativar Notificações"';
  }
}

function requestNotifPermission(){
  if(!('Notification' in window)){
    toast('Seu navegador não suporta notificações.','error'); return;
  }
  Notification.requestPermission().then(function(perm){
    updateNotifStatusBadge();
    if(perm==='granted'){
      toast('Notificações ativadas!','success');
      // Send test notification
      setTimeout(function(){
        sendNotif('SolisWeb ✓','Notificações configuradas com sucesso! Bons estudos 📚',null);
      },500);
      startNotifScheduler();
    } else if(perm==='denied'){
      toast('Notificações bloqueadas. Ative nas configurações do navegador.','error');
    }
  });
}

function sendNotif(title,body,icon){
  if(Notification.permission!=='granted') return;
  try {
    var n=new Notification(title,{
      body:body,
      icon:icon||'icons/icon-192.png',
      badge:'icons/icon-96.png',
      tag:'solisweb-notif',
      renotify:true
    });
    n.onclick=function(){ window.focus(); navigate('timer'); n.close(); };
  } catch(e){ console.warn('[Notif]',e); }
}

function checkAndNotify(){
  var cfg=getNotifConfig(); if(!cfg.daily&&!cfg.streak&&!cfg.goal) return;
  var now=new Date();
  var todayMins=todaySessions().reduce(function(a,s){return a+s.mins;},0);
  var goalMins=getDailyGoalMins();

  // Goal achieved notification
  if(cfg.goal && todayMins>=goalMins && goalMins>0){
    var lastGoalNotif=localStorage.getItem('sw_goal_notif_'+todayStr());
    if(!lastGoalNotif){
      localStorage.setItem('sw_goal_notif_'+todayStr(),'1');
      sendNotif('🎯 Meta diária atingida!','Você estudou '+fmtTime(todayMins)+' hoje. Parabéns, continue assim!',null);
    }
  }

  // Daily reminder
  if(cfg.daily && cfg.time){
    var parts=cfg.time.split(':');
    var notifH=parseInt(parts[0]), notifM=parseInt(parts[1]);
    var nowH=now.getHours(), nowMin=now.getMinutes();
    var isTime=(nowH===notifH && nowMin>=notifM && nowMin<notifM+10);
    if(isTime && todayMins===0){
      var lastDailyNotif=localStorage.getItem('sw_daily_notif_'+todayStr());
      if(!lastDailyNotif){
        localStorage.setItem('sw_daily_notif_'+todayStr(),'1');
        sendNotif('📚 Hora de estudar!','Você ainda não estudou hoje. Que tal uma sessão agora?',null);
      }
    }
  }

  // Streak at risk (22:00 and hasn't studied yet)
  if(cfg.streak && now.getHours()===22 && todayMins===0 && calcStreak()>0){
    var lastStreakNotif=localStorage.getItem('sw_streak_notif_'+todayStr());
    if(!lastStreakNotif){
      localStorage.setItem('sw_streak_notif_'+todayStr(),'1');
      sendNotif('🔥 Streak em risco!','Seu streak de '+calcStreak()+' dias vai quebrar à meia-noite! Estude agora para manter.',null);
    }
  }
}

function startNotifScheduler(){
  if(notifCheckInterval) clearInterval(notifCheckInterval);
  notifCheckInterval=setInterval(checkAndNotify, 60000); // check every minute
  checkAndNotify(); // check immediately
}

function initNotifSettings(){
  var cfg=getNotifConfig();
  var dailyTog=document.getElementById('notif-daily-toggle');
  var goalTog=document.getElementById('notif-goal-toggle');
  var streakTog=document.getElementById('notif-streak-toggle');
  var timeInp=document.getElementById('notif-time');
  var reqBtn=document.getElementById('btn-req-notif');
  var saveBtn=document.getElementById('btn-save-notif');

  if(dailyTog) dailyTog.checked=cfg.daily;
  if(goalTog)  goalTog.checked=cfg.goal;
  if(streakTog) streakTog.checked=cfg.streak;
  if(timeInp)  timeInp.value=cfg.time||'20:00';

  updateNotifStatusBadge();

  if(reqBtn) reqBtn.addEventListener('click',requestNotifPermission);
  if(saveBtn) saveBtn.addEventListener('click',function(){
    var newCfg={
      daily:dailyTog?dailyTog.checked:false,
      goal:goalTog?goalTog.checked:true,
      streak:streakTog?streakTog.checked:true,
      time:timeInp?timeInp.value:'20:00'
    };
    saveNotifConfig(newCfg);
    toast('Configurações salvas!','success');
    if(Notification.permission==='granted') startNotifScheduler();
  });

  // Auto-start scheduler if already permitted
  if(Notification.permission==='granted') startNotifScheduler();
}

function initRankingPage(){
  renderRankingPage();

  // Copy code button
  var copyBtn=document.getElementById('btn-copy-code');
  if(copyBtn) copyBtn.addEventListener('click',function(){
    var code=generateUserCode();
    navigator.clipboard.writeText(code).then(function(){
      copyBtn.innerHTML='<i class="fa-solid fa-check"></i> Copiado!';
      setTimeout(function(){ copyBtn.innerHTML='<i class="fa-solid fa-copy"></i> Copiar'; },2000);
    }).catch(function(){
      toast('Código: '+code,'info');
    });
  });

  // Add friend button
  var addBtn=document.getElementById('btn-add-friend');
  var addInp=document.getElementById('friend-code-input');
  var addHint=document.getElementById('add-friend-hint');
  if(addBtn) addBtn.addEventListener('click',function(){
    var result=addFriend(addInp.value);
    if(result.ok){
      addInp.value='';
      if(addHint){ addHint.textContent=''; addHint.style.color=''; }
      renderFriendList();
      toast('Amigo '+result.friend.name+' adicionado!','success');
    } else {
      if(addHint){ addHint.textContent=result.msg; addHint.style.color='var(--danger)'; }
      toast(result.msg,'error');
    }
  });
  if(addInp) addInp.addEventListener('keydown',function(e){
    if(e.key==='Enter') addBtn.click();
    addInp.value=addInp.value.toUpperCase();
  });
}

// Hook goal notification into session saving
var _origAddSessionOld = addSession;
addSession = function(sid,mins,date,mode){
  _origAddSessionOld(sid,mins,date,mode);
  // Check goal after saving
  setTimeout(function(){
    var cfg=getNotifConfig();
    if(cfg.goal && Notification.permission==='granted'){
      var todayMins=todaySessions().reduce(function(a,s){return a+s.mins;},0);
      var goalMins=getDailyGoalMins();
      if(todayMins>=goalMins && goalMins>0){
        var key='sw_goal_notif_'+todayStr();
        if(!localStorage.getItem(key)){
          localStorage.setItem(key,'1');
          sendNotif('🎯 Meta diária atingida!','Você estudou '+fmtTime(todayMins)+' hoje. Continue assim!',null);
        }
      }
    }
  },500);
};

// ══════════════════════════════════════════════════════════════
//  AMIGOS, RANKING & NOTIFICAÇÕES PUSH
// ══════════════════════════════════════════════════════════════

// ── CÓDIGO DE AMIGO ────────────────────────────────────────────
function genFriendCode(){
  if(DB.data.friendCode) return DB.data.friendCode;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for(var i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
  DB.data.friendCode = code;
  DB.save();
  return code;
}

function getMyProfile(){
  var totalMins = DB.data.sessions.reduce(function(a,s){return a+s.mins;},0);
  var ago = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  var weekMinsVal = DB.data.sessions.filter(function(s){return s.date>=ago;}).reduce(function(a,s){return a+s.mins;},0);
  return {
    code: genFriendCode(),
    name: DB.data.displayName || (currentUser&&currentUser.displayName) || 'Você',
    xp: calcTotalXP(),
    weekMins: weekMinsVal,
    totalMins: totalMins,
    streak: calcStreak(),
    level: getLevelInfo(calcTotalXP()).num
  };
}

// ── FRIENDS DATA ───────────────────────────────────────────────
function getFriends(){ return DB.data.friends || []; }

function addFriend(code){
  code = code.toUpperCase().trim();
  if(!code || code.length !== 6){ toast('Código inválido. Use 6 caracteres.','error'); return; }
  if(code === genFriendCode()){ toast('Esse é o seu próprio código!','error'); return; }
  var friends = getFriends();
  if(friends.find(function(f){return f.code===code;})){ toast('Amigo já adicionado.','error'); return; }

  // In a real app this would query a server. For now we create a simulated friend profile
  // stored locally with the code as identifier
  friends.push({
    code: code,
    name: 'Amigo '+code,
    xp: Math.floor(Math.random()*8000)+500,
    weekMins: Math.floor(Math.random()*600)+60,
    totalMins: Math.floor(Math.random()*18000)+1000,
    streak: Math.floor(Math.random()*30),
    level: Math.floor(Math.random()*6)+1,
    addedAt: todayStr()
  });
  DB.data.friends = friends;
  DB.save();
  renderFriendsPage();
  toast('Amigo adicionado! Código: '+code,'success');
}

function removeFriend(code){
  confirm2('Remover amigo','Remover este amigo do seu ranking?',function(){
    DB.data.friends = (DB.data.friends||[]).filter(function(f){return f.code!==code;});
    DB.save(); renderFriendsPage();
    toast('Amigo removido.','info');
  });
}

// ── RENDER FRIENDS PAGE ────────────────────────────────────────
var rankMode = 'week';

function renderFriendsPage(){
  var code = genFriendCode();
  var codeEl = document.getElementById('my-friend-code');
  if(codeEl) codeEl.textContent = code;

  var friends = getFriends();
  document.getElementById('friends-count').textContent = friends.length;

  // Friends list
  var listEl = document.getElementById('friends-list');
  if(listEl){
    if(!friends.length){
      listEl.innerHTML = '<div class="rank-empty"><i class="fa-solid fa-user-group"></i><p>Nenhum amigo adicionado ainda.<br/>Compartilhe seu código!</p></div>';
    } else {
      listEl.innerHTML = friends.map(function(f){
        var lv = getLevelInfo(f.xp||0);
        return '<div class="friend-item">'+
          '<div class="friend-avatar">'+f.name[0].toUpperCase()+'</div>'+
          '<div style="flex:1"><div class="friend-name">'+f.name+'</div>'+
          '<div class="friend-xp">'+lv.icon+' Nv'+lv.num+' · '+f.xp+' XP</div></div>'+
          '<button class="friend-remove" data-code="'+f.code+'" title="Remover"><i class="fa-solid fa-user-xmark"></i></button>'+
          '</div>';
      }).join('');
      listEl.querySelectorAll('.friend-remove').forEach(function(b){
        b.addEventListener('click',function(){ removeFriend(b.dataset.code); });
      });
    }
  }

  renderFriendsRanking(rankMode);
  renderNotifStatus();
}

function renderFriendsRanking(mode){
  rankMode = mode;
  var me = getMyProfile();
  var friends = getFriends();

  // Build combined list: me + friends
  var all = friends.map(function(f){
    return {name:f.name, xp:f.xp||0, weekMins:f.weekMins||0, totalMins:f.totalMins||0,
            level:f.level||1, isMe:false, code:f.code};
  });
  all.push({name:me.name+' (você)', xp:me.xp, weekMins:me.weekMins,
             totalMins:me.totalMins, level:me.level, isMe:true, code:me.code});

  // Sort
  all.sort(function(a,b){
    return mode==='week' ? b.weekMins-a.weekMins : b.xp-a.xp;
  });

  var el = document.getElementById('friends-ranking');
  if(!el) return;

  if(all.length<=1){
    el.innerHTML='<div class="rank-empty"><i class="fa-solid fa-trophy"></i><p>Adicione amigos para ver o ranking!</p></div>';
    return;
  }

  var posClass=['','gold','silver','bronze'];
  el.innerHTML = all.map(function(p,i){
    var pos = i+1;
    var pc = pos<=3 ? posClass[pos] : '';
    var val = mode==='week'
      ? fmtTime(p.weekMins)
      : p.xp+' XP';
    var lv = getLevelInfo(p.xp);
    return '<div class="rank-friend-row'+(p.isMe?' is-me':'')+'">'+
      '<div class="rank-friend-pos '+pc+'">#'+pos+'</div>'+
      '<div class="rank-friend-avatar">'+p.name[0].toUpperCase()+'</div>'+
      '<div><div class="rank-friend-name">'+p.name+'</div>'+
      '<div style="font-size:.7rem;color:var(--text-muted)">'+lv.icon+' Nv'+lv.num+' '+lv.name+'</div></div>'+
      (p.isMe?'<span class="rank-friend-me-badge">você</span>':'<span></span>')+
      '<div class="rank-friend-val">'+val+'</div>'+
      '</div>';
  }).join('');
}

// ── NOTIFICAÇÕES PUSH ──────────────────────────────────────────
var notifInterval = null;

function renderNotifStatus(){
  var toggle = document.getElementById('notif-toggle');
  var statusEl = document.getElementById('notif-status');
  var statusText = document.getElementById('notif-status-text');
  if(!toggle||!statusEl||!statusText) return;

  var saved = DB.data.notifSettings || {enabled:false, time:'20:00'};
  toggle.checked = !!saved.enabled;

  var timeInput = document.getElementById('notif-time');
  if(timeInput) timeInput.value = saved.time||'20:00';

  if(!('Notification' in window)){
    statusEl.className='notif-status warn';
    statusText.textContent='Notificações não suportadas neste navegador';
    return;
  }
  if(Notification.permission==='denied'){
    statusEl.className='notif-status warn';
    statusText.textContent='Permissão de notificação bloqueada. Habilite nas configurações do navegador.';
    return;
  }
  if(!saved.enabled){
    statusEl.className='notif-status off';
    statusText.textContent='Notificações desativadas';
    return;
  }
  if(Notification.permission==='granted'){
    statusEl.className='notif-status ok';
    statusText.textContent='✓ Ativo — lembrete às '+( saved.time||'20:00')+' se não estudar hoje';
  } else {
    statusEl.className='notif-status warn';
    statusText.textContent='Clique em Ativar para conceder permissão';
  }
}

function enableNotifications(enabled){
  if(!DB.data.notifSettings) DB.data.notifSettings={enabled:false,time:'20:00'};
  if(enabled && Notification.permission !== 'granted'){
    Notification.requestPermission().then(function(perm){
      if(perm==='granted'){
        DB.data.notifSettings.enabled=true; DB.save();
        scheduleNotifCheck();
        toast('Notificações ativadas!','success');
      } else {
        var toggle=document.getElementById('notif-toggle');
        if(toggle) toggle.checked=false;
        toast('Permissão negada. Habilite nas configurações do navegador.','error');
      }
      renderNotifStatus();
    });
  } else {
    DB.data.notifSettings.enabled=enabled; DB.save();
    if(enabled) scheduleNotifCheck(); else clearInterval(notifInterval);
    renderNotifStatus();
    toast(enabled?'Lembretes ativados!':'Lembretes desativados.', enabled?'success':'info');
  }
}

function saveNotifTime(t){
  if(!DB.data.notifSettings) DB.data.notifSettings={enabled:false,time:'20:00'};
  DB.data.notifSettings.time=t; DB.save();
  renderNotifStatus();
  toast('Horário salvo: '+t,'success');
}

function sendStudyReminder(){
  if(Notification.permission!=='granted') return;
  var todayMins=todaySessions().reduce(function(a,s){return a+s.mins;},0);
  if(todayMins>0) return; // Already studied today — no notification needed
  var streak=calcStreak();
  var msgs=[
    'Você ainda não estudou hoje! 📚 Não quebre sua sequência de '+streak+' dias.',
    'Hora de estudar! 🎯 Sua meta diária está esperando.',
    'Não esqueça de estudar hoje! 🔥 Mantenha o ritmo no SolisWeb.',
  ];
  var msg=msgs[Math.floor(Math.random()*msgs.length)];
  try {
    new Notification('SolisWeb — Lembrete de Estudo',{
      body:msg,
      icon:'icons/icon-192.png',
      badge:'icons/icon-72.png',
      tag:'study-reminder',
      renotify:false
    });
  } catch(e){ console.warn('[Notif] Error:', e); }
}

function testNotification(){
  if(Notification.permission!=='granted'){
    Notification.requestPermission().then(function(p){
      if(p==='granted'){
        new Notification('SolisWeb — Teste',{body:'Notificações funcionando! ✓',icon:'icons/icon-192.png',tag:'test'});
        toast('Notificação de teste enviada!','success');
      } else { toast('Permissão negada.','error'); }
      renderNotifStatus();
    });
  } else {
    new Notification('SolisWeb — Teste',{body:'Notificações funcionando! ✓',icon:'icons/icon-192.png',tag:'test'});
    toast('Notificação de teste enviada!','success');
  }
}

function scheduleNotifCheck(){
  clearInterval(notifInterval);
  notifInterval=setInterval(function(){
    var s=DB.data.notifSettings;
    if(!s||!s.enabled||Notification.permission!=='granted') return;
    var now=new Date();
    var parts=(s.time||'20:00').split(':');
    var h=parseInt(parts[0]),m=parseInt(parts[1]);
    if(now.getHours()===h&&now.getMinutes()===m){
      sendStudyReminder();
    }
  },60000); // Check every minute
}

// ── INIT FRIENDS & NOTIF ───────────────────────────────────────
function initFriendsPage(){
  genFriendCode();
  renderFriendsPage();

  // Wire rank tabs
  document.querySelectorAll('.rank-tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('.rank-tab').forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      renderFriendsRanking(tab.dataset.rank);
    });
  });

  // Copy code button
  var btnCopy=document.getElementById('btn-copy-code');
  if(btnCopy) btnCopy.addEventListener('click',function(){
    var code=genFriendCode();
    navigator.clipboard.writeText(code).then(function(){
      toast('Código copiado: '+code,'success');
    }).catch(function(){
      toast('Código: '+code,'info');
    });
  });

  // Add friend
  var btnAdd=document.getElementById('btn-add-friend');
  var inp=document.getElementById('friend-code-input');
  if(btnAdd) btnAdd.addEventListener('click',function(){
    addFriend(inp.value); inp.value='';
  });
  if(inp) inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'){ addFriend(inp.value); inp.value=''; }
    inp.value=inp.value.toUpperCase();
  });

  // Notification toggle
  var toggle=document.getElementById('notif-toggle');
  if(toggle) toggle.addEventListener('change',function(){ enableNotifications(this.checked); });

  // Notification time
  var timeInp=document.getElementById('notif-time');
  if(timeInp) timeInp.addEventListener('change',function(){ saveNotifTime(this.value); });

  // Test button
  var btnTest=document.getElementById('btn-test-notif');
  if(btnTest) btnTest.addEventListener('click',testNotification);
}

// Start notification scheduler on load
(function(){
  var s=DB.data.notifSettings;
  if(s&&s.enabled&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
    scheduleNotifCheck();
  }
})();
// ===== PROGRESS PAGE =====
var _progressRadarChart = null;

function loadProgressData() {
  return DB.data.progressData || {};
}

function saveProgressData(data) {
  DB.data.progressData = data;
  DB.save();
}

function renderProgressSliders() {
  var container = document.getElementById('progress-sliders');
  if (!container) return;
  var subs = DB.data.subjects;
  if (!subs || !subs.length) {
    container.innerHTML = '<p class="empty-hint">Adicione matérias na aba <strong>Matérias</strong> primeiro.</p>';
    return;
  }
  var saved = loadProgressData();
  container.innerHTML = subs.map(function(s) {
    var val = saved[s.id] !== undefined ? saved[s.id] : 0;
    return '<div class="progress-slider-item" data-id="' + s.id + '">' +
      '<div class="progress-slider-header">' +
        '<div class="progress-slider-name">' +
          '<div class="progress-slider-dot" style="background:' + s.color + '"></div>' +
          s.name +
        '</div>' +
        '<span class="progress-slider-pct" id="pct-' + s.id + '">' + val + '%</span>' +
      '</div>' +
      '<input type="range" class="progress-range" min="0" max="100" value="' + val + '" ' +
        'style="accent-color:' + s.color + '" ' +
        'data-id="' + s.id + '" id="range-' + s.id + '">' +
    '</div>';
  }).join('');

  // Bind slider events
  container.querySelectorAll('.progress-range').forEach(function(inp) {
    inp.addEventListener('input', function() {
      var id = inp.dataset.id;
      var pctEl = document.getElementById('pct-' + id);
      if (pctEl) pctEl.textContent = inp.value + '%';
    });
  });
}

function getProgressValues() {
  var values = {};
  var sliders = document.querySelectorAll('.progress-range');
  sliders.forEach(function(inp) {
    values[inp.dataset.id] = parseInt(inp.value, 10);
  });
  return values;
}

function renderProgressRadar() {
  var canvas = document.getElementById('progress-radar-chart');
  var emptyEl = document.getElementById('progress-radar-empty');
  if (!canvas) return;

  var subs = DB.data.subjects;
  if (!subs || !subs.length) {
    if (emptyEl) emptyEl.style.display = 'flex';
    canvas.style.display = 'none';
    return;
  }

  var values = getProgressValues();
  var labels = subs.map(function(s) { return s.name; });
  var data = subs.map(function(s) { return values[s.id] || 0; });
  var colors = subs.map(function(s) { return s.color; });

  if (emptyEl) emptyEl.style.display = 'none';
  canvas.style.display = 'block';

  var accentRgb = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#5b8ef5';

  var chartData = {
    labels: labels,
    datasets: [{
      label: 'Progresso (%)',
      data: data,
      backgroundColor: 'rgba(91,142,245,0.18)',
      borderColor: accentRgb,
      borderWidth: 2.5,
      pointBackgroundColor: colors,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: true
    }]
  };

  if (_progressRadarChart) {
    _progressRadarChart.data = chartData;
    _progressRadarChart.update();
  } else {
    var ctx = canvas.getContext('2d');
    _progressRadarChart = new Chart(ctx, {
      type: 'radar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) { return ' ' + ctx.raw + '%'; }
            }
          }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#4d5570',
              font: { size: 10 },
              callback: function(v) { return v + '%'; }
            },
            grid: { color: getComputedStyle(document.body).getPropertyValue('--border').trim() || 'rgba(255,255,255,0.07)' },
            angleLines: { color: getComputedStyle(document.body).getPropertyValue('--border').trim() || 'rgba(255,255,255,0.07)' },
            pointLabels: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#8b93a8',
              font: { size: 11, weight: '600' }
            }
          }
        }
      }
    });
  }

  // Update summary cards
  var summaryEl = document.getElementById('progress-summary');
  if (summaryEl) {
    summaryEl.innerHTML = subs.map(function(s) {
      var v = values[s.id] || 0;
      var color = v >= 80 ? 'var(--success)' : v >= 50 ? 'var(--warn)' : 'var(--danger)';
      return '<div class="progress-summary-item">' +
        '<div class="progress-summary-name" title="' + s.name + '">' + s.name + '</div>' +
        '<div class="progress-summary-val" style="color:' + color + '">' + v + '%</div>' +
      '</div>';
    }).join('');
  }
}

function initProgressPage() {
  renderProgressSliders();
  // Load saved values into sliders
  var saved = loadProgressData();
  Object.keys(saved).forEach(function(id) {
    var inp = document.getElementById('range-' + id);
    var pct = document.getElementById('pct-' + id);
    if (inp) { inp.value = saved[id]; }
    if (pct) { pct.textContent = saved[id] + '%'; }
  });
  renderProgressRadar();

  var btnUpdate = document.getElementById('btn-update-radar');
  if (btnUpdate) {
    btnUpdate.addEventListener('click', function() {
      renderProgressRadar();
      toast('Radar atualizado!', 'success');
    });
  }

  var btnSave = document.getElementById('btn-save-progress');
  if (btnSave) {
    btnSave.addEventListener('click', function() {
      var vals = getProgressValues();
      saveProgressData(vals);
      renderProgressRadar();
      toast('Progresso salvo!', 'success');
    });
  }
}
