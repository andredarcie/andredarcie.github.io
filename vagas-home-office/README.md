# Vagas de qualquer lugar

Site estático de vagas **home office para candidatos no Brasil**, com anúncios em **português do Brasil**, sem exigência declarada de ensino superior ou outro idioma e sem vagas de programação ou desenvolvimento. A pasta é independente do projeto `job/`.

Abra `http://localhost:8765/vagas-home-office/` enquanto o servidor local estiver ativo. O `index.html` também pode ser aberto diretamente.

## Como funciona

1. `atualizar-vagas.mjs` reúne vagas do portal nacional [Sólides Vagas](https://vagas.solides.com.br/), do [Remotar](https://remotar.com.br/) e de páginas públicas de carreiras de empresas brasileiras na plataforma Greenhouse.
2. Só entram anúncios remotos ativos, com descrição disponível e ainda no prazo quando a fonte informa a data de encerramento. A localização da vaga aparece no cartão: algumas posições remotas aceitam candidaturas apenas de uma cidade ou estado.
3. O título e a descrição precisam estar em português. O filtro exclui cargos e atividades de programação ou desenvolvimento, vagas que exigem ensino superior ou outro idioma, estágios, trabalho híbrido ou presencial e atividades de campo. Menções claramente opcionais e benefícios educacionais não são tratados como exigência.
4. O arquivo `vagas.js` contém título, empresa, área, data e links da vaga. Os resumos são redigidos automaticamente a partir desses fatos; a descrição integral permanece no site de origem.
5. A coleta é executada diariamente pelo GitHub Actions e também pode ser iniciada manualmente. Se todas as fontes falharem, o arquivo anterior é preservado. Se nenhuma vaga passar pelos filtros, a página mostra a lista vazia. Dados com mais de sete dias são escondidos.

Para atualizar manualmente, use Node.js 20 ou superior:

```sh
node vagas-home-office/atualizar-vagas.mjs
```

Não há dependências nem chave de API. Confirme a situação e os requisitos na página original antes de se candidatar.
