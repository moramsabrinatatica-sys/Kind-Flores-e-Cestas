import { calculateCheckout, ORDER_EXTRAS } from './checkout-model.js';
import { canonicalItem, lineKey, itemUnitPrice } from './cart-model.js';
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cart;try{cart=JSON.parse(localStorage.getItem('kind-cart')||'[]')}catch{cart=[]}if(!Array.isArray(cart))cart=[];
let products=[];
function save(){localStorage.setItem('kind-cart',JSON.stringify(cart));renderCart()}
function addConfigured(item) {
 const key=lineKey(item),existing=cart.find(row=>lineKey(row)===key);
 if(existing&&existing.quantity+item.quantity>20)throw Error('O limite é de 20 unidades por configuração.');
 if(existing)existing.quantity+=item.quantity;else cart.push(item);
 save();
}
function renderCart(){
 const count=document.querySelector('#count');if(count)count.textContent=`(${cart.reduce((sum,item)=>sum+item.quantity,0)})`;
 let total=0;
 const rows=cart.map((item,index)=>{
  const product=products.find(product=>product.id===item.id);if(!product)return '';
  const unit=itemUnitPrice(item,product),lineTotal=unit*item.quantity;total+=lineTotal;
  const options=(product.addonGroups||[]).flatMap(group=>group.options);
  const chosen=(item.addons||[]).map(id=>options.find(option=>option.id===id)?.name).filter(Boolean);
  return `<article class="drawer-item"><img src="${esc(product.image)}" alt="${esc(product.name)}"><div class="drawer-item-info"><h3>${esc(product.name)}</h3><p class="small">Quantidade: ${item.quantity}</p><div class="quantity-control"><button type="button" data-cart-delta="-1" data-index="${index}" aria-label="Diminuir quantidade de ${esc(product.name)}" ${item.quantity===1?'disabled':''}>−</button><span aria-label="Quantidade">${item.quantity}</span><button type="button" data-cart-delta="1" data-index="${index}" aria-label="Aumentar quantidade de ${esc(product.name)}" ${item.quantity===20?'disabled':''}>+</button></div>${chosen.length?`<ul class="drawer-item-options">${chosen.map(name=>`<li>+ ${esc(name)}</li>`).join('')}</ul>`:''}<strong class="drawer-line-total">${money(lineTotal)}</strong>${item.quantity>1?`<span class="small">${money(unit)} por unidade</span>`:''}</div><button type="button" class="drawer-remove" data-cart-remove="${index}" aria-label="Remover ${esc(product.name)}">×</button></article>`;
 }).join('')||'<div class="drawer-empty"><h3>Seu carrinho está vazio</h3><p>Escolha um presente para continuar.</p></div>';
 for(const selector of ['#cart','#drawer-items']){
  const container=document.querySelector(selector);if(!container)continue;
  container.innerHTML=rows;
  container.querySelectorAll('[data-cart-delta]').forEach(button=>button.onclick=()=>{
   const item=cart[Number(button.dataset.index)],next=item.quantity+Number(button.dataset.cartDelta);
   if(next>=1&&next<=20){item.quantity=next;save()}
  });
  container.querySelectorAll('[data-cart-remove]').forEach(button=>button.onclick=()=>{cart.splice(Number(button.dataset.cartRemove),1);save()});
 }
 for(const selector of ['#total','#drawer-total']){const element=document.querySelector(selector);if(element)element.textContent=money(total)}
 const pay=document.querySelector('#pay');if(pay)pay.disabled=!total;
 if(document.querySelector('#checkout'))renderCheckoutSummary();
 const checkout=document.querySelector('#drawer-checkout');if(checkout){checkout.hidden=!total;checkout.setAttribute('aria-disabled',String(!total))}
}
function openCart(){
 const drawer=document.querySelector('#cart-drawer');if(!drawer)return;
 renderCart();drawer.showModal();document.body.classList.add('cart-open');document.querySelector('#cart-close').focus();
}
function setupCartDrawer(){
 const drawer=document.querySelector('#cart-drawer');if(!drawer)return;
 document.querySelector('#cart-close').onclick=()=>drawer.close();
 document.querySelector('#cart-continue').onclick=()=>drawer.close();
 drawer.addEventListener('close',()=>document.body.classList.remove('cart-open'));
 document.querySelectorAll('header a[href="checkout.html"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openCart()}));
}
let modalProduct=null,modalQuantity=1,modalAddons=[];
function refreshProductTotal(){
 if(!modalProduct)return;
 const total=itemUnitPrice({addons:modalAddons},modalProduct)*modalQuantity;
 document.querySelector('#product-quantity').textContent=modalQuantity;
 document.querySelector('#product-total').textContent=money(total);
 document.querySelector('#product-add').textContent='Confirmar e ir ao carrinho · '+money(total);
 document.querySelector('#product-minus').disabled=modalQuantity===1;
 document.querySelector('#product-plus').disabled=modalQuantity===20;
}
function addonThumbnail(option, product){
 if(option.id.startsWith('tamanho-'))return product.image;
 if(option.id==='cartao-mao')return 'imagens/cartao-te-amo.webp';
 return 'imagens/complementos/'+option.id+'.svg';
}
function openProduct(id){
 modalProduct=products.find(product=>product.id===id);if(!modalProduct)return;
 modalQuantity=1;modalAddons=[];
 const product=modalProduct,dialog=document.querySelector('#product');
 document.querySelector('#details').innerHTML=`<div class="product-heading"><img src="${esc(product.image)}" alt="${esc(product.name)}"><div><small>${esc(product.category)}</small><h2 id="product-title">${esc(product.name)}</h2><div class="price">${money(product.price)}</div></div></div>
 <section class="product-included"><h3>O que já vem no presente</h3><ul>${(product.contents||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>
 <dl class="product-facts"><div><dt>Produto</dt><dd>${esc(product.name)}</dd></div><div><dt>Acabamento</dt><dd>${esc(product.finish||'Consulte a loja')}</dd></div><div><dt>Mensagem</dt><dd>${esc(product.message||'Consulte a loja')}</dd></div><div><dt>Observações</dt><dd>${esc(product.description||'Confirme a composição com a loja antes de comprar.')}</dd></div>${(product.brands||[]).map(brand=>`<div><dt>Marca / referência</dt><dd>${esc(brand)}</dd></div>`).join('')}</dl>
 ${(product.addonGroups||[]).map((group,index)=>`<fieldset class="product-addon-group"><legend>${esc(group.title)} <small>Opcional · até ${group.limit}</small></legend>${group.options.map(option=>`<label class="product-addon"><img class="addon-thumbnail" src="${esc(addonThumbnail(option,product))}" alt="" loading="lazy" width="60" height="60"><span class="addon-label"><b>${esc(option.name)}</b><small>${option.price?'+'+money(option.price):'Sem acréscimo'}</small></span><input type="${group.limit===1?'radio':'checkbox'}" name="addon-group-${index}" value="${esc(option.id)}" data-group="${index}"></label>`).join('')}${group.limit===1?`<button type="button" class="quiet-button" data-reset-group="${index}">Manter opção padrão</button>`:''}</fieldset>`).join('')}<p class="small product-footnote">Miniaturas ilustrativas. Os adicionais são cobrados por unidade do presente. Confirme disponibilidade e composição com a loja.</p><p id="product-error" class="error" role="alert"></p>`;
 const controls=[...dialog.querySelectorAll('input[data-group]')];
 for(const input of controls)input.addEventListener('change',()=>{
  const group=product.addonGroups[Number(input.dataset.group)];
  const selected=controls.filter(control=>control.dataset.group===input.dataset.group&&control.checked);
  if(selected.length>group.limit){input.checked=false;document.querySelector('#product-error').textContent=`Escolha no máximo ${group.limit} opções neste grupo.`}
  else document.querySelector('#product-error').textContent='';
  modalAddons=controls.filter(control=>control.checked).map(control=>control.value);refreshProductTotal();
 });
 dialog.querySelectorAll('[data-reset-group]').forEach(button=>button.onclick=()=>{
  controls.filter(control=>control.dataset.group===button.dataset.resetGroup).forEach(control=>control.checked=false);
  modalAddons=controls.filter(control=>control.checked).map(control=>control.value);refreshProductTotal();
 });
 refreshProductTotal();dialog.showModal();document.body.classList.add('product-open');
 document.querySelector('#product-close').focus();
 dialog.scrollTop=0;
}
function setupProductDialog(){
 const dialog=document.querySelector('#product');if(!dialog)return;
 document.querySelector('#product-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>document.body.classList.remove('product-open'));
 document.querySelector('#product-minus').onclick=()=>{if(modalQuantity>1)modalQuantity--;refreshProductTotal()};
 document.querySelector('#product-plus').onclick=()=>{if(modalQuantity<20)modalQuantity++;refreshProductTotal()};
 document.querySelector('#product-add').onclick=()=>{try{
  addConfigured(canonicalItem({id:modalProduct.id,quantity:modalQuantity,addons:modalAddons},products));
  dialog.close();openCart();
 }catch(error){document.querySelector('#product-error').textContent=error.message}};
}
function grid(category='Todos'){
 const categories=[...new Set(products.map(product=>product.category))];
 const visible=category==='Todos'?categories:categories.filter(name=>name===category);
 document.querySelector('#grid').innerHTML=visible.map(name=>{
  const titleId='category-title-'+categories.indexOf(name);
  const cards=products.filter(product=>product.category===name).map(product=>`<article class="card"><img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy"><div class="body"><small>${esc(product.category)}</small><h3>${esc(product.name)}</h3><div class="price">${money(product.price)}</div><button type="button" data-detail="${esc(product.id)}">Adicionar ao carrinho</button></div></article>`).join('');
  return `<section class="catalog-category" aria-labelledby="${titleId}"><div class="category-heading"><h2 id="${titleId}">${esc(name)}</h2><span aria-hidden="true"></span></div><div class="grid category-products">${cards}</div></section>`;
 }).join('');
 document.querySelectorAll('[data-detail]').forEach(button=>button.onclick=()=>openProduct(button.dataset.detail));
 document.querySelectorAll('#filters button').forEach(button=>{
  const selected=button.textContent===category;
  button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
 });
}
function checkoutSelection(){
 const form=document.querySelector('#checkout');
 return {shipping:form.querySelector('input[name="shipping"]:checked')?.value||'free',extras:[...form.querySelectorAll('input[name="orderExtra"]:checked')].map(input=>input.value),confidential:form.elements.confidential.checked};
}
function renderCheckoutSummary(){
 let pricing={subtotal_cents:0,extras_cents:0,shipping_cents:0,discount_cents:0,total_cents:0};
 if(cart.length)pricing=calculateCheckout(cart,products,checkoutSelection()).pricing;
 for(const [id,key]of Object.entries({'subtotal':'subtotal_cents','extras-total':'extras_cents','total':'total_cents'}))document.getElementById(id).textContent=money(pricing[key]);
 document.querySelector('#shipping-total').textContent=pricing.shipping_cents?money(pricing.shipping_cents):'Grátis';
 document.querySelector('#pix-discount').textContent='− '+money(pricing.discount_cents);
 document.querySelector('#extra-summary').textContent=checkoutSelection().extras.map(id=>ORDER_EXTRAS.find(extra=>extra.id===id).name).join(' · ');
}
async function json(url,opts){const r=await fetch(url,opts);let d;try{d=await r.json()}catch{throw Error('Para gerar Pix, abra o site na hospedagem com o servidor configurado.')}if(!r.ok)throw Error(d.error||'Não foi possível concluir.');return d}
let pollTimer;
function showPayment(d){const receiptLink=document.querySelector('#confirm-whatsapp');if(receiptLink){receiptLink.href='https://wa.me/5562976016786?text='+encodeURIComponent('Olá, Kind Flores e Cestas! Quero enviar o comprovante do pagamento do pedido '+d.id+'.');}document.querySelector('#payment').hidden=false;document.querySelector('#code').textContent=d.pix?.copy_paste||'';document.querySelector('#expiry').textContent=d.pix?.expires_at?'Válido até '+new Date(d.pix.expires_at).toLocaleString('pt-BR'):'';document.querySelector('#status').textContent=d.status==='PAID'?'Pagamento confirmado. Entre em contato com a loja para acompanhar a entrega.':'Aguardando pagamento. Copie o código e pague no aplicativo do seu banco.';document.querySelector('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(d.pix.copy_paste);document.querySelector('#copy').textContent='Código copiado ✓'}catch{document.querySelector('#status').textContent='Selecione e copie o código Pix manualmente.'}};clearTimeout(pollTimer);if(d.status==='PAID'){cart=[];save();sessionStorage.removeItem('kind-idempotency');sessionStorage.removeItem('kind-order-stamp')}if(d.status==='PENDING')pollTimer=setTimeout(async()=>{try{showPayment(await json('/api/orders/'+encodeURIComponent(d.id),{headers:{'X-Order-Token':d.token}}))}catch{document.querySelector('#status').textContent='Consulta temporariamente indisponível. Atualize a página para tentar novamente.'}},15000);else if(d.status!=='PAID')document.querySelector('#status').textContent='Situação do pagamento: '+d.status}
async function start(){products=await (await fetch('catalogo.json')).json();cart=cart.flatMap(item=>{try{return [canonicalItem(item,products)]}catch{return []}});setupProductDialog();setupCartDrawer();renderCart();if(document.querySelector('#grid')){const cats=['Todos',...new Set(products.map(p=>p.category))];document.querySelector('#filters').innerHTML=cats.map(c=>`<button type="button" aria-pressed="${c==='Todos'}">${esc(c)}</button>`).join('');document.querySelectorAll('#filters button').forEach(b=>b.onclick=()=>grid(b.textContent));grid()}const form=document.querySelector('#checkout');if(!form)return;form.addEventListener('change',renderCheckoutSummary);form.elements.date.min=new Date().toLocaleDateString('en-CA');let saved;try{saved=JSON.parse(sessionStorage.getItem('kind-order')||'null')}catch{}if(saved){try{showPayment(await json('/api/orders/'+saved.id,{headers:{'X-Order-Token':saved.token}}))}catch{}}
form.onsubmit=async e=>{e.preventDefault();const btn=document.querySelector('#pay');btn.disabled=true;document.querySelector('#error').textContent='';try{let key=sessionStorage.getItem('kind-idempotency');const stamp=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({items:cart,checkout:checkoutSelection(),fields:Object.fromEntries(new FormData(form))}))))).map(n=>n.toString(16).padStart(2,'0')).join('');if(sessionStorage.getItem('kind-order-stamp')!==stamp){key=null;sessionStorage.setItem('kind-order-stamp',stamp)}if(!key){key=crypto.randomUUID();sessionStorage.setItem('kind-idempotency',key)}const d=await json('/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({items:cart,checkout:checkoutSelection(),delivery:Object.fromEntries(new FormData(form)),customer:{name:form.elements.name.value,email:form.elements.email.value,cpf:form.elements.cpf.value,phone:form.elements.phone.value}})});sessionStorage.setItem('kind-order',JSON.stringify({id:d.id,token:d.token}));showPayment(d);document.querySelector('#payment').scrollIntoView({behavior:'smooth'})}catch(err){document.querySelector('#error').textContent=err.message}finally{btn.disabled=false}}}
start().catch(()=>{const el=document.querySelector('#grid')||document.querySelector('#error');if(el)el.textContent='Abra o site pelo servidor conforme o arquivo LEIA-ME para carregar o catálogo.'});
