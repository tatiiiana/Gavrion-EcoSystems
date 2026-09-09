'use client';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Printer,X} from 'lucide-react';
import {Button} from './ui/button';
import type {ExecutiveSection} from '@/lib/executive-report-data';
import type {Cell} from '@/lib/report-export';
export const formatReportValue=(value:number|null,unit:string)=>value==null?'Sin datos':(unit==='LPS'||unit==='USD'?unit+' ':'')+value.toLocaleString('es-HN',{minimumFractionDigits:unit==='LPS'||unit==='USD'?2:0,maximumFractionDigits:unit==='LPS'||unit==='USD'?2:4})+(unit==='LPS'||unit==='USD'?'':' '+unit);
export function ExecutiveChart({section}:{section:ExecutiveSection}){
 const min=Math.min(0,...section.chart.map(r=>r.value??0)),max=Math.max(1,...section.chart.map(r=>r.value??0)),range=max-min,zero=-min/range*100;
 return <div className="executive-chart" aria-label={'Gráfica: '+section.title}>{section.chart.map((row,i)=><div className="executive-bar-row" key={row.label+i}><span>{row.label}</span><div className="executive-track"><i style={{left:zero+'%'}}/><b style={{left:(row.value!=null&&row.value<0?(row.value-min)/range*100:zero)+'%',width:(Math.abs(row.value??0)/range*100)+'%',background:row.value!=null&&row.value<0?'#ce7882':row.color}}/></div><strong>{formatReportValue(row.value,row.unit)}</strong></div>)}{!section.chart.length&&<p className="empty-state">No hay datos para esta selección.</p>}</div>;
}
export function ExecutiveStats({section}:{section:ExecutiveSection}){return <div className="executive-stats">{section.metrics.map(m=><div key={m.label}><span>{m.label}</span><strong>{formatReportValue(m.value,m.unit)}</strong></div>)}</div>}
export function ExecutiveTable({section}:{section:ExecutiveSection}){
 const cell=(value:Cell,i:number)=>value==null?'Sin datos':typeof value==='number'?value.toLocaleString('es-HN',{maximumFractionDigits:/LPS|USD/.test(section.headers[i])?2:4}):value;
 return <div className="table-wrap"><table><thead><tr>{section.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{section.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{cell(v,j)}</td>)}</tr>)}{!section.rows.length&&<tr><td colSpan={section.headers.length}>No hay registros en esta selección.</td></tr>}</tbody>{section.total&&<tfoot><tr>{section.total.map((v,j)=><td key={j}>{cell(v,j)}</td>)}</tr></tfoot>}</table></div>;
}
export type ReportSnapshot={section:ExecutiveSection;company:string;logo?:string|null;metadata:[string,string][];note:string;generated:string};
export function ExecutivePreview({snapshot,onClose,onExport,exporting=false}:{snapshot:ReportSnapshot;onClose:()=>void;onExport?:(format:'xlsx'|'csv')=>void;exporting?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const before=document.activeElement as HTMLElement,overflow=document.body.style.overflow,title=document.title;document.body.style.overflow='hidden';document.title=snapshot.company+' - '+snapshot.section.title;ref.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{document.body.style.overflow=overflow;document.title=title;before?.focus()}},[snapshot]);
 return createPortal(<div id="executive-print-root" ref={ref} role="dialog" aria-modal="true" aria-label="Resumen ejecutivo para PDF o impresión" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=ref.current?.querySelectorAll<HTMLButtonElement>('button');if(nodes?.length){const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}}>
 <div className="executive-print-toolbar"><span>Revisa los datos antes de exportar. Excel y CSV incluyen el detalle en celdas; PDF conserva este diseño mediante “Guardar como PDF”.</span>{onExport&&<><Button variant="outline" disabled={exporting} onClick={()=>onExport('xlsx')}>Descargar Excel</Button><Button variant="outline" disabled={exporting} onClick={()=>onExport('csv')}>Descargar CSV</Button></>}<Button onClick={()=>window.print()}><Printer/>Guardar PDF / Imprimir</Button><Button variant="outline" onClick={onClose} aria-label="Cerrar vista previa"><X/></Button></div>
 <article className="executive-paper"><header>{snapshot.logo&&<img src={snapshot.logo} alt="" />}<div><h1>{snapshot.company}</h1><p>Resumen ejecutivo · {snapshot.generated}</p></div></header><h2>{snapshot.section.title}</h2><p>{snapshot.section.description}</p><dl className="executive-metadata">{snapshot.metadata.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><ExecutiveStats section={snapshot.section}/><ExecutiveChart section={snapshot.section}/><h3>Detalle del reporte</h3><ExecutiveTable section={snapshot.section}/><footer>{snapshot.note}</footer></article></div>,document.body);
}
