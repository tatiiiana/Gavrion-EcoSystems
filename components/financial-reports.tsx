'use client';
import {useState} from 'react';
import {Download,Printer,Eye,PackageSearch,ArrowDownToLine,Check} from 'lucide-react';
import {Button} from './ui/button';
import {CustomReportBuilder} from './custom-report-builder';
import {SupplierPicker} from './supplier-picker';
import {ExecutiveChart,ExecutiveStats,ExecutiveTable,ExecutivePreview,type ReportSnapshot} from './executive-report';
import {useEconexoData} from '@/lib/econexo-data';
import {useBusinessMovements} from '@/hooks/use-business-movements';
import {buildReport} from '@/lib/report-data';
import {defaultMaterialGroups,materialGroupId} from '@/lib/material-groups';
import {periodBounds} from '@/lib/dashboard-metrics';
import {executiveSections,type ExecutiveSection} from '@/lib/executive-report-data';
import {downloadReport,reportCsv,reportXlsx,type Cell} from '@/lib/report-export';

export function FinancialReports({notify}:{notify:(message:string,tone?:'success'|'error')=>void}){
 const {inventory,suppliers,materials,settings}=useEconexoData(),{movements,loading,error}=useBusinessMovements();
 const initial=periodBounds('Mensual'),[from,setFrom]=useState(initial.start),[to,setTo]=useState(initial.end),[supplier,setSupplier]=useState('');
 const [currency,setCurrency]=useState<'LPS'|'USD'>(settings?.default_currency??'LPS'),[unit,setUnit]=useState<'lb'|'ton'>('ton');
 const [category,setCategory]=useState(''),[material,setMaterial]=useState(''),[stock,setStock]=useState<'all'|'positive'|'empty'>('all');
 type ReportFilters={from:string;to:string;supplier:string;currency:'LPS'|'USD';unit:'lb'|'ton';category:string;material:string;stock:'all'|'positive'|'empty'};
 const [appliedFilters,setAppliedFilters]=useState<ReportFilters>({from:initial.start,to:initial.end,supplier:'',currency:settings?.default_currency??'LPS',unit:'ton',category:'',material:'',stock:'all'});
 const [active,setActive]=useState('inventory'),[exporting,setExporting]=useState(''),[preview,setPreview]=useState<ReportSnapshot|null>(null);
 const groups=settings?.material_groups??defaultMaterialGroups;
 const currentFilters:ReportFilters={from,to,supplier,currency,unit,category,material,stock};
 const filtersDirty=JSON.stringify(currentFilters)!==JSON.stringify(appliedFilters);
 const materialNames=[...new Set([...materials.map(m=>m.name),...inventory.map(m=>m.material),...movements.map(m=>m.material)])].filter(name=>!category||(materialGroupId(materials.find(m=>m.name===name)??{name})||'unclassified')===category).sort((a,b)=>a.localeCompare(b,'es'));
 const invalid=!!(from&&to&&from>to),appliedInvalid=!!(appliedFilters.from&&appliedFilters.to&&appliedFilters.from>appliedFilters.to),rate=Number(settings?.usd_to_lps_rate??24.75),dataReady=!loading&&!error&&!invalid&&Number.isFinite(rate)&&rate>0,ready=dataReady&&!filtersDirty&&!appliedInvalid;
 const report=buildReport(inventory,movements,materials,groups,appliedFilters);
 const queryEvents=movements.filter(m=>(!appliedFilters.from||m.date>=appliedFilters.from)&&(!appliedFilters.to||m.date<=appliedFilters.to)&&(!appliedFilters.supplier||m.supplierId===appliedFilters.supplier)&&report.rows.some(r=>r.material===m.material));
 const sections=executiveSections(report,appliedFilters.currency,appliedFilters.unit,rate),selected=sections.find(s=>s.id===active)!,inventorySection=sections.find(s=>s.id==='inventory')!;
 const metadata:[string,string][]=[['Fecha inicial',appliedFilters.from||'Sin límite'],['Fecha final',appliedFilters.to||'Sin límite'],['Proveedor',suppliers.find(s=>s.id===appliedFilters.supplier)?.name??'Todos'],['Categoría',groups.find(g=>g.id===appliedFilters.category)?.name??(appliedFilters.category==='unclassified'?'Sin clasificar':'Todas')],['Material',appliedFilters.material||'Todos'],['Stock actual',appliedFilters.stock==='all'?'Todos':appliedFilters.stock==='positive'?'Con existencias':'Sin existencias'],['Moneda',appliedFilters.currency],['Unidad',appliedFilters.unit==='ton'?'Toneladas':'Libras']];
 const note='Inventario: saldo actual al '+initial.end+'. Compras y ventas: período seleccionado. Ganancia bruta sin gastos operativos. '+(appliedFilters.currency==='USD'?'Conversión: 1 USD = '+rate+' LPS. ':'')+'Los costos antiguos sin snapshot se estiman con el costo disponible del lote; “Sin datos” indica información faltante.';
 const snapshot=(section:ExecutiveSection):ReportSnapshot=>({section,company:settings?.name??'Gavrion EcoSystems',logo:settings?.logo_url,metadata,note,generated:new Date().toLocaleString('es-HN',{timeZone:'America/Tegucigalpa'})});
 const exportSection=async(section:ExecutiveSection,format:'xlsx'|'csv')=>{
  if(!ready||exporting)return;setExporting(section.id);
  try{
   const snap=snapshot(section),detail:Cell[][]=[section.headers,...section.rows,...(section.total?[section.total]:[])];
   const executive:Cell[][]=[['Resumen ejecutivo',section.title],['Empresa',snap.company],['Generado',snap.generated],...metadata,['Indicador','Valor','Unidad'],...section.metrics.map(m=>[m.label,m.value,m.unit]),['Notas',note]];
   const filename='reporte-'+section.id+'-'+(from||'inicio')+'-'+(to||'hoy');
   if(format==='xlsx')downloadReport(reportXlsx([{name:'Resumen ejecutivo',rows:executive},{name:'Detalle',rows:detail}]).buffer as ArrayBuffer,filename+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   else downloadReport(reportCsv([[...section.headers,...metadata.map(([label])=>label)],...detail.slice(1).map(row=>[...row,...metadata.map(([,value])=>value)])]),filename+'.csv','text/csv;charset=utf-8');
   notify('Exportado: '+section.title+'. Solo incluye esta sección y los filtros seleccionados.');
 }catch(e){notify(e instanceof Error?e.message:'No fue posible exportar.','error')}finally{setExporting('')}
 };
 const money=(value:number|null)=>value==null?'Sin datos':(appliedFilters.currency==='USD'?'USD ':'LPS ')+(appliedFilters.currency==='USD'?value/rate:value).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});
 const weight=(value:number)=>((appliedFilters.unit==='ton'?value/2000:value).toLocaleString('es-HN',{maximumFractionDigits:2})+' '+(appliedFilters.unit==='ton'?'toneladas':'lb'));
 const applyFilters=()=>{setAppliedFilters(currentFilters);notify('Filtros aplicados. El reporte se actualizó.');};
 const filteredMoves=queryEvents.filter(m=>m.pounds>0).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 const movementName=(id?:string)=>suppliers.find(s=>s.id===id)?.name??(id?'Proveedor registrado':'Movimiento de venta');
 return <div className="financial-reports executive-reports">
 <div className="page-title editorial-title"><div><p className="eyebrow">REPORTES PERSONALIZADOS</p><h1>Reportes</h1><p>Elige tus filtros, consulta una sección y exporta únicamente lo que necesitas.</p></div></div>
 <section className="panel report-filters report-section-one"><div className="executive-filter-title"><span className="query-step">1</span><div><h2>Personaliza tu consulta</h2><p>Define el período y los datos que quieres analizar.</p></div></div><div className="financial-filter-grid">
 <label>Fecha inicial<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
 <label>Fecha final<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
 <SupplierPicker suppliers={suppliers} value={supplier} onChange={setSupplier}/>
 <label>Moneda<select value={currency} onChange={e=>setCurrency(e.target.value as 'LPS'|'USD')}><option>LPS</option><option>USD</option></select></label>
 <label>Unidad<select value={unit} onChange={e=>setUnit(e.target.value as 'lb'|'ton')}><option value="lb">Libras</option><option value="ton">Toneladas</option></select></label>
 <label>Categoría<select value={category} onChange={e=>{setCategory(e.target.value);setMaterial('')}}><option value="">Todas las categorías</option>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}<option value="unclassified">Sin clasificar</option></select></label>
 <label>Material<select value={material} onChange={e=>setMaterial(e.target.value)}><option value="">Todos los materiales</option>{materialNames.map(name=><option key={name}>{name}</option>)}</select></label>
 <label>Stock actual<select value={stock} onChange={e=>setStock(e.target.value as typeof stock)}><option value="all">Todos</option><option value="positive">Con existencias</option><option value="empty">Sin existencias</option></select></label>
 </div><p className="chart-note">Para comparar todos los proveedores, deja Proveedores en “Todos”. Stock actual filtra por el saldo de hoy, no por el saldo histórico.</p><div className="report-filter-actions"><div><strong>Reporte filtrado</strong><span>{filtersDirty?'Tienes cambios sin aplicar.':'Consulta lista para exportar.'}</span></div><Button disabled={!dataReady} onClick={applyFilters}><Check/>Aplicar filtros</Button><Button variant="outline" disabled={!ready} onClick={()=>setPreview(snapshot(inventorySection))}><Eye/>Vista previa</Button><Button variant="outline" disabled={!ready||!!exporting} onClick={()=>void exportSection(inventorySection,'xlsx')}><Download/>Excel</Button><Button variant="outline" disabled={!ready||!!exporting} onClick={()=>void exportSection(inventorySection,'csv')}>CSV</Button><Button variant="outline" disabled={!ready} onClick={()=>setPreview(snapshot(inventorySection))}><Printer/>PDF</Button></div><div className="report-filter-summary" aria-label="Resumen del reporte filtrado"><div><span>Registros encontrados</span><strong>{report.rows.length}</strong></div><div><span>Peso total</span><strong>{weight(report.stock)}</strong></div><div><span>Total comprado</span><strong>{money(report.summary.purchaseTotal)}</strong></div><div><span>Total vendido</span><strong>{money(report.summary.saleTotal)}</strong></div><div><span>Ganancia estimada</span><strong>{money(report.summary.profit)}</strong></div><div><span>Inventario restante</span><strong>{weight(report.stock)}</strong></div></div></section>
 <section className="panel report-section-two"><div className="section-numbered-heading"><span className="query-step">2</span><div><h2>¿Qué necesitas saber?</h2><p>Consulta un indicador de forma independiente y genera su documento.</p></div></div><CustomReportBuilder sections={sections} events={movements} currency={currency} unit={unit} rate={rate} metadata={metadata} note={note} ready={dataReady} filterKey={JSON.stringify(metadata)} notify={notify}/></section>
 <section className="report-section-three"><div className="section-numbered-heading"><span className="query-step">3</span><div><h2>Resumen visual</h2><p>Consulta rápidamente el inventario disponible y los movimientos de tu selección.</p></div></div><div className="report-overview-grid"><article className="panel report-overview-card"><div className="report-overview-head"><div><PackageSearch/><div><h3>Resumen de inventario</h3><p>Distribución por material</p></div></div><span>{appliedFilters.unit==='ton'?'Toneladas':'Libras'}</span></div><div className="inventory-bars">{report.rows.length?report.rows.map(row=>{const max=Math.max(1,...report.rows.map(r=>r.stock));const value=appliedFilters.unit==='ton'?row.stock/2000:row.stock;return <div className="inventory-bar" key={row.material}><span>{row.material}</span><div><i style={{width:(row.stock/max*100)+'%'}}/></div><strong>{value.toLocaleString('es-HN',{maximumFractionDigits:2})} {appliedFilters.unit==='ton'?'toneladas':'lb'}</strong></div>}):<p className="empty-state">No hay existencias para estos filtros.</p>}</div></article><article className="panel report-overview-card"><div className="report-overview-head"><div><ArrowDownToLine/><div><h3>Movimientos filtrados</h3><p>Últimos registros de la selección</p></div></div><span>{filteredMoves.length} registros</span></div><div className="filtered-movements">{filteredMoves.length?filteredMoves.map((move,index)=><div className="filtered-movement" key={(move.inventoryId??move.material)+'-'+move.date+'-'+index}><span className={'movement-initial '+(move.kind==='sale'?'sale':'purchase')}>{move.material.slice(0,1).toUpperCase()}</span><div><strong>{move.material}{move.category?' · '+move.category:''}</strong><small>{movementName(move.supplierId)} · {move.date}</small></div><b>{(appliedFilters.unit==='ton'?move.pounds/2000:move.pounds).toLocaleString('es-HN',{maximumFractionDigits:2})} {appliedFilters.unit==='ton'?'toneladas':'lb'}</b></div>):<p className="empty-state">No hay movimientos para estos filtros.</p>}</div></article></div>
 <div className="quick-reports-heading"><h2>Reportes por sección</h2><p>También puedes consultar y exportar estos resúmenes directamente.</p></div>
 <nav className="executive-tabs" aria-label="Secciones de reportes">{sections.map(s=><button key={s.id} type="button" aria-pressed={active===s.id} className={active===s.id?'active':''} onClick={()=>setActive(s.id)}>{s.title}</button>)}</nav>
 {invalid&&<p className="form-error" role="alert">La fecha inicial no puede ser posterior a la fecha final.</p>}{error&&<p className="form-error" role="alert">{error}</p>}
 <section className="panel executive-section" aria-labelledby="executive-section-title" key={selected.id}>
 <div className="executive-section-head"><div><p className="eyebrow">RESUMEN EJECUTIVO</p><h2 id="executive-section-title">{selected.title}</h2><p>{selected.description}</p></div><div className="executive-export-actions"><Button disabled={!ready||!!exporting} onClick={()=>void exportSection(selected,'xlsx')}><Download/>{exporting?'Exportando…':'Excel'}</Button><Button variant="outline" disabled={!ready||!!exporting} onClick={()=>void exportSection(selected,'csv')}>CSV</Button><Button variant="outline" disabled={!ready} onClick={()=>setPreview(snapshot(selected))}><Printer/>PDF / Imprimir</Button></div></div>
 {!ready?<p role="status" className="empty-state">{loading?'Cargando documentos…':'Corrige los filtros o el error para consultar y exportar.'}</p>:<>
 <div className="executive-filter-chips">{metadata.map(([label,value])=><span key={label}>{label}: <b>{value}</b></span>)}</div>
 <ExecutiveStats section={selected}/><ExecutiveChart section={selected}/>
 <p className="chart-note">{selected.id==='top'?'Ranking por peso neto vendido. No incluye productos sin ventas.':selected.id==='profit'?'Comparación de los importes totales de la selección.':'Gráfica de los ocho materiales principales; el detalle incluye todos los resultados.'}</p>
 <details className="executive-detail" open={selected.id==='top'}><summary>Ver detalle · {selected.rows.length} {selected.id==='top'?'productos':'materiales'}</summary><ExecutiveTable section={selected}/></details>
 <p className="chart-note">{note}</p>
 {report.unattributed>0&&<p className="chart-note">Existen ventas históricas sin proveedor identificable. Solo aparecen al seleccionar todos los proveedores.</p>}
 </>}
 </section></section>{preview&&<ExecutivePreview snapshot={preview} onClose={()=>setPreview(null)}/>} 
 </div>;
}
