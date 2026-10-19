import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalItem, lineKey, itemUnitPrice } from '../public/cart-model.js';
import { validate } from '../lib/core.js';
const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url)));
const purchase = items => ({ items, customer: { name: 'Teste', email: 'teste@example.com', phone: '11999999999', cpf: '11144477735' }, delivery: { date: '2099-12-31', time: '09h às 12h', recipient: 'Teste', cep: '01001000', address: 'Praça', number: '1', district: 'Sé', city: 'São Paulo', state: 'SP' } });
test('adicionais e quantidade entram no total do servidor', () => {
 const p = catalog.find(p => p.name.includes('Stitch'));
 const item = canonicalItem({ id:p.id,quantity:2,addons:['balao-coracao','cartao-mao'] },catalog);
 assert.equal(itemUnitPrice(item,p),p.price+2790+1290);
 assert.equal(validate(purchase([item]),catalog).amount,(p.price+2790+1290)*2-Math.round((p.price+2790+1290)*2*0.05));
});
test('mesmo produto com configurações diferentes fica separado', () => {
 const p=catalog[0];
 const plain={id:p.id,quantity:1,addons:[]},extra={id:p.id,quantity:1,addons:['cartao-mao']};
 assert.notEqual(lineKey(plain),lineKey(extra));
 assert.equal(validate(purchase([plain,extra]),catalog).payload.items.length,2);
 assert.throws(()=>validate(purchase([plain,plain]),catalog));
});
test('não aceita preço adulterado, adicional desconhecido ou repetido', () => {
 const p=catalog[0];
 const value=validate(purchase([{id:p.id,quantity:1,addons:['cartao-mao'],price:1,addonPrice:0}]),catalog);
 assert.equal(value.amount,p.price+1290-Math.round((p.price+1290)*0.05));
 for(const addons of [['inexistente'],['cartao-mao','cartao-mao'],[{}]])assert.throws(()=>canonicalItem({id:p.id,quantity:1,addons},catalog));
});
test('limites dos grupos e uma única opção de tamanho', () => {
 const p=catalog.find(p=>p.name.includes('Stitch'));
 const size=p.addonGroups.find(g=>g.limit===1);
 assert(size&&size.options.length===2);
 assert.throws(()=>canonicalItem({id:p.id,quantity:1,addons:size.options.map(o=>o.id)},catalog));
 const bigger=size.options.find(o=>o.price>0);
 const item=canonicalItem({id:p.id,quantity:1,addons:[bigger.id]},catalog);
 assert.equal(itemUnitPrice(item,p),6990);
 const cafe=catalog[0];const g=cafe.addonGroups.find(g=>g.limit===3);assert(g);
 assert.throws(()=>canonicalItem({id:p.id,quantity:0,addons:[]},catalog));
});
test('todos os produtos têm detalhes e adicionais consistentes', () => {
 assert.equal(catalog.length,48);
 for(const p of catalog){assert(p.contents.length>0,p.name);assert(p.description,p.name);const ids=[];for(const g of p.addonGroups){assert(g.limit>0);for(const o of g.options){assert(Number.isInteger(o.price)&&o.price>=0);assert(!ids.includes(o.id),p.name);ids.push(o.id)}}}
 const publicCatalog=JSON.parse(readFileSync(new URL('../public/catalogo.json',import.meta.url)));assert.deepEqual(publicCatalog,catalog);
});
