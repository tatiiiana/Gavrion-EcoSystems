import type { InventoryRecord } from './econexo-data';
import type { InvoiceRecord } from '@/components/billing';

export type WeightDocument={id:string;party_id?:string;kind:'supplier'|'client';entered:string;exited?:string;total:number;lines:{inventory_id:string;supplier_id?:string;material:string;category?:string;neto:number;bruto?:number;tara?:number;total:number;cost_per_lb?:number}[]};
export type BusinessMovement={inventoryId?:string;supplierId?:string;category?:string;billed?:number;date:string;material:string;kind:'purchase'|'sale';pounds:number;amount:number;cost:number|null;waste:number};
export const periodNames=['Diario','Semanal','Mensual','Trimestral','Semestral','Anual'];
export function periodBounds(period:string,now=new Date()){
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tegucigalpa',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const end=new Date(day+'T00:00:00Z'),start=new Date(end);
  if(period==='Semanal')start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
  if(['Mensual','Trimestral','Semestral','Anual'].includes(period)){
    start.setUTCDate(1);
    if(period==='Trimestral')start.setUTCMonth(Math.floor(start.getUTCMonth()/3)*3);
    if(period==='Semestral')start.setUTCMonth(Math.floor(start.getUTCMonth()/6)*6);
    if(period==='Anual')start.setUTCMonth(0);
  }
  return {start:start.toISOString().slice(0,10),end:day};
}
export function documentDay(value:string){
  if(value.length===10)return value;
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tegucigalpa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function businessMovements(inventory:InventoryRecord[],tickets:WeightDocument[],invoices:InvoiceRecord[]):BusinessMovement[]{
  const result:BusinessMovement[]=[];
  const delta=new Map<string,number>();
  const costPerLb=(id:string)=>{const r=inventory.find(x=>x.id===id);return r&&r.cost_price!=null?Number(r.cost_price)/(r.unit==='ton'?2000:1)*(r.currency==='USD'?Number(r.exchange_rate??1):1):null};
  for(const t of tickets)for(const l of t.lines){
    delta.set(l.inventory_id,(delta.get(l.inventory_id)??0)+(t.kind==='supplier'?1:-1)*Number(l.neto));
    const cost=l.cost_per_lb??costPerLb(l.inventory_id);
    result.push({inventoryId:l.inventory_id,supplierId:l.supplier_id??inventory.find(r=>r.id===l.inventory_id)?.supplier_id??(t.kind==='supplier'?t.party_id:undefined),category:l.category??l.material.split(' · ').slice(1).join(' · '),billed:t.kind==='client'?Number(l.total):0,date:documentDay(t.exited||t.entered),material:l.material.split(' · ')[0],kind:t.kind==='supplier'?'purchase':'sale',waste:Math.max(0,l.bruto!=null?Number(l.bruto)-Number(l.neto):Number(l.tara??0)),pounds:Number(l.neto),amount:Number(l.total),cost:cost==null?null:cost*Number(l.neto)});
  }
  for(const invoice of invoices.filter(i=>i.status!=='void'))for(const l of invoice.lines){
    const pounds=Number(l.quantity)*(l.unit==='ton'?2000:1),cost=costPerLb(l.inventory_id);
    delta.set(l.inventory_id,(delta.get(l.inventory_id)??0)-pounds);
    result.push({inventoryId:l.inventory_id,supplierId:inventory.find(r=>r.id===l.inventory_id)?.supplier_id,category:l.category,billed:Number(l.total)*(invoice.currency==='USD'?Number(invoice.exchange_rate):1),date:invoice.issued_at.slice(0,10),material:l.material,kind:'sale',waste:0,pounds,amount:Number(l.subtotal)*(invoice.currency==='USD'?Number(invoice.exchange_rate):1),cost:cost==null?null:cost*pounds});
  }
  // Separate the original inventory entry from subsequent tickets to avoid counting purchases twice.
  for(const r of inventory){
    const pounds=Math.max(0,Number(r.pounds)-(delta.get(r.id)??0)),cost=costPerLb(r.id);
    if(pounds>0)result.push({inventoryId:r.id,supplierId:r.supplier_id,category:r.category,billed:0,date:r.received_at.slice(0,10),material:r.material,kind:'purchase',waste:0,pounds,amount:(cost??0)*pounds,cost:cost==null?null:cost*pounds});
  }
  return result;
}
export function summarize(movements:BusinessMovement[]){
  const purchases=movements.filter(m=>m.kind==='purchase'),sales=movements.filter(m=>m.kind==='sale');
  const purchaseTotal=purchases.reduce((s,m)=>s+m.amount,0),saleTotal=sales.reduce((s,m)=>s+m.amount,0);
  const missingCosts=sales.some(m=>m.cost==null),cost=sales.reduce((s,m)=>s+(m.cost??0),0);
  return {waste:movements.reduce((s,m)=>s+m.waste,0),purchased:purchases.reduce((s,m)=>s+m.pounds,0),sold:sales.reduce((s,m)=>s+m.pounds,0),purchaseTotal,saleTotal,cost,profit:missingCosts?null:saleTotal-cost,missingCosts};
}
