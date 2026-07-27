// Etapa 6 — exportação.
// Escreve o corpus em CSV, no formato que uma pessoa espera encontrar ao baixar
// um dataset: uma linha por observação, colunas com tipo estável, UTF-8, vírgula
// como separador e ponto como decimal.
//
// São cinco tabelas em vez de uma só porque os dados têm dois grãos diferentes:
// a vaga e o par vaga×requisito. Juntar tudo numa tabela só obrigaria a repetir
// a descrição inteira em cada linha de requisito.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = path.join(RAIZ, 'dados');

const FONTES_BR = new Set(['gupy', 'greenhouse_br', 'programathor']);

// RFC 4180: aspas duplas dobradas, e o campo inteiro entre aspas quando contém
// separador, aspas ou quebra de linha. A descrição da vaga tem parágrafos, então
// isso não é detalhe — é o que faz o arquivo abrir certo no pandas e no Excel.
function celula(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[",\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

function paraCSV(colunas, linhas) {
  const cabecalho = colunas.join(',');
  const corpo = linhas.map((linha) => colunas.map((c) => celula(linha[c])).join(','));
  return `${[cabecalho, ...corpo].join('\n')}\n`;
}

// Fonte única das descrições: alimenta o manifesto do Kaggle, o manifesto do
// site e o log. Não repetir isso em três lugares é o que evita desencontro.
const DESCRICOES = {
  'vagas.csv': 'Uma linha por vaga, com a descrição original completa.',
  'vagas_requisitos.csv': 'Formato longo: um par vaga × requisito por linha.',
  'vagas_requisitos_matriz.csv':
    'Formato largo: uma coluna 0/1 por requisito. Sem texto de terceiros.',
  'taxonomia.csv': 'Dicionário dos 50 requisitos e os padrões usados para detectá-los.',
  'fontes.csv': 'As fontes e o funil de triagem de cada uma.',
  'ranking_requisitos.csv': 'Agregado por requisito, já calculado.',
};

// O manifesto alimenta a seção de download do site: assim a página nunca mostra
// contagem ou tamanho de arquivo escritos à mão.
const manifestoArquivos = [];

async function escrever(arquivo, colunas, linhas) {
  const conteudo = paraCSV(colunas, linhas);
  await writeFile(path.join(DESTINO, arquivo), conteudo, 'utf8');
  manifestoArquivos.push({
    arquivo,
    descricao: DESCRICOES[arquivo] || '',
    linhas: linhas.length,
    colunas: colunas.length,
    bytes: Buffer.byteLength(conteudo, 'utf8'),
  });
  console.log(`  ${arquivo.padEnd(30)} ${String(linhas.length).padStart(6)} linhas`);
}

async function main() {
  const vagas = (await readFile(path.join(RAIZ, 'data/corpus/vagas-analisadas.ndjson'), 'utf8'))
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const taxonomia = JSON.parse(await readFile(path.join(RAIZ, 'config/taxonomia.json'), 'utf8'));
  const estatisticas = JSON.parse(await readFile(path.join(RAIZ, 'analise/estatisticas.json'), 'utf8'));
  const coleta = JSON.parse(await readFile(path.join(RAIZ, 'data/corpus/coleta.json'), 'utf8'));

  await mkdir(DESTINO, { recursive: true });
  console.log('Exportando CSV para dados/');

  // 1. Uma linha por vaga, com o texto original.
  const colunasVagas = [
    'id', 'fonte', 'mercado', 'idioma', 'titulo', 'empresa', 'local',
    'modalidade', 'senioridade', 'familia', 'anos_experiencia_min',
    'data_publicacao', 'data_coleta', 'caracteres_descricao', 'n_requisitos',
    'url', 'descricao',
  ];
  await escrever(
    'vagas.csv',
    colunasVagas,
    vagas.map((v) => ({
      id: v.id,
      fonte: v.fonte,
      mercado: FONTES_BR.has(v.fonte) ? 'brasil' : 'global',
      idioma: v.idioma,
      titulo: v.titulo,
      empresa: v.empresa,
      local: v.local,
      modalidade: v.modalidade,
      senioridade: v.senioridade,
      familia: v.familia,
      anos_experiencia_min: v.anosMin ?? '',
      data_publicacao: v.publicadoEm,
      data_coleta: v.coletadoEm,
      caracteres_descricao: v.caracteres,
      n_requisitos: v.requisitos.length,
      url: v.url,
      descricao: v.texto,
    }))
  );

  // 2. Formato longo: uma linha por par vaga × requisito identificado.
  const porId = Object.fromEntries(taxonomia.requisitos.map((r) => [r.id, r]));
  const longo = [];
  for (const v of vagas) {
    for (const req of v.requisitos) {
      const r = porId[req];
      if (!r) continue;
      longo.push({
        vaga_id: v.id,
        requisito_id: r.id,
        requisito: r.rotulo,
        categoria: r.categoria,
        categoria_nome: taxonomia.categorias[r.categoria],
      });
    }
  }
  await escrever(
    'vagas_requisitos.csv',
    ['vaga_id', 'requisito_id', 'requisito', 'categoria', 'categoria_nome'],
    longo
  );

  // 3. Formato largo: uma coluna 0/1 por requisito. É o arquivo que serve direto
  //    de matriz de features, e o único sem texto de terceiros dentro.
  const idsRequisitos = taxonomia.requisitos.map((r) => r.id);
  const colunasMatriz = [
    'id', 'fonte', 'mercado', 'idioma', 'senioridade', 'familia', 'modalidade',
    'anos_experiencia_min', 'n_requisitos',
    ...idsRequisitos.map((r) => `req_${r}`),
  ];
  await escrever(
    'vagas_requisitos_matriz.csv',
    colunasMatriz,
    vagas.map((v) => {
      const linha = {
        id: v.id,
        fonte: v.fonte,
        mercado: FONTES_BR.has(v.fonte) ? 'brasil' : 'global',
        idioma: v.idioma,
        senioridade: v.senioridade,
        familia: v.familia,
        modalidade: v.modalidade,
        anos_experiencia_min: v.anosMin ?? '',
        n_requisitos: v.requisitos.length,
      };
      for (const req of idsRequisitos) linha[`req_${req}`] = v.requisitos.includes(req) ? 1 : 0;
      return linha;
    })
  );

  // 4. O dicionário: o que cada requisito significa e como foi medido.
  await escrever(
    'taxonomia.csv',
    ['requisito_id', 'requisito', 'categoria', 'categoria_nome', 'n_padroes', 'padroes', 'excecoes', 'nota'],
    taxonomia.requisitos.map((r) => ({
      requisito_id: r.id,
      requisito: r.rotulo,
      categoria: r.categoria,
      categoria_nome: taxonomia.categorias[r.categoria],
      n_padroes: r.padroes.length,
      padroes: r.padroes.join(' | '),
      excecoes: (r.excecoes || []).join(' | '),
      nota: r.notaMetodologica || '',
    }))
  );

  // 5. As fontes, com o funil de triagem de cada uma.
  await escrever(
    'fontes.csv',
    ['fonte', 'nome', 'mercado', 'escopo', 'vagas_no_corpus', 'anuncios_coletados', 'fora_do_escopo_dev', 'excluidos_por_titulo', 'sem_descricao', 'duplicados'],
    coleta.funil
      .filter((f) => f.aceito)
      .map((f) => ({
        fonte: f.fonte,
        nome: f.nome,
        mercado: FONTES_BR.has(f.fonte) ? 'brasil' : 'global',
        escopo: f.escopo,
        vagas_no_corpus: f.aceito,
        anuncios_coletados: f.bruto,
        fora_do_escopo_dev: f.foraTituloDev,
        excluidos_por_titulo: f.excluidoTitulo,
        sem_descricao: f.semDescricao,
        duplicados: f.duplicado,
      }))
  );

  // 6. O agregado já calculado, para quem só quer o resultado.
  await escrever(
    'ranking_requisitos.csv',
    ['requisito_id', 'requisito', 'categoria_nome', 'n_vagas', 'pct_geral', 'pct_boards', 'pct_pt', 'pct_en', 'piso_entre_fontes', 'teto_entre_fontes'],
    estatisticas.ranking.map((r) => ({
      requisito_id: r.id,
      requisito: r.rotulo,
      categoria_nome: estatisticas.categorias[r.categoria],
      n_vagas: r.n,
      pct_geral: r.pct,
      pct_boards: r.pctBoards,
      pct_pt: r.pt,
      pct_en: r.en,
      piso_entre_fontes: r.pisoEntreFontes,
      teto_entre_fontes: r.tetoEntreFontes,
    }))
  );

  // Manifesto do Kaggle. O id precisa começar pelo usuário real do Kaggle para
  // o `kaggle datasets create` funcionar.
  const manifesto = {
    title: 'Vagas de desenvolvedor: o que se pede além da stack',
    subtitle: `${vagas.length} anúncios de 9 boards, com 50 requisitos não-stack anotados`,
    id: 'SEU_USUARIO_KAGGLE/vagas-dev-requisitos-alem-da-stack',
    licenses: [{ name: 'other' }],
    keywords: ['jobs', 'brazil', 'software-engineering', 'nlp', 'labor-market', 'text'],
    resources: manifestoArquivos.map((f) => ({
      path: f.arquivo,
      description: f.descricao,
    })),
  };
  await writeFile(
    path.join(DESTINO, 'dataset-metadata.json'),
    `${JSON.stringify(manifesto, null, 2)}\n`,
    'utf8'
  );
  console.log('  dataset-metadata.json          manifesto do Kaggle');

  await writeFile(
    path.join(DESTINO, '_manifesto.json'),
    `${JSON.stringify(
      {
        geradoEm: new Date().toISOString().slice(0, 10),
        totalVagas: vagas.length,
        arquivos: manifestoArquivos,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  console.log('  _manifesto.json                índice consumido pelo site');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
