'use client';
import { useState } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { materialDisplayId } from '@/lib/code-rules';
import { Button } from './ui/button';
import { useEconexoData, type MaterialRecord } from '@/lib/econexo-data';
import { defaultMaterialGroups, materialGroupId, type MaterialGroup } from '@/lib/material-groups';

export function MaterialCatalog({notify}:{notify:(message:string,tone?:'success'|'error')=>void}) {
  const {settings,materials,clients,saveSettings,saveMaterial,toggleMaterial,deleteMaterial}=useEconexoData();
  const groups=settings?.material_groups??defaultMaterialGroups;
  const [deleting,setDeleting]=useState<{kind:'group'|'material';id:string;name:string}|null>(null);
  const [deleteError,setDeleteError]=useState('');
  const remove=async()=>{if(!deleting)return;setBusy(true);setDeleteError('');try{if(deleting.kind==='material')await deleteMaterial(deleting.id);else{if(materials.some(m=>materialGroupId(m)===deleting.id)||clients.some(c=>c.code_group_id===deleting.id))throw Error('La categoría tiene materiales o clientes asociados y no se puede eliminar.');await saveSettings({material_groups:groups.filter(g=>g.id!==deleting.id)})}setDeleting(null);notify('Registro eliminado.')}catch(e){setDeleteError(e instanceof Error?e.message:'No se pudo eliminar.')}finally{setBusy(false)}};
  const [draft,setDraft]=useState<{kind:'group'|'material';id?:string;name:string;groupId:string}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const open=(kind:'group'|'material',groupId='',item?:MaterialRecord|MaterialGroup)=>{setError('');setDraft({kind,id:item?.id,name:item?.name??'',groupId})};
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!draft)return;const name=draft.name.trim();
    if(name.length<2){setError('Escribe un nombre de al menos 2 caracteres.');return}
    if((draft.kind==='group'?groups:materials).some(x=>x.id!==draft.id&&x.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){setError('Ese nombre ya existe.');return}
    if(draft.kind==='material'&&!draft.groupId){setError('Selecciona una categoría.');return}
    setBusy(true);try{
      if(draft.kind==='group')await saveSettings({material_groups:draft.id?groups.map(g=>g.id===draft.id?{...g,name}:g):[...groups,{id:crypto.randomUUID(),name,active:true}]});
      else await saveMaterial(name,draft.id,draft.groupId);
      setDraft(null);notify('Catálogo actualizado.');
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.')}finally{setBusy(false)}
  };
  const toggle=async(m:MaterialRecord)=>{try{await toggleMaterial(m.id,!m.active)}catch(e){notify(e instanceof Error?e.message:'No se pudo actualizar.','error')}};
  return <><div className="settings-head row"><div><h2>Materiales y categorías</h2><p>Categorías principales y tipos de material. Los registros anteriores se conservan.</p></div><Button onClick={()=>open('group')}><Plus/>Agregar categoría</Button></div>
  {[...groups,...(materials.some(m=>!groups.some(g=>g.id===materialGroupId(m)))?[{id:'',name:'Materiales sin clasificar',active:true}]:[])].map(g=><article className="material-group" key={g.id}>
    <div><h3>{g.name}</h3>{g.id&&<div className="catalog-item-actions"><Button variant="ghost" size="icon" aria-label={'Editar categoría '+g.name} onClick={()=>open('group',g.id,g)}><Edit3/></Button><Button variant="ghost" size="icon" aria-label={'Eliminar categoría '+g.name} onClick={()=>{setDeleting({kind:'group',id:g.id,name:g.name});setDeleteError('')}}><Trash2/></Button></div>}</div>
    <ul>{materials.filter(m=>materialGroupId(m)===g.id).map(m=><li key={m.id}><span>{m.name}<small style={{display:'block'}}>{materialDisplayId(m)}</small></span><small>{m.active?'Activo':'Inactivo'}</small><label className="toggle"><input aria-label={'Activar '+m.name} type="checkbox" checked={m.active} onChange={()=>void toggle(m)}/><i/></label><div className="catalog-item-actions"><Button variant="ghost" size="icon" aria-label={'Editar material '+m.name} onClick={()=>open('material',g.id,m)}><Edit3/></Button><Button variant="ghost" size="icon" aria-label={'Eliminar material '+m.name} onClick={()=>{setDeleting({kind:'material',id:m.id,name:m.name});setDeleteError('')}}><Trash2/></Button></div></li>)}</ul>
    {!materials.some(m=>materialGroupId(m)===g.id)&&<p>No hay tipos de material registrados en esta categoría.</p>}
    {g.id&&<Button variant="ghost" onClick={()=>open('material',g.id)}><Plus/>Agregar tipo de material</Button>}
  </article>)}
  {draft&&<div className="modal-layer" role="dialog" aria-modal="true" aria-label="Editar catálogo"><form className="modal" onSubmit={save}><h2>{draft.id?'Editar':'Agregar'} {draft.kind==='group'?'categoría':'tipo de material'}</h2><div className="form-grid"><label>Nombre<input autoFocus required minLength={2} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>{draft.kind==='material'&&<label>Categoría<select required value={draft.groupId} onChange={e=>setDraft({...draft,groupId:e.target.value})}><option value="">Selecciona</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}</div>{error&&<p role="alert" className="form-error">{error}</p>}<div className="modal-actions"><Button disabled={busy} type="button" variant="outline" onClick={()=>setDraft(null)}>Cancelar</Button><Button disabled={busy} type="submit">{busy?'Guardando…':'Guardar'}</Button></div></form></div>}
  {deleting&&<div className="modal-layer" role="dialog" aria-modal="true" aria-label="Confirmar eliminación"><div className="modal"><h2>Eliminar {deleting.name}</h2><p>Esta acción no se puede deshacer. Solo se pueden eliminar registros sin asociaciones ni documentos históricos.</p>{deleteError&&<p role="alert" className="form-error">{deleteError}</p>}<div className="modal-actions"><Button disabled={busy} variant="outline" onClick={()=>setDeleting(null)}>Cancelar</Button><Button disabled={busy} variant="destructive" onClick={()=>void remove()}>{busy?'Eliminando…':'Confirmar eliminación'}</Button></div></div></div>}
  </>;
}
