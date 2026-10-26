const fs=require('node:fs');
(async()=>{const source=fs.readFileSync('app/data/products.js','utf8');const {products}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));fs.writeFileSync('catalogue-seed.json',JSON.stringify(products,null,2));})().catch(e=>{console.error(e);process.exit(1)});
