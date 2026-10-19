export function canonicalItem(item, catalog) {
  const product = catalog.find(product => product.id === item?.id);
  if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
    throw new Error('Produto ou quantidade inválida.');
  }
  const addons = item.addons === undefined ? [] : item.addons;
  if (!Array.isArray(addons) || addons.length > 30 ||
      addons.some(id => typeof id !== 'string') || new Set(addons).size !== addons.length) {
    throw new Error('Adicionais inválidos.');
  }
  const groups = product.addonGroups || [];
  const options = groups.flatMap(group => group.options);
  if (addons.some(id => !options.some(option => option.id === id))) {
    throw new Error('Adicional indisponível para este produto.');
  }
  for (const group of groups) {
    if (addons.filter(id => group.options.some(option => option.id === id)).length > group.limit) {
      throw new Error('Limite de adicionais excedido.');
    }
  }
  return { id: item.id, quantity: item.quantity, addons: [...addons].sort() };
}
export function lineKey(item) {
  return item.id + ':' + [...(item.addons || [])].sort().join(',');
}
export function itemUnitPrice(item, product) {
  const options = (product.addonGroups || []).flatMap(group => group.options);
  return product.price + (item.addons || []).reduce((sum, id) => {
    const option = options.find(option => option.id === id);
    if (!option) throw new Error('Adicional indisponível.');
    return sum + option.price;
  }, 0);
}
