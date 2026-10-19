import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateCheckout } from '../public/checkout-model.js';
import { validate } from '../lib/core.js';
const catalog=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url)));
const items=[{id:'1',quantity:1}];
const purchase=checkout=>({items,checkout,customer:{name:'Teste',email:'teste@example.com',phone:'11999999999',cpf:'11144477735'},delivery:{date:'2099-12-31',time:'09h às 12h',recipient:'Teste',cep:'01001000',address:'Praça',number:'1',district:'Sé',city:'São Paulo',state:'SP'}});
test('frete grátis e desconto Pix têm soma exata em centavos',()=>{
 const result=calculateCheckout(items,catalog,{shipping:'free'});
 assert.deepEqual(result.pricing,{subtotal_cents:7290,extras_cents:0,shipping_cents:0,discount_cents:365,total_cents:6925,pix_discount_percent:5});
});
test('Frete Full e adicionais entram no total; desconto não incide no frete',()=>{
 const options={shipping:'full',extras:['cartao-te-amo','balao-love'],confidential:true};
 const result=calculateCheckout(items,catalog,options);
 assert.equal(result.pricing.extras_cents,3280);
 assert.equal(result.pricing.discount_cents,529);
 assert.equal(result.pricing.total_cents,11241);
 const server=validate(purchase(options),catalog);
 assert.equal(server.amount,result.pricing.total_cents);
 assert.equal(server.payload.checkout.confidential,true);
 assert.equal(server.payload.pricing.shipping_cents,1200);
});
test('preço, desconto e frete enviados pelo navegador não substituem tabela do servidor',()=>{
 const result=calculateCheckout(items,catalog,{shipping:'full',shipping_cents:0,discount_cents:999999,extras:['cartao-te-amo'],extrasPrice:0});
 assert.equal(result.pricing.shipping_cents,1200);assert.equal(result.pricing.extras_cents,1290);assert.equal(result.pricing.discount_cents,429);
});
test('opções desconhecidas, extras duplicados e confidencial inválido são rejeitados',()=>{
 for(const options of [{shipping:'inventado'},{extras:['inventado']},{extras:['cartao-te-amo','cartao-te-amo']},{confidential:'true'}])assert.throws(()=>calculateCheckout(items,catalog,options));
});
test('cartão de crédito aparece desativado no HTML e Pix selecionado',()=>{
 const html=readFileSync(new URL('../public/checkout.html',import.meta.url),'utf8');
 assert.match(html,/value="card" disabled/);assert.match(html,/value="pix" checked/);
 const source=readFileSync(new URL('../lib/service.js',import.meta.url),'utf8');assert.match(source,/method:'pix'/);assert.doesNotMatch(source,/method:'card'/);
});
