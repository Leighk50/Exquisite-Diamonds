const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {HttpError}=require('./catalogue');
function validate(input){
 const result={};
 for(const [key,max,required] of [['name',200,true],['email',254,true],['orderReference',200,false],['item',2000,true],['address',2000,false],['orderDate',10,false],['deliveryDate',10,false]]){
  const value=input[key]??'';
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new HttpError(400,'Please check the '+key+' field.');
  result[key]=value.trim();
 }
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new HttpError(400,'Enter a valid email address.');
 for(const key of ['orderDate','deliveryDate'])if(result[key]&&!/^\d{4}-\d{2}-\d{2}$/.test(result[key]))throw new HttpError(400,'Enter a valid date.');
 return result;
}
async function save(directory,input){
 const record={...validate(input),id:crypto.randomUUID(),receivedAt:new Date().toISOString()};
 const folder=path.join(directory,'cancellations');await fs.mkdir(folder,{recursive:true,mode:0o700});
 const file=await fs.open(path.join(folder,record.id+'.json'),'wx',0o600);
 try{await file.writeFile(JSON.stringify(record));await file.sync()}finally{await file.close()}
 return {reference:record.id,receivedAt:record.receivedAt};
}
async function list(directory){const folder=path.join(directory,'cancellations');let names;try{names=await fs.readdir(folder)}catch(e){if(e.code==='ENOENT')return [];throw e}const records=await Promise.all(names.filter(n=>/^[a-f0-9-]{36}\.json$/.test(n)).map(async n=>JSON.parse(await fs.readFile(path.join(folder,n),'utf8'))));return records.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt))}
module.exports={save,list};
