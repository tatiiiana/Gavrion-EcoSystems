import type {buildReport} from './report-data';
import type {Cell} from './report-export';
export type ExecutiveMetric={label:string;value:number|null;unit:string};
export type ExecutiveSection={id:string;title:string;description:string;metrics:ExecutiveMetric[];chart:{label:string;value:number|null;unit:string;color:string}[];headers:string[];rows:Cell[][];total?:Cell[]};
export function executiveSections(report:ReturnType<typeof buildReport>,currency:'LPS'|'USD',unit:'lb'|'ton',rate:number):ExecutiveSection[]{
 const weightUnit=unit==='ton'?'toneladas':'lb',w=(n:number)=>unit==='ton'?n/2000:n,m=(n:number)=>Math.round((currency==='USD'?n/rate:n)*100)/100;
 const {rows,summary:s}=report;
 const series=(key:'available'|'saleTotal'|'purchaseTotal',money:boolean,color:string)=>[...rows].sort((a,b)=>b[key]-a[key]).slice(0,8).map(r=>({label:r.material,value:money?m(r[key]):w(r[key]),unit:money?currency:weightUnit,color}));
 return [
 {id:'inventory',title:'Inventario disponible y restante',description:'Qué puedes vender actualmente, cuánto vendiste en el período y cuánto inventario queda hoy.',
 metrics:[{label:'Disponible para vender',value:w(report.available),unit:weightUnit},{label:'Vendido en el período',value:w(s.sold),unit:weightUnit},{label:'Inventario restante hoy',value:w(report.stock),unit:weightUnit}],
 chart:series('available',false,'#27b682'),
 headers:['Categoría','Material','Disponible ('+weightUnit+')','Vendido en el período ('+weightUnit+')','Stock restante ('+weightUnit+')','Valor restante ('+currency+')'],
 rows:rows.map(r=>[r.category,r.material,w(r.available),w(r.sold),w(r.stock),m(r.stockValue)]),
 total:['TOTAL','',w(report.available),w(s.sold),w(report.stock),m(report.stockValue)]},
 {id:'sales',title:'Ventas del período',description:'Cuánto vendiste en peso y dinero, con el total de los documentos emitidos.',
 metrics:[{label:'Peso vendido',value:w(s.sold),unit:weightUnit},{label:'Ventas sin ISV',value:m(s.saleTotal),unit:currency},{label:'Total facturado',value:m(report.billed),unit:currency}],
 chart:series('saleTotal',true,'#2687f3'),
 headers:['Categoría','Material','Peso vendido ('+weightUnit+')','Ventas sin ISV ('+currency+')','Total facturado ('+currency+')'],
 rows:rows.map(r=>[r.category,r.material,w(r.sold),m(r.saleTotal),m(r.billed)]),
 total:['TOTAL','',w(s.sold),m(s.saleTotal),m(report.billed)]},
 {id:'purchases',title:'Compras del período',description:'Cuánto material compraste y cuánto invertiste en los registros del período.',
 metrics:[{label:'Peso comprado',value:w(s.purchased),unit:weightUnit},{label:'Total comprado',value:m(s.purchaseTotal),unit:currency}],
 chart:series('purchaseTotal',true,'#829fc5'),
 headers:['Categoría','Material','Peso comprado ('+weightUnit+')','Total comprado ('+currency+')'],
 rows:rows.map(r=>[r.category,r.material,w(r.purchased),m(r.purchaseTotal)]),
 total:['TOTAL','',w(s.purchased),m(s.purchaseTotal)]},
 {id:'profit',title:'Ganancias, costos y ventas',description:'Resumen ejecutivo del margen bruto: ventas menos costo del material vendido. No incluye gastos operativos.',
 metrics:[{label:'Ventas sin ISV',value:m(s.saleTotal),unit:currency},{label:'Costo de lo vendido',value:s.missingCosts?null:m(s.cost),unit:currency},{label:'Ganancia bruta estimada',value:s.profit==null?null:m(s.profit),unit:currency}],
 chart:[{label:'Ventas',value:m(s.saleTotal),unit:currency,color:'#2687f3'},{label:'Costos',value:s.missingCosts?null:m(s.cost),unit:currency,color:'#90a6c5'},{label:'Ganancias',value:s.profit==null?null:m(s.profit),unit:currency,color:'#27b682'}],
 headers:['Categoría','Material','Ventas sin ISV ('+currency+')','Costo de lo vendido ('+currency+')','Ganancia bruta ('+currency+')'],
 rows:rows.map(r=>[r.category,r.material,m(r.saleTotal),r.missingCosts?null:m(r.cost),r.profit==null?null:m(r.profit)]),
 total:['TOTAL','',m(s.saleTotal),s.missingCosts?null:m(s.cost),s.profit==null?null:m(s.profit)]},
 {id:'top',title:'Productos más vendidos',description:'Los cinco materiales y categorías con mayor peso vendido, en libras y toneladas.',
 metrics:[{label:'Productos en el ranking',value:report.top.length,unit:'productos'},{label:'Peso vendido · top 5',value:w(report.top.reduce((sum,r)=>sum+r.sold,0)),unit:weightUnit},{label:'Ventas · top 5',value:m(report.top.reduce((sum,r)=>sum+r.saleTotal,0)),unit:currency}],
 chart:report.top.map(r=>({label:r.material+' · '+r.category,value:w(r.sold),unit:weightUnit,color:'#2687f3'})),
 headers:['Posición','Material','Categoría','Vendido (lb)','Vendido (toneladas)','Ventas ('+currency+')'],
 rows:report.top.map((r,i)=>[i+1,r.material,r.category,r.sold,r.sold/2000,m(r.saleTotal)])}
 ];
}
