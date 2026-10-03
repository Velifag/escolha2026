import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const URL="https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUT=path.resolve("public/data");
fs.mkdirSync(OUT,{recursive:true});

console.log("Baixando base oficial do TSE...");
const res=await fetch(URL,{headers:{"user-agent":"Mozilla/5.0 Escolha2026/1.0"}});
if(!res.ok) throw new Error(`Falha TSE: ${res.status}`);
const buf=Buffer.from(await res.arrayBuffer());
console.log("ZIP recebido:",Math.round(buf.length/1024/1024),"MB");

const zip=new AdmZip(buf);
const entry=zip.getEntries().find(e=>/consulta_cand_2026.*\.csv$/i.test(e.entryName)) || zip.getEntries().find(e=>/\.csv$/i.test(e.entryName));
if(!entry) throw new Error("CSV não encontrado no ZIP do TSE.");
const csv=entry.getData().toString("latin1");

const rows=parse(csv,{columns:true,delimiter:";",skip_empty_lines:true,relax_quotes:true,bom:true});
const allowed=new Set(["PRESIDENTE","GOVERNADOR","SENADOR","DEPUTADO FEDERAL","DEPUTADO ESTADUAL","DEPUTADO DISTRITAL"]);
const byUF={};

for(const r of rows){
  const office=(r.DS_CARGO||"").trim().toUpperCase();
  let uf=(r.SG_UF||"").trim().toUpperCase();
  if(!allowed.has(office)) continue;
  if(office==="PRESIDENTE") uf="BR";
  if(!/^[A-Z]{2}$/.test(uf)) continue;
  const c={
    id:r.SQ_CANDIDATO||r.NR_CANDIDATO,
    uf,
    office,
    number:r.NR_CANDIDATO||"",
    name:r.NM_URNA_CANDIDATO||r.NM_CANDIDATO||"",
    full_name:r.NM_CANDIDATO||"",
    party:r.SG_PARTIDO||"",
    party_name:r.NM_PARTIDO||"",
    status:r.DS_SITUACAO_CANDIDATURA||"",
    occupation:r.DS_OCUPACAO||"",
    education:r.DS_GRAU_INSTRUCAO||"",
    birth_date:r.DT_NASCIMENTO||"",
    photo:""
  };
  (byUF[uf]??=[]).push(c);
}

for(const [uf,list] of Object.entries(byUF)){
  list.sort((a,b)=>a.office.localeCompare(b.office,"pt-BR")||Number(a.number)-Number(b.number)||a.name.localeCompare(b.name,"pt-BR"));
  fs.writeFileSync(path.join(OUT,`${uf}.json`),JSON.stringify(list));
}
const meta={updated_at:new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}),source:URL,ufs:Object.keys(byUF).sort(),records:Object.values(byUF).reduce((n,x)=>n+x.length,0)};
fs.writeFileSync(path.join(OUT,"index.json"),JSON.stringify(meta,null,2));
console.log("Concluído:",meta.records,"registros em",meta.ufs.length,"UFs.");
