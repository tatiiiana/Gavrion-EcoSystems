'use client';
import { useEffect, useMemo, useState } from 'react';
import { Boxes, ShoppingCart, TrendingUp, TrendingDown, Truck, Users, CircleDollarSign, PackageCheck } from 'lucide-react';
import { useEconexoData } from '@/lib/econexo-data';
import { defaultMaterialGroups, materialGroupId } from '@/lib/material-groups';
import { useBilling } from './billing';
import { AnimatedValue } from './motion';
import { MaterialComparison } from './material-comparison';
import { createClient } from '@/lib/supabase/client';
import { businessMovements, periodBounds, periodNames, summarize, type WeightDocument } from '@/lib/dashboard-metrics';

const number=(n:number)=>n.toLocaleString('es-HN',{maximumFractionDigits:4});
const money=(n:number)=>'LPS '+n.toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});
export function BusinessDashboard(){
  const {inventory,suppliers,clients,materials,settings,configured}=useEconexoData(),{invoices}=useBilling();
  const [period,setPeriod]=useState('Mensual'),[unit,setUnit]=useState<'lb'|'ton'>('ton');
  const [tickets,setTickets]=useState<WeightDocument[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;setLoaded(false);(async()=>{try{
    if(configured){const result=await createClient().from('weight_tickets').select('document');if(result.error)throw result.error;if(active)setTickets((result.data??[]).map(r=>r.document as WeightDocument))}
    else{const records=JSON.parse(localStorage.getItem('gavrion-weight-tickets-v1')||'[]');if(!Array.isArray(records))throw Error('Historial de boletas inválido.');if(active)setTickets(records)}
    if(active)setError('');
  }catch(e){if(active)setError(e instanceof Error?e.message:'No se pudo cargar el historial.')}finally{if(active)setLoaded(true)}})();return()=>{active=false}},[configured,inventory]);
  const bounds=periodBounds(period);
  const all=useMemo(()=>businessMovements(inventory,tickets,invoices),[inventory,tickets,invoices]);
  const movements=all.filter(m=>m.date>=bounds.start&&m.date<=bounds.end),summary=summarize(movements);
  const weight=(n:number)=>number(unit==='ton'?n/2000:n),unitLabel=unit==='ton'?'toneladas':'lb';
  const stock=inventory.reduce((s,r)=>s+Number(r.pounds),0),stockFor=(status:string)=>inventory.filter(r=>r.status===status).reduce((s,r)=>s+Number(r.pounds),0);
  const averageCost=summary.purchased>0?movements.filter(m=>m.kind==='purchase'&&m.cost!=null).reduce((s,m)=>s+(m.cost??0),0)/summary.purchased:0;
  const wasteValue=summary.waste*averageCost;
  const available=stock?stockFor('available')/stock*100:0,processing=stock?stockFor('in_transit')/stock*100:0;
  const kpis=[
    {label:'Toneladas compradas',value:weight(summary.purchased),unit:unitLabel,note:period,icon:ShoppingCart,tone:'violet'},
    {label:'Toneladas vendidas',value:weight(summary.sold),unit:unitLabel,note:period,icon:TrendingUp,tone:'cyan'},
    {label:'Toneladas merma',value:weight(summary.waste),unit:unitLabel,note:'Desviación del peso',icon:TrendingDown,tone:'blue'},
    {label:'Toneladas stock',value:weight(stock),unit:unitLabel,note:'Existencias actuales',icon:Boxes,tone:'mint'},
    {label:'Compras del período',value:money(summary.purchaseTotal),unit:'Lempiras',note:period,icon:ShoppingCart,tone:'sky'},
    {label:'Ventas del período',value:money(summary.saleTotal),unit:'Lempiras · total valorizado',note:period,icon:CircleDollarSign,tone:'pink'},
    {label:'Merma del período',value:money(wasteValue),unit:'Lempiras estimados',note:'Peso merma × costo promedio',icon:TrendingDown,tone:'rose'},
    {label:'Stock actual',value:money(inventory.reduce((s,r)=>{const amount=Number(r.cost_total??0);return s+(r.currency==='USD'?amount*Number(r.exchange_rate??settings?.usd_to_lps_rate??24.75):amount)},0)),unit:'Lempiras · valor inventario',note:'Saldo valorizado',icon:PackageCheck,tone:'amber'},
  ];
  const dates=[...new Set(movements.map(m=>m.date))].sort();
  const bars=dates.map(date=>({date,...summarize(movements.filter(m=>m.date===date))})),maxWeight=Math.max(1,...bars.flatMap(b=>[b.purchased,b.sold]));
  const topSoldProducts=[...movements.filter(m=>m.kind==='sale').reduce((map,m)=>{const key=m.material+' · '+(m.category||'Sin categoría');const current=map.get(key);map.set(key,{label:key,pounds:(current?.pounds??0)+m.pounds,lastDate:current?.lastDate&&current.lastDate>m.date?current.lastDate:m.date});return map},new Map<string,{label:string;pounds:number;lastDate:string}>()).values()].sort((a,b)=>b.pounds-a.pounds).slice(0,5);
  const stockCategoryDefinitions=[...defaultMaterialGroups.map(group=>({id:group.id,name:group.name})),{id:'batteries',name:'Baterías'}];
  const stockCategoryOrder=['ferrous','non-ferrous','plastic','paper','cardboard','glass','raee','batteries'];
  const stockCategories=stockCategoryOrder.map(id=>stockCategoryDefinitions.find(group=>group.id===id)!).map(group=>{const pounds=inventory.filter(r=>{const material=materials.find(m=>m.id===r.material_id);return (material?materialGroupId(material):materialGroupId({name:r.material}))===group.id}).reduce((s,r)=>s+Number(r.pounds),0);return {...group,pounds}});
  const maxCategoryStock=Math.max(1,...stockCategories.map(category=>category.pounds));
  return <div className="business-dashboard">
    <div className="page-title editorial-title"><div><p className="eyebrow">RESUMEN GENERAL</p><h1>Dashboard</h1></div><div className="periods">{periodNames.map(p=><button key={p} className={period===p?'selected':''} aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p}</button>)}</div></div>
    <div className="dashboard-controls"><span>{bounds.start} — {bounds.end}</span><div className="unit-switch" aria-label="Unidad de peso"><button className={unit==='lb'?'selected':''} aria-pressed={unit==='lb'} onClick={()=>setUnit('lb')}>Libras</button><button className={unit==='ton'?'selected':''} aria-pressed={unit==='ton'} onClick={()=>setUnit('ton')}>Toneladas</button></div></div>
    {error&&<p role="alert" className="form-error">{error}</p>}
    <section className="kpi-grid business-kpis">{kpis.map(({label,value,unit:caption,note,icon:Icon,tone},i)=><article className={'kpi-card '+tone} key={label} style={{animationDelay:(i*35)+'ms'}}><div className="kpi-top"><span className="icon-box"><Icon size={20}/></span><span className="trend">{note}</span></div><p>{label}</p><AnimatedValue value={(!loaded||error)&&i>0&&i<8?'—':value}/><small>{caption}</small></article>)}</section>
    <section className="category-stock-section"><div className="category-stock-heading"><span>Toneladas stock actual</span><small>Existencias agrupadas por categoría de residuo</small></div><div className="category-kpi-grid">{stockCategories.slice(0,4).map((category,i)=><article className={'kpi-card category-kpi-card '+['mint','blue','violet','cyan'][i]} key={category.id}><div className="kpi-top"><span className="icon-box"><Boxes size={20}/></span><span className="trend">Stock actual</span></div><p>{category.name}</p><strong>{(category.pounds/2000).toLocaleString('es-HN',{maximumFractionDigits:2})}</strong><small>toneladas</small></article>)}</div><div className="category-kpi-grid">{stockCategories.slice(4,8).map((category,i)=><article className={'kpi-card category-kpi-card '+['amber','rose','sky','pink'][i]} key={category.id}><div className="kpi-top"><span className="icon-box"><Boxes size={20}/></span><span className="trend">Stock actual</span></div><p>{category.name}</p><strong>{(category.pounds/2000).toLocaleString('es-HN',{maximumFractionDigits:2})}</strong><small>toneladas</small></article>)}</div><div className="entity-kpi-grid"><article className="kpi-card sky"><div className="kpi-top"><span className="icon-box"><Truck size={20}/></span><span className="trend">Activos</span></div><p>Proveedores</p><strong>{suppliers.filter(s=>s.active).length}</strong><small>generadores registrados</small></article><article className="kpi-card mint"><div className="kpi-top"><span className="icon-box"><Users size={20}/></span><span className="trend">Activos</span></div><p>Recolectores</p><strong>{suppliers.filter(s=>s.active&&s.type==='collector').length}</strong><small>generadores registrados</small></article><article className="kpi-card pink"><div className="kpi-top"><span className="icon-box"><Users size={20}/></span><span className="trend">Activos</span></div><p>Clientes</p><strong>{clients.filter(c=>c.active).length}</strong><small>compradores registrados</small></article></div></section>
    <section className="dashboard-grid"><article className="panel movement-panel"><div className="panel-head"><div><h2>Movimientos de inventario</h2><p>Compras y ventas del período · {unitLabel}</p></div></div>
    <div className="legend"><span><i className="dot blue-dot"/>Compras</span><span><i className="dot green-dot"/>Ventas</span></div>
    <div className="business-chart">{bars.map(b=><div className="business-bar-group" key={b.date}><div><i style={{height:(b.purchased/maxWeight*100)+'%'}} title={'Compras: '+weight(b.purchased)+' '+unitLabel}/><i style={{height:(b.sold/maxWeight*100)+'%'}} title={'Ventas: '+weight(b.sold)+' '+unitLabel}/></div><small>{b.date.slice(5)}</small></div>)}</div>{!bars.length&&<p className="empty-state">No hay movimientos en este período.</p>}
    </article><article className="panel stock-panel"><div className="panel-head"><div><PackageCheck/><h2>Estado de stock</h2><p>Distribución actual</p></div></div><div className="donut" style={{background:stock?'conic-gradient(#27bf82 0% '+available+'%, #2687f3 '+available+'% '+(available+processing)+'%, #cbd2dc '+(available+processing)+'% 100%)':'#e7edf4'}}><div><strong>{weight(stock)}</strong><span>{unitLabel}</span></div></div><ul className="stock-list">{[['available','Disponible','green-dot'],['in_transit','En proceso','blue-dot'],['reserved','Reservado','gray-dot']].map(([key,label,tone])=><li key={key}><span><i className={'dot '+tone}/>{label}</span><strong>{weight(stockFor(key))} {unitLabel}</strong></li>)}</ul></article></section>
    <MaterialComparison movements={movements}/>
    <section className="recent-section"><div className="section-title"><h2>Actividades recientes</h2></div><div className="activity-grid"><article className="panel compact"><h3>Inventarios recientes</h3>{inventory.slice(0,4).map(r=><div className="activity-row" key={r.id}><div><strong>{r.material}</strong><small>{weight(Number(r.pounds))} {unitLabel}</small></div><time>{r.received_at.slice(0,10)}</time></div>)}</article><article className="panel compact"><h3>Productos más vendidos</h3>{topSoldProducts.length?topSoldProducts.map((product,i)=><div className="activity-row" key={product.label}><div><strong>{i+1}. {product.label}</strong><small>{number(product.pounds)} lb · {(product.pounds/2000).toLocaleString('es-HN',{maximumFractionDigits:4})} toneladas</small></div><time>{product.lastDate}</time></div>):<p className="empty-state">No hay ventas registradas en este período.</p>}</article></div></section>
  </div>;
}
