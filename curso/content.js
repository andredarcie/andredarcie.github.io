const content = {
  meta: {
    title: "Curso Dev do André",
    lang: "pt-BR",
  },

  header: {
    label: "André N. Darcie",
    heading: "Engenharia de\nSoftware na Prática",
  },

  instructor: {
    name: "André N. Darcie",
    role: "Desenvolvedor Sênior · NTT Data / XP Investimentos",
    bio: "Bacharel em Ciência da Computação e pós-graduado em Ciência de Dados Aplicada pela PUC Minas. Especialista em microserviços, APIs distribuídas e sistemas de alto volume na maior corretora do Brasil. Autor de diversos projetos open source com reconhecimento na comunidade. Professor e consultor especializado em C# e .NET.",
  },

  format: {
    heading: "Como é o curso",
    items: [
      "Atendimento exclusivamente individual, sem turmas ou grade compartilhada",
      "Plano de ensino elaborado sob medida com base no perfil e nos objetivos do aluno",
      "Aulas ao vivo, sem material gravado ou estático",
      "Conteúdo conduzido pelas dúvidas e necessidades reais de cada sessão",
      "Ritmo ajustado continuamente ao progresso do aluno",
      "Foco em sair de cada aula com o conceito compreendido de forma sólida",
      "Primeira aula gratuita, pagamento por sessão sem compromisso de continuidade",
    ],
  },

  audience: {
    heading: "Para quem é",
    items: [
      "Estudantes de computação que querem entender os fundamentos na prática",
      "Desenvolvedores júnior e pleno buscando evoluir para sênior",
      "Profissionais que querem se atualizar em arquitetura e sistemas modernos",
      "Quem quer ser produtivo com IA mas entregar com qualidade e segurança",
    ],
  },

  modules: [
    {
      title: "Casos Reais",
      topics: [
        "Processando milhões de eventos com Apache Kafka",
        "Tuning avançado de banco de dados SQL e NoSQL",
        "Concorrência e paralelismo: garantias de segurança em sistemas de alto volume",
        "Race conditions em produção: diagnóstico, isolamento e solução definitiva",
        "Otimização de desempenho com profiler: eliminando gargalos e vazamentos de memória",
        "Resiliência em integrações externas: fallbacks, retries e contratos com provedores",
        "Do zero à produção: todas as decisões arquiteturais e seus trade-offs",
        "Monolito em startup vs. microserviços no corporativo: quando e por quê migrar",
      ],
    },
    {
      title: "Engenharia com IA",
      topics: [
        "TDD e SDD para guiar agentes de IA",
        "Orquestração de múltiplos agentes com controle de estado e falhas",
        "Guardrails e validação de outputs de agentes em produção",
        "Garantindo qualidade e confiabilidade no código gerado com IA",
        "Estruturando projetos que evoluem sem acumular dívida técnica",
        "LLMs em produção: trade-offs de custo, latência e estratégias de integração",
      ],
    },
    {
      title: "Arquitetura",
      topics: [
        "Design Patterns avançados: seleção criteriosa por contexto e consequências",
        "Quando não aplicar padrões: reconhecendo e evitando overengineering",
        "CQRS e Event Sourcing",
        "Resiliência e tolerância a falha em sistemas críticos",
        "Segurança avançada: autenticação, autorização, criptografia e conformidade regulatória",
        "Kubernetes avançado: scheduling, autoscaling, resource limits e estratégias de deploy",
        "Arquitetura cloud: decisões de multi-region, serviços gerenciados vs. self-hosted e custo",
        "CI/CD com quality gates, deploy progressivo e rollback automatizado",
        "Observabilidade com OpenTelemetry: traces, métricas e logs em produção",
      ],
    },
    {
      title: "Sistemas Distribuídos",
      topics: [
        "Sagas e transações distribuídas",
        "Service Mesh e comunicação entre serviços",
        "Cache distribuído: estratégias de invalidação, consistência e eviction em alta escala",
        "Idempotência e consistência eventual",
        "Retry, DLQ e Circuit Breaker",
        "Background Jobs: scheduling, idempotência e recuperação de falhas em escala",
      ],
    },
  ],

  contact: {
    links: [
      { label: "E-mail", href: "mailto:andrendarcie@gmail.com" },
      { label: "LinkedIn", href: "https://linkedin.com/in/andredarcie" },
      { label: "GitHub", href: "https://github.com/andredarcie" },
    ],
  },

  footer: {
    text: "© 2026 André N. Darcie",
  },
};
