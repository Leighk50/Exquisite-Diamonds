const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {CatalogueStore,HttpError}=require('./catalogue'); const {auth}=require('./auth');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain'};
async function body(req,limit) { const parts=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>limit)throw new HttpError(413,'The upload is too large. Photos must be under 8 MB.');parts.push(chunk);}return Buffer.concat(parts); }
async function jsonBody(req) {if(!(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Send JSON.');try{return JSON.parse((await body(req,250000)).toString());}catch(e){if(e.status)throw e;throw new HttpError(400,'Invalid JSON.');}}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function createApp(options={}) {
 const root=path.resolve(options.root||__dirname+'/..');
 const data=options.dataDirectory||process.env.CATALOGUE_DATA_DIR||(process.env.WEBSITE_INSTANCE_ID?'/home/data/antique-diamonds':path.join(os.homedir(),'.antique-diamonds'));
 const store=new CatalogueStore(data,options.seedFile||path.join(__dirname,'..','catalogue-seed.json'));await store.init();
 const secure=options.secure??!!(process.env.WEBSITE_INSTANCE_ID||process.env.NODE_ENV==='production');
 const security=auth(process.env.BACKOFFICE_SESSION_SECRET||store.sessionKey,options.password??process.env.BACKOFFICE_PASSWORD,secure);
 const attempts=new Map(); let lastSweep=0;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
  let pathname;
  try {
   pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.includes('\0')||pathname.includes('\\'))throw new HttpError(400,'Invalid path.');
   if(pathname.startsWith('/api/')) {
    if(pathname==='/api/catalogue'&&req.method==='GET'){const c=await store.read();return send(res,200,{revision:c.revision,products:c.products.filter(p=>p.published)});}
    if(!pathname.startsWith('/api/admin/'))throw new HttpError(404,'Not found.');
    if(['POST','PUT','DELETE','PATCH'].includes(req.method)) {
     const origin=req.headers.origin;const host=req.headers.host;
     if(origin){let o;try{o=new URL(origin)}catch{throw new HttpError(403,'Invalid origin.');}const allowed=[host,...String(process.env.BACKOFFICE_ORIGIN||'https://exquisite.villagelimits.co.uk').split(',').map(x=>{try{return new URL(x.trim()).host}catch{return ''}})];if(!allowed.includes(o.host))throw new HttpError(403,'Open the back office on this website to make changes.');}
     if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Cross-site request blocked.');
    }
    if(pathname==='/api/admin/login'&&req.method==='POST'){
     if(Date.now()-lastSweep>60000){for(const [ip,value]of attempts)if(value.until<Date.now())attempts.delete(ip);lastSweep=Date.now();}
     const ip=req.socket.remoteAddress||'unknown',old=attempts.get(ip);
     if(old&&old.until>Date.now()&&old.count>=10)throw new HttpError(429,'Too many sign-in attempts. Please wait 15 minutes.');
     const input=await jsonBody(req);let cookie;
     try{cookie=security.login(input.password)}catch(e){if(e.status===401){const entry=old&&old.until>Date.now()?old:{count:0,until:Date.now()+900000};entry.count++;attempts.set(ip,entry);}throw e;}
     attempts.delete(ip);res.setHeader('Set-Cookie',cookie);return send(res,200,{ok:true});
    }
    const current=security.session(req);
    if(pathname==='/api/admin/session'&&req.method==='GET')return send(res,200,{csrf:current.csrf});
    if(!['GET','HEAD'].includes(req.method))security.verifyCSRF(req,current);
    if(pathname==='/api/admin/logout'&&req.method==='POST'){res.setHeader('Set-Cookie',security.logout());return send(res,200,{ok:true});}
    if(pathname==='/api/admin/catalogue'&&req.method==='GET')return send(res,200,await store.read());
    if(pathname==='/api/admin/export'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="antique-diamonds-catalogue.json"');return send(res,200,await store.read());}
    if(pathname==='/api/admin/products'&&req.method==='POST'){
     const input=await jsonBody(req);const value=await store.save(input.product,input.revision,input.id);return send(res,200,value);
    }
    if(pathname==='/api/admin/photos'&&req.method==='POST'){
     const buffer=await body(req,8*1024*1024);const mime=(req.headers['content-type']||'').split(';')[0];let ext;
     if(mime==='image/jpeg'&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)ext='jpg';
     if(mime==='image/png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';
     if(mime==='image/webp'&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP')ext='webp';
     if(!ext)throw new HttpError(400,'Upload a JPG, PNG or WebP image.');
     const name=crypto.randomUUID()+'.'+ext;await fs.writeFile(path.join(store.directory,'media',name),buffer,{flag:'wx'});return send(res,201,{url:'/media/'+name});
    }
    throw new HttpError(404,'Not found.');
   }
   if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'Method not allowed.');
   let file;
   if(pathname.startsWith('/media/')){
    if(!/^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(pathname))throw new HttpError(404,'Not found.');
    file=path.join(store.directory,pathname.slice(1));res.setHeader('Cache-Control','public, max-age=31536000, immutable');
   }else{
    if(/^\/(backend|scripts|tests)(\/|$)/.test(pathname)||/^\/(server|static-server)\.js$/.test(pathname)||pathname==='/catalogue-seed.json'||pathname.split('/').some(p=>p.startsWith('.')))throw new HttpError(404,'Not found.');
    const match=pathname.match(/^\/product\/([a-z0-9-]+)\/?$/);
    if(match){const c=await store.read();if(!c.products.some(p=>p.published&&p.slug===match[1]))throw new HttpError(404,'Item not found.');}
    file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)&&file!==root)throw new HttpError(404,'Not found.');
    let stat;try{stat=await fs.stat(file)}catch{if(match){file=path.join(root,'piece','index.html');stat=await fs.stat(file);}else throw new HttpError(404,'Not found.');}
    if(stat.isDirectory())file=path.join(file,'index.html');
    res.setHeader('Cache-Control',path.extname(file)==='.html'?'no-store':'public, max-age=3600');
   }
   const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){if(e.code==='ENOENT')e=new HttpError(404,'Not found.');if(!e.status)console.error('Request failed:',e.message);if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'The catalogue could not be loaded or saved. Please retry; no saved data has been replaced.'});else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;return {server,store};
}
module.exports={createApp};
