export type SupplierCategory={id:string;name:string;active:boolean};
export const defaultSupplierCategories:SupplierCategory[]=[{id:'collector',name:'Recolectores',active:true},{id:'company',name:'Empresas',active:true}];
export const supplierCategoryId=(supplier:{type:string;category_id?:string|null})=>supplier.category_id||supplier.type;
