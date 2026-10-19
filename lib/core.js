import {calculateCheckout} from '../public/checkout-model.js';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const digest=s=>createHash('sha256').update(s).digest('hex');
export const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function verify(raw,header,secret,now=Date.now()) {
 if(!header||!secret)return false;
 const p=Object.fromEntries(header.split(',').map(x=>x.trim().split('=')));
 if(!/^\d+$/.test(p.t||'')||!/^([a-f0-9]{64})$/i.test(p.v1||''))return false;
 if(Math.abs(now/1000-Number(p.t))>300)return false;
 const expected=createHmac('sha256',secret).update(`${p.t}.${raw}`).digest();
 return timingSafeEqual(expected,Buffer.from(p.v1,'hex'));
}
export function nextStatus(current,next) {
 if(!['PENDING','PAID','EXPIRED','REFUNDED','CHARGEBACK'].includes(next))return current;
 if(current==='CHARGEBACK')return current;
 if(current==='REFUNDED')return next==='CHARGEBACK'?next:current;
 if(current==='PAID'&&['PENDING','EXPIRED'].includes(next))return current;
 if(current==='EXPIRED'&&next==='PENDING')return current;
 return next;
}
function str(value,max,required=true){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw fail('Confira os dados do pedido.');return value.trim()}
export function validate(input,catalog,today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})) {
 if(!input||!Array.isArray(input.items)||!input.items.length||input.items.length>50)throw fail('Sacola inválida.');
 let calculated;try{calculated=calculateCheckout(input.items,catalog,input.checkout)}catch(e){throw fail(e.message)}
 const items=calculated.items,amount=calculated.pricing.total_cents;

 if(amount<500||amount>10000000)throw fail('Valor inválido.');
 const c=input.customer||{},d=input.delivery||{};
 const customer={name:str(c.name,120),email:str(c.email,200),phone:str(c.phone,25),cpf:str(c.cpf,18).replace(/\D/g,'')};
 if(!/^\S+@\S+\.\S+$/.test(customer.email)||!/^\d{11}$/.test(customer.cpf)||customer.phone.replace(/\D/g,'').length<10)throw fail('Confira e-mail, CPF e telefone.');
 const delivery={};for(const [k,max] of Object.entries({date:10,time:30,recipient:120,cep:9,address:200,number:20,district:100,city:100,state:2}))delivery[k]=str(d[k],max);
 for(const k of ['message','complement'])delivery[k]=str(d[k]||'',500,false);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(delivery.date)||delivery.date<today||Number.isNaN(Date.parse(delivery.date))||!['09h às 12h','12h às 15h','15h às 18h'].includes(delivery.time)||!/^\d{5}-?\d{3}$/.test(delivery.cep)||!/^[A-Za-z]{2}$/.test(delivery.state))throw fail('Confira a data e o endereço.');
 return {amount,payload:{items,customer,delivery,checkout:calculated.checkout,pricing:calculated.pricing}};
}
export function checkTransaction(tx,order){if(!tx||tx.id!==order.transaction_id||tx.external_reference!==order.id||Number(tx.amount_cents)!==Number(order.amount)||tx.currency!=='BRL'||tx.method!=='PIX')throw fail('Transação incompatível.',502)}
