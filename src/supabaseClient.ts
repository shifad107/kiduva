import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export type LiveVariant = { id: string; size: string; colour: string; sku: string; stock: number; low_stock_threshold: number; };
export type LiveProduct = { id:string; name:string; category:string; description:string; sku:string; price:number; image_url:string|null; status:'draft'|'active'|'archived'; kiduva_variants:LiveVariant[] };
export async function fetchLiveProducts(includeDrafts=false):Promise<LiveProduct[]> {
 if (!supabase) return [];
 let query = supabase.from('kiduva_products').select('id,name,category,description,sku,price,image_url,status,kiduva_variants(id,size,colour,sku,stock,low_stock_threshold)').order('created_at',{ascending:false});
 if (!includeDrafts) query=query.eq('status','active');
 const {data,error}=await query;
 if(error) throw error;
 return (data||[]) as LiveProduct[];
}
