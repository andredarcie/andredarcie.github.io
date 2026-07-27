// Etapa 2 — análise.
// Classifica cada vaga (família, senioridade, modalidade, anos exigidos), aplica
// a taxonomia de requisitos não-stack e consolida as estatísticas.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarParaBusca } from './lib/texto.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SENIORIDADE = [
  ['estagio', /\b(estagi\w*|intern|internship|trainee|aprendiz|apprentice)\b/],
  ['staff_plus', /\b(staff|principal|distinguished|tech(nical)? lead|team lead|arquitet\w+|architect|head of engineering|gerente de (engenharia|desenvolvimento))\b/],
  ['senior', /\b(senior|sr\.?|especialista|specialist|expert)\b/],
  ['pleno', /\b(pleno|mid[ -]?level|intermediate|middle)\b/],
  ['junior', /\b(junior|jr\.?|entry[ -]level|iniciante|assistente)\b/],
];

const FAMILIA = [
  ['dados_ml', /\b(data engineer|machine learning|ml engineer|ai engineer|mlops|engenheir\w+ de dados|cientista de dados|data scientist|analytics engineer)\b/],
  ['devops_sre', /\b(devops|sre|site reliability|platform engineer|infrastructure engineer|cloud engineer|engenheir\w+ de (plataforma|infraestrutura)|infra)\b/],
  ['qa', /\b(qa|quality assurance|test(e)? engineer|automacao de testes|analista de testes|sdet)\b/],
  ['mobile', /\b(mobile|android|ios|flutter|react native|swift)\b/],
  ['fullstack', /\b(full ?[- ]?stack)\b/],
  ['frontend', /\b(front ?[- ]?end|frontend|ui engineer)\b/],
  ['backend', /\b(back ?[- ]?end|backend|server[ -]side)\b/],
  ['embarcado', /\b(embedded|firmware|embarcad\w+|iot)\b/],
  ['jogos', /\b(game|jogos|unity|unreal)\b/],
];

// Ordem importa: "híbrido" vence "remoto" quando os dois aparecem.
function classificarModalidade(vaga, texto) {
  const bruta = normalizarParaBusca(vaga.modalidadeBruta || '');
  if (/hybrid|hibrido/.test(bruta)) return 'hibrido';
  if (/on[ -]?site|presencial/.test(bruta) && !/remot/.test(bruta)) return 'presencial';
  if (/remot/.test(bruta)) return 'remoto';
  const cabecalho = texto.slice(0, 1200);
  if (/\bhibrido\b|\bhybrid\b/.test(cabecalho)) return 'hibrido';
  if (/\bremote\b|\bremoto\b|home ?office|\banywhere\b|100% remot/.test(cabecalho)) return 'remoto';
  if (/\bon[ -]?site\b|\bpresencial\b|in[ -]office/.test(cabecalho)) return 'presencial';
  return 'nao_informado';
}

function classificar(lista, alvo, padrao = 'nao_informado') {
  for (const [rotulo, re] of lista) if (re.test(alvo)) return rotulo;
  return padrao;
}

// O bloco final de benefícios é a maior fonte de falso positivo do corpus:
// "curso de inglês in company", "horário flexível", "plano de saúde" e afins
// são o que a empresa OFERECE, não o que ela PEDE. Cortamos o rabo do anúncio
// quando um cabeçalho de benefícios aparece na metade final do texto — nunca
// antes disso, para não decapitar anúncio que lista benefício no começo.
const CABECALHO_BENEFICIOS =
  /\n?\s*(informacoes adicionais|beneficios|nossos beneficios|o que oferecemos|o que voce (vai )?(ganha|encontra)|pacote de beneficios|what we offer|perks( and benefits)?|benefits( and perks)?|why (you'?ll )?(join|love)|our benefits|compensation and benefits)\b/;

function recortarBeneficios(texto) {
  const m = texto.match(CABECALHO_BENEFICIOS);
  if (!m) return { texto, cortado: 0 };
  const pos = m.index;
  if (pos < texto.length * 0.5) return { texto, cortado: 0 };
  return { texto: texto.slice(0, pos), cortado: texto.length - pos };
}

const ANOS = [
  /(\d{1,2})\s*\+?\s*(?:years?|yrs?|anos)[^.;!?]{0,50}?(?:experien|exp\b)/g,
  /(?:experien\w*|experiencia)[^.;!?]{0,50}?(\d{1,2})\s*\+?\s*(?:years?|yrs?|anos)/g,
  /(?:at least|minimum of|min\.?|no minimo|pelo menos)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?|anos)/g,
];

function extrairAnos(texto) {
  const valores = [];
  for (const re of ANOS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(texto)) !== null) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 20) valores.push(n);
    }
  }
  if (valores.length === 0) return null;
  return { min: Math.min(...valores), max: Math.max(...valores) };
}

function compilarRequisitos(taxonomia) {
  return taxonomia.requisitos.map((r) => ({
    ...r,
    regexes: r.padroes.map((p) => new RegExp(p, 'i')),
    regexesExcecao: (r.excecoes || []).map((p) => new RegExp(p, 'gi')),
  }));
}

function detectarRequisitos(texto, requisitos) {
  const achados = [];
  for (const r of requisitos) {
    let alvo = texto;
    for (const ex of r.regexesExcecao) alvo = alvo.replace(ex, ' ');
    if (r.regexes.some((re) => re.test(alvo))) achados.push(r.id);
  }
  return achados;
}

// --- agregação -------------------------------------------------------------

function contar(lista, chave) {
  const mapa = {};
  for (const item of lista) {
    const k = typeof chave === 'function' ? chave(item) : item[chave];
    mapa[k] = (mapa[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(mapa).sort((a, b) => b[1] - a[1]));
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
}

function estatisticasPorSegmento(vagas, requisitos, campo) {
  const grupos = {};
  for (const v of vagas) (grupos[v[campo]] ||= []).push(v);
  const saida = {};
  for (const [grupo, itens] of Object.entries(grupos)) {
    saida[grupo] = { total: itens.length, requisitos: {} };
    for (const r of requisitos) {
      const n = itens.filter((v) => v.requisitos.includes(r.id)).length;
      saida[grupo].requisitos[r.id] = { n, pct: pct(n, itens.length) };
    }
  }
  return saida;
}

async function main() {
  const taxonomia = JSON.parse(
    await readFile(path.join(RAIZ, 'config/taxonomia.json'), 'utf8')
  );
  const requisitos = compilarRequisitos(taxonomia);
  const bruto = await readFile(path.join(RAIZ, 'data/corpus/vagas.ndjson'), 'utf8');
  const vagas = bruto.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

  const analisadas = vagas.map((v) => {
    // URLs e e-mails saem antes do casamento de padrões: um link para
    // github.com/empresa marcaria "controle de versão" sem que a vaga peça Git.
    const textoNorm = normalizarParaBusca(`${v.titulo}\n${v.texto}`)
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/\bwww\.\S+/g, ' ')
      .replace(/\S+@\S+\.\w+/g, ' ');
    const tituloNorm = normalizarParaBusca(v.titulo);
    // Modalidade sai do texto inteiro (às vezes só o rodapé diz "híbrido");
    // os requisitos saem do texto sem o bloco de benefícios.
    const { texto: textoRequisitos, cortado } = recortarBeneficios(textoNorm);
    const anos = extrairAnos(textoRequisitos);
    return {
      ...v,
      senioridade: classificar(SENIORIDADE, tituloNorm),
      familia: classificar(FAMILIA, tituloNorm, 'generico'),
      modalidade: classificarModalidade(v, textoNorm),
      anosMin: anos?.min ?? null,
      anosMax: anos?.max ?? null,
      caracteresBeneficiosCortados: cortado,
      requisitos: detectarRequisitos(textoRequisitos, requisitos),
    };
  });

  const total = analisadas.length;

  // Fontes com amostra suficiente para comparação (as pequenas viram ruído).
  const MIN_AMOSTRA = 70;
  const fontesComparaveis = Object.entries(contar(analisadas, 'fonte'))
    .filter(([, n]) => n >= MIN_AMOSTRA)
    .map(([f]) => f);

  const ranking = requisitos
    .map((r) => {
      const casos = analisadas.filter((v) => v.requisitos.includes(r.id));
      const pt = analisadas.filter((v) => v.idioma === 'pt');
      const en = analisadas.filter((v) => v.idioma === 'en');

      // Consistência: o piso do requisito entre as fontes comparáveis. Um item
      // pode ter média alta só porque uma fonte grande o repete; o piso mostra
      // o que aparece em todo lugar — que é o que "em comum" de fato significa.
      const porFonte = {};
      for (const f of fontesComparaveis) {
        const doF = analisadas.filter((v) => v.fonte === f);
        porFonte[f] = pct(doF.filter((v) => v.requisitos.includes(r.id)).length, doF.length);
      }
      const valores = Object.values(porFonte);

      // Anúncio do Hacker News é pitch curto escrito por engenheiro, não lista
      // de requisitos de RH. Manter um recorte só dos boards estruturados evita
      // que ele puxe para baixo tudo que é "requisito declarado".
      const boards = analisadas.filter((v) => v.fonte !== 'hackernews');

      return {
        id: r.id,
        rotulo: r.rotulo,
        categoria: r.categoria,
        n: casos.length,
        pct: pct(casos.length, total),
        pt: pct(casos.filter((v) => v.idioma === 'pt').length, pt.length),
        en: pct(casos.filter((v) => v.idioma === 'en').length, en.length),
        pctBoards: pct(
          boards.filter((v) => v.requisitos.includes(r.id)).length,
          boards.length
        ),
        porFonte,
        pisoEntreFontes: Math.min(...valores),
        tetoEntreFontes: Math.max(...valores),
      };
    })
    .sort((a, b) => b.n - a.n);

  // Cobertura por categoria: quantas vagas pedem PELO MENOS UM item da categoria.
  const coberturaCategorias = Object.entries(taxonomia.categorias).map(([cat, nome]) => {
    const ids = requisitos.filter((r) => r.categoria === cat).map((r) => r.id);
    const n = analisadas.filter((v) => v.requisitos.some((id) => ids.includes(id))).length;
    return {
      categoria: cat,
      nome,
      requisitos: ids.length,
      n,
      pct: pct(n, total),
      pt: pct(
        analisadas.filter((v) => v.idioma === 'pt' && v.requisitos.some((id) => ids.includes(id))).length,
        analisadas.filter((v) => v.idioma === 'pt').length
      ),
      en: pct(
        analisadas.filter((v) => v.idioma === 'en' && v.requisitos.some((id) => ids.includes(id))).length,
        analisadas.filter((v) => v.idioma === 'en').length
      ),
    };
  }).sort((a, b) => b.n - a.n);

  // Co-ocorrência: pares que mais aparecem juntos entre os 20 requisitos mais comuns.
  const topIds = ranking.slice(0, 20).map((r) => r.id);
  const pares = [];
  for (let i = 0; i < topIds.length; i++) {
    for (let j = i + 1; j < topIds.length; j++) {
      const a = topIds[i];
      const b = topIds[j];
      const n = analisadas.filter(
        (v) => v.requisitos.includes(a) && v.requisitos.includes(b)
      ).length;
      pares.push({ a, b, n, pct: pct(n, total) });
    }
  }
  pares.sort((x, y) => y.n - x.n);

  const anos = analisadas.map((v) => v.anosMin).filter((n) => n !== null);
  const anosOrdenados = [...anos].sort((a, b) => a - b);

  const estatisticas = {
    geradoEm: new Date().toISOString(),
    taxonomiaVersao: taxonomia.versao,
    total,
    porFonte: contar(analisadas, 'fonte'),
    porIdioma: contar(analisadas, 'idioma'),
    porSenioridade: contar(analisadas, 'senioridade'),
    porFamilia: contar(analisadas, 'familia'),
    porModalidade: contar(analisadas, 'modalidade'),
    recorteBeneficios: {
      vagasComCorte: analisadas.filter((v) => v.caracteresBeneficiosCortados > 0).length,
      pctDoCorpus: pct(
        analisadas.filter((v) => v.caracteresBeneficiosCortados > 0).length,
        total
      ),
      mediaCaracteresCortados: Math.round(
        analisadas.reduce((a, v) => a + v.caracteresBeneficiosCortados, 0) /
          Math.max(1, analisadas.filter((v) => v.caracteresBeneficiosCortados > 0).length)
      ),
    },
    mediaRequisitosPorVaga:
      Math.round((analisadas.reduce((a, v) => a + v.requisitos.length, 0) / total) * 10) / 10,
    categorias: taxonomia.categorias,
    fontesComparaveis,
    coberturaCategorias,
    ranking,
    porSenioridadeDetalhe: estatisticasPorSegmento(analisadas, requisitos, 'senioridade'),
    porFonteDetalhe: estatisticasPorSegmento(analisadas, requisitos, 'fonte'),
    coocorrencia: pares.slice(0, 15),
    anosExperiencia: {
      vagasComNumero: anos.length,
      pctDoCorpus: pct(anos.length, total),
      media: anos.length ? Math.round((anos.reduce((a, b) => a + b, 0) / anos.length) * 10) / 10 : null,
      mediana: anos.length ? anosOrdenados[Math.floor(anosOrdenados.length / 2)] : null,
      distribuicao: contar(anos.map((n) => ({ n })), (o) => o.n),
    },
  };

  await mkdir(path.join(RAIZ, 'analise'), { recursive: true });
  await writeFile(
    path.join(RAIZ, 'data/corpus/vagas-analisadas.ndjson'),
    analisadas.map((v) => JSON.stringify(v)).join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(RAIZ, 'analise/estatisticas.json'),
    JSON.stringify(estatisticas, null, 2),
    'utf8'
  );

  console.log(`${total} vagas analisadas | média de ${estatisticas.mediaRequisitosPorVaga} requisitos por vaga`);
  console.log('\nTop 15 requisitos:');
  ranking.slice(0, 15).forEach((r, i) =>
    console.log(`${String(i + 1).padStart(2)}. ${r.pct.toFixed(1).padStart(5)}%  ${r.rotulo} (pt ${r.pt}% / en ${r.en}%)`)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
