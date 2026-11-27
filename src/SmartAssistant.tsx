import {useState,useRef,useEffect} from 'react';
import {MessageCircle,X,Send,ShoppingBag,Sparkles,ArrowRight} from 'lucide-react';

type Item={id:string|number;name:string;category:string;price:number;stock:number;ageRange?:string};
type Reply={role:'bot'|'user';text:string;items?:Item[]};
type Props={products:Item[];onProduct:(id:string|number)=>void;onShop:()=>void;hidden?:boolean};

const categoryRules=[
  {name:'Baby Frocks',test:/frock|dress|party|girl|ponnu|பெண்|பொண்ணு|ஃப்ராக்/i},
  {name:'Baby Rompers',test:/romper|onesie|rompers|ரொம்பர்/i},
  {name:'Newborn Sets',test:/newborn|new born|set|new baby|புதுசா|பிறந்த/i},
  {name:'Baby Nightwear',test:/night|sleep|pyjama|pajama|நைட்|தூங்க/i}
];
const money=(n:number)=>'₹'+n.toLocaleString('en-IN');
const welcome:Reply={role:'bot',text:"Vanakkam! 🐼💙 I'm KIDUVA Smart Shopping Buddy. Tell me a category, baby's age or budget (example: 'rompers under 800'). I'll find matching preview outfits! This is a free automated helper, not a live AI agent."};
const priceFrom=(text:string)=>{
 const match=text.match(/(?:under|below|less than|within|budget|upto|up to|கீழ்|குள்ள|kulla|keela)\s*(?:rs\.?|₹)?\s*(\d{2,6})/i)||text.match(/(?:₹|rs\.?\s*)(\d{2,6})/i);
 return match?Number(match[1]):null;
};
function replyTo(text:string,products:Item[]):Reply{
 const t=text.toLowerCase().trim();
 if(!t)return {role:'bot',text:'Tell me what you are looking for 💗'};
 if(/hello|hi\b|hey|vanakkam|வணக்கம்/i.test(t))return {role:'bot',text:'Hi! 🐼 Looking for frocks, rompers, newborn sets, or a budget-friendly outfit? Try a category or price!'};
 if(/delivery|shipping|return|refund|exchange|track|order status|payment|cod|cash on delivery|டெலிவரி/i.test(t))
  return {role:'bot',text:'Delivery, payments, order tracking and return policies are not live yet. KIDUVA is currently a store preview, so I cannot confirm shipping fees, return terms or order status. 💙'};
 if(/human|support|contact|phone|whatsapp|email|help me/i.test(t))
  return {role:'bot',text:'Our official support details are being prepared. You can visit the Contact page; its form is a preview and does not send messages yet. 💙'};
 const rule=categoryRules.find(r=>r.test.test(t));
 const max=priceFrom(t);
 const asksAll=/shop|all product|show all|everything|collection|catalog|எல்லா|ellam/i.test(t);
 const age=t.match(/(\d{1,2})\s*(?:years?|yrs?|year old|வயது|vayasu|age|months?|month|maasam)/i);
 let matches=products.filter(p=>p.price>0&&p.stock!==0);
 if(rule)matches=matches.filter(p=>p.category===rule.name);
 if(max!==null)matches=matches.filter(p=>p.price<=max);
 const count=matches.length;
 const ageText=age?` For age ${age[1]} ${/month|maasam/i.test(age[0])?'months':'years'}, please check each product's size and age details before buying.`:'';
 if(!rule&&max===null&&!age&&!asksAll){
  return {role:'bot',text:'I can help find baby frocks, rompers, newborn sets and nightwear! 🐼 Try “frocks under 900”, “rompers”, “2 years baby”, or “delivery”.'};
 }
 if(!count)return {role:'bot',text:`No matching preview outfits found${max!==null?' within '+money(max):''}. 🐼 Try another category or a higher budget. These are demo products; live stock is not confirmed.`};
 return {role:'bot',text:`I found ${count} matching preview outfit${count===1?'':'s'}${max!==null?' under '+money(max):''}! 💗${ageText} Prices and availability are for preview only. Tap an outfit to view sizes.`,items:matches.slice(0,3)};
}
export default function SmartAssistant({products,onProduct,onShop,hidden=false}:Props){
 const [open,setOpen]=useState(false);
 const [input,setInput]=useState('');
 const [messages,setMessages]=useState<Reply[]>([welcome]);
 const endRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{if(open)endRef.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages,open]);
 const send=(value:string)=>{
  const t=value.trim().slice(0,240);if(!t)return;
  setMessages(old=>[...old.slice(-16),{role:'user',text:t},replyTo(t,products)]);
  setInput('');
 };
 if(hidden)return null;
 return <div className="kiduva-buddy-root">
  {open&&<section className="kiduva-buddy-panel" role="dialog" aria-label="KIDUVA smart shopping assistant">
   <header className="kiduva-buddy-head"><div className="kiduva-buddy-avatar" aria-hidden="true">🐼</div><div><strong>KIDUVA Shopping Buddy</strong><small>Free smart helper · no paid AI</small></div><button type="button" aria-label="Close shopping assistant" onClick={()=>setOpen(false)}><X size={20}/></button></header>
   <div className="kiduva-buddy-messages" aria-live="polite">
    {messages.map((m,i)=><div key={i} className={`kiduva-buddy-bubble ${m.role==='user'?'kiduva-buddy-user':'kiduva-buddy-bot'}`}><p>{m.text}</p>{m.items&&<div className="kiduva-buddy-recs">{m.items.map(p=><button key={p.id} onClick={()=>{onProduct(p.id);setOpen(false)}}><ShoppingBag size={16}/><span><b>{p.name}</b><small>{p.category} · {money(p.price)} (preview)</small></span><ArrowRight size={16}/></button>)}</div>}</div>)}
    <div ref={endRef}/>
   </div>
   <div className="kiduva-buddy-chips">{['Frocks','Rompers','Under ₹800','Delivery info'].map(q=><button key={q} onClick={()=>send(q)}>{q}</button>)}</div>
   <form className="kiduva-buddy-form" onSubmit={e=>{e.preventDefault();send(input)}}><input value={input} onChange={e=>setInput(e.target.value)} maxLength={240} placeholder="Ask about styles or budget..." aria-label="Message KIDUVA shopping buddy"/><button type="submit" aria-label="Send message" disabled={!input.trim()}><Send size={18}/></button></form>
   <footer>Automated product matching · no real orders or payments. <button onClick={()=>{onShop();setOpen(false)}}>Shop all</button></footer>
  </section>}
  <button className="kiduva-buddy-fab" aria-label={open?'Close KIDUVA shopping buddy':'Chat with KIDUVA shopping buddy'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={24}/>:<><MessageCircle size={23}/><Sparkles size={14} className="kiduva-buddy-fab-star"/></>}</button>
 </div>;
}
