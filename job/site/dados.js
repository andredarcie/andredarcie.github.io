// Gerado por src/site.mjs a partir de analise/estatisticas.json. Não editar à mão.
window.__RADAR__ = {
 "meta": {
  "geradoEm": "2026-07-27",
  "total": 1209,
  "fontes": [
   {
    "id": "gupy",
    "nome": "Gupy",
    "n": 320,
    "escopo": "Brasil — maior ATS do país, vagas em português"
   },
   {
    "id": "hackernews",
    "nome": "Hacker News",
    "n": 280,
    "escopo": "Global — anúncio escrito pela própria engenharia, sem template de RH"
   },
   {
    "id": "programathor",
    "nome": "programathor",
    "n": 160,
    "escopo": "Brasil — board só de vagas de tecnologia, empresas menores e startups"
   },
   {
    "id": "weworkremotely",
    "nome": "We Work Remotely",
    "n": 108,
    "escopo": "Remoto global — feeds RSS por categoria (25 por feed)"
   },
   {
    "id": "greenhouse_br",
    "nome": "greenhouse_br",
    "n": 85,
    "escopo": "Brasil — página de carreiras de empresas de tecnologia e fintechs brasileiras"
   },
   {
    "id": "himalayas",
    "nome": "Himalayas",
    "n": 84,
    "escopo": "Remoto global — API paginada de 20 em 20"
   },
   {
    "id": "jobicy",
    "nome": "Jobicy",
    "n": 80,
    "escopo": "Remoto global — API limitada a 50 por chamada, varrida por região"
   },
   {
    "id": "arbeitnow",
    "nome": "Arbeitnow",
    "n": 79,
    "escopo": "Europa (forte na Alemanha) — board generalista, 100 por página"
   },
   {
    "id": "remotive",
    "nome": "Remotive",
    "n": 13,
    "escopo": "Remoto global — categoria software-dev"
   }
  ],
  "porIdioma": {
   "en": 703,
   "pt": 506
  },
  "porModalidade": {
   "remoto": 718,
   "hibrido": 209,
   "nao_informado": 146,
   "presencial": 136
  },
  "porFamilia": {
   "generico": 527,
   "fullstack": 242,
   "backend": 140,
   "devops_sre": 84,
   "dados_ml": 82,
   "mobile": 62,
   "frontend": 53,
   "qa": 14,
   "embarcado": 4,
   "jogos": 1
  },
  "porSenioridade": {
   "Não informado": 483,
   "Sênior": 440,
   "Staff / Lead": 130,
   "Pleno": 111,
   "Júnior": 41,
   "Estágio": 4
  },
  "mediaRequisitos": 9.9,
  "totalRequisitos": 50,
  "recorteBeneficios": {
   "vagasComCorte": 640,
   "pctDoCorpus": 52.9,
   "mediaCaracteresCortados": 949
  },
  "silencio": {
   "hackernews": 7.5,
   "gupy": 65.6
  }
 },
 "dataset": {
  "geradoEm": "2026-07-27",
  "totalVagas": 1209,
  "arquivos": [
   {
    "arquivo": "vagas.csv",
    "descricao": "Uma linha por vaga, com a descrição original completa.",
    "linhas": 1209,
    "colunas": 17,
    "bytes": 4553007
   },
   {
    "arquivo": "vagas_requisitos.csv",
    "descricao": "Formato longo: um par vaga × requisito por linha.",
    "linhas": 11989,
    "colunas": 5,
    "bytes": 1404523
   },
   {
    "arquivo": "vagas_requisitos_matriz.csv",
    "descricao": "Formato largo: uma coluna 0/1 por requisito. Sem texto de terceiros.",
    "linhas": 1209,
    "colunas": 59,
    "bytes": 209122
   },
   {
    "arquivo": "taxonomia.csv",
    "descricao": "Dicionário dos 50 requisitos e os padrões usados para detectá-los.",
    "linhas": 50,
    "colunas": 8,
    "bytes": 14483
   },
   {
    "arquivo": "fontes.csv",
    "descricao": "As fontes e o funil de triagem de cada uma.",
    "linhas": 9,
    "colunas": 10,
    "bytes": 1155
   },
   {
    "arquivo": "ranking_requisitos.csv",
    "descricao": "Agregado por requisito, já calculado.",
    "linhas": 50,
    "colunas": 10,
    "bytes": 5739
   }
  ]
 },
 "categorias": {
  "comunicacao": "Comunicação e idioma",
  "comportamento": "Comportamento e colaboração",
  "processo": "Processo e prática de engenharia",
  "tecnico_transversal": "Fundamentos técnicos que independem de linguagem",
  "credenciais": "Credenciais, contexto e formato de trabalho",
  "produto": "Produto e negócio"
 },
 "cobertura": [
  {
   "categoria": "tecnico_transversal",
   "nome": "Fundamentos técnicos que independem de linguagem",
   "requisitos": 11,
   "n": 1088,
   "pct": 90,
   "pt": 96.8,
   "en": 85.1
  },
  {
   "categoria": "processo",
   "nome": "Processo e prática de engenharia",
   "requisitos": 11,
   "n": 944,
   "pct": 78.1,
   "pt": 90.9,
   "en": 68.8
  },
  {
   "categoria": "comportamento",
   "nome": "Comportamento e colaboração",
   "requisitos": 12,
   "n": 889,
   "pct": 73.5,
   "pt": 75.5,
   "en": 72.1
  },
  {
   "categoria": "credenciais",
   "nome": "Credenciais, contexto e formato de trabalho",
   "requisitos": 8,
   "n": 712,
   "pct": 58.9,
   "pt": 66.6,
   "en": 53.3
  },
  {
   "categoria": "comunicacao",
   "nome": "Comunicação e idioma",
   "requisitos": 4,
   "n": 532,
   "pct": 44,
   "pt": 44.5,
   "en": 43.7
  },
  {
   "categoria": "produto",
   "nome": "Produto e negócio",
   "requisitos": 4,
   "n": 350,
   "pct": 28.9,
   "pt": 27.7,
   "en": 29.9
  }
 ],
 "ranking": [
  {
   "id": "apis_integracao",
   "rotulo": "APIs e integrações",
   "categoria": "tecnico_transversal",
   "pct": 55.4,
   "pctBoards": 64.9,
   "pt": 75.9,
   "en": 40.7,
   "piso": 23.9,
   "teto": 78.8,
   "n": 670
  },
  {
   "id": "banco_dados",
   "rotulo": "Banco de dados / SQL",
   "categoria": "tecnico_transversal",
   "pct": 53.3,
   "pctBoards": 59.1,
   "pt": 72.3,
   "en": 39.7,
   "piso": 32.9,
   "teto": 74.4,
   "n": 645
  },
  {
   "id": "trabalho_em_equipe",
   "rotulo": "Trabalho em equipe / colaboração",
   "categoria": "comportamento",
   "pct": 49.3,
   "pctBoards": 61.9,
   "pt": 57.7,
   "en": 43.2,
   "piso": 7.5,
   "teto": 78.8,
   "n": 596
  },
  {
   "id": "boas_praticas_codigo",
   "rotulo": "Clean code / SOLID / boas práticas",
   "categoria": "tecnico_transversal",
   "pct": 41.4,
   "pctBoards": 51.9,
   "pt": 54.2,
   "en": 32.3,
   "piso": 6.8,
   "teto": 74.1,
   "n": 501
  },
  {
   "id": "cloud",
   "rotulo": "Cloud (AWS/Azure/GCP)",
   "categoria": "tecnico_transversal",
   "pct": 41.4,
   "pctBoards": 46.6,
   "pt": 43.1,
   "en": 40.1,
   "piso": 23.9,
   "teto": 62.4,
   "n": 500
  },
  {
   "id": "arquitetura",
   "rotulo": "Arquitetura / system design",
   "categoria": "tecnico_transversal",
   "pct": 39.8,
   "pctBoards": 45.6,
   "pt": 33,
   "en": 44.7,
   "piso": 20.4,
   "teto": 67.5,
   "n": 481
  },
  {
   "id": "experiencia_previa",
   "rotulo": "Experiência prévia comprovada (sem número)",
   "categoria": "credenciais",
   "pct": 38.7,
   "pctBoards": 48.9,
   "pt": 51.8,
   "en": 29.3,
   "piso": 5,
   "teto": 58.8,
   "n": 468
  },
  {
   "id": "versionamento",
   "rotulo": "Controle de versão (Git)",
   "categoria": "processo",
   "pct": 37.2,
   "pctBoards": 46.1,
   "pt": 60.1,
   "en": 20.8,
   "piso": 7.9,
   "teto": 64.7,
   "n": 450
  },
  {
   "id": "comunicacao_geral",
   "rotulo": "Comunicação (falar/escrever bem)",
   "categoria": "comunicacao",
   "pct": 36.5,
   "pctBoards": 45.9,
   "pt": 34.8,
   "en": 37.7,
   "piso": 5.4,
   "teto": 73.8,
   "n": 441
  },
  {
   "id": "performance_escala",
   "rotulo": "Performance e escala",
   "categoria": "processo",
   "pct": 34.8,
   "pctBoards": 43.3,
   "pt": 36.2,
   "en": 33.9,
   "piso": 6.8,
   "teto": 62.4,
   "n": 421
  },
  {
   "id": "observabilidade",
   "rotulo": "Observabilidade / monitoramento",
   "categoria": "processo",
   "pct": 32.8,
   "pctBoards": 38.4,
   "pt": 33.6,
   "en": 32.3,
   "piso": 14.3,
   "teto": 57.6,
   "n": 397
  },
  {
   "id": "ci_cd",
   "rotulo": "CI/CD e automação de deploy",
   "categoria": "processo",
   "pct": 31.9,
   "pctBoards": 39,
   "pt": 40.1,
   "en": 26,
   "piso": 8.6,
   "teto": 44.4,
   "n": 386
  },
  {
   "id": "dados_ia",
   "rotulo": "Dados / IA no dia a dia",
   "categoria": "tecnico_transversal",
   "pct": 29.4,
   "pctBoards": 30.7,
   "pt": 26.1,
   "en": 31.7,
   "piso": 23.1,
   "teto": 47.5,
   "n": 355
  },
  {
   "id": "containers",
   "rotulo": "Containers / Kubernetes",
   "categoria": "tecnico_transversal",
   "pct": 28.5,
   "pctBoards": 32.5,
   "pt": 31.4,
   "en": 26.5,
   "piso": 15.4,
   "teto": 38.8,
   "n": 345
  },
  {
   "id": "metodologias_ageis",
   "rotulo": "Metodologias ágeis (Scrum/Kanban)",
   "categoria": "processo",
   "pct": 28.4,
   "pctBoards": 34.8,
   "pt": 41.1,
   "en": 19.2,
   "piso": 7.1,
   "teto": 50.6,
   "n": 343
  },
  {
   "id": "testes_automatizados",
   "rotulo": "Testes automatizados / TDD",
   "categoria": "processo",
   "pct": 24.7,
   "pctBoards": 31.8,
   "pt": 41.5,
   "en": 12.7,
   "piso": 1.4,
   "teto": 48.1,
   "n": 299
  },
  {
   "id": "autonomia",
   "rotulo": "Autonomia / trabalhar sem supervisão",
   "categoria": "comportamento",
   "pct": 23,
   "pctBoards": 25.4,
   "pt": 26.1,
   "en": 20.8,
   "piso": 13.9,
   "teto": 33.8,
   "n": 278
  },
  {
   "id": "documentacao",
   "rotulo": "Documentação técnica",
   "categoria": "processo",
   "pct": 22,
   "pctBoards": 28.3,
   "pt": 30,
   "en": 16.2,
   "piso": 1.1,
   "teto": 33.8,
   "n": 266
  },
  {
   "id": "cultura_devops",
   "rotulo": "Cultura DevOps",
   "categoria": "processo",
   "pct": 20.3,
   "pctBoards": 22.7,
   "pt": 20.4,
   "en": 20.3,
   "piso": 12.5,
   "teto": 31.5,
   "n": 246
  },
  {
   "id": "ownership",
   "rotulo": "Ownership / senso de dono",
   "categoria": "comportamento",
   "pct": 19.4,
   "pctBoards": 19.7,
   "pt": 12.8,
   "en": 24,
   "piso": 8.8,
   "teto": 31.3,
   "n": 234
  },
  {
   "id": "graduacao",
   "rotulo": "Diploma / ensino superior",
   "categoria": "credenciais",
   "pct": 18.7,
   "pctBoards": 24.2,
   "pt": 24.5,
   "en": 14.5,
   "piso": 0.4,
   "teto": 40.5,
   "n": 226
  },
  {
   "id": "mensageria_eventos",
   "rotulo": "Mensageria / arquitetura orientada a eventos",
   "categoria": "tecnico_transversal",
   "pct": 18.2,
   "pctBoards": 22.9,
   "pt": 29.2,
   "en": 10.2,
   "piso": 2.5,
   "teto": 35.3,
   "n": 220
  },
  {
   "id": "ingles",
   "rotulo": "Inglês",
   "categoria": "comunicacao",
   "pct": 18,
   "pctBoards": 22.5,
   "pt": 16.8,
   "en": 18.9,
   "piso": 3.2,
   "teto": 38.8,
   "n": 218
  },
  {
   "id": "code_review",
   "rotulo": "Code review / pull request",
   "categoria": "processo",
   "pct": 17.5,
   "pctBoards": 22.4,
   "pt": 26.9,
   "en": 10.8,
   "piso": 1.4,
   "teto": 29.4,
   "n": 212
  },
  {
   "id": "mentoria",
   "rotulo": "Mentoria de outras pessoas",
   "categoria": "comportamento",
   "pct": 16.8,
   "pctBoards": 20.1,
   "pt": 10.5,
   "en": 21.3,
   "piso": 5.7,
   "teto": 38.8,
   "n": 203
  },
  {
   "id": "microservicos",
   "rotulo": "Microsserviços",
   "categoria": "tecnico_transversal",
   "pct": 16.6,
   "pctBoards": 21.2,
   "pt": 25.7,
   "en": 10.1,
   "piso": 1.4,
   "teto": 30.6,
   "n": 201
  },
  {
   "id": "lideranca",
   "rotulo": "Liderança técnica",
   "categoria": "comportamento",
   "pct": 16.1,
   "pctBoards": 18.7,
   "pt": 15.2,
   "en": 16.8,
   "piso": 7.5,
   "teto": 31.8,
   "n": 195
  },
  {
   "id": "anos_experiencia",
   "rotulo": "Tempo mínimo de experiência (em anos)",
   "categoria": "credenciais",
   "pct": 16.1,
   "pctBoards": 19.3,
   "pt": 7.3,
   "en": 22.5,
   "piso": 5.7,
   "teto": 41.3,
   "n": 195
  },
  {
   "id": "resolucao_problemas",
   "rotulo": "Resolução de problemas / raciocínio analítico",
   "categoria": "comportamento",
   "pct": 14.9,
   "pctBoards": 19.3,
   "pt": 18.6,
   "en": 12.2,
   "piso": 0.4,
   "teto": 32.1,
   "n": 180
  },
  {
   "id": "times_multidisciplinares",
   "rotulo": "Times multidisciplinares / cross-functional",
   "categoria": "comportamento",
   "pct": 13.6,
   "pctBoards": 17,
   "pt": 11.3,
   "en": 15.2,
   "piso": 2.1,
   "teto": 25.9,
   "n": 164
  },
  {
   "id": "aprendizado_continuo",
   "rotulo": "Aprendizado contínuo / curiosidade",
   "categoria": "comportamento",
   "pct": 13.1,
   "pctBoards": 16.1,
   "pt": 12.6,
   "en": 13.4,
   "piso": 2.9,
   "teto": 33.8,
   "n": 158
  },
  {
   "id": "infra_como_codigo",
   "rotulo": "Infraestrutura como código",
   "categoria": "tecnico_transversal",
   "pct": 11.3,
   "pctBoards": 12.1,
   "pt": 4.7,
   "en": 16.1,
   "piso": 3.1,
   "teto": 26.9,
   "n": 137
  },
  {
   "id": "impacto_negocio",
   "rotulo": "Entender o negócio / gerar impacto",
   "categoria": "produto",
   "pct": 11.2,
   "pctBoards": 14.4,
   "pt": 13.4,
   "en": 9.7,
   "piso": 0.7,
   "teto": 19,
   "n": 136
  },
  {
   "id": "organizacao_tempo",
   "rotulo": "Organização / gestão de prazos",
   "categoria": "comportamento",
   "pct": 11.2,
   "pctBoards": 14,
   "pt": 16.8,
   "en": 7.1,
   "piso": 1.8,
   "teto": 21.3,
   "n": 135
  },
  {
   "id": "stakeholders",
   "rotulo": "Relação com stakeholders",
   "categoria": "produto",
   "pct": 11.2,
   "pctBoards": 14,
   "pt": 7.1,
   "en": 14.1,
   "piso": 1.8,
   "teto": 28.7,
   "n": 135
  },
  {
   "id": "adaptabilidade",
   "rotulo": "Adaptabilidade / ambiente de mudança",
   "categoria": "comportamento",
   "pct": 9.7,
   "pctBoards": 11.6,
   "pt": 4.3,
   "en": 13.5,
   "piso": 3.2,
   "teto": 26.3,
   "n": 117
  },
  {
   "id": "proatividade",
   "rotulo": "Proatividade / iniciativa",
   "categoria": "comportamento",
   "pct": 9.5,
   "pctBoards": 12.1,
   "pt": 8.9,
   "en": 10,
   "piso": 1.1,
   "teto": 21.4,
   "n": 115
  },
  {
   "id": "foco_cliente",
   "rotulo": "Foco no cliente / usuário final",
   "categoria": "produto",
   "pct": 8.5,
   "pctBoards": 10.8,
   "pt": 7.7,
   "en": 9.1,
   "piso": 1.1,
   "teto": 20,
   "n": 103
  },
  {
   "id": "seguranca",
   "rotulo": "Segurança / conformidade",
   "categoria": "processo",
   "pct": 7.9,
   "pctBoards": 9.9,
   "pt": 9.3,
   "en": 7,
   "piso": 1.4,
   "teto": 16.5,
   "n": 96
  },
  {
   "id": "visao_produto",
   "rotulo": "Visão de produto / trabalho com PM e design",
   "categoria": "produto",
   "pct": 7.9,
   "pctBoards": 8.7,
   "pt": 3.8,
   "en": 11,
   "piso": 3.8,
   "teto": 16.3,
   "n": 96
  },
  {
   "id": "portfolio_open_source",
   "rotulo": "Portfólio / open source / projetos pessoais",
   "categoria": "credenciais",
   "pct": 6.6,
   "pctBoards": 7.2,
   "pt": 3.4,
   "en": 9,
   "piso": 3.4,
   "teto": 12.9,
   "n": 80
  },
  {
   "id": "on_call",
   "rotulo": "Plantão / on-call",
   "categoria": "processo",
   "pct": 5.7,
   "pctBoards": 6.8,
   "pt": 0.8,
   "en": 9.2,
   "piso": 0.6,
   "teto": 24.1,
   "n": 69
  },
  {
   "id": "fundamentos_cs",
   "rotulo": "Algoritmos e estruturas de dados",
   "categoria": "tecnico_transversal",
   "pct": 5.2,
   "pctBoards": 5.9,
   "pt": 5.1,
   "en": 5.3,
   "piso": 2.9,
   "teto": 12.9,
   "n": 63
  },
  {
   "id": "fuso_horario",
   "rotulo": "Fuso horário / janela de sobreposição",
   "categoria": "credenciais",
   "pct": 4.9,
   "pctBoards": 4.1,
   "pt": 0.2,
   "en": 8.3,
   "piso": 0,
   "teto": 18.8,
   "n": 59
  },
  {
   "id": "atencao_detalhe",
   "rotulo": "Atenção a detalhes / qualidade",
   "categoria": "comportamento",
   "pct": 3.6,
   "pctBoards": 4.6,
   "pt": 1.4,
   "en": 5.3,
   "piso": 0.4,
   "teto": 12.5,
   "n": 44
  },
  {
   "id": "diploma_dispensavel",
   "rotulo": "Diploma explicitamente dispensável",
   "categoria": "credenciais",
   "pct": 2.7,
   "pctBoards": 3.3,
   "pt": 0.6,
   "en": 4.3,
   "piso": 0,
   "teto": 13.1,
   "n": 33
  },
  {
   "id": "comunicacao_escrita",
   "rotulo": "Comunicação escrita explícita",
   "categoria": "comunicacao",
   "pct": 2.6,
   "pctBoards": 3.2,
   "pt": 0.6,
   "en": 4.1,
   "piso": 0.6,
   "teto": 13.1,
   "n": 32
  },
  {
   "id": "autorizacao_trabalho",
   "rotulo": "Autorização de trabalho / visto",
   "categoria": "credenciais",
   "pct": 1.9,
   "pctBoards": 0.8,
   "pt": 0,
   "en": 3.3,
   "piso": 0,
   "teto": 6,
   "n": 23
  },
  {
   "id": "espanhol",
   "rotulo": "Espanhol",
   "categoria": "comunicacao",
   "pct": 1.4,
   "pctBoards": 1.8,
   "pt": 2.8,
   "en": 0.4,
   "piso": 0,
   "teto": 4.1,
   "n": 17
  },
  {
   "id": "disponibilidade_viagem",
   "rotulo": "Disponibilidade para viagem / presença",
   "categoria": "credenciais",
   "pct": 0.4,
   "pctBoards": 0.5,
   "pt": 0.4,
   "en": 0.4,
   "piso": 0,
   "teto": 2.5,
   "n": 5
  }
 ],
 "universais": [
  {
   "id": "banco_dados",
   "rotulo": "Banco de dados / SQL",
   "piso": 32.9,
   "pct": 53.3
  },
  {
   "id": "apis_integracao",
   "rotulo": "APIs e integrações",
   "piso": 23.9,
   "pct": 55.4
  },
  {
   "id": "cloud",
   "rotulo": "Cloud (AWS/Azure/GCP)",
   "piso": 23.9,
   "pct": 41.4
  },
  {
   "id": "dados_ia",
   "rotulo": "Dados / IA no dia a dia",
   "piso": 23.1,
   "pct": 29.4
  },
  {
   "id": "arquitetura",
   "rotulo": "Arquitetura / system design",
   "piso": 20.4,
   "pct": 39.8
  },
  {
   "id": "containers",
   "rotulo": "Containers / Kubernetes",
   "piso": 15.4,
   "pct": 28.5
  },
  {
   "id": "observabilidade",
   "rotulo": "Observabilidade / monitoramento",
   "piso": 14.3,
   "pct": 32.8
  },
  {
   "id": "autonomia",
   "rotulo": "Autonomia / trabalhar sem supervisão",
   "piso": 13.9,
   "pct": 23
  },
  {
   "id": "cultura_devops",
   "rotulo": "Cultura DevOps",
   "piso": 12.5,
   "pct": 20.3
  },
  {
   "id": "ownership",
   "rotulo": "Ownership / senso de dono",
   "piso": 8.8,
   "pct": 19.4
  }
 ],
 "brasil": [
  {
   "id": "versionamento",
   "rotulo": "Controle de versão (Git)",
   "pt": 60.1,
   "en": 20.8,
   "diff": 39.3
  },
  {
   "id": "apis_integracao",
   "rotulo": "APIs e integrações",
   "pt": 75.9,
   "en": 40.7,
   "diff": 35.2
  },
  {
   "id": "banco_dados",
   "rotulo": "Banco de dados / SQL",
   "pt": 72.3,
   "en": 39.7,
   "diff": 32.6
  },
  {
   "id": "testes_automatizados",
   "rotulo": "Testes automatizados / TDD",
   "pt": 41.5,
   "en": 12.7,
   "diff": 28.8
  },
  {
   "id": "experiencia_previa",
   "rotulo": "Experiência prévia comprovada (sem número)",
   "pt": 51.8,
   "en": 29.3,
   "diff": 22.5
  },
  {
   "id": "boas_praticas_codigo",
   "rotulo": "Clean code / SOLID / boas práticas",
   "pt": 54.2,
   "en": 32.3,
   "diff": 21.9
  },
  {
   "id": "metodologias_ageis",
   "rotulo": "Metodologias ágeis (Scrum/Kanban)",
   "pt": 41.1,
   "en": 19.2,
   "diff": 21.9
  },
  {
   "id": "mensageria_eventos",
   "rotulo": "Mensageria / arquitetura orientada a eventos",
   "pt": 29.2,
   "en": 10.2,
   "diff": 19
  }
 ],
 "global": [
  {
   "id": "anos_experiencia",
   "rotulo": "Tempo mínimo de experiência (em anos)",
   "pt": 7.3,
   "en": 22.5,
   "diff": 15.2
  },
  {
   "id": "arquitetura",
   "rotulo": "Arquitetura / system design",
   "pt": 33,
   "en": 44.7,
   "diff": 11.7
  },
  {
   "id": "infra_como_codigo",
   "rotulo": "Infraestrutura como código",
   "pt": 4.7,
   "en": 16.1,
   "diff": 11.4
  },
  {
   "id": "ownership",
   "rotulo": "Ownership / senso de dono",
   "pt": 12.8,
   "en": 24,
   "diff": 11.2
  },
  {
   "id": "mentoria",
   "rotulo": "Mentoria de outras pessoas",
   "pt": 10.5,
   "en": 21.3,
   "diff": 10.8
  },
  {
   "id": "adaptabilidade",
   "rotulo": "Adaptabilidade / ambiente de mudança",
   "pt": 4.3,
   "en": 13.5,
   "diff": 9.2
  },
  {
   "id": "stakeholders",
   "rotulo": "Relação com stakeholders",
   "pt": 7.1,
   "en": 14.1,
   "diff": 7
  },
  {
   "id": "dados_ia",
   "rotulo": "Dados / IA no dia a dia",
   "pt": 26.1,
   "en": 31.7,
   "diff": 5.6
  }
 ],
 "brasilFontes": {
  "fontes": [
   {
    "id": "gupy",
    "nome": "Gupy",
    "rotulo": "ATS de corporação, varejo e consultoria",
    "total": 320
   },
   {
    "id": "programathor",
    "nome": "ProgramaThor",
    "rotulo": "Board de startup e empresa pequena",
    "total": 160
   },
   {
    "id": "greenhouse_br",
    "nome": "Empresas de produto",
    "rotulo": "Página de carreira de fintech e tech BR",
    "total": 85
   }
  ],
  "itens": [
   {
    "id": "observabilidade",
    "rotulo": "Observabilidade / monitoramento",
    "valores": [
     37.5,
     19.4,
     57.6
    ],
    "amplitude": 38.2
   },
   {
    "id": "performance_escala",
    "rotulo": "Performance e escala",
    "valores": [
     38.4,
     31.9,
     62.4
    ],
    "amplitude": 30.5
   },
   {
    "id": "arquitetura",
    "rotulo": "Arquitetura / system design",
    "valores": [
     37.8,
     28.8,
     58.8
    ],
    "amplitude": 30
   },
   {
    "id": "boas_praticas_codigo",
    "rotulo": "Clean code / SOLID / boas práticas",
    "valores": [
     58.8,
     44.4,
     74.1
    ],
    "amplitude": 29.7
   },
   {
    "id": "trabalho_em_equipe",
    "rotulo": "Trabalho em equipe / colaboração",
    "valores": [
     65.6,
     44.4,
     71.8
    ],
    "amplitude": 27.4
   },
   {
    "id": "versionamento",
    "rotulo": "Controle de versão (Git)",
    "valores": [
     64.7,
     54.4,
     38.8
    ],
    "amplitude": 25.9
   },
   {
    "id": "metodologias_ageis",
    "rotulo": "Metodologias ágeis (Scrum/Kanban)",
    "valores": [
     50.6,
     25.6,
     36.5
    ],
    "amplitude": 25
   },
   {
    "id": "cloud",
    "rotulo": "Cloud (AWS/Azure/GCP)",
    "valores": [
     44.7,
     38.1,
     62.4
    ],
    "amplitude": 24.3
   },
   {
    "id": "testes_automatizados",
    "rotulo": "Testes automatizados / TDD",
    "valores": [
     48.1,
     26.3,
     30.6
    ],
    "amplitude": 21.8
   },
   {
    "id": "ingles",
    "rotulo": "Inglês",
    "valores": [
     18.8,
     26.9,
     38.8
    ],
    "amplitude": 20
   }
  ]
 },
 "senioridade": {
  "faixas": [
   {
    "id": "junior",
    "rotulo": "Júnior",
    "total": 41
   },
   {
    "id": "pleno",
    "rotulo": "Pleno",
    "total": 111
   },
   {
    "id": "senior",
    "rotulo": "Sênior",
    "total": 440
   },
   {
    "id": "staff_plus",
    "rotulo": "Staff / Lead",
    "total": 130
   }
  ],
  "itens": [
   {
    "id": "arquitetura",
    "rotulo": "Arquitetura / system design",
    "valores": [
     14.6,
     23.4,
     46.8,
     70.8
    ],
    "delta": 56.2,
    "gap": -11.7,
    "confundido": false
   },
   {
    "id": "lideranca",
    "rotulo": "Liderança técnica",
    "valores": [
     7.3,
     6.3,
     16.4,
     50.8
    ],
    "delta": 43.5,
    "gap": -1.6,
    "confundido": false
   },
   {
    "id": "observabilidade",
    "rotulo": "Observabilidade / monitoramento",
    "valores": [
     9.8,
     25.2,
     39.8,
     48.5
    ],
    "delta": 38.7,
    "gap": 1.3,
    "confundido": false
   },
   {
    "id": "versionamento",
    "rotulo": "Controle de versão (Git)",
    "valores": [
     65.9,
     65.8,
     35.9,
     30.8
    ],
    "delta": -35.1,
    "gap": 39.3,
    "confundido": true
   },
   {
    "id": "ci_cd",
    "rotulo": "CI/CD e automação de deploy",
    "valores": [
     9.8,
     36,
     37.5,
     43.8
    ],
    "delta": 34,
    "gap": 14.1,
    "confundido": false
   },
   {
    "id": "cloud",
    "rotulo": "Cloud (AWS/Azure/GCP)",
    "valores": [
     19.5,
     40.5,
     48.9,
     51.5
    ],
    "delta": 32,
    "gap": 3,
    "confundido": false
   },
   {
    "id": "banco_dados",
    "rotulo": "Banco de dados / SQL",
    "valores": [
     68.3,
     79.3,
     57.5,
     36.9
    ],
    "delta": -31.4,
    "gap": 32.6,
    "confundido": true
   },
   {
    "id": "performance_escala",
    "rotulo": "Performance e escala",
    "valores": [
     17.1,
     34.2,
     45.5,
     48.5
    ],
    "delta": 31.4,
    "gap": 2.3,
    "confundido": false
   },
   {
    "id": "mentoria",
    "rotulo": "Mentoria de outras pessoas",
    "valores": [
     7.3,
     6.3,
     21.6,
     38.5
    ],
    "delta": 31.2,
    "gap": -10.8,
    "confundido": false
   },
   {
    "id": "times_multidisciplinares",
    "rotulo": "Times multidisciplinares / cross-functional",
    "valores": [
     2.4,
     12.6,
     14.5,
     28.5
    ],
    "delta": 26.1,
    "gap": -3.9,
    "confundido": false
   },
   {
    "id": "ownership",
    "rotulo": "Ownership / senso de dono",
    "valores": [
     4.9,
     8.1,
     22,
     30
    ],
    "delta": 25.1,
    "gap": -11.2,
    "confundido": false
   },
   {
    "id": "autonomia",
    "rotulo": "Autonomia / trabalhar sem supervisão",
    "valores": [
     7.3,
     25.2,
     22.3,
     30.8
    ],
    "delta": 23.5,
    "gap": 5.3,
    "confundido": false
   }
  ]
 },
 "anos": {
  "vagasComNumero": 331,
  "pctDoCorpus": 27.4,
  "media": 5.3,
  "mediana": 5,
  "distribuicao": {
   "1": 4,
   "2": 39,
   "3": 46,
   "4": 23,
   "5": 117,
   "6": 34,
   "7": 12,
   "8": 23,
   "10": 17,
   "12": 7,
   "15": 5,
   "16": 3,
   "20": 1
  }
 },
 "coocorrencia": [
  {
   "a": "APIs e integrações",
   "b": "Banco de dados / SQL",
   "pct": 36.2
  },
  {
   "a": "APIs e integrações",
   "b": "Trabalho em equipe / colaboração",
   "pct": 31.7
  },
  {
   "a": "APIs e integrações",
   "b": "Clean code / SOLID / boas práticas",
   "pct": 29.4
  },
  {
   "a": "Banco de dados / SQL",
   "b": "Trabalho em equipe / colaboração",
   "pct": 28.9
  },
  {
   "a": "APIs e integrações",
   "b": "Controle de versão (Git)",
   "pct": 28.7
  },
  {
   "a": "Trabalho em equipe / colaboração",
   "b": "Clean code / SOLID / boas práticas",
   "pct": 28.3
  },
  {
   "a": "APIs e integrações",
   "b": "Experiência prévia comprovada (sem número)",
   "pct": 27.2
  },
  {
   "a": "Banco de dados / SQL",
   "b": "Cloud (AWS/Azure/GCP)",
   "pct": 26.8
  }
 ],
 "raros": [
  {
   "id": "disponibilidade_viagem",
   "rotulo": "Disponibilidade para viagem / presença",
   "pct": 0.4,
   "categoria": "credenciais"
  },
  {
   "id": "espanhol",
   "rotulo": "Espanhol",
   "pct": 1.4,
   "categoria": "comunicacao"
  },
  {
   "id": "autorizacao_trabalho",
   "rotulo": "Autorização de trabalho / visto",
   "pct": 1.9,
   "categoria": "credenciais"
  },
  {
   "id": "comunicacao_escrita",
   "rotulo": "Comunicação escrita explícita",
   "pct": 2.6,
   "categoria": "comunicacao"
  },
  {
   "id": "diploma_dispensavel",
   "rotulo": "Diploma explicitamente dispensável",
   "pct": 2.7,
   "categoria": "credenciais"
  },
  {
   "id": "atencao_detalhe",
   "rotulo": "Atenção a detalhes / qualidade",
   "pct": 3.6,
   "categoria": "comportamento"
  },
  {
   "id": "fuso_horario",
   "rotulo": "Fuso horário / janela de sobreposição",
   "pct": 4.9,
   "categoria": "credenciais"
  },
  {
   "id": "fundamentos_cs",
   "rotulo": "Algoritmos e estruturas de dados",
   "pct": 5.2,
   "categoria": "tecnico_transversal"
  }
 ],
 "tripe": [
  {
   "titulo": "Mover dados entre sistemas",
   "itens": [
    {
     "id": "apis_integracao",
     "rotulo": "APIs e integrações",
     "pct": 55.4,
     "piso": 23.9
    },
    {
     "id": "banco_dados",
     "rotulo": "Banco de dados / SQL",
     "pct": 53.3,
     "piso": 32.9
    }
   ],
   "texto": "Ler de um lugar, transformar, expor em outro. Os dois itens mais pedidos do corpus inteiro, e nenhum deles depende da linguagem."
  },
  {
   "titulo": "Colocar em produção sozinho",
   "itens": [
    {
     "id": "cloud",
     "rotulo": "Cloud (AWS/Azure/GCP)",
     "pct": 41.4,
     "piso": 23.9
    },
    {
     "id": "ci_cd",
     "rotulo": "CI/CD e automação de deploy",
     "pct": 31.9,
     "piso": 8.6
    },
    {
     "id": "containers",
     "rotulo": "Containers / Kubernetes",
     "pct": 28.5,
     "piso": 15.4
    }
   ],
   "texto": "Deixou de ser assunto de infraestrutura. Cloud é a exigência mais uniforme do corpus: não cai abaixo do piso em nenhuma fonte."
  },
  {
   "titulo": "Trabalhar com gente",
   "itens": [
    {
     "id": "trabalho_em_equipe",
     "rotulo": "Trabalho em equipe / colaboração",
     "pct": 49.3,
     "piso": 7.5
    },
    {
     "id": "comunicacao_geral",
     "rotulo": "Comunicação (falar/escrever bem)",
     "pct": 36.5,
     "piso": 5.4
    },
    {
     "id": "autonomia",
     "rotulo": "Autonomia / trabalhar sem supervisão",
     "pct": 23,
     "piso": 13.9
    }
   ],
   "texto": "Não existe uma lista longa de soft skills cobradas. Existem duas, repetidas à exaustão, e o resto fica bem atrás."
  }
 ]
};
