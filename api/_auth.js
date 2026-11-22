import crypto from 'node:crypto';
export function cookie(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));}
export function signedSession(req){const secret=process.env.ADMIN_SESSION_SECRET;if(!secret||secret.length<32)return false;const token=cookie(req).kiduva_admin;if(!token)return false;const [expiry,mac]=token.split('.');if(!expiry||!mac||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return false;const expected=crypto.createHmac('sha256',secret).update(expiry).digest('hex');return mac.length===expected.length&&crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected));}
export function requireAdmin(req,res){if(signedSession(req))return true;res.status(401).json({error:'Administrator authentication required'});return false;}
export function sameOrigin(req,res){const origin=req.headers.origin;if(!origin)return true;let expected;try{expected=new URL('https://'+req.headers.host).origin;}catch{return false;}if(origin!==expected){res.status(403).json({error:'Origin mismatch'});return false;}return true;}
export function jsonBody(req){return typeof req.body==='string'?JSON.parse(req.body):req.body||{};}
export function fail(res,error){console.error('KIDUVA API:',error);res.status(500).json({error:'Unable to complete this request'});}
