import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostalCodeLookup } from '../lib/cep.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const address = { logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' };
test('CEP: consulta fixa, cache e validação antes da rede', async () => {
 let calls=0;
 const lookup=createPostalCodeLookup({fetcher:async(url,options)=>{calls++;assert.equal(url,'https://viacep.com.br/ws/01001000/json/');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);return Response.json(address)}});
 assert.deepEqual(await lookup('01001000','client'),{address:'Praça da Sé',district:'Sé',city:'São Paulo',state:'SP'});
 await lookup('01001000','client');assert.equal(calls,1);
 await assert.rejects(()=>lookup('http://outro.local','client'),e=>e.status===400);assert.equal(calls,1);
});
test('CEP: inexistente, falha de rede e resposta inválida',async()=>{
 for(const[fetcher,status]of[[async()=>Response.json({erro:true}),404],[async()=>{throw Error('network')},503],[async()=>Response.json({localidade:'incompleto'}),503]])await assert.rejects(()=>createPostalCodeLookup({fetcher})('01001000'),e=>e.status===status);
});
test('CEP: limite de consultas por cliente',async()=>{
 const lookup=createPostalCodeLookup({fetcher:async()=>Response.json(address)});
 for(let n=0;n<30;n++)await lookup('01001000','client');
 await assert.rejects(()=>lookup('01001000','client'),e=>e.status===429);
 assert.equal((await lookup('01001000','other-client')).state,'SP');
});
function browser(fetcher){
 const elements={};
 for(const name of ['cep','address','district','city','state','number','complement'])elements[name]={value:'',handlers:{},addEventListener(e,fn){this.handlers[e]=fn},setAttribute(){},removeAttribute(){}};
 const message={textContent:''},timers=new Map();let timerId=0;
 const context={document:{querySelector:s=>s==='#checkout'?{elements}:message},fetch:fetcher,AbortController,setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id},clearTimeout(id){timers.delete(id)}};
 vm.runInNewContext(readFileSync(new URL('../public/cep.js',import.meta.url),'utf8'),context);
 return{elements,message,async type(code){elements.cep.value=code;elements.cep.handlers.input();const t=[...timers].find(([,t])=>t.delay===300);if(t){timers.delete(t[0]);return t[1].fn()}}};
}
const response=()=>Response.json({address:'Praça da Sé',district:'Sé',city:'São Paulo',state:'SP'});
test('navegador: endereço preenchido, número preservado e API local',async()=>{
 const app=browser(async url=>{assert.equal(url,'/api/cep?cep=01001000');return response()});app.elements.number.value='123';await app.type('01001000');assert.equal(app.elements.cep.value,'01001-000');assert.equal(app.elements.city.value,'São Paulo');assert.equal(app.elements.number.value,'123');
});
test('navegador: edição manual durante consulta é preservada',async()=>{
 let resolve;const waiting=new Promise(r=>{resolve=r}),app=browser(()=>waiting),pending=app.type('01001000');app.elements.address.value='Rua corrigida';app.elements.address.handlers.input();resolve(response());await pending;assert.equal(app.elements.address.value,'Rua corrigida');assert.equal(app.elements.city.value,'São Paulo');
});
test('navegador: resposta antiga não preenche CEP alterado',async()=>{
 let resolve;const app=browser(()=>new Promise(r=>{resolve=r})),pending=app.type('01001000');await app.type('123');resolve(response());await pending;assert.equal(app.elements.city.value,'');
});
test('navegador: CEP inexistente permite preenchimento manual',async()=>{
 const app=browser(async()=>Response.json({error:'not found'},{status:404}));await app.type('99999999');assert.match(app.message.textContent,/manualmente/);assert.equal(app.elements.city.disabled,undefined);
});
