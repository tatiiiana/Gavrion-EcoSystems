export type Cell=string|number|null;
export type Sheet={name:string;rows:Cell[][]};
const xml=(s:string)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function reportCsv(rows:Cell[][]){
  return '\uFEFF'+rows.map(row=>row.map(value=>{
    const text=String(value??'');
    // Prevent a user-supplied material name from becoming an Excel formula.
    const safe=typeof value==='string'&&/^[\s]*[=+@-]/.test(text)?"'"+text:text;
    return '"'+safe.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n');
}
const encoder=new TextEncoder();
function crc(bytes:Uint8Array){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0)}return (value^0xffffffff)>>>0}
function zip(files:Record<string,string>){
  const chunks:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
  for(const [path,content] of Object.entries(files)){
    const name=encoder.encode(path),data=encoder.encode(content),checksum=crc(data);
    const head=new Uint8Array(30+name.length),v=new DataView(head.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);head.set(name,30);
    const record=new Uint8Array(46+name.length),c=new DataView(record.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint32(16,checksum,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);record.set(name,46);
    chunks.push(head,data);central.push(record);offset+=head.length+data.length;
  }
  const length=central.reduce((s,b)=>s+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,length,true);e.setUint32(16,offset,true);
  const output=new Uint8Array(offset+length+22);let cursor=0;for(const chunk of [...chunks,...central,end]){output.set(chunk,cursor);cursor+=chunk.length}return output;
}
export function reportXlsx(sheets:Sheet[]){
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files:Record<string,string>={
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>',
    '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+rel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>'
  };
  const column=(n:number)=>{let out='';for(n++;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out};
  sheets.forEach((sheet,index)=>{files['xl/worksheets/sheet'+(index+1)+'.xml']='<worksheet xmlns="'+ns+'"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="40" width="24" customWidth="1"/></cols><sheetData>'+sheet.rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((cell,j)=>{const pos=column(j)+(i+1);return typeof cell==='number'&&Number.isFinite(cell)?'<c r="'+pos+'"><v>'+cell+'</v></c>':'<c r="'+pos+'" t="inlineStr"><is><t xml:space="preserve">'+xml(String(cell??''))+'</t></is></c>'}).join('')+'</row>').join('')+'</sheetData></worksheet>'});
  return zip(files);
}
export function downloadReport(content:BlobPart,name:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
