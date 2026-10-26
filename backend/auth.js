const crypto=require('node:crypto');
const {HttpError}=require('./catalogue');
const hash=x=>crypto.createHash('sha256').update(x).digest();
const same=(a,b)=>crypto.timingSafeEqual(hash(String(a)),hash(String(b)));
function auth(secret,password,secure) {
  const configured=typeof password==='string'&&password.length>=12;
  const sign=x=>crypto.createHmac('sha256',hash(secret+'\0'+password)).update(x).digest('base64url');
  const cookie=(value,age)=>`ad_admin=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
  const session=req=>{
    if(!configured)throw new HttpError(503,'Back office setup is required: add BACKOFFICE_PASSWORD (at least 12 characters) in Azure application settings.');
    const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ad_admin='))?.slice(9)||'';
    const [payload,signature]=value.split('.');
    if(!payload||!signature||!same(sign(payload),signature))throw new HttpError(401,'Please sign in.');
    let parsed;try{parsed=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{throw new HttpError(401,'Please sign in.');}
    if(!parsed.exp||parsed.exp<Date.now()||!parsed.nonce)throw new HttpError(401,'Your session has expired. Please sign in again.');
    return {csrf:sign('csrf:'+value)};
  };
  return {configured,session,logout:()=>cookie('',0),login:supplied=>{
    if(!configured)throw new HttpError(503,'Back office setup is required: add BACKOFFICE_PASSWORD (at least 12 characters) in Azure application settings.');
    if(typeof supplied!=='string'||!same(supplied,password))throw new HttpError(401,'Incorrect password.');
    const payload=Buffer.from(JSON.stringify({exp:Date.now()+8*60*60*1000,nonce:crypto.randomBytes(24).toString('hex')})).toString('base64url');
    return cookie(payload+'.'+sign(payload),8*60*60);
  },verifyCSRF:(req,current)=>{if(!same(req.headers['x-csrf-token']||'',current.csrf))throw new HttpError(403,'Please refresh the back office and retry.');}};
}
module.exports={auth};
