export type MaterialGroup = {id:string;name:string;active:boolean};
export const defaultMaterialGroups:MaterialGroup[] = [
  {id:'ferrous',name:'Ferrosos',active:true}, {id:'non-ferrous',name:'No ferrosos',active:true},
  {id:'plastic',name:'Plástico',active:true}, {id:'paper',name:'Papel',active:true},
  {id:'cardboard',name:'Cartón',active:true}, {id:'raee',name:'RAEE',active:true},
];
export const defaultMaterialTypes = [
  {id:'mat-wrought-iron',name:'Hierro forjado',group_id:'ferrous'},
  {id:'mat-steel',name:'Acero',group_id:'ferrous'},
  ...['Aluminio','Cobre','Zinc','Estaño','Magnesio'].map((name,i)=>({id:`mat-non-ferrous-${i}`,name,group_id:'non-ferrous'})),
];
export function materialGroupId(material:{name:string;group_id?:string|null}) {
  if(material.group_id)return material.group_id;
  const name=material.name.toLocaleLowerCase('es');
  if(/hierro|acero|chatarra/.test(name))return 'ferrous';
  if(/aluminio|cobre|zinc|estaño|magnesio/.test(name))return 'non-ferrous';
  if(name.includes('cartón'))return 'cardboard';
  if(name.includes('papel'))return 'paper';
  if(name.includes('plást'))return 'plastic';
  if(name.includes('raee'))return 'raee';
  return '';
}
export const weightUnitLabel = (unit:unknown) => unit==='ton'?'toneladas':String(unit??'');
