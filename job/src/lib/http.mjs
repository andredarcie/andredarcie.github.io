// Cliente HTTP mínimo com timeout, retry exponencial e educação com as APIs
// públicas (User-Agent identificável + pausa entre requisições).

const UA =
  'radar-vagas-dev/1.0 (pesquisa de mercado; contato: andrendarcie@gmail.com)';

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export async function buscarJSON(url, opcoes = {}) {
  const { tentativas = 3, timeoutMs = 45000, headers = {} } = opcoes;
  let ultimoErro;

  for (let i = 1; i <= tentativas; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': UA,
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'en,pt-BR;q=0.9',
          ...headers,
        },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`);
      return await resp.json();
    } catch (erro) {
      ultimoErro = erro;
      if (i < tentativas) await dormir(1500 * i * i);
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimoErro;
}
