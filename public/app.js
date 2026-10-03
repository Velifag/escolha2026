const UFS=[["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],["PE","Pernambuco"],["PI","Piauí"],["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","São Paulo"],["SE","Sergipe"],["TO","Tocantins"]];
const $=s=>document.querySelector(s);
const uf=$("#uf"),cargo=$("#cargo"),q=$("#q"),cards=$("#cards"),badge=$("#syncBadge"),meta=$("#meta");
const detail=$("#detail"),detailBody=$("#detailBody");
let all=[],deferredPrompt=null;
const state=JSON.parse(localStorage.getItem("escolha2026.selection")||'{"presidente":null,"governador":null,"senador":[],"federal":null,"estadual":null}');
if(!("presidente" in state)) state.presidente=null;
if(!("governador" in state)) state.governador=null;
UFS.forEach(([k,n])=>{const o=document.createElement("option");o.value=k;o.textContent=`${k} — ${n}`;if(k==="PR")o.selected=true;uf.appendChild(o)});
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function initials(n=""){return n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
async function load(){
  cards.innerHTML='<div class="empty">Carregando candidaturas…</div>';
  try{
    const scope=cargo.value==="PRESIDENTE"?"BR":uf.value;
    const r=await fetch(`./data/${scope}.json?ts=${Date.now()}`,{cache:"no-store"});
    if(!r.ok)throw new Error("Base ainda não publicada");
    all=await r.json();
    badge.textContent="Base oficial carregada";
    badge.style.background="#e7f5ed";badge.style.color="#176a47";
    render();
    try{
      const i=await fetch("./data/index.json",{cache:"no-store"}).then(r=>r.json());
      meta.textContent=`Atualizado em ${i.updated_at||"—"} • Fonte: TSE • ${all.length} registros ${cargo.value==="PRESIDENTE"?"nacionais":"na UF"}`;
    }catch{}
  }catch(e){
    all=[];badge.textContent="Base em atualização";
    cards.innerHTML='<div class="empty">Os dados oficiais ainda estão sendo preparados pela publicação automática. Tente novamente em alguns minutos.</div>';
    meta.textContent="";
  }
}
function key(c){return `${c.uf}-${c.id}`}
function selected(c){
  if(c.office==="PRESIDENTE")return state.presidente&&key(state.presidente)===key(c);
  if(c.office==="GOVERNADOR")return state.governador&&key(state.governador)===key(c);
  if(c.office==="SENADOR")return state.senador?.some(x=>key(x)===key(c));
  if(c.office==="DEPUTADO FEDERAL")return state.federal&&key(state.federal)===key(c);
  return state.estadual&&key(state.estadual)===key(c);
}
function selectCandidate(c){
  if(c.office==="PRESIDENTE")state.presidente=selected(c)?null:c;
  else if(c.office==="GOVERNADOR")state.governador=selected(c)?null:c;
  else if(c.office==="SENADOR"){
    state.senador=state.senador||[];
    const ix=state.senador.findIndex(x=>key(x)===key(c));
    if(ix>=0)state.senador.splice(ix,1);
    else{if(state.senador.length>=2)state.senador.shift();state.senador.push(c)}
  }else if(c.office==="DEPUTADO FEDERAL")state.federal=selected(c)?null:c;
  else state.estadual=selected(c)?null:c;
  save();render();renderBallot();
}
function save(){localStorage.setItem("escolha2026.selection",JSON.stringify(state))}
function filtered(){
  const term=q.value.trim().toLowerCase();
  let list=all.filter(x=>x.office===cargo.value);
  if(term)list=list.filter(x=>[x.name,x.full_name,x.number,x.party].some(v=>String(v||"").toLowerCase().includes(term)));
  return list;
}
function render(){
  const list=filtered();cards.innerHTML="";
  if(!list.length){cards.innerHTML='<div class="empty">Nenhuma candidatura encontrada para este filtro.</div>';return}
  list.forEach(c=>{
    const el=document.createElement("article");el.className="card";
    const photo=c.photo?`<img src="${esc(c.photo)}" alt="Foto oficial de ${esc(c.name)}" onerror="this.remove();this.parentElement.textContent='${initials(c.name)}'">`:initials(c.name);
    el.innerHTML=`<div class="card-head"><div class="avatar">${photo}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.party)} • ${esc(c.uf)}</p></div></div>
    <div class="row"><span>Número</span><b>${esc(c.number)}</b></div>
    <div class="row"><span>Situação</span><b>${esc(c.status||"—")}</b></div>
    <div class="card-actions"><button class="btn dark view">Ver ficha</button><button class="btn ${selected(c)?"selected":"dark"} pick">${selected(c)?"Selecionado":"Selecionar"}</button></div>`;
    el.querySelector(".view").addEventListener("click",()=>showDetail(c));
    el.querySelector(".pick").addEventListener("click",()=>selectCandidate(c));
    cards.appendChild(el);
  });
}
function showDetail(c){
  const p=c.photo?`<img src="${esc(c.photo)}" alt="Foto oficial de ${esc(c.name)}">`:initials(c.name);
  detailBody.innerHTML=`<div class="detail-grid"><div class="detail-photo">${p}</div><div><span class="eyebrow blue">${esc(c.office)}</span><h2>${esc(c.name)}</h2><p>${esc(c.full_name||"")}</p><strong>${esc(c.number)} • ${esc(c.party)}</strong></div></div>
  <div class="details">
    <div><small>Situação</small><b>${esc(c.status||"—")}</b></div>
    <div><small>UF</small><b>${esc(c.uf)}</b></div>
    <div><small>Ocupação</small><b>${esc(c.occupation||"—")}</b></div>
    <div><small>Escolaridade</small><b>${esc(c.education||"—")}</b></div>
    <div><small>Nascimento</small><b>${esc(c.birth_date||"—")}</b></div>
    <div><small>Partido</small><b>${esc(c.party_name||c.party)}</b></div>
  </div><p style="color:#728294;margin-top:18px">Fonte: dados públicos do Tribunal Superior Eleitoral.</p>`;
  detail.showModal();
}
function line(id,metaId,c){$(id).textContent=c?c.name:"Não selecionado";$(metaId).textContent=c?`${c.number} • ${c.party}`:"—"}
function renderBallot(){
  $("#ballotUF").textContent=uf.value;
  const [a,b]=state.senador||[];
  line("#f1","#f1m",state.federal);
  line("#e1","#e1m",state.estadual);
  line("#s1","#s1m",a);
  line("#s2","#s2m",b);
  line("#g1","#g1m",state.governador);
  line("#p1","#p1m",state.presidente);
  $("#miniP").textContent=state.presidente?`${state.presidente.name} (${state.presidente.number})`:"—";
  $("#miniG").textContent=state.governador?`${state.governador.name} (${state.governador.number})`:"—";
  $("#miniS1").textContent=a?`${a.name} (${a.number})`:"—";
  $("#miniS2").textContent=b?`${b.name} (${b.number})`:"—";
  $("#miniF").textContent=state.federal?`${state.federal.name} (${state.federal.number})`:"—";
  $("#miniE").textContent=state.estadual?`${state.estadual.name} (${state.estadual.number})`:"—";
}
uf.addEventListener("change",load);cargo.addEventListener("change",load);q.addEventListener("input",render);
$("#closeDetail").addEventListener("click",()=>detail.close());
$("#clearBtn").addEventListener("click",()=>{state.presidente=null;state.governador=null;state.senador=[];state.federal=null;state.estadual=null;save();render();renderBallot()});
$("#printBtn").addEventListener("click",()=>window.print());
async function shareSelection(){
  const [a,b]=state.senador||[];
  const text=`Minha seleção — Eleições 2026
1. Deputado Federal: ${state.federal?`${state.federal.name} — ${state.federal.number}`:"—"}
2. Deputado Estadual/Distrital: ${state.estadual?`${state.estadual.name} — ${state.estadual.number}`:"—"}
3. Senador 1: ${a?`${a.name} — ${a.number}`:"—"}
4. Senador 2: ${b?`${b.name} — ${b.number}`:"—"}
5. Governador: ${state.governador?`${state.governador.name} — ${state.governador.number}`:"—"}
6. Presidente: ${state.presidente?`${state.presidente.name} — ${state.presidente.number}`:"—"}

Confira sempre os dados oficiais do TSE.`;
  if(navigator.share){try{await navigator.share({title:"Escolha 2026",text});return}catch{}}
  prompt("Copie sua seleção:",text);
}
$("#shareBtn").addEventListener("click",shareSelection);
$("#mobileShare").addEventListener("click",shareSelection);
document.querySelectorAll(".mobile-dock [data-jump]").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"})));
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").hidden=true});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
renderBallot();load();