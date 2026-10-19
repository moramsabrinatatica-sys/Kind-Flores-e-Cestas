import { canonicalItem, lineKey, itemUnitPrice } from './cart-model.js';
export const SHIPPING_OPTIONS = [
 { id: 'free', name: 'Frete grátis', price: 0 },
 { id: 'full', name: 'Frete Full', price: 1200 }
];
export const ORDER_EXTRAS = [
 { id: 'cartao-te-amo', name: 'Cartão romântico Te Amo', price: 1290, image: 'imagens/cartao-te-amo.webp' },
 { id: 'balao-love', name: 'Balão coração Love', price: 1990, image: 'imagens/balao-love.png' }
];
export const PIX_DISCOUNT_PERCENT = 5;
export function calculateCheckout(rawItems, catalog, input = {}) {
 if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 50) throw Error('Sacola inválida.');
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Opções inválidas.');
 const keys = new Set();
 const items = rawItems.map(raw => {
  const item = canonicalItem(raw, catalog), key = lineKey(item);
  if (keys.has(key)) throw Error('Item duplicado.');
  keys.add(key); return item;
 }).sort((a,b) => lineKey(a).localeCompare(lineKey(b)));
 const shipping = SHIPPING_OPTIONS.find(option => option.id === (input.shipping || 'free'));
 if (!shipping) throw Error('Opção de frete inválida.');
 const extras = input.extras === undefined ? [] : input.extras;
 if (!Array.isArray(extras) || new Set(extras).size !== extras.length || extras.some(id => !ORDER_EXTRAS.some(extra => extra.id === id))) throw Error('Adicional de pedido inválido.');
 if (input.confidential !== undefined && typeof input.confidential !== 'boolean') throw Error('Modo confidencial inválido.');
 const subtotal = items.reduce((sum,item) => sum + itemUnitPrice(item,catalog.find(p => p.id === item.id)) * item.quantity, 0);
 const extrasTotal = extras.reduce((sum,id) => sum + ORDER_EXTRAS.find(extra => extra.id === id).price,0);
 const discount = Math.round((subtotal + extrasTotal) * PIX_DISCOUNT_PERCENT / 100);
 return { items, checkout: { shipping: shipping.id, extras: [...extras].sort(), confidential: input.confidential === true },
  pricing: { subtotal_cents: subtotal, extras_cents: extrasTotal, shipping_cents: shipping.price, discount_cents: discount,
   total_cents: subtotal + extrasTotal + shipping.price - discount, pix_discount_percent: PIX_DISCOUNT_PERCENT } };
}
