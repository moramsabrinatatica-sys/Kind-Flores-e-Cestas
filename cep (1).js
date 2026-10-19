import { fail } from './core.js';

// Consulta com destino fixo e CEP validado: não funciona como proxy genérico.
export function createPostalCodeLookup({ fetcher = fetch, now = Date.now } = {}) {
  const results = new Map();
  const requestCounts = new Map();

  function keepBounded(map, maximum) {
    while (map.size > maximum) map.delete(map.keys().next().value);
  }

  return async function findAddress(code, client = 'unknown') {
    if (typeof code !== 'string' || !/^\d{8}$/.test(code)) {
      throw fail('Informe um CEP com oito números.', 400);
    }
    const timestamp = now();
    let counter = requestCounts.get(client);
    if (!counter || counter.until <= timestamp) counter = { hits: 0, until: timestamp + 60000 };
    counter.hits += 1;
    requestCounts.set(client, counter);
    keepBounded(requestCounts, 500);
    if (counter.hits > 30) throw fail('Muitas consultas. Aguarde um minuto.', 429);

    const cached = results.get(code);
    if (cached && cached.until > timestamp) return cached.address;
    let response;
    try {
      response = await fetcher('https://viacep.com.br/ws/' + code + '/json/', {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(6000)
      });
    } catch {
      throw fail('Consulta de CEP indisponível. Preencha o endereço manualmente.', 503);
    }
    if (!response.ok) throw fail('Consulta de CEP indisponível.', 503);
    let data;
    try { data = await response.json(); } catch { throw fail('Resposta de CEP inválida.', 503); }
    if (data.erro === true || data.erro === 'true') throw fail('CEP não encontrado.', 404);
    if (typeof data.localidade !== 'string' || !data.localidade.trim() ||
        typeof data.uf !== 'string' || !/^[A-Z]{2}$/.test(data.uf)) {
      throw fail('Resposta de CEP inválida.', 503);
    }
    const clean = (value, maximum) => typeof value === 'string' ? value.slice(0, maximum) : '';
    const address = {
      address: clean(data.logradouro, 200),
      district: clean(data.bairro, 100),
      city: clean(data.localidade, 100),
      state: data.uf
    };
    results.set(code, { address, until: timestamp + 86400000 });
    keepBounded(results, 250);
    return address;
  };
}
