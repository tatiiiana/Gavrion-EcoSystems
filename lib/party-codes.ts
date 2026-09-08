type PartyCode = {id:string;supplier_code?:string|null;client_code?:string|null};
const suppliers:Record<string,string>={'sup-pedro':'PROV-0001','sup-mario':'PROV-0002','sup-jose':'PROV-0003','sup-demo':'PROV-0004','sup-norte':'PROV-0005'};
const clients:Record<string,string>={'cli-pedro':'CLI-0001','cli-maria':'CLI-0002','cli-guatemala':'CLI-0003'};
export const supplierDisplayId=(p:PartyCode)=>p.supplier_code?.trim()||suppliers[p.id]||'PROV-'+p.id.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();
export const clientDisplayId=(p:PartyCode)=>p.client_code?.trim()||clients[p.id]||'CLI-'+p.id.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();
