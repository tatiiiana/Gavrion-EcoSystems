export type CodeEntity='material'|'client'|'supplier';
export type CodeRule={entity:CodeEntity;category:string;prefix:string;digits:number;start:number};
export const codeDefaults:Record<CodeEntity,string>={material:'MAT',client:'CLI',supplier:'PROV'};
export function getCodeRule(rules:CodeRule[],entity:CodeEntity,category:string):CodeRule{
 return rules.find(r=>r.entity===entity&&r.category===category)??rules.find(r=>r.entity===entity&&r.category==='*')??{entity,category:'*',prefix:codeDefaults[entity],digits:4,start:1};
}
export function nextCode(rule:CodeRule,existing:string[],counter=0){
 if(!/^[A-Z0-9][A-Z0-9-]{1,11}$/.test(rule.prefix)||!Number.isInteger(rule.digits)||rule.digits<2||rule.digits>8||!Number.isInteger(rule.start)||rule.start<1)throw Error('Nomenclatura inválida.');
 let serial=Math.max(rule.start,counter+1);
 for(const code of existing){if(code.startsWith(rule.prefix+'-')){const suffix=code.slice(rule.prefix.length+1);if(/^\d+$/.test(suffix))serial=Math.max(serial,Number(suffix)+1)}}
 if(serial>=10**rule.digits)throw Error('El consecutivo excede los dígitos configurados. Amplía la nomenclatura.');
 return {code:rule.prefix+'-'+String(serial).padStart(rule.digits,'0'),serial};
}
export const materialDisplayId=(m:{id:string;material_code?:string|null})=>m.material_code||'MAT-'+m.id.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();
