(function configureAddressLookup() {
  'use strict';

  const form = document.querySelector('#checkout');
  if (!form) return;

  const postalCode = form.elements.cep;
  const message = document.querySelector('#cep-status');
  const addressFields = ['address', 'district', 'city', 'state'];
  const editedAt = Object.fromEntries(addressFields.map(name => [name, 0]));
  const autoFilled = new Map();
  const cache = new Map();
  let activeRequest = null;
  let pendingTimer = null;
  let revision = 0;

  for (const name of addressFields) {
    form.elements[name].addEventListener('input', function markManualEdit() {
      editedAt[name] += 1;
      autoFilled.delete(name);
    });
  }

  function setMessage(text) {
    message.textContent = text;
  }

  function clearAutomaticAddress() {
    for (const [name, value] of autoFilled) {
      if (form.elements[name].value === value) form.elements[name].value = '';
    }
    autoFilled.clear();
  }

  async function lookup(code, requestRevision) {
    const controller = new AbortController();
    activeRequest = controller;
    const beforeLookup = { ...editedAt };
    postalCode.setAttribute('aria-busy', 'true');
    setMessage('Consultando o endereço…');
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      let address = cache.get(code);
      if (!address) {
        const response = await fetch('/api/cep?cep=' + encodeURIComponent(code), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          signal: controller.signal
        });
        if (requestRevision !== revision) return;
        if (response.status === 404) {
          setMessage('CEP não encontrado. Confira os números ou preencha o endereço manualmente.');
          return;
        }
        if (!response.ok) throw new Error('Consulta indisponível');
        address = await response.json();
        if (requestRevision !== revision) return;
        if (!address || typeof address.city !== 'string' || !address.city ||
            typeof address.state !== 'string' || !/^[A-Z]{2}$/.test(address.state)) {
          throw new Error('Resposta inválida');
        }
        cache.set(code, address);
        if (cache.size > 20) cache.delete(cache.keys().next().value);
      }
      if (requestRevision !== revision) return;
      for (const name of addressFields) {
        if (editedAt[name] !== beforeLookup[name]) continue;
        const value = typeof address[name] === 'string' ? address[name] : '';
        form.elements[name].value = value;
        autoFilled.set(name, value);
      }
      setMessage('Confira o endereço e informe número e complemento. A consulta não confirma disponibilidade de entrega.');
    } catch (error) {
      if (requestRevision === revision) {
        setMessage('A consulta está indisponível. Preencha o endereço manualmente para continuar.');
      }
    } finally {
      clearTimeout(timeout);
      if (requestRevision === revision) {
        postalCode.removeAttribute('aria-busy');
        activeRequest = null;
      }
    }
  }

  postalCode.addEventListener('input', function scheduleLookup() {
    revision += 1;
    const currentRevision = revision;
    clearTimeout(pendingTimer);
    if (activeRequest) activeRequest.abort();
    postalCode.removeAttribute('aria-busy');
    const digits = postalCode.value.replace(/\D/g, '').slice(0, 8);
    postalCode.value = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
    clearAutomaticAddress();
    if (digits.length !== 8) {
      setMessage('Digite os oito números do CEP. O endereço também pode ser preenchido manualmente.');
      return;
    }
    pendingTimer = setTimeout(() => lookup(digits, currentRevision), 300);
  });
})();
