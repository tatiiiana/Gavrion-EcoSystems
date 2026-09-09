'use client';
import {useState} from 'react';
import {summarize,type BusinessMovement} from '@/lib/dashboard-metrics';
import {useEconexoData} from '@/lib/econexo-data';
import {defaultMaterialGroups,materialGroupId} from '@/lib/material-groups';
export function MaterialComparison({movements}:{movements:BusinessMovement[]}){
 const {materials,settings}=useEconexoData();
 const [material,setMaterial]=useState(''),[category,setCategory]=useState('');
 const names=[...new Set([...materials.map(m=>m.name),...movements.map(m=>m.material)])].sort((a,b)=>a.localeCompare(b,'es'));
 const groups=settings?.material_groups??defaultMaterialGroups;
 const groupId=(name:string)=>materialGroupId(materials.find(m=>m.name===name)??{name})||'unclassified';
 const categoryOptions=groups.filter(g=>g.active);
 const materialOptions=names.filter(name=>!category||groupId(name)===category);
 const categoryLabel=groups.find(g=>g.id===category)?.name??(category?'Sin clasificar':'todas las categorías');
 const filtered=movements.filter(m=>(!material||m.material===material)&&(!category||groupId(m.material)===category));
 const summary=summarize(filtered);
 const values=[{name:'Ventas',value:summary.saleTotal,color:'#2582ed'},{name:'Costos',value:summary.missingCosts?null:summary.cost,color:'#90a6c5'},{name:'Ganancias',value:summary.profit,color:'#27b682'}];
 const max=Math.max(1,...values.map(v=>v.value??0))*1.2,min=Math.min(0,...values.map(v=>v.value??0))*1.2;
 const y=(value:number)=>220-(value-min)/(max-min)*175,baseline=y(0);
 const money=(v:number)=>'LPS '+v.toLocaleString('es-HN',{maximumFractionDigits:2});
 return <section className="panel material-financial-chart"><div className="financial-chart-head"><div><h2>Ventas, costos y ganancias</h2><p>Selecciona una categoría y luego un material perteneciente a ella.</p></div><div className="chart-selectors"><label>Categoría<select value={category} onChange={e=>{setCategory(e.target.value);setMaterial('')}}><option value="">Todas las categorías</option>{categoryOptions.map(group=><option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label>Material<select disabled={!category} value={material} onChange={e=>setMaterial(e.target.value)}><option value="">Todos los materiales</option>{materialOptions.map(name=><option key={name}>{name}</option>)}</select></label></div></div>
 <svg viewBox="0 0 560 280" role="img" aria-label={'Gráfico financiero en lempiras de '+(material||categoryLabel)} className="financial-bars">
 {[0,.25,.5,.75,1].map(t=>{const value=min+(max-min)*t;return <g key={t}><line x1="80" x2="545" y1={y(value)} y2={y(value)} stroke="#e9eff6"/><text x="70" y={y(value)+4} textAnchor="end" fill="#71819b" fontSize="10">{value.toLocaleString('es-HN',{maximumFractionDigits:0})}</text></g>})}
 <line x1="80" x2="545" y1={baseline} y2={baseline} stroke="#a7b8ce"/>
 {values.map((item,i)=>{const x=130+i*155,value=item.value??0;return <g key={item.name}><title>{item.name+': '+(item.value==null?'Sin costo histórico':money(value))}</title><rect x={x} y={Math.min(y(value),baseline)} width="70" height={Math.abs(y(value)-baseline)} rx="5" fill={item.color}/><text x={x+35} y={value<0?y(value)+16:y(value)-10} textAnchor="middle" fontSize="11" fontWeight="600" fill="#183353">{item.value==null?'Sin datos':money(value)}</text><text x={x+35} y="260" textAnchor="middle" fill="#536783" fontSize="12">{item.name}</text></g>})}</svg>
 <div className="chart-value-summary">{values.map(item=><div key={item.name}><span><i style={{background:item.color}}/>{item.name}</span><strong>{item.value==null?'Sin costo histórico':money(item.value)}</strong></div>)}</div>
 {!filtered.some(m=>m.kind==='sale')&&<p className="chart-note">No hay ventas registradas para esta selección en el período.</p>}
 </section>;
}
