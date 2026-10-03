import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const URL="https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUT=path.resolve("public/data");
fs.mkdirSync(OUT,{recursive:true});

console.log("Baixando base oficial do TSE...");
const res=await fetch(URL,{headers:{"user-agent":"Mozilla/5.0 Escolha2026/1.1"}});
if(!res.ok) throw new Error(`Falha ao baixar TSE: HTTP ${res.status}`);
const buf=Buffer.from(await res.arrayBuffer());
console.log("ZIP recebido:",Math.round(buf.length/1024/1024),"MB");

const zip=new AdmZip(buf);
const csvEntries=zip.getEntries().filter(e=>!e.isDirectory && /\.csv$/i.test(e.entryName));
if(!csvEntries.length) throw new Error("Nenhum CSV encontrado no ZIP do TSE.");
console.log("CSVs encontrados:",csvEntries.length);

const allowed=new Set(["PRESIDENTE","GOVERNADOR","SENADOR","DEPUTADO FEDERAL","DEPUTADO ESTADUAL","DEPUTADO DISTRITAL"]);
const byUF={};
let totalRead=0;

for(const entry of csvEntries){
  let text=entry.getData().toString("latin1");
  let rows;
  try{
    rows=parse(text,{columns:true,delimiter:";",skip_empty_lines:true,relax_quotes:true,relax_column_count:true,bom:true});
  }catch(err){
    console.warn("Ignorando CSV com erro:",entry.entryName,err.message);
    continue;
  }

  totalRead+=rows.length;

  for(const r of rows){
    const office=(r.DS_CARGO||"").trim().toUpperCase();
    if(!allowed.has(office)) continue;

    let uf=(r.SG_UF||"").trim().toUpperCase();
    if(office==="PRESIDENTE") uf="BR";
    if(!/^[A-Z]{2}$/.test(uf)) continue;

    const candidate={
      id:r.SQ_CANDIDATO||r.NR_CANDIDATO||"",
      uf,
      office,
      number:r.NR_CANDIDATO||"",
      name:r.NM_URNA_CANDIDATO||r.NM_CANDIDATO||"",
      full_name:r.NM_CANDIDATO||"",
      party:r.SG_PARTIDO||"",
      party_name:r.NM_PARTIDO||"",
      status:r.DS_SITUACAO_CANDIDATURA||r.DS_SITUACAO_CANDIDATO_PLEITO||"",
      occupation:r.DS_OCUPACAO||"",
      education:r.DS_GRAU_INSTRUCAO||"",
      birth_date:r.DT_NASCIMENTO||"",
      photo:""
    };

    if(!candidate.name || !candidate.number) continue;
    (byUF[uf]??=[]).push(candidate);
  }
}

for(const [uf,list] of Object.entries(byUF)){
  const unique=new Map();
  for(const c of list) unique.set(`${c.office}:${c.id}:${c.number}`,c);
  const final=[...unique.values()].sort((a,b)=>
    a.office.localeCompare(b.office,"pt-BR") ||
    Number(a.number)-Number(b.number) ||
    a.name.localeCompare(b.name,"pt-BR")
  );
  fs.writeFileSync(path.join(OUT,`${uf}.json`),JSON.stringify(final));
  console.log(uf,final.length,"registros");
}

const ufs=Object.keys(byUF).sort();
const records=ufs.reduce((n,uf)=>{
  try{return n+JSON.parse(fs.readFileSync(path.join(OUT,`${uf}.json`),"utf8")).length}
  catch{return n}
},0);

if(!ufs.includes("BR")) console.warn("ATENÇÃO: BR.json não foi gerado.");
if(ufs.length<20) throw new Error(`Poucas UFs geradas (${ufs.length}). Importação provavelmente incompleta.`);

const meta={
  updated_at:new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}),
  source:URL,
  csv_files:csvEntries.length,
  source_rows:totalRead,
  ufs,
  records
};
fs.writeFileSync(path.join(OUT,"index.json"),JSON.stringify(meta,null,2));
console.log("Concluído:",records,"registros em",ufs.length,"arquivos/UFs.");
