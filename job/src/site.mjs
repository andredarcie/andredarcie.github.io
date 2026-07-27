// Etapa 5 — site.
// Reduz analise/estatisticas.json ao que a página consome e grava site/dados.js
// como um objeto global. É arquivo .js e não .json de propósito: assim a página
// abre direto do disco, sem servidor e sem esbarrar em CORS.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NOME_FONTE = {
  gupy: 'Gupy',
  hackernews: 'Hacker News',
  weworkremotely: 'We Work Remotely',
  himalayas: 'Himalayas',
  jobicy: 'Jobicy',
  arbeitnow: 'Arbeitnow',
  remotive: 'Remotive',
};

const ROTULO_SENIORIDADE = {
  estagio: 'Estágio',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  staff_plus: 'Staff / Lead',
  nao_informado: 'Não informado',
};

const ORDEM_SENIORIDADE = ['junior', 'pleno', 'senior', 'staff_plus'];

async function main() {
  const e = JSON.parse(
    await readFile(path.join(RAIZ, 'analise/estatisticas.json'), 'utf8')
  );
  const coleta = JSON.parse(
    await readFile(path.join(RAIZ, 'data/corpus/coleta.json'), 'utf8')
  );

  // A seção de download da página sai daqui. Se o export ainda não rodou, a
  // seção simplesmente não aparece — melhor do que listar arquivo inexistente.
  let dataset = null;
  try {
    dataset = JSON.parse(await readFile(path.join(RAIZ, 'dados/_manifesto.json'), 'utf8'));
  } catch {
    console.warn('  (dados/_manifesto.json ausente — rode `npm run exportar`)');
  }

  const porId = Object.fromEntries(e.ranking.map((r) => [r.id, r]));

  // Senioridade: mesma lógica do relatório, incluindo a marca de confundimento
  // (a faixa júnior é quase toda BR e a staff quase toda internacional, então
  // parte da variação é da fonte e não da carreira).
  const senioridade = e.ranking
    .filter((r) => r.pct >= 10)
    .map((r) => {
      const valores = ORDEM_SENIORIDADE.map(
        (s) => e.porSenioridadeDetalhe[s].requisitos[r.id].pct
      );
      const delta = valores[valores.length - 1] - valores[0];
      const gap = Math.round((r.pt - r.en) * 10) / 10;
      return {
        id: r.id,
        rotulo: r.rotulo,
        valores,
        delta: Math.round(delta * 10) / 10,
        gap,
        confundido: Math.abs(gap) >= Math.abs(delta) * 0.6,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 12);

  const contraste = (chave, outra) =>
    e.ranking
      .filter((r) => r.pct >= 8)
      .map((r) => ({
        id: r.id,
        rotulo: r.rotulo,
        pt: r.pt,
        en: r.en,
        diff: Math.round((r[chave] - r[outra]) * 10) / 10,
      }))
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 8);

  const dados = {
    meta: {
      geradoEm: e.geradoEm.slice(0, 10),
      total: e.total,
      fontes: Object.entries(e.porFonte).map(([id, n]) => ({
        id,
        nome: NOME_FONTE[id] || id,
        n,
        escopo: (coleta.funil.find((f) => f.fonte === id) || {}).escopo || '',
      })),
      porIdioma: e.porIdioma,
      porModalidade: e.porModalidade,
      porFamilia: e.porFamilia,
      porSenioridade: Object.fromEntries(
        Object.entries(e.porSenioridade).map(([k, v]) => [ROTULO_SENIORIDADE[k] || k, v])
      ),
      mediaRequisitos: e.mediaRequisitosPorVaga,
      totalRequisitos: e.ranking.length,
      recorteBeneficios: e.recorteBeneficios,
      // O contraste que sustenta a nota "silêncio não é dispensa".
      silencio: {
        hackernews: porId.trabalho_em_equipe.porFonte.hackernews,
        gupy: porId.trabalho_em_equipe.porFonte.gupy,
      },
    },
    dataset,
    categorias: e.categorias,
    cobertura: e.coberturaCategorias,
    ranking: e.ranking.map((r) => ({
      id: r.id,
      rotulo: r.rotulo,
      categoria: r.categoria,
      pct: r.pct,
      pctBoards: r.pctBoards,
      pt: r.pt,
      en: r.en,
      piso: r.pisoEntreFontes,
      teto: r.tetoEntreFontes,
      n: r.n,
    })),
    universais: [...e.ranking]
      .sort((a, b) => b.pisoEntreFontes - a.pisoEntreFontes)
      .slice(0, 10)
      .map((r) => ({ id: r.id, rotulo: r.rotulo, piso: r.pisoEntreFontes, pct: r.pct })),
    brasil: contraste('pt', 'en'),
    global: contraste('en', 'pt'),
    // As três fontes brasileiras entre si: o contraste dentro do país é maior
    // que o contraste entre países em vários itens.
    brasilFontes: (() => {
      const fontes = [
        { id: 'gupy', nome: 'Gupy', rotulo: 'ATS de corporação, varejo e consultoria' },
        { id: 'programathor', nome: 'ProgramaThor', rotulo: 'Board de startup e empresa pequena' },
        { id: 'greenhouse_br', nome: 'Empresas de produto', rotulo: 'Página de carreira de fintech e tech BR' },
      ].filter((f) => e.porFonteDetalhe[f.id]);

      const itens = e.ranking
        .filter((r) => r.pct >= 12)
        .map((r) => {
          const valores = fontes.map((f) => e.porFonteDetalhe[f.id].requisitos[r.id].pct);
          return {
            id: r.id,
            rotulo: r.rotulo,
            valores,
            amplitude: Math.round((Math.max(...valores) - Math.min(...valores)) * 10) / 10,
          };
        })
        .sort((a, b) => b.amplitude - a.amplitude)
        .slice(0, 10);

      return {
        fontes: fontes.map((f) => ({ ...f, total: e.porFonteDetalhe[f.id].total })),
        itens,
      };
    })(),
    senioridade: {
      faixas: ORDEM_SENIORIDADE.map((s) => ({
        id: s,
        rotulo: ROTULO_SENIORIDADE[s],
        total: e.porSenioridadeDetalhe[s].total,
      })),
      itens: senioridade,
    },
    anos: e.anosExperiencia,
    coocorrencia: e.coocorrencia.slice(0, 8).map((par) => ({
      a: porId[par.a].rotulo,
      b: porId[par.b].rotulo,
      pct: par.pct,
    })),
    raros: [...e.ranking]
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8)
      .map((r) => ({ id: r.id, rotulo: r.rotulo, pct: r.pct, categoria: r.categoria })),
    // Os três eixos da conclusão. Os números vêm do ranking para não descolarem.
    tripe: [
      {
        titulo: 'Mover dados entre sistemas',
        itens: ['apis_integracao', 'banco_dados'],
        texto:
          'Ler de um lugar, transformar, expor em outro. Os dois itens mais pedidos do corpus inteiro, e nenhum deles depende da linguagem.',
      },
      {
        titulo: 'Colocar em produção sozinho',
        itens: ['cloud', 'ci_cd', 'containers'],
        texto:
          'Deixou de ser assunto de infraestrutura. Cloud é a exigência mais uniforme do corpus: não cai abaixo do piso em nenhuma fonte.',
      },
      {
        titulo: 'Trabalhar com gente',
        itens: ['trabalho_em_equipe', 'comunicacao_geral', 'autonomia'],
        texto:
          'Não existe uma lista longa de soft skills cobradas. Existem duas, repetidas à exaustão, e o resto fica bem atrás.',
      },
    ].map((eixo) => ({
      ...eixo,
      itens: eixo.itens.map((id) => ({
        id,
        rotulo: porId[id].rotulo,
        pct: porId[id].pct,
        piso: porId[id].pisoEntreFontes,
      })),
    })),
  };

  await mkdir(path.join(RAIZ, 'site'), { recursive: true });
  await writeFile(
    path.join(RAIZ, 'site/dados.js'),
    `// Gerado por src/site.mjs a partir de analise/estatisticas.json. Não editar à mão.\n` +
      `window.__RADAR__ = ${JSON.stringify(dados, null, 1)};\n`,
    'utf8'
  );

  console.log(
    `site/dados.js gerado — ${dados.ranking.length} requisitos, ${dados.meta.total} vagas`
  );
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
