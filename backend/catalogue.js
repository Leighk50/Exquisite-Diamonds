const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fields = ['name','description','metal','period','condition','dimensions','ringSize','carat','cut','colour','clarity','certLab','certificate','stockCode'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function validateProduct(input, existing) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Invalid item.');
  const p = {};
  for (const field of fields) {
    if (input[field] != null && typeof input[field] !== 'string') throw new HttpError(400, 'Invalid '+field+'.');
    p[field] = (input[field] || '').trim();
    if (p[field].length > (['description','certificate','condition'].includes(field) ? 10000 : 250)) throw new HttpError(400, field+' is too long.');
  }
  if (!p.name || !p.description) throw new HttpError(400, 'An item name and description are required.');
  p.slug = existing ? existing.slug : String(input.slug || '').trim();
  if (!slugPattern.test(p.slug) || p.slug.length > 120) throw new HttpError(400, 'Use a short URL containing lowercase letters, numbers and hyphens.');
  if (!['rings','earrings','necklaces','other'].includes(input.category)) throw new HttpError(400, 'Choose a valid jewellery category.');
  if (!['antique','modern'].includes(input.collection)) throw new HttpError(400, 'Choose Antique & vintage or Preloved modern.');
  if (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price < 0 || input.price > 10000000) throw new HttpError(400, 'Enter a valid price.');
  p.price = Math.round(input.price * 100) / 100;
  p.featuredOrder = input.featuredOrder == null ? 100 : Number(input.featuredOrder);
  if (!Number.isInteger(p.featuredOrder) || p.featuredOrder < 0 || p.featuredOrder > 9999) throw new HttpError(400, 'Featured order must be a whole number from 0 to 9999.');
  p.category = input.category; p.collection = input.collection;
  for (const field of ['featured','justArrived','published','sold']) {
    if (typeof input[field] !== 'boolean') throw new HttpError(400, 'Invalid '+field+' setting.');
    p[field] = input[field];
  }
  if (!Array.isArray(input.images) || input.images.length > 12 || !input.images.every(x => typeof x === 'string' && /^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(x))) throw new HttpError(400, 'Choose up to 12 uploaded JPG, PNG or WebP photos.');
  p.images = [...new Set(input.images)];
  if (p.published && (!p.price || !p.metal)) throw new HttpError(400, 'Published pieces need a price and metal.');
  return p;
}
class CatalogueStore {
  constructor(directory, seedFile) { this.directory=path.resolve(directory); this.file=path.join(this.directory,'catalogue.json'); this.seedFile=seedFile; }
  async lock(task) {
    const lock=path.join(this.directory,'.write-lock');
    let acquired=false;
    for(let i=0;i<30;i++) { try { await fs.mkdir(lock); acquired=true; break; } catch(e) { if(e.code!=='EEXIST')throw e; await new Promise(r=>setTimeout(r,100)); } }
    if(!acquired)throw new HttpError(503,'Another catalogue save is in progress. Please retry.');
    try { return await task(); } finally { await fs.rmdir(lock); }
  }
  async init() {
    await fs.mkdir(this.directory,{recursive:true}); await fs.mkdir(path.join(this.directory,'media'),{recursive:true}); await fs.mkdir(path.join(this.directory,'backups'),{recursive:true});
    await this.lock(async()=>{
      try { await this.read(); } catch(e) {
        if(e.code!=='ENOENT')throw e;
        try { await fs.access(path.join(this.directory,'.initialised')); throw new Error('Catalogue missing from an initialised store; restore a backup before restarting.'); } catch(marker) { if(marker.code!=='ENOENT')throw marker; }
        const seed=JSON.parse(await fs.readFile(this.seedFile,'utf8'));
        const catalogue={version:1,revision:crypto.randomUUID(),updatedAt:new Date().toISOString(),products:seed.map(p=>({...p,id:crypto.randomUUID(),collection:p.collection||'antique',images:p.images||[],published:true,sold:false,featured:p.featured??!!p.justArrived}))};
        await this.atomicWrite(catalogue);
      }
      await fs.writeFile(path.join(this.directory,'.initialised'),'1',{flag:'a'});
      const keyFile=path.join(this.directory,'.session-key');
      try { await fs.writeFile(keyFile,crypto.randomBytes(48).toString('hex'),{flag:'wx',mode:0o600}); } catch(e) { if(e.code!=='EEXIST')throw e; }
      this.sessionKey=await fs.readFile(keyFile,'utf8');
    });
  }
  async read() {
    const value=JSON.parse(await fs.readFile(this.file,'utf8'));
    if(value.version!==1 || !Array.isArray(value.products) || !value.revision)throw new Error('Invalid saved catalogue; refusing to overwrite it.');
    return value;
  }
  async atomicWrite(value) {
    const temporary=this.file+'.'+crypto.randomUUID()+'.tmp';
    const handle=await fs.open(temporary,'wx',0o600);
    try { await handle.writeFile(JSON.stringify(value,null,2)); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary,this.file);
  }
  async save(input, revision, id) {
    return this.lock(async()=>{
      const current=await this.read();
      if(revision!==current.revision)throw new HttpError(409,'This catalogue has changed in another session. Reload the catalogue before saving again; your unsaved form is still available.');
      const existing=id?current.products.find(p=>p.id===id):null;
      if(id&&!existing)throw new HttpError(404,'Item not found.');
      const valid=validateProduct(input,existing);
      if(current.products.some(p=>p.slug===valid.slug&&p.id!==id))throw new HttpError(409,'That item URL is already in use.');
      for(const image of valid.images) { try { await fs.access(path.join(this.directory,image.slice(1))); } catch { throw new HttpError(400,'An uploaded photo is missing. Please upload it again.'); } }
      const now=new Date().toISOString();
      const product={...existing,...valid,id:existing?.id||crypto.randomUUID(),createdAt:existing?.createdAt||now,updatedAt:now};
      const next={...current,revision:crypto.randomUUID(),updatedAt:now,products:existing?current.products.map(p=>p.id===id?product:p):[product,...current.products]};
      await fs.writeFile(path.join(this.directory,'backups',current.revision+'.json'),JSON.stringify(current),{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});
      await this.atomicWrite(next);
      // Preserve ten previous catalogue versions. Photos are never deleted automatically.
      try { const backups=await fs.readdir(path.join(this.directory,'backups')); const details=await Promise.all(backups.filter(x=>x.endsWith('.json')).map(async name=>({name,time:(await fs.stat(path.join(this.directory,'backups',name))).mtimeMs})));
      for(const old of details.sort((a,b)=>b.time-a.time).slice(10))await fs.unlink(path.join(this.directory,'backups',old.name)).catch(()=>{}); } catch(e) { console.error('Backup retention cleanup:',e.message); }
      return {catalogue:next,product};
    });
  }
}
module.exports={CatalogueStore,HttpError,validateProduct};
