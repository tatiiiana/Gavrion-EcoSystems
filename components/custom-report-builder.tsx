'use client';
import {useState} from 'react';
import {ArrowRight,Download,Printer,SlidersHorizontal,FileBarChart,Eye} from 'lucide-react';
import {Button} from './ui/button';
import {ExecutiveChart,ExecutiveStats,ExecutiveTable,ExecutivePreview,type ReportSnapshot} from './executive-report';
import type {BusinessMovement} from '@/lib/dashboard-metrics';
import {supplierRanking} from '@/lib/supplier-ranking';
import {useEconexoData} from '@/lib/econexo-data';
import {buildReport} from '@/lib/report-data';
import {executiveSections,type ExecutiveSection} from '@/lib/executive-report-data';
import {defaultMaterialGroups,materialGroupId} from '@/lib/material-groups';
import {periodBounds} from '@/lib/dashboard-metrics';
import {downloadReport,reportCsv,reportXlsx,type Cell} from '@/lib/report-export';
const queries=[
 {id:'supplier-ranking',label:'¿A qué proveedor le compré más?',hint:'Compara proveedores por importe o peso.'},
 {id:'sales',label:'¿Cuánto vendí?',hint:'Peso vendido, ingresos y facturación.'},
 {id:'profit',label:'¿Cuánto gané?',hint:'Ventas, costos y margen bruto.'},
 {id:'inventory',label:'¿Cuánto inventario me queda?',hint:'Stock actual y disponible para vender.'},
 {id:'purchases',label:'¿Cuánto compré?',hint:'Compras por material en el período.'},
 {id:'top',label:'¿Qué materiales vendí más?',hint:'Los cinco productos más vendidos.'},
];
export function CustomReportBuilder({events,rate,ready=true,notify}:{sections?:ExecutiveSection[];events:BusinessMovement[];currency?:'LPS'|'USD';unit?:'lb'|'ton';rate:number;metadata?:[string,string][];note?:string;ready?:boolean;filterKey?:string;notify:(s:string,t?:'success'|'error')=>void}){
 const {suppliers,settings,inventory,materials}=useEconexoData();
 const initial=periodBounds('Mensual');
 const [from,setFrom]=useState(initial.start),[to,setTo]=useState(initial.end),[supplier,setSupplier]=useState(''),[localCurrency,setLocalCurrency]=useState<'LPS'|'USD'>(settings?.default_currency??'LPS'),[localUnit,setLocalUnit]=useState<'lb'|'ton'>('ton'),[category,setCategory]=useState(''),[material,setMaterial]=useState(''),[stock,setStock]=useState<'all'|'positive'|'empty'>('all');
 const groups=settings?.material_groups??defaultMaterialGroups,localFilters={from,to,supplier,currency:localCurrency,unit:localUnit,category,material,stock};
 const materialNames=[...new Set([...materials.map(m=>m.name),...events.map(m=>m.material)])].filter(name=>!category||(materialGroupId(materials.find(m=>m.name===name)??{name})||'unclassified')===category).sort((a,b)=>a.localeCompare(b,'es'));
 const invalid=!!(from&&to&&from>to),localReady=ready&&!invalid&&Number.isFinite(rate)&&rate>0;
 const localReport=buildReport(inventory,events,materials,groups,localFilters),localEvents=events.filter(m=>(!from||m.date>=from)&&(!to||m.date<=to)&&(!supplier||m.supplierId===supplier)&&localReport.rows.some(r=>r.material===m.material));
 const localSections=executiveSections(localReport,localCurrency,localUnit,rate);
 const localMetadata:[string,string][]=[['Fecha inicial',from||'Sin límite'],['Fecha final',to||'Sin límite'],['Proveedor',suppliers.find(s=>s.id===supplier)?.name??'Todos'],['Categoría',groups.find(g=>g.id===category)?.name??(category==='unclassified'?'Sin clasificar':'Todas')],['Material',material||'Todos'],['Stock actual',stock==='all'?'Todos':stock==='positive'?'Con existencias':'Sin existencias'],['Moneda',localCurrency],['Unidad',localUnit==='ton'?'Toneladas':'Libras']];
 const localNote='Consulta independiente. Compras y ventas se calculan en el período seleccionado. '+(localCurrency==='USD'?'Conversión: 1 USD = '+rate+' LPS. ':'')+'La ganancia es bruta y no incluye gastos operativos.';
 const [query,setQuery]=useState('supplier-ranking'),[order,setOrder]=useState<'amount'|'weight'>('amount'),[limit,setLimit]=useState(5),[hidden,setHidden]=useState<number[]>([]);
 const [result,setResult]=useState<{snapshot:ReportSnapshot;key:string}|null>(null),[preview,setPreview]=useState<ReportSnapshot|null>(null),[busy,setBusy]=useState(false);
 const section=query==='supplier-ranking'?supplierRanking(localEvents,suppliers,localCurrency,localUnit,rate,order,limit):localSections.find(s=>s.id===query)!;
 const signature=JSON.stringify([localMetadata,query,order,limit,hidden,section,settings?.name,settings?.logo_url]);
 const stale=!!result&&result.key!==signature;
 const generate=()=>{if(!localReady)return;const indices=section.headers.map((_,i)=>i).filter(i=>!hidden.includes(i));if(!indices.length)return;
 const selected={...section,headers:indices.map(i=>section.headers[i]),rows:section.rows.map(r=>indices.map(i=>r[i])),total:section.total?indices.map(i=>section.total![i]):undefined};
 const extra:[string,string][]=query==='supplier-ranking'?[['Orden',order==='amount'?'Mayor importe':'Mayor peso'],['Mostrar',limit?'Primeros '+limit:'Todos']]:[];
 const snapshot:ReportSnapshot={section:selected,company:settings?.name??'Gavrion EcoSystems',logo:settings?.logo_url,metadata:[...localMetadata,...extra],note:localNote,generated:new Date().toLocaleString('es-HN',{timeZone:'America/Tegucigalpa'})};setResult({key:signature,snapshot});return snapshot};
 const exportSnapshot=(snap:ReportSnapshot,format:'xlsx'|'csv')=>{setBusy(true);try{
 const s=snap.section,detail:Cell[][]=[s.headers,...s.rows,...(s.total?[s.total]:[])],summary:Cell[][]=[['Resumen ejecutivo',s.title],['Empresa',snap.company],['Generado',snap.generated],...snap.metadata,['Indicador','Valor','Unidad'],...s.metrics.map(m=>[m.label,m.value,m.unit]),['Notas',snap.note]];
 const filename='consulta-'+s.id+'-'+new Date().toISOString().slice(0,10);
 if(format==='xlsx')downloadReport(reportXlsx([{name:'Resumen ejecutivo',rows:summary},{name:'Detalle',rows:detail}]).buffer as ArrayBuffer,filename+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 else downloadReport(reportCsv([[...s.headers,...snap.metadata.map(([label])=>label)],...detail.slice(1).map(row=>[...row,...snap.metadata.map(([,value])=>value)])]),filename+'.csv','text/csv;charset=utf-8');
 notify('Consulta exportada: '+s.title);
 }catch(e){notify(e instanceof Error?e.message:'No se pudo exportar.','error')}finally{setBusy(false)}};
 const exportResult=(format:'xlsx'|'csv')=>{if(result&&!stale&&localReady)exportSnapshot(result.snapshot,format)};
 const openPreview=()=>{const snapshot=generate();if(snapshot)setPreview(snapshot)};
 return <div className="custom-report-builder">
 <div className="query-independent-filters"><div className="query-independent-filters-title"><strong>Filtros de esta consulta</strong><span>Este período y estos datos son independientes de la sección 1.</span></div><div className="query-independent-grid"><label>Fecha inicial<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>Fecha final<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><label>Proveedor<select value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Todos los proveedores</option>{suppliers.filter(s=>s.active!==false).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Moneda<select value={localCurrency} onChange={e=>setLocalCurrency(e.target.value as 'LPS'|'USD')}><option value="LPS">LPS — Lempiras</option><option value="USD">USD — Dólares</option></select></label><label>Unidad<select value={localUnit} onChange={e=>setLocalUnit(e.target.value as 'lb'|'ton')}><option value="lb">Libras</option><option value="ton">Toneladas</option></select></label><label>Categoría<select value={category} onChange={e=>{setCategory(e.target.value);setMaterial('')}}><option value="">Todas las categorías</option>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}<option value="unclassified">Sin clasificar</option></select></label><label>Material<select value={material} onChange={e=>setMaterial(e.target.value)}><option value="">Todos los materiales</option>{materialNames.map(name=><option value={name} key={name}>{name}</option>)}</select></label><label>Stock actual<select value={stock} onChange={e=>setStock(e.target.value as typeof stock)}><option value="all">Todos</option><option value="positive">Con existencias</option><option value="empty">Sin existencias</option></select></label></div>{invalid&&<p className="form-error" role="alert">La fecha inicial no puede ser posterior a la fecha final.</p>}</div>
 <div className="query-presets">{queries.map(q=><button type="button" key={q.id} className={query===q.id?'active':''} aria-pressed={query===q.id} onClick={()=>{setQuery(q.id);setHidden([])}}><strong>{q.label}</strong><span>{q.hint}</span></button>)}</div>
 {query==='supplier-ranking'&&<div className="query-ranking-controls"><label>Comparar por<select value={order} onChange={e=>setOrder(e.target.value as typeof order)}><option value="amount">Importe comprado</option><option value="weight">Peso comprado</option></select></label><label>Resultados<select value={limit} onChange={e=>setLimit(Number(e.target.value))}><option value={5}>5 principales</option><option value={10}>10 principales</option><option value={0}>Todos</option></select></label><p>Para encontrar al proveedor principal, selecciona <b>Todos los proveedores</b>. Si eliges uno, consultarás únicamente sus compras.</p></div>}
 <details className="query-columns"><summary><SlidersHorizontal size={15}/>Personalizar columnas del documento <span>{section.headers.length-hidden.length} seleccionadas</span></summary><div>{section.headers.map((h,i)=><label key={h}><input type="checkbox" checked={!hidden.includes(i)} disabled={!hidden.includes(i)&&hidden.length===section.headers.length-1} onChange={()=>setHidden(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])}/>{h}</label>)}</div></details>
 <div className="query-generate"><p>{localReady?'Listo para generar con tus filtros.':'Revisa las fechas o espera a que se carguen los datos.'}</p><Button disabled={!localReady} onClick={generate}>{result?'Actualizar consulta':'Generar consulta'}<ArrowRight size={16}/></Button></div>
 <div className="query-filter-actions query-filter-actions-bottom" aria-label="Acciones del reporte"><Button disabled={!localReady||busy} onClick={openPreview}><Eye/>Vista previa</Button><Button variant="outline" disabled={!localReady||busy} onClick={openPreview}><Download/>Exportar Excel</Button><Button variant="outline" disabled={!localReady||busy} onClick={openPreview}>Exportar CSV</Button><Button variant="outline" disabled={!localReady||busy} onClick={openPreview}><Printer/>Exportar PDF / Imprimir</Button></div>
 {result?<section className="query-result" aria-label="Resultado de consulta independiente"><div className="query-result-head"><div><p className="eyebrow">TU REPORTE</p><h2>{result.snapshot.section.title}</h2><p>{result.snapshot.section.description}</p></div><div className="executive-export-actions"><Button disabled={!ready||stale||busy} onClick={()=>exportResult('xlsx')}><Download/>Excel de consulta</Button><Button variant="outline" disabled={!ready||stale||busy} onClick={()=>exportResult('csv')}>CSV de consulta</Button><Button variant="outline" disabled={!ready||stale} onClick={()=>setPreview(result.snapshot)}><Printer/>PDF / Imprimir consulta</Button></div></div>
 {stale&&<p className="query-stale" role="status">Cambiaste la consulta o sus datos. Pulsa “Actualizar consulta” antes de exportar.</p>}
 <div className="executive-filter-chips">{result.snapshot.metadata.map(([label,value])=><span key={label}>{label}: <b>{value}</b></span>)}</div><ExecutiveStats section={result.snapshot.section}/><ExecutiveChart section={result.snapshot.section}/><ExecutiveTable section={result.snapshot.section}/>
 {!result.snapshot.section.rows.length&&<p className="chart-note">Prueba ampliar las fechas o seleccionar todos los proveedores y materiales.</p>}
 </section>:<div className="query-empty"><FileBarChart size={28}/><div><strong>Tu reporte aparecerá aquí</strong><p>Se generará de forma independiente, listo para Excel, PDF o impresión.</p></div></div>}
 {preview&&<ExecutivePreview snapshot={preview} onClose={()=>setPreview(null)} onExport={format=>exportSnapshot(preview,format)} exporting={busy}/>}
 </div>;
}
