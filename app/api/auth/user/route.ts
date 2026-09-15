import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function GET(){
 const client=await createServerSupabase();
 if(!client)return NextResponse.json({authenticated:false,error:"Auth not configured"},{status:503});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return NextResponse.json({authenticated:false},{status:401});
 return NextResponse.json({authenticated:true,user:{id:user.id,email:user.email,name:user.user_metadata?.full_name||user.user_metadata?.display_name||user.email||"Future user"}},{headers:{"Cache-Control":"no-store"}});
}
