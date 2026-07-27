// Etapa 4 — agregação.
// Monta analise/requisitos-comuns.md a partir de analise/estatisticas.json.
// A seção de leitura interpretativa vem de analise/_leitura.md (escrita à mão)
// e é embutida aqui, para que regerar o relatório não apague a análise.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ROTULO_SENIORIDADE = {
  estagio: 'Estágio',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  staff_plus: 'Staff/Lead',
  nao_informado: 'Não informado',
};

const NOME_FONTE = {
  gupy: 'Gupy (BR)',
  hackernews: 'Hacker News',
  weworkremotely: 'We Work Remotely',
  himalayas: 'Himalayas',
  jobicy: 'Jobicy',
  arbeitnow: 'Arbeitnow',
  remotive: 'Remotive',
};

const p = (v) => `${v.toFixed ? v.toFixed(1) : v}%`;
const barra = (v, max = 100, largura = 22) =>
  '█'.repeat(Math.round((v / max) * largura)) || '▏';

function tabela(cabecalho, linhas) {
  return [
    `| ${cabecalho.join(' | ')} |`,
    `| ${cabecalho.map(() => '---').join(' | ')} |`,
    ...linhas.map((l) => `| ${l.join(' | ')} |`),
  ].join('\n');
}

async function main() {
  const e = JSON.parse(
    await readFile(path.join(RAIZ, 'analise/estatisticas.json'), 'utf8')
  );
  const coleta = JSON.parse(
    await readFile(path.join(RAIZ, 'data/corpus/coleta.json'), 'utf8')
  );

  let leitura = '';
  try {
    leitura = await readFile(path.join(RAIZ, 'analise/_leitura.md'), 'utf8');
  } catch {
    leitura = '_(Seção interpretativa ainda não escrita — ver `analise/_leitura.md`.)_';
  }

  const data = e.geradoEm.slice(0, 10);
  const fontesOrdenadas = Object.entries(e.porFonte).sort((a, b) => b[1] - a[1]);

  // --- ranking geral ---
  const linhasRanking = e.ranking.map((r, i) => [
    String(i + 1),
    r.rotulo,
    e.categorias[r.categoria],
    `**${p(r.pct)}**`,
    p(r.pctBoards),
    p(r.pt),
    p(r.en),
    `${p(r.pisoEntreFontes)} – ${p(r.tetoEntreFontes)}`,
  ]);

  // --- núcleo universal: alto piso entre fontes ---
  const universais = [...e.ranking]
    .sort((a, b) => b.pisoEntreFontes - a.pisoEntreFontes)
    .slice(0, 12)
    .map((r) => [
      r.rotulo,
      p(r.pisoEntreFontes),
      p(r.pct),
      `\`${barra(r.pisoEntreFontes, 40, 18)}\``,
    ]);

  // --- Brasil x global ---
  const contrasteBR = [...e.ranking]
    .filter((r) => r.pct >= 8)
    .sort((a, b) => b.pt - b.en - (a.pt - a.en))
    .slice(0, 8)
    .map((r) => [r.rotulo, p(r.pt), p(r.en), `+${(r.pt - r.en).toFixed(1)} p.p.`]);

  const contrasteGlobal = [...e.ranking]
    .filter((r) => r.pct >= 8)
    .sort((a, b) => b.en - b.pt - (a.en - a.pt))
    .slice(0, 8)
    .map((r) => [r.rotulo, p(r.en), p(r.pt), `+${(r.en - r.pt).toFixed(1)} p.p.`]);

  // --- senioridade ---
  const ordemSen = ['junior', 'pleno', 'senior', 'staff_plus'];
  const senDisponivel = ordemSen.filter((s) => e.porSenioridadeDetalhe[s]);
  const idsSenioridade = [...e.ranking]
    .filter((r) => r.pct >= 10)
    .map((r) => {
      const vals = senDisponivel.map((s) => e.porSenioridadeDetalhe[s].requisitos[r.id].pct);
      return { r, delta: vals[vals.length - 1] - vals[0], vals };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 12);

  // A faixa júnior/pleno do corpus é quase toda brasileira e a staff quase toda
  // internacional. Sem expor o gap PT–EN ao lado, o leitor credita à senioridade
  // um efeito que é da fonte.
  const linhasSenioridade = idsSenioridade.map(({ r, vals, delta }) => {
    const gap = r.pt - r.en;
    const confundido = Math.abs(gap) >= Math.abs(delta) * 0.6;
    return [
      r.rotulo,
      ...vals.map((v) => p(v)),
      `${delta > 0 ? '+' : ''}${delta.toFixed(1)} p.p.`,
      `${gap > 0 ? '+' : ''}${gap.toFixed(1)} p.p.`,
      confundido ? '⚠️ confundido' : 'ok',
    ];
  });

  const composicaoSenioridade = senDisponivel.map((s) => {
    const grupo = e.porSenioridadeDetalhe[s];
    return `${ROTULO_SENIORIDADE[s]} ${grupo.total}`;
  });

  // --- raros ---
  const raros = [...e.ranking]
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 10)
    .map((r) => [r.rotulo, e.categorias[r.categoria], p(r.pct)]);

  const distAnos = Object.entries(e.anosExperiencia.distribuicao)
    .map(([anos, n]) => ({ anos: Number(anos), n }))
    .sort((a, b) => a.anos - b.anos);
  const maxAnos = Math.max(...distAnos.map((d) => d.n));

  const md = `# O que as vagas de desenvolvedor mais pedem em comum

> Fora linguagem de programação e framework.

**Corpus:** ${e.total} anúncios de vaga de desenvolvedor coletados em ${data}, de ${
    Object.keys(e.porFonte).length
  } fontes, ${e.porIdioma.pt} em português e ${e.porIdioma.en} em inglês.
**Método:** ${e.ranking.length} requisitos não-stack procurados por padrões de texto em cada anúncio; a medida é presença ou ausência por vaga, nunca número de repetições.
**Regerado por:** \`npm run agregar\` · dados em [estatisticas.json](estatisticas.json) · corpus em [../dados/vagas.csv](../dados/README.md)

---

${leitura.trim()}

---

## 1. O corpus

${tabela(
  ['Fonte', 'Vagas', 'Escopo'],
  fontesOrdenadas.map(([f, n]) => [
    NOME_FONTE[f] || f,
    String(n),
    (coleta.funil.find((x) => x.fonte === f) || {}).escopo || '—',
  ])
)}

Distribuição do corpus:

- **Idioma:** ${Object.entries(e.porIdioma).map(([k, v]) => `${k} ${v}`).join(' · ')}
- **Senioridade declarada no título:** ${Object.entries(e.porSenioridade)
    .map(([k, v]) => `${ROTULO_SENIORIDADE[k] || k} ${v}`)
    .join(' · ')}
- **Modalidade:** ${Object.entries(e.porModalidade).map(([k, v]) => `${k} ${v}`).join(' · ')}
- **Família:** ${Object.entries(e.porFamilia).map(([k, v]) => `${k} ${v}`).join(' · ')}
- **Média de requisitos não-stack por vaga:** ${e.mediaRequisitosPorVaga}

## 2. Quanto cada tipo de exigência aparece

Percentual de anúncios que pedem **pelo menos um** item da categoria.

${tabela(
  ['Categoria', 'Itens na taxonomia', '% das vagas', 'PT', 'EN'],
  e.coberturaCategorias.map((c) => [
    c.nome,
    String(c.requisitos),
    `**${p(c.pct)}**`,
    p(c.pt),
    p(c.en),
  ])
)}

## 3. Ranking completo

- **% geral** — todas as ${e.total} vagas.
- **% boards** — só os boards com formulário estruturado (exclui Hacker News, cujos anúncios são pitches curtos e quase nunca listam requisito).
- **piso – teto** — menor e maior percentual entre as ${e.fontesComparaveis.length} fontes com amostra relevante. Um piso alto significa que a exigência aparece em toda parte, não só onde uma fonte grande a repete.

${tabela(
  ['#', 'Requisito', 'Categoria', '% geral', '% boards', 'PT', 'EN', 'piso – teto'],
  linhasRanking
)}

## 4. O núcleo que aparece em toda fonte

Ordenado pelo **piso** entre fontes — o que sobrevive independentemente de onde a vaga foi publicada.

${tabela(['Requisito', 'Piso entre fontes', '% geral', ''], universais)}

## 5. Brasil x mercado global

Vagas em português (majoritariamente Gupy) contra vagas em inglês (boards remotos internacionais).

**Cobrado mais no Brasil:**

${tabela(['Requisito', 'PT', 'EN', 'Diferença'], contrasteBR)}

**Cobrado mais lá fora:**

${tabela(['Requisito', 'EN', 'PT', 'Diferença'], contrasteGlobal)}

## 6. O que muda conforme a senioridade

Requisitos com maior variação entre júnior e staff/lead.

**Leia esta tabela com cuidado.** As vagas júnior e plenas do corpus são quase
todas brasileiras (79% e 96% vêm da Gupy) e as de staff/lead são quase todas
internacionais (21% da Gupy). Como o anúncio brasileiro e o internacional pedem
coisas diferentes, parte da variação abaixo é efeito da fonte, não da senioridade.
A coluna **gap PT–EN** mostra a diferença do mesmo requisito entre os dois
idiomas: quando ela é grande em relação à variação, a linha está marcada como
confundida e não deve ser lida como "isso muda com a senioridade".

${tabela(
  [
    'Requisito',
    ...senDisponivel.map((s) => ROTULO_SENIORIDADE[s]),
    'Variação',
    'Gap PT–EN',
    'Leitura',
  ],
  linhasSenioridade
)}

Tamanho de cada grupo: ${composicaoSenioridade.join(' · ')} · Não informado ${
    e.porSenioridadeDetalhe.nao_informado?.total ?? 0
  }.

## 7. Tempo de experiência exigido

${e.anosExperiencia.pctDoCorpus}% dos anúncios (${e.anosExperiencia.vagasComNumero} vagas) declaram um número mínimo de anos. Entre elas, a mediana é **${e.anosExperiencia.mediana} anos** e a média ${e.anosExperiencia.media}.

\`\`\`
${distAnos
  .map(
    (d) =>
      `${String(d.anos).padStart(2)} ano(s) ${'█'.repeat(
        Math.max(1, Math.round((d.n / maxAnos) * 34))
      )} ${d.n}`
  )
  .join('\n')}
\`\`\`

## 8. Exigências que andam juntas

Pares que mais aparecem no mesmo anúncio.

${tabela(
  ['Par', '% das vagas'],
  e.coocorrencia
    .slice(0, 10)
    .map((par) => [
      `${e.ranking.find((r) => r.id === par.a).rotulo} + ${
        e.ranking.find((r) => r.id === par.b).rotulo
      }`,
      p(par.pct),
    ])
)}

## 9. O que quase ninguém pede

${tabela(['Requisito', 'Categoria', '% das vagas'], raros)}

## 10. Como ler estes números

1. **Presença de padrão não é exigência formal.** O projeto mede se o assunto aparece no anúncio. "Arquitetura" pode ser requisito ("experiência com arquitetura de sistemas") ou descrição do produto ("nossa arquitetura distribuída"). O texto original de cada vaga fica na coluna \`descricao\` de [../dados/vagas.csv](../dados/README.md) para conferência.
2. **O bloco de benefícios é descartado** quando aparece na metade final do anúncio (${e.recorteBeneficios.pctDoCorpus}% das vagas, ~${e.recorteBeneficios.mediaCaracteresCortados} caracteres em média). Sem isso, "curso de inglês in company" viraria exigência de inglês e "horário flexível" viraria pedido de adaptabilidade.
3. **Silêncio não é ausência de exigência.** Nenhuma vaga do Hacker News pede "trabalho em equipe" por escrito, e é óbvio que essas empresas esperam isso. Por isso o ranking traz a coluna de boards estruturados e o piso entre fontes.
4. **O idioma do anúncio é um recorte imperfeito de mercado.** "PT" aproxima o mercado brasileiro e "EN" o internacional remoto, mas há empresa brasileira publicando em inglês.
5. **É uma foto, não um filme.** Os números valem para a coleta de ${data}.

## 11. Reproduzir

\`\`\`bash
npm run pipeline    # coleta → análise → este relatório → site → CSV
\`\`\`

Critérios de busca em [\`config/criterios.json\`](../config/criterios.json), dicionário de requisitos em [\`config/taxonomia.json\`](../config/taxonomia.json) (versão tabular em [\`dados/taxonomia.csv\`](../dados/taxonomia.csv)), metodologia em [\`docs/metodologia.md\`](../docs/metodologia.md).
`;

  await writeFile(path.join(RAIZ, 'analise/requisitos-comuns.md'), md, 'utf8');
  console.log('analise/requisitos-comuns.md gerado');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
