const path=require('node:path'),fs=require('node:fs');
const {createApp}=require('./backend/http');
const root=process.env.STATIC_ROOT||(fs.existsSync(path.join(__dirname,'out','index.html'))?path.join(__dirname,'out'):__dirname);
createApp({root}).then(({server})=>server.listen(process.env.PORT||8080,'0.0.0.0',()=>console.log('Antique Diamonds listening on',process.env.PORT||8080))).catch(e=>{console.error('Catalogue startup failed:',e.message);process.exit(1)});
