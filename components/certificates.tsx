'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEconexoData } from '@/lib/econexo-data';

export function Certificates(){
 const {settings,user}=useEconexoData();
 const [text,setText]=useState(''),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('');
 const storageKey='gavrion-certificate-draft-'+(user?.id??'local');
 useEffect(()=>{setLoaded(false);try{setText(localStorage.getItem(storageKey)??'')}catch{setMessage('No se pudo recuperar el borrador local.')}setLoaded(true)},[storageKey]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(storageKey,text);setMessage('Borrador guardado en este navegador')}catch{setMessage('No se pudo guardar el borrador. Puedes imprimir el documento.')}},[text,loaded,storageKey]);
 return <div className="certificate-module">
 <div className="page-title editorial-title"><div><p className="eyebrow">DOCUMENTOS DE LA EMPRESA</p><h1>Certificados</h1><p>Redacta tu documento y revisa la vista previa antes de imprimir.</p></div><Button disabled={!text.trim()} onClick={()=>window.print()}><Printer/>Imprimir / PDF</Button></div>
 <div className="certificate-workspace">
 <section className="panel certificate-editor"><h2>Contenido del certificado</h2><p>El encabezado usa el nombre, logo, teléfono y dirección de Configuración → Identidad de la empresa.</p><label htmlFor="certificate-text">Texto del documento</label><textarea id="certificate-text" disabled={!loaded} value={text} onChange={e=>setText(e.target.value)} placeholder="Escribe aquí el contenido del certificado…" rows={16}/><small role="status">{message}</small><p>La firma y el sello quedan al final para completar después de imprimir.</p></section>
 <div className="certificate-preview"><p className="certificate-preview-label">Vista previa · Formato A4</p><article className="certificate-paper">
 <header>{settings?.logo_url&&<img src={settings.logo_url} alt="Logo de la empresa"/>}<h2>{settings?.name??'Gavrion EcoSystems'}</h2>{settings?.fiscal_address&&<p>{settings.fiscal_address}</p>}{settings?.fiscal_phone&&<p>Teléfono: {settings.fiscal_phone}</p>}</header>
 <div className={'certificate-body'+(!text.trim()?' certificate-placeholder':'')}>{text||'El contenido que escribas aparecerá aquí.'}</div>
 <footer><div className="certificate-signature"><span/><strong>Firma</strong></div><div className="certificate-seal">Sello</div></footer>
 </article></div></div></div>;
}
