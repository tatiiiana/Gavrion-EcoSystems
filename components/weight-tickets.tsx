'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, Plus, Printer, Scale, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEconexoData } from '@/lib/econexo-data';
import { materialDisplayId } from '@/lib/code-rules';
import { supplierDisplayId, clientDisplayId } from '@/lib/party-codes';
import { createClient } from '@/lib/supabase/client';

type Line = {inventory_id:string;material_id?:string;supplier_id?:string;category?:string;code:string;material:string;bruto:number;tara:number;neto:number;cost_per_lb?:number;price:number;total:number};
type Ticket = {id:string;code:string;kind:'supplier'|'client';party_id:string;party:string;party_code:string;company:string;address:string;phone:string;operator:string;operator_id?:string;logo?:string;entered:string;exited:string;lines:Line[];total:number};
const key='gavrion-weight-tickets-v1';
const money=(n:number)=>'L '+n.toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});
const weight=(n:number)=>n.toLocaleString('es-HN',{maximumFractionDigits:4})+' lb';
const date=(s:string)=>s?new Date(s).toLocaleDateString('es-HN',{timeZone:'America/Tegucigalpa'}):'Al emitir';
const time=(s:string)=>s?new Date(s).toLocaleTimeString('es-HN',{timeZone:'America/Tegucigalpa',hour:'2-digit',minute:'2-digit'}):'Al emitir';

function Paper({ticket}:{ticket:Ticket}){
 return <article className="weight-paper">
 <header>{ticket.logo?<img src={ticket.logo} alt={ticket.company} style={{width:48,height:48,objectFit:'contain',margin:'0 auto'}}/>:null}<h2>{ticket.company}</h2><p>Dirección: {ticket.address||'Configura la dirección de la empresa'}</p><p>Teléfono: {ticket.phone||'—'}</p><span>BOLETA DE PESO · {ticket.code}</span></header>
 <div className="weight-dates"><p>Fecha de ingreso: <b>{date(ticket.entered)}</b></p><p>Hora de ingreso: <b>{time(ticket.entered)}</b></p><p>Fecha de salida: <b>{date(ticket.exited)}</b></p><p>Hora de salida: <b>{time(ticket.exited)}</b></p></div>
 <div className="weight-party"><span>Tipo: <b>{ticket.kind==='supplier'?'☑ Proveedor   ☐ Cliente':'☐ Proveedor   ☑ Cliente'}</b></span><span>Nombre: <b>{ticket.party||'Selecciona un registro'}</b></span><span>Código: <b>{ticket.party_code||'—'}</b></span></div>
 <h3>Datos de peso en libras</h3><div className="weight-table-scroll"><table><thead><tr>{['Código','Material','Bruto','Tara','Neto','Precio / lb','Total'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{ticket.lines.map((l,i)=><tr key={i}><td>{l.code}</td><td>{l.material}</td><td>{weight(l.bruto)}</td><td>{weight(l.tara)}</td><td><b>{weight(l.neto)}</b></td><td>{money(l.price)}</td><td>{money(l.total)}</td></tr>)}{!ticket.lines.length&&<tr><td colSpan={7} className="weight-empty">Selecciona un material para visualizar el pesaje.</td></tr>}</tbody></table></div>
 <div className="weight-grand"><span>Peso neto: {weight(ticket.lines.reduce((s,l)=>s+l.neto,0))}</span><strong>Total general: {money(ticket.total)}</strong></div>
 <footer><dl>{[['Pesaje',ticket.operator],['Postea',ticket.exited?ticket.operator:'Al emitir'],['Pago','Pendiente'],[ticket.kind==='supplier'?'Proveedor':'Cliente',ticket.party],['Código',ticket.party_code]].map(([a,b])=><div key={a}><dt>{a}:</dt><dd>{b||'—'}</dd></div>)}</dl><div className="weight-stamp">Sello</div></footer>
 </article>;
}

export function WeightTickets({notify}:{notify:(s:string,t?:'success'|'error')=>void}){
 const data=useEconexoData(); const {inventory,materials,suppliers,clients,settings,profiles,user,configured}=data;
 const [tickets,setTickets]=useState<Ticket[]>([]),[ready,setReady]=useState(false),[editing,setEditing]=useState(false),[selected,setSelected]=useState<Ticket|null>(null);
 const [kind,setKind]=useState<'supplier'|'client'>('supplier'),[partyId,setParty]=useState(''),[entered,setEntered]=useState(''),[draft,setDraft]=useState<{id:string;bruto:string;tara:string}[]>([]);
 const [operatorId,setOperatorId]=useState(user?.id??'');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 useEffect(()=>{let live=true;(async()=>{try{if(configured){const {data,error}=await createClient().from('weight_tickets').select('document').order('created_at',{ascending:false});if(error)throw error;if(live)setTickets((data??[]).map(x=>x.document as Ticket))}else{const saved=localStorage.getItem(key);if(saved&&live)setTickets(JSON.parse(saved))}}catch(e){if(live)setError(e instanceof Error?e.message:'No se pudieron cargar las boletas.')}finally{if(live)setReady(true)}})();return()=>{live=false}},[configured]);
 const parties=kind==='supplier'?suppliers:clients;const party=parties.find(x=>x.id===partyId);
 const available=inventory.filter(x=>kind==='supplier'?x.supplier_id===partyId:x.status==='available'&&x.pounds>0);
 const lines:Line[]=draft.map(d=>{const r=inventory.find(x=>x.id===d.id);const raw=Number(kind==='supplier'?r?.cost_price:r?.sale_price);const price=raw/(r?.unit==='ton'?2000:1)*(r?.currency==='USD'?Number(settings?.usd_to_lps_rate??24.75):1);const bruto=Number(d.bruto),tara=Number(d.tara),neto=Math.max(0,bruto-tara);return{inventory_id:d.id,material_id:r?.material_id,supplier_id:r?.supplier_id,category:r?.category,code:materials.find(m=>m.id===r?.material_id)?materialDisplayId(materials.find(m=>m.id===r?.material_id)!):r?.inventory_code??'',material:[r?.material,r?.category].filter(Boolean).join(' · '),bruto,tara,neto,cost_per_lb:Number(r?.cost_price??0)/(r?.unit==='ton'?2000:1)*(r?.currency==='USD'?Number(settings?.usd_to_lps_rate??24.75):1),price,total:Math.round(neto*price*100)/100}});
 const preview:Ticket={id:'preview',code:configured?'Se asigna al emitir':'BP-'+String(Math.max(0,...tickets.map(t=>Number(t.code.replace('BP-',''))||0))+1).padStart(6,'0'),kind,party_id:partyId,party:party?.name??'',party_code:party?(kind==='supplier'?supplierDisplayId(party):clientDisplayId(party)):'',company:settings?.name??'Gavrion EcoSystems',address:settings?.fiscal_address??'',phone:settings?.fiscal_phone??'',logo:settings?.logo_url??'',operator_id:operatorId,operator:profiles.find(x=>x.id===operatorId)?.full_name??'',entered,exited:'',lines,total:lines.reduce((s,l)=>s+l.total,0)};
 const start=()=>{setOperatorId(profiles.find(p=>p.id===user?.id&&p.active)?.id??profiles.find(p=>p.active)?.id??'');setEntered(new Date().toISOString());setDraft([]);setParty('');setError('');setSelected(null);setEditing(true)};
 const emit=async()=>{if(lock.current)return;setError('');if(!profiles.some(p=>p.id===operatorId&&p.active)){setError('Selecciona un responsable activo.');return}if(!party||!lines.length){setError('Selecciona un proveedor o cliente y al menos un material.');return}
 if(draft.some(d=>d.bruto===''||d.tara==='')||lines.some(l=>!Number.isFinite(l.bruto)||!Number.isFinite(l.tara)||!Number.isFinite(l.price)||l.bruto<=0||l.tara<0||l.tara>=l.bruto||l.price<0)){setError('Completa bruto y tara. Bruto debe ser mayor que tara y tara no puede ser negativa.');return}
 if(kind==='client'&&inventory.some(r=>lines.filter(l=>l.inventory_id===r.id).reduce((sum,l)=>sum+l.neto,0)>Number(r.pounds))){setError('El peso neto acumulado de las líneas supera el inventario disponible del lote.');return}
 lock.current=true;setBusy(true);try{
 let ticket:Ticket={...preview,id:crypto.randomUUID(),exited:new Date().toISOString()};
 if(configured){const result=await createClient().rpc('issue_weight_ticket',{p_operator_id:operatorId,p_kind:kind,p_party_id:partyId,p_entered:entered,p_lines:lines.map(l=>({inventory_id:l.inventory_id,bruto:l.bruto,tara:l.tara}))});if(result.error)throw result.error;ticket=result.data as Ticket;await data.refresh()}
 else{
 // Persist the document and inventory together before updating the React view.
 const stored=JSON.parse(localStorage.getItem('econexo-demo-data-v1')||'{}');
 const updated=inventory.map(r=>{const matches=lines.filter(x=>x.inventory_id===r.id);if(!matches.length)return r;const net=matches.reduce((sum,l)=>sum+l.neto,0);const pounds=Number(r.pounds)+(kind==='supplier'?net:-net),quantity=r.unit==='ton'?pounds/2000:pounds;return{...r,pounds,tons:pounds/2000,quantity,cost_total:quantity*Number(r.cost_price??0),estimated_sale:quantity*Number(r.sale_price??0),estimated_profit:quantity*(Number(r.sale_price??0)-Number(r.cost_price??0))}});
 const next=[ticket,...tickets];localStorage.setItem('econexo-demo-data-v1',JSON.stringify({...stored,inventory:updated,weight_tickets:next}));
 localStorage.setItem(key,JSON.stringify(next));
 for(const inventoryId of new Set(lines.map(l=>l.inventory_id))){const r=updated.find(x=>x.id===inventoryId)!;await data.updateInventory(r.id,{material_id:r.material_id!,category_id:r.category_id!,supplier_id:r.supplier_id!,delivered_by:r.delivered_by,quantity:r.quantity,unit:r.unit,currency:r.currency??'LPS',cost_price:Number(r.cost_price??0),sale_price:Number(r.sale_price??0),exchange_rate:Number(r.exchange_rate??24.75),received_at:r.received_at,status:r.status,notes:r.notes??''})}
 }
 setTickets(current=>[ticket,...current]);setSelected(ticket);setEditing(false);notify('Boleta emitida e inventario actualizado.');
 }catch(e){setError(e instanceof Error?e.message:'No fue posible emitir la boleta.')}finally{lock.current=false;setBusy(false)}};
 return <div className="weight-module"><div className="page-title editorial-title"><div><p className="eyebrow">CONTROL DE PESAJE</p><h1>Boleta de peso</h1><p>Boleta para el control de registros automatizados</p></div><Button disabled={!ready||busy} onClick={start}><Plus/>Nueva boleta</Button></div>
 {error&&<p role="alert" className="form-error">{error}</p>}
 {editing?<div className="weight-workspace"><section className="panel weight-editor"><Button variant="ghost" disabled={busy} onClick={()=>setEditing(false)}><ArrowLeft/>Volver</Button><h2>Datos del pesaje</h2><p>Selecciona los registros. Solo escribe bruto y tara.</p><label>Operación<select disabled={busy} value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setParty('');setDraft([])}}><option value="supplier">Proveedor · Entrada</option><option value="client">Cliente · Salida</option></select></label><label>{kind==='supplier'?'Proveedor':'Cliente'}<select disabled={busy} value={partyId} onChange={e=>{setParty(e.target.value);setDraft([])}}><option value="">Selecciona un registro</option>{parties.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <div className="weight-auto"><span>Ingreso automático</span><b>{date(entered)} · {time(entered)}</b></div>
 <label>Responsable<select disabled={busy} value={operatorId} onChange={e=>setOperatorId(e.target.value)}><option value="">Selecciona un usuario</option>{profiles.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
 {draft.map((d,i)=><fieldset disabled={busy} key={i}><legend>Material {i+1}</legend><label>Material / lote<select value={d.id} onChange={e=>setDraft(v=>v.map((x,n)=>n===i?{...x,id:e.target.value}:x))}>{available.map(r=><option key={r.id} value={r.id}>{r.material} · {r.category} · {r.inventory_code}</option>)}</select></label><div className="weight-inputs">{(['bruto','tara'] as const).map(k=><label key={k}>{k==='bruto'?'Bruto':'Tara'} (lb)<input inputMode="decimal" type="number" min="0" step="0.0001" value={d[k]} onChange={e=>setDraft(v=>v.map((x,n)=>n===i?{...x,[k]:e.target.value}:x))}/></label>)}</div><div className="weight-auto"><span>Neto: <b>{weight(lines[i].neto)}</b></span><span>Precio: <b>{money(lines[i].price)} / lb</b></span><strong>{money(lines[i].total)}</strong></div><Button variant="ghost" onClick={()=>setDraft(v=>v.filter((_,n)=>n!==i))}><Trash2/>Quitar</Button></fieldset>)}
 <Button variant="outline" disabled={busy||!available.length} onClick={()=>{const r=available.find(r=>!draft.some(d=>d.id===r.id))??available[0];if(r)setDraft(v=>[...v,{id:r.id,bruto:'',tara:''}])}}><Plus/>Agregar material</Button>
 {partyId&&!available.length&&<p>No hay lotes con precios registrados para esta selección. Agrégalos en Inventarios.</p>}
 <Button disabled={busy||!lines.length} onClick={emit}>{busy?'Guardando…':'Emitir boleta y actualizar inventario'}</Button></section><aside className="weight-preview"><div className="weight-preview-title"><span className="weight-live"/>Vista previa en tiempo real</div><Paper ticket={preview}/></aside></div>:selected?<><div className="weight-toolbar"><Button variant="outline" onClick={()=>setSelected(null)}><ArrowLeft/>Historial</Button><Button onClick={()=>window.print()}><Printer/>Imprimir / PDF</Button></div><Paper ticket={selected}/></>:<section className="panel"><h2>Boletas emitidas</h2><div className="table-wrap"><table><thead><tr><th>Boleta</th><th>Ingreso</th><th>Tipo</th><th>Nombre</th><th>Neto</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{tickets.map(t=><tr key={t.id}><td>{t.code}</td><td>{date(t.entered)}</td><td>{t.kind==='supplier'?'Proveedor':'Cliente'}</td><td>{t.party}</td><td>{weight(t.lines.reduce((s,l)=>s+l.neto,0))}</td><td>{money(t.total)}</td><td><Button variant="ghost" onClick={()=>setSelected(t)}><Eye/>Ver</Button></td></tr>)}{!tickets.length&&<tr><td colSpan={7} className="weight-empty">{ready?'Crea tu primera boleta de peso.':'Cargando boletas…'}</td></tr>}</tbody></table></div></section>}</div>;
}
