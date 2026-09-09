import type {BusinessMovement} from './dashboard-metrics';
import type {SupplierRecord} from './econexo-data';
import type {ExecutiveSection} from './executive-report-data';
import {supplierDisplayId} from './party-codes';
export function supplierRanking(events:BusinessMovement[],suppliers:SupplierRecord[],currency:'LPS'|'USD',unit:'lb'|'ton',rate:number,order:'amount'|'weight',limit:number):ExecutiveSection {
 const purchases=events.filter(e=>e.kind==='purchase'),grouped=new Map<string,{id:string;name:string;code:string;amount:number;weight:number;count:number}>();
 for(const e of purchases){const id=e.supplierId??'unknown',p=suppliers.find(s=>s.id===id);const row=grouped.get(id)??{id,name:p?.name??'Proveedor no identificado',code:p?supplierDisplayId(p):'—',amount:0,weight:0,count:0};row.amount+=e.amount;row.weight+=e.pounds;row.count++;grouped.set(id,row)}
 const all=[...grouped.values()].sort((a,b)=>b[order]-a[order]||a.name.localeCompare(b.name,'es')),rows=limit?all.slice(0,limit):all;
 const total=all.reduce((s,r)=>s+r.amount,0),totalWeight=all.reduce((s,r)=>s+r.weight,0);
 const amount=(n:number)=>Math.round((currency==='USD'?n/rate:n)*100)/100,w=(n:number)=>unit==='ton'?n/2000:n,label=unit==='ton'?'toneladas':'lb';
 return {id:'supplier-ranking',title:'Proveedores a los que más compré',description:'Ordenado por '+(order==='amount'?'importe comprado':'peso comprado')+'. Participación sobre todas las compras que cumplen los filtros. Registros cuenta líneas, no facturas.',
 metrics:[{label:'Proveedores en la selección',value:all.length,unit:'proveedores'},{label:'Total comprado · selección',value:amount(total),unit:currency},{label:'Peso comprado · selección',value:w(totalWeight),unit:label}],
 chart:rows.slice(0,8).map(r=>({label:r.name,value:order==='amount'?amount(r.amount):w(r.weight),unit:order==='amount'?currency:label,color:'#2687f3'})),
 headers:['Posición','Proveedor','Código','Registros','Peso comprado ('+label+')','Total comprado ('+currency+')','Participación en importe (%)'],
 rows:rows.map((r,i)=>[i+1,r.name,r.code,r.count,w(r.weight),amount(r.amount),total?Math.round(r.amount/total*10000)/100:0])};
}
