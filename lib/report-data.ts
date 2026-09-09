import type {InventoryRecord,MaterialRecord} from './econexo-data';
import {type BusinessMovement,summarize} from './dashboard-metrics';
import {defaultMaterialGroups,materialGroupId,type MaterialGroup} from './material-groups';
export function buildReport(inventory:InventoryRecord[],movements:BusinessMovement[],materials:MaterialRecord[],groups:MaterialGroup[]=defaultMaterialGroups,filter:{from:string;to:string;supplier:string;category?:string;material?:string;stock?:'all'|'positive'|'empty'}){
  const sourceStock=inventory.filter(r=>!filter.supplier||r.supplier_id===filter.supplier);
  const sourceEvents=movements.filter(m=>(!filter.from||m.date>=filter.from)&&(!filter.to||m.date<=filter.to)&&(!filter.supplier||m.supplierId===filter.supplier));
  const category=(name:string)=>{const material=materials.find(m=>m.name===name)??{name};return groups.find(g=>g.id===materialGroupId(material))?.name??'Sin clasificar'};
  const groupId=(name:string)=>materialGroupId(materials.find(m=>m.name===name)??{name})||'unclassified';
  const names=[...new Set([...sourceStock.map(r=>r.material),...sourceEvents.map(m=>m.material)])].filter(name=>{
    const balance=sourceStock.filter(r=>r.material===name).reduce((s,r)=>s+Number(r.pounds),0);
    return (!filter.category||groupId(name)===filter.category)&&(!filter.material||name===filter.material)&&(filter.stock!=='positive'||balance>0)&&(filter.stock!=='empty'||balance<=0);
  }).sort((a,b)=>a.localeCompare(b,'es'));
  const stock=sourceStock.filter(r=>names.includes(r.material)),events=sourceEvents.filter(m=>names.includes(m.material));
  const rows=names.map(material=>{
    const current=stock.filter(r=>r.material===material),period=events.filter(m=>m.material===material),summary=summarize(period);
    return {material,category:category(material),stock:current.reduce((s,r)=>s+Number(r.pounds),0),available:current.filter(r=>r.status==='available').reduce((s,r)=>s+Number(r.pounds),0),stockValue:current.reduce((s,r)=>s+Number(r.cost_total??0)*(r.currency==='USD'?Number(r.exchange_rate??1):1),0),billed:period.reduce((s,m)=>s+(m.kind==='sale'?(m.billed??m.amount):0),0),...summary};
  });
  const summary=summarize(events);
  const top=rows.filter(r=>r.sold>0).sort((a,b)=>b.sold-a.sold||a.material.localeCompare(b.material)).slice(0,5);
  return {rows,top,summary,stock:rows.reduce((s,r)=>s+r.stock,0),available:rows.reduce((s,r)=>s+r.available,0),stockValue:rows.reduce((s,r)=>s+r.stockValue,0),billed:rows.reduce((s,r)=>s+r.billed,0),unattributed:movements.filter(m=>m.kind==='sale'&&!m.supplierId&&(!filter.from||m.date>=filter.from)&&(!filter.to||m.date<=filter.to)).length};
}
