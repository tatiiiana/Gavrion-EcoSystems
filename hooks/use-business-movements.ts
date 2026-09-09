'use client';
import {useEffect,useMemo,useState} from 'react';
import {useEconexoData} from '@/lib/econexo-data';
import {useBilling} from '@/components/billing';
import {createClient} from '@/lib/supabase/client';
import {businessMovements,type WeightDocument} from '@/lib/dashboard-metrics';
export function useBusinessMovements(){
  const {configured,inventory}=useEconexoData(),{invoices}=useBilling();
  const [tickets,setTickets]=useState<WeightDocument[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let active=true;setLoading(true);(async()=>{try{
    let rows:WeightDocument[];
    if(configured){const r=await createClient().from('weight_tickets').select('document');if(r.error)throw r.error;rows=(r.data??[]).map(r=>r.document)}
    else{rows=JSON.parse(localStorage.getItem('gavrion-weight-tickets-v1')||'[]');if(!Array.isArray(rows))throw Error('Historial de boletas inválido')}
    if(active){setTickets(rows);setError('')}
  }catch(e){if(active)setError(e instanceof Error?e.message:'No fue posible cargar los documentos')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[configured,inventory]);
  const movements=useMemo(()=>businessMovements(inventory,tickets,invoices),[inventory,tickets,invoices]);
  return {movements,loading,error};
}
