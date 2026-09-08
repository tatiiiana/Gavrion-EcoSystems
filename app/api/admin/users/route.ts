import {createClient} from '@supabase/supabase-js';
export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return Response.json({error:'La creación de cuentas requiere configurar Supabase en el servidor.'},{status:503});
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!token)return Response.json({error:'Autenticación requerida'},{status:401});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await admin.auth.getUser(token);
 if(error||!auth.user)return Response.json({error:'Sesión no válida'},{status:401});
 const {data:profile}=await admin.from('profiles').select('role,active').eq('id',auth.user.id).single();
 if(profile?.role!=='admin'||!profile.active)return Response.json({error:'Solo administradores'},{status:403});
 let body;try{body=await request.json()}catch{return Response.json({error:'Solicitud inválida'},{status:400})}
 const {full_name,email,password,role}=body;
 if(typeof full_name!=='string'||full_name.trim().length<2||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<12||!['admin','employee'].includes(role))return Response.json({error:'Revisa nombre, correo, rol y contraseña (mínimo 12 caracteres).'},{status:400});
 const result=await admin.auth.admin.createUser({email:email.trim().toLowerCase(),password,user_metadata:{full_name:full_name.trim()}});
 if(result.error)return Response.json({error:result.error.message},{status:400});
 const saved=await admin.from('profiles').upsert({id:result.data.user.id,full_name:full_name.trim(),role,active:true});
 if(saved.error)return Response.json({error:'La cuenta fue creada, pero no se pudo asignar el perfil. Revísala en Usuarios antes de volver a crearla.'},{status:500});
 return Response.json({id:result.data.user.id},{status:201});
}
