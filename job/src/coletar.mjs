// Etapa 1 — coleta.
// Busca as fontes, aplica os critérios de config/criterios.json e grava o corpus
// normalizado em data/corpus/vagas.ndjson, junto com o funil de triagem.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarParaBusca, hash, assinatura } from './lib/texto.mjs';

import * as remotive from './fontes/remotive.mjs';
import * as remoteok from './fontes/remoteok.mjs';
import * as arbeitnow from './fontes/arbeitnow.mjs';
import * as himalayas from './fontes/himalayas.mjs';
import * as gupy from './fontes/gupy.mjs';
import * as hackernews from './fontes/hackernews.mjs';
import * as jobicy from './fontes/jobicy.mjs';
import * as weworkremotely from './fontes/weworkremotely.mjs';
import * as greenhouse_br from './fontes/greenhouse-br.mjs';
import * as programathor from './fontes/programathor.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OFFLINE = process.argv.includes('--offline');
const FONTES = {
  remotive,
  remoteok,
  arbeitnow,
  himalayas,
  gupy,
  hackernews,
  jobicy,
  weworkremotely,
  greenhouse_br,
  programathor,
};

const PT = /\b(e|de|da|do|para|com|que|uma?|nos|nas|voce|nossa|sera|experiencia|conhecimento|desenvolvimento|equipe|vaga|atuar|requisitos|desejavel|beneficios)\b/g;
const EN = /\b(the|and|of|to|for|with|you|we|our|will|your|experience|knowledge|development|team|role|requirements|preferred|benefits)\b/g;

function detectarIdioma(texto) {
  const t = normalizarParaBusca(texto).slice(0, 6000);
  const pt = (t.match(PT) || []).length;
  const en = (t.match(EN) || []).length;
  return pt > en ? 'pt' : 'en';
}

function compilar(lista) {
  return lista.map((p) => new RegExp(p, 'i'));
}

// "Engenheiro(a) de Software", "Arquiteto (a) Mobile", "Desenvolvedor(a)": a
// flexão inclusiva entre parênteses fica no meio do cargo e quebra qualquer
// padrão que espere "engenheiro de software" colado. Some com ela antes de
// testar os filtros — é convenção onipresente em vaga brasileira.
const FLEXAO_INCLUSIVA = /\s*\(\s*(?:a|as|o|os|e|es)\s*\)/g;

function tituloParaFiltro(titulo) {
  return normalizarParaBusca(titulo).replace(FLEXAO_INCLUSIVA, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const criterios = JSON.parse(
    await readFile(path.join(RAIZ, 'config/criterios.json'), 'utf8')
  );
  const incluir = compilar(criterios.inclusao.titulo);
  const excluir = compilar(criterios.exclusao.titulo);
  const q = criterios.qualidade;

  await mkdir(path.join(RAIZ, 'data/raw'), { recursive: true });
  await mkdir(path.join(RAIZ, 'data/corpus'), { recursive: true });

  const corpus = [];
  const funil = [];
  const vistosAssinatura = new Set();
  const vistosTexto = new Set();
  const porEmpresa = new Map();

  for (const [fonteId, cfg] of Object.entries(criterios.fontes)) {
    const mod = FONTES[fonteId];
    if (!mod || !cfg.ativa) {
      console.log(`- ${fonteId}: desativada`);
      continue;
    }
    const log = (m) => console.log(`  [${fonteId}] ${m}`);
    console.log(`\n> ${mod.nome}`);

    let brutos = [];
    let vagas = [];
    try {
      if (OFFLINE) {
        // Reprocessa o snapshot salvo em data/raw. Serve para mexer em filtro,
        // taxonomia ou normalização sem que o corpus mude debaixo dos pés —
        // board público muda todo dia e inviabilizaria comparar duas rodadas.
        brutos = JSON.parse(
          await readFile(path.join(RAIZ, 'data/raw', `${fonteId}.json`), 'utf8')
        );
        vagas = mod.normalizar(brutos);
        log(`offline: ${brutos.length} anúncios do snapshot`);
      } else {
        const r = await mod.coletar({ ...cfg, log });
        brutos = r.brutos;
        vagas = r.vagas;
      }
    } catch (erro) {
      console.log(`  [${fonteId}] FALHOU: ${erro.message}`);
      funil.push({ fonte: fonteId, erro: erro.message });
      continue;
    }

    if (!OFFLINE) {
      await writeFile(
        path.join(RAIZ, 'data/raw', `${fonteId}.json`),
        JSON.stringify(brutos, null, 1),
        'utf8'
      );
    }

    const conta = {
      fonte: fonteId,
      nome: mod.nome,
      escopo: mod.escopo,
      site: mod.site,
      bruto: vagas.length,
      foraTituloDev: 0,
      excluidoTitulo: 0,
      semDescricao: 0,
      duplicado: 0,
      tetoEmpresa: 0,
      tetoQuota: 0,
      aceito: 0,
    };

    for (const v of vagas) {
      if (conta.aceito >= cfg.quota) {
        conta.tetoQuota++;
        continue;
      }
      const titulo = tituloParaFiltro(v.titulo);
      if (excluir.some((re) => re.test(titulo))) {
        conta.excluidoTitulo++;
        continue;
      }
      // No HN o cargo às vezes só aparece no corpo do anúncio.
      const alvoInclusao =
        v.fonte === 'hackernews'
          ? `${titulo} ${normalizarParaBusca(v.texto).slice(0, 600)}`
          : titulo;
      if (!incluir.some((re) => re.test(alvoInclusao))) {
        conta.foraTituloDev++;
        continue;
      }
      if (
        !v.texto ||
        v.texto.length < q.minCaracteresDescricao ||
        (q.exigeEmpresa && !v.empresa) ||
        (q.exigeUrl && !v.url)
      ) {
        conta.semDescricao++;
        continue;
      }

      const assin = assinatura(v.titulo, v.empresa);
      const hashTexto = hash(normalizarParaBusca(v.texto).slice(0, 4000));
      if (
        (criterios.deduplicacao.porEmpresaTitulo && vistosAssinatura.has(assin)) ||
        (criterios.deduplicacao.porTextoIdentico && vistosTexto.has(hashTexto))
      ) {
        conta.duplicado++;
        continue;
      }

      const chaveEmpresa = normalizarParaBusca(v.empresa).trim();
      const jaDaEmpresa = porEmpresa.get(chaveEmpresa) || 0;
      if (jaDaEmpresa >= criterios.deduplicacao.maxPorEmpresa) {
        conta.tetoEmpresa++;
        continue;
      }

      vistosAssinatura.add(assin);
      vistosTexto.add(hashTexto);
      porEmpresa.set(chaveEmpresa, jaDaEmpresa + 1);
      conta.aceito++;

      corpus.push({
        id: `${v.fonte}-${hash(`${v.fonte}:${v.idExterno}`, 10)}`,
        ...v,
        texto: v.texto.slice(0, q.maxCaracteresDescricao),
        idioma: detectarIdioma(v.texto),
        caracteres: v.texto.length,
        coletadoEm: new Date().toISOString().slice(0, 10),
      });
    }

    funil.push(conta);
    console.log(
      `  [${fonteId}] aceitas ${conta.aceito} | fora do escopo dev ${conta.foraTituloDev} | ` +
        `excluídas ${conta.excluidoTitulo} | sem descrição ${conta.semDescricao} | ` +
        `duplicadas ${conta.duplicado} | teto por empresa ${conta.tetoEmpresa}`
    );
  }

  await writeFile(
    path.join(RAIZ, 'data/corpus/vagas.ndjson'),
    corpus.map((v) => JSON.stringify(v)).join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(RAIZ, 'data/corpus/coleta.json'),
    JSON.stringify(
      {
        executadoEm: new Date().toISOString(),
        criteriosVersao: criterios.versao,
        total: corpus.length,
        porIdioma: corpus.reduce((a, v) => ((a[v.idioma] = (a[v.idioma] || 0) + 1), a), {}),
        funil,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\n=== corpus final: ${corpus.length} vagas ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
