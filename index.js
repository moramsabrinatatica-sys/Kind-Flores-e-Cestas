import {neon} from '@neondatabase/serverless';
import {makeService} from '../lib/service.js';
import {fail} from '../lib/core.js';
import {createPostalCodeLookup} from '../lib/cep.js';
const findAddress = createPostalCodeLookup();
let service;
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request){try{
 const url=new URL(request.url);const path=url.searchParams.has('route')?'/api/'+url.searchParams.get('route'):url.pathname;
 if(request.method==='GET'&&path==='/api/health')return response({ok:true,checkout_enabled:process.env.CHECKOUT_ENABLED==='true',configured:!!(process.env.DATABASE_URL&&process.env.BRAVOPAY_API_KEY&&process.env.ORDER_TOKEN_SECRET&&process.env.BRAVOPAY_WEBHOOK_SECRET)});
 if(request.method==='GET'&&path==='/api/cep')return response(await findAddress(url.searchParams.get('cep'),request.headers.get('x-real-ip')||'unknown'));
 if(!process.env.DATABASE_URL)throw fail('Loja ainda em configuração.',503);
 service||=makeService({sql:neon(process.env.DATABASE_URL)});
 if(request.method==='POST'){
  if(Number(request.headers.get('content-length')||0)>32768)throw fail('Pedido muito grande.',413);
  const reader=request.body?.getReader();let bytes=0,chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>32768){await reader.cancel();throw fail('Pedido muito grande.',413)}chunks.push(value)}}
  const raw=Buffer.concat(chunks).toString('utf8');
  if(path==='/api/webhooks/bravopay')return response(await service.webhook(raw,request.headers.get('bravopay-signature')||request.headers.get('x-bravopay-signature')));
  if(path==='/api/orders'){
   if(!process.env.PUBLIC_ORIGIN)throw fail('Origem da loja ainda não configurada.',503);
   if(request.headers.get('origin')!==new URL(process.env.PUBLIC_ORIGIN).origin)throw fail('Origem inválida.',403);
   await service.rate(request.headers.get('x-real-ip')||'unknown');let input;try{input=JSON.parse(raw)}catch{throw fail('JSON inválido.')};return response(await service.create(input,request.headers.get('idempotency-key')));
  }
 }
 if(request.method==='GET'&&/^\/api\/orders\/kind_[a-f0-9]{32}$/.test(path))return response(await service.get(path.split('/').at(-1),request.headers.get('x-order-token')));
 return response({error:'Rota não encontrada.'},404);
 }catch(e){return response({error:e.status?e.message:'Serviço indisponível. Tente novamente mais tarde.'},e.status||503)}}};
