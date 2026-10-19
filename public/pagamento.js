"use strict";
let timer, saved, lastCode, currentStatus;
const reviewMessage="Pedido em análise — aguardando o comprovante de pagamento para confirmação.";
let reviewOrder;
try{reviewOrder=sessionStorage.getItem("kind-review-order");}catch{}
const el=id=>document.getElementById(id);
try { saved=JSON.parse(sessionStorage.getItem('kind-order')||'null'); } catch {}
function render(d){
 currentStatus=d.status;
 el('payment').hidden=false;
 el('amount').textContent=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(d.amount_cents/100);
 el('order-number').textContent='Pedido '+d.id;
 const code=d.pix?.copy_paste||'';
 el('code').textContent=code;
 if(code && code!==lastCode){try{const qr=qrcode(0,'M');qr.addData(code);qr.make();el('qr').innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});lastCode=code;}catch{el('qr').textContent='Não foi possível exibir o QR Code. Use o código copia e cola abaixo.';}}
 el('expiry').textContent=d.pix?.expires_at?'Válido até '+new Date(d.pix.expires_at).toLocaleString('pt-BR'):'';
 el('confirm-whatsapp').href='https://wa.me/5562976016786?text='+encodeURIComponent('Olá, Kind Flores e Cestas! Quero enviar o comprovante do pagamento do pedido '+d.id+'.');
 const messages={PENDING:'Aguardando pagamento. Pague pelo aplicativo do seu banco.',PAID:'Pagamento confirmado! Entre em contato com a loja para acompanhar a entrega.',EXPIRED:'Este Pix expirou. Volte ao pedido para continuar.',REFUNDED:'Pagamento reembolsado.',CHARGEBACK:'Pagamento contestado.'};
 el('status').textContent=d.status==='PENDING' && reviewOrder===d.id?reviewMessage:(messages[d.status]||'Situação do pagamento: '+d.status);
 el('qr').hidden=d.status!=='PENDING';el('copy').disabled=d.status!=='PENDING';
 el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(code);el('copy-status').textContent='Código copiado!';}catch{el('copy-status').textContent='Selecione o código acima e copie manualmente.';}};
 if(d.status==='PAID'){localStorage.removeItem('kind-cart');sessionStorage.removeItem('kind-idempotency');sessionStorage.removeItem('kind-order-stamp');}
 if(d.status==='PENDING')timer=setTimeout(refresh,15000);
}
async function refresh(){clearTimeout(timer);el('retry').hidden=true;try{const r=await fetch('/api/orders/'+encodeURIComponent(saved.id),{headers:{'X-Order-Token':saved.token},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Consulta indisponível.');render(d);}catch{el('status').textContent='Não foi possível consultar o pagamento. Tente novamente.';el('retry').hidden=false;}}
el('confirm-whatsapp').addEventListener('click',()=>{
 if(currentStatus!=='PENDING'||!saved?.id)return;
 reviewOrder=saved.id;
 try{sessionStorage.setItem('kind-review-order',reviewOrder);}catch{}
 el('status').textContent=reviewMessage;
});
el('retry').onclick=refresh;
if(saved?.id && saved?.token)refresh();else el('status').textContent='Nenhum pagamento encontrado nesta sessão. Volte ao pedido para gerar seu Pix.';
