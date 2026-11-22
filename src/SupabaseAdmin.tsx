import {useEffect,useState} from 'react';
import {ArrowLeft,Box,ImagePlus,LogOut,Plus,RefreshCw,Save,Search,ShieldCheck,Trash2,X} from 'lucide-react';
import {supabase,fetchLiveProducts,type LiveProduct,type LiveVariant} from './supabaseClient';

type Props={onBack:()=>;onChanged:()=>};
const categories=['Baby Rompers','Baby Frocks','Newborn Sets','Baby Nightwear'];
const sizes=['0–3 Months','3–6 Months','6–12 Months','1–2 Years','2–3 Years','3–4 Years','4–5 Years'];
const blank={name:'',category:categories[0],sku:'',price:'',description:'',sizes:'',colours:'',status:'draft' as 'draft'|'active',image_url:''};
export default function SupabaseAdmin({onBack,onChanged}:Props){
 const [user,setUser]=useState<string|null>(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[authorised,setAuthorised]=useState(false);
 const [products,setProducts]=useState<LiveProduct[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [tab,setTab]=useState<'Products'|'Inventory'>('Products'),[search,setSearch]=useState(''),[formOpen,setFormOpen]=useState(false),[editId,setEditId]=useState<string|null>(null),[form,setForm]=useState(blank);
 const [upload,setUpload]=useState<File|null>(null),[adjust,setAdjust]=useState<LiveVariant|null>(null),[delta,setDelta]=useState(''),[reason,setReason]=useState('');
 const tell=(s:string)=>{setMessage(s);setError('')}; const fail=(e:unknown)=>setError(e instanceof Error?e.message:String(e));
 async function verify(){
  if(!supabase)return;
  const {data:{user:u}}=await supabase.auth.getUser();
  if(!u){setUser(null);setAuthorised(false);setLoading(false);return;}
  setUser(u.email||u.id);
  const {data,error:e}=await supabase.from('kiduva_admins').select('role').eq('user_id',u.id).maybeSingle();
  if(e)fail(e);
  setAuthorised(Boolean(data));setLoading(false);
 }
 async function load(){
  if(!supabase)return;
  try{setProducts(await fetchLiveProducts(true));onChanged()}catch(e){fail(e)}
 }
 useEffect(()=>{let active=true;void verify();const sub=supabase?.auth.onAuthStateChange(()=>{if(active)void verify()});return()=>{active=false;sub?.data.subscription.unsubscribe()}},[]);
 useEffect(()=>{if(authorised)void load()},[authorised]);
 async function login(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{const {error:e}=await supabase.auth.signInWithPassword({email,password});if(e)throw e;setPassword('');await verify()}catch(e){fail(e)}finally{setBusy(false)}}
 async function signOut(){await supabase?.auth.signOut();setUser(null);setAuthorised(false)}
 const newProduct=()=>{setEditId(null);setForm(blank);setUpload(null);setFormOpen(true);setError('')};
 const editProduct=(p:LiveProduct)=>{setEditId(p.id);setForm({name:p.name,category:p.category,sku:p.sku,price:String(p.price),description:p.description,sizes:[...new Set(p.kiduva_variants.map(v=>v.size))].join(', '),colours:[...new Set(p.kiduva_variants.map(v=>v.colour))].join(', '),status:p.status==='active'?'active':'draft',image_url:p.image_url||''});setUpload(null);setFormOpen(true);setError('')};
 const parsed=(s:string)=>[...new Set(s.split(',').map(x=>x.trim()).filter(Boolean))];
 async function save(){
  if(!supabase)return;setError('');setMessage('');
  const price=Number(form.price),ss=parsed(form.sizes),cc=parsed(form.colours);
  if(!form.name.trim()||!form.sku.trim()||!Number.isFinite(price)||price<0||!form.price||!ss.length||!cc.length){setError('Name, SKU, price, sizes and colours are required');return}
  if(ss.length*cc.length>80){setError('Maximum 80 size/colour combinations');return}
  if(upload&&(!['image/png','image/jpeg','image/webp'].includes(upload.type)||upload.size>5*1024*1024)){setError('Use PNG/JPEG/WebP under 5 MB');return}
  setBusy(true);let newId:string|null=null;
  try{
   let image=form.image_url.trim()||null;
   if(upload){const ext=upload.type==='image/png'?'png':upload.type==='image/webp'?'webp':'jpg';const path=`${crypto.randomUUID()}.${ext}`;const result=await supabase.storage.from('kiduva-products').upload(path,upload,{contentType:upload.type,upsert:false});if(result.error)throw result.error;image=supabase.storage.from('kiduva-products').getPublicUrl(path).data.publicUrl;}
   const record={name:form.name.trim(),category:form.category,sku:form.sku.trim(),price,description:form.description.trim(),status:form.status,image_url:image,updated_at:new Date().toISOString()};
   if(editId){
    const found=products.find(p=>p.id===editId);
    if(!found)throw Error('Product not found');
    const oldSizes=[...new Set(found.kiduva_variants.map(v=>v.size))].sort().join('|');
    const oldColors=[...new Set(found.kiduva_variants.map(v=>v.colour))].sort().join('|');
    if(oldSizes!==[...ss].sort().join('|')||oldColors!==[...cc].sort().join('|'))throw Error('For now, existing variant combinations cannot be changed. Create another product or edit details without changing sizes/colours.');
    const {error:e}=await supabase.from('kiduva_products').update(record).eq('id',editId);if(e)throw e;
   }else{
    const {data:p,error:e}=await supabase.from('kiduva_products').insert(record).select('id').single();if(e)throw e;newId=p.id;
    const variants=ss.flatMap((size,i)=>cc.map((colour,j)=>({product_id:p.id,size,colour,sku:`${form.sku.trim()}-${i+1}-${j+1}`,stock:0,low_stock_threshold:5})));
    const inserted=await supabase.from('kiduva_variants').insert(variants);
    if(inserted.error)throw inserted.error;
   }
   await load();setFormOpen(false);tell(editId?'Product updated successfully':'Product created with zero stock. Add stock in Inventory.');setEditId(null);
  }catch(e){if(newId){await supabase.from('kiduva_products').delete().eq('id',newId)}fail(e)}finally{setBusy(false)}
 }
 async function removeProduct(p:LiveProduct){if(!supabase||!window.confirm(`Delete ${p.name}? This cannot be undone.`))return;setBusy(true);try{const {error:e}=await supabase.from('kiduva_products').delete().eq('id',p.id);if(e)throw e;await load();tell('Product deleted')}catch(e){fail(e)}finally{setBusy(false)}}
 async function stockSave(){if(!supabase||!adjust)return;const value=Number(delta);if(!delta.trim()||!Number.isSafeInteger(value)||value===0||reason.trim().length<3){setError('Enter a nonzero whole-number adjustment and a reason');return}setBusy(true);try{const {error:e}=await supabase.rpc('kiduva_adjust_stock',{p_variant_id:adjust.id,p_delta:value,p_reason:reason});if(e)throw e;setAdjust(null);setDelta('');setReason('');await load();tell('Stock saved and recorded in history')}catch(e){fail(e)}finally{setBusy(false)}}
 const filtered=products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(search.toLowerCase()));
 return <main className="sb-admin">
  <header className="sb-header"><img src="/kiduva-logo.png" alt="KIDUVA.IN"/><div><small>OWNER CONTROL ROOM</small><h1>Store Dashboard</h1></div><button onClick={onBack}><ArrowLeft size={16}/> Website</button></header>
  {!authorised? <section className="sb-login"><ShieldCheck size={38}/><h2>Secure Admin Login</h2><p>Use your Supabase owner's email and password. The old 'Shifad' demo password does not grant access to this real database.</p>{loading?<p>Checking account...</p>:<form onSubmit={login}><label>Email<input type="email" value={email} required onChange={e=>setEmail(e.target.value)} placeholder="Owner email"/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Secure password"/></label><button disabled={busy} className="pill">{busy?'Signing in...':'Sign in securely'}</button></form>}{user&&!authorised&&<p>Signed in as {user}, but this account has not been granted a KIDUVA admin role.</p>}{error&&<p className="sb-error">{error}</p>}</section>:
  <div className="sb-workspace"><div className="sb-toolbar"><span>Signed in: {user}</span><button onClick={signOut}><LogOut size={16}/> Sign out</button></div><div className="sb-tabs"><button className={tab==='Products'?'current':''} onClick={()=>setTab('Products')}><Box size={17}/> Products</button><button className={tab==='Inventory'?'current':''} onClick={()=>setTab('Inventory')}><RefreshCw size={17}/> Inventory</button></div>
  <div className="sb-section-top"><div><h2>{tab==='Products'?'Manage products':'Manage inventory'}</h2><p>Changes are saved to Supabase and reflected on the website.</p></div>{tab==='Products'&&<button className="pill" onClick={newProduct}><Plus size={17}/> Add Product</button>}</div>
  {message&&<p className="sb-success">{message}</p>}{error&&<p className="sb-error">{error}</p>}
  <label className="sb-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products or SKU"/></label>
  {tab==='Products'?<div className="sb-table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><div className="sb-product-cell">{p.image_url&&<img src={p.image_url} alt=""/>}<b>{p.name}<small>{p.sku}</small></b></div></td><td>{p.category}</td><td>₹{Number(p.price).toLocaleString('en-IN')}</td><td>{p.kiduva_variants.reduce((n,v)=>n+v.stock,0)}</td><td>{p.status}</td><td><button onClick={()=>editProduct(p)}>Edit</button><button className="danger-text" onClick={()=>removeProduct(p)} disabled={busy}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{!filtered.length&&<p className="sb-empty">No products yet. Click Add Product to start.</p>}</div>:
  <div className="sb-table-wrap"><table><thead><tr><th>Product</th><th>Size</th><th>Colour</th><th>SKU</th><th>Stock</th><th>Action</th></tr></thead><tbody>{filtered.flatMap(p=>p.kiduva_variants.map(v=><tr key={v.id}><td>{p.name}</td><td>{v.size}</td><td>{v.colour}</td><td>{v.sku}</td><td>{v.stock===0?'Out of stock':v.stock<=v.low_stock_threshold?`Low: ${v.stock}`:v.stock}</td><td><button onClick={()=>{setAdjust(v);setError('')}}>Adjust stock</button></td></tr>))}</tbody></table></div>}
  {adjust&&<div className="sb-stock-form"><h3>Adjust stock: {adjust.size} / {adjust.colour}</h3><p>Current: {adjust.stock} · Enter +20 to add, -5 to reduce.</p><input type="number" step="1" value={delta} onChange={e=>setDelta(e.target.value)} placeholder="+20"/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (e.g. New shipment)"/><button className="pill" disabled={busy} onClick={stockSave}>Save stock</button><button onClick={()=>setAdjust(null)}>Cancel</button></div>}
  </div>}
  {authorised&&formOpen&&<div className="sb-modal-backdrop" onClick={()=>setFormOpen(false)}><section className="sb-modal" onClick={e=>e.stopPropagation()}><div className="sb-modal-top"><h2>{editId?'Edit product':'Add new product'}</h2><button onClick={()=>setFormOpen(false)}><X/></button></div><p>New products start with zero stock. Add stock separately in Inventory.</p><label>Product name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="sb-form-grid"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>SKU<input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label></div><div className="sb-form-grid"><label>Price ₹<input type="number" min="0" step=".01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'draft'|'active'})}><option value="draft">Draft</option><option value="active">Active</option></select></label></div><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Sizes (comma separated)<input value={form.sizes} onChange={e=>setForm({...form,sizes:e.target.value})} placeholder={sizes.slice(0,3).join(', ')}/></label><label>Colours (comma separated)<input value={form.colours} onChange={e=>setForm({...form,colours:e.target.value})} placeholder="Blue, Pink"/></label><label>Photo upload (PNG / JPG / WebP, up to 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setUpload(e.target.files?.[0]||null)}/></label>{(upload||form.image_url)&&<img className="sb-photo-preview" src={upload?URL.createObjectURL(upload):form.image_url} alt="Product preview"/>}{error&&<p className="sb-error">{error}</p>}<div className="sb-modal-actions"><button onClick={()=>setFormOpen(false)}>Cancel</button><button className="pill" disabled={busy} onClick={save}><Save size={17}/>{busy?'Saving...':'Save Product'}</button></div></section></div>}
 </main>;
}
