# Quando usar HTTP, gRPC e Mensageria?

## HTTP
HTTP deve ser usado quando a comunicação entre cliente e servidor é síncrona e direta, como em APIs REST para aplicações web e mobile. Ele é ideal para integração com sistemas externos devido à sua ampla compatibilidade, facilidade de implementação e suporte nativo nos navegadores. No entanto, pode não ser a melhor escolha para comunicação entre microsserviços internos devido à latência e ao acoplamento entre serviços.

## gRPC
gRPC é indicado para comunicação de alto desempenho entre microsserviços internos, oferecendo baixa latência e suporte a streaming bidirecional por meio do HTTP/2 e Protocol Buffers. Ele é ideal para sistemas que precisam de chamadas frequentes e rápidas entre serviços escritos em diferentes linguagens, garantindo um contrato rígido entre eles. Porém, sua complexidade de implementação e o suporte limitado em navegadores podem torná-lo menos adequado para APIs públicas ou aplicações front-end.

## Mensageria
Mensageria deve ser utilizada quando a comunicação assíncrona e o desacoplamento entre serviços são essenciais, como no processamento de eventos, filas de mensagens e sistemas distribuídos. Tecnologias como RabbitMQ, Kafka e AWS SQS garantem resiliência, reprocessamento e escalabilidade ao lidar com grandes volumes de dados sem depender de respostas imediatas. No entanto, sua implementação exige mais configuração e monitoramento para garantir a entrega e a ordem das mensagens.

# Apache Kafka

O Apache Kafka é uma plataforma de streaming distribuída usada para coletar, processar, armazenar e distribuir eventos em tempo real. Ele é baseado em um modelo pub/sub e utiliza partições para distribuir mensagens entre múltiplos consumidores, garantindo escalabilidade e tolerância a falhas. É amplamente utilizado para logs, mensageria, processamento de dados e integração entre microservices.

# Arquitetura Onion vs. Arquitetura Hexagonal

A Arquitetura Onion organiza o código em camadas concêntricas, colocando o domínio no centro e impedindo que ele dependa diretamente da infraestrutura. Já a Arquitetura Hexagonal foca em Portas e Adaptadores, permitindo que o domínio seja acessado de diferentes formas sem se acoplar diretamente a detalhes técnicos. Ambas favorecem a separação de responsabilidades e modularidade, mas a Hexagonal enfatiza a flexibilidade de comunicação com diferentes sistemas.

# O Elemento Mais Importante no DDD

No Domain-Driven Design (DDD), o mais importante é capturar e modelar o Domínio da aplicação de forma precisa, garantindo que a lógica de negócio esteja bem definida e encapsulada em Entidades, Value Objects, Aggregates e Serviços de Domínio. Isso permite um código coeso, claro e alinhado com as regras reais do negócio, facilitando a evolução e manutenção da aplicação.

# Como Funciona o SAGA Pattern

O SAGA Pattern é um padrão para gerenciar transações distribuídas em microservices, garantindo consistência eventual sem depender de um banco de dados transacional centralizado. Ele pode ser implementado de duas formas: orquestrado, onde um serviço central gerencia os fluxos das transações, ou coreografado, onde os próprios serviços reagem a eventos disparados por outros, garantindo a execução de compensações em caso de falhas.

# Como Funciona o Kafka Streams

O Kafka Streams é uma biblioteca para processamento de eventos em tempo real diretamente no Apache Kafka, permitindo operações como filtros, agregações, joins e janelas de tempo. Ele roda dentro das próprias aplicações clientes, sem necessidade de infraestrutura extra, garantindo baixo consumo de recursos e escalabilidade horizontal, sendo útil para análise de dados, ETL e integrações reativas.

# Conceitos Avançados do Kafka

Além da publicação e consumo de mensagens, o Kafka suporta conceitos avançados como Log Compaction (eliminação de mensagens obsoletas), Exactly-Once Semantics (EOS) para garantir entrega única, Schema Registry para controle de compatibilidade de mensagens, Rebalanceamento de Partições para otimização da distribuição de carga, e Stateful Processing em aplicações que precisam manter estado entre eventos.

# Serviços Mais Comuns do Azure e Seus Usos

O Azure oferece diversos serviços para diferentes necessidades, incluindo Azure Functions para computação serverless, Azure Cosmos DB para armazenamento NoSQL escalável, Azure Kubernetes Service (AKS) para orquestração de contêineres, Azure Service Bus para mensageria entre microservices, Azure DevOps para CI/CD, e Azure Monitor para observabilidade e logs.

# Uso do Kubernetes

O Kubernetes é uma plataforma de orquestração de contêineres que gerencia a implantação, escalabilidade e manutenção de aplicações conteinerizadas. Ele permite balanceamento de carga, autoescalonamento, gerenciamento de configuração (ConfigMaps, Secrets) e facilita a alta disponibilidade de aplicações distribuídas em clusters.

# Como Otimizar Queries SQL

Para otimizar consultas SQL, utilize índices para acelerar buscas, evite SELECT * para reduzir carga no banco, utilize EXPLAIN ANALYZE para diagnosticar gargalos, normalize ou desnormalize tabelas conforme necessário, implemente particionamento para grandes volumes de dados e utilize caching sempre que possível para reduzir leituras repetitivas.

# Quando Escolher entre SQL e NoSQL

Escolha SQL quando precisar de transações ACID, consistência forte e relações complexas entre os dados, como em sistemas bancários ou ERP. Prefira NoSQL quando for necessário escalabilidade horizontal, flexibilidade de esquema e alta disponibilidade, como em aplicações web de grande porte, redes sociais e IoT.

# Cloud Patterns

Os padrões arquiteturais em cloud incluem CQRS (separação de leitura e escrita), Event Sourcing (armazenar estado como eventos), API Gateway (proxy unificado para microservices), Sidecar Pattern (serviços auxiliares rodando junto à aplicação principal) e Strangler Pattern (migração gradual de sistemas legados).

# Boas Práticas de Arquitetura de Microservices

Microservices devem ser independentes, comunicarem-se preferencialmente de forma assíncrona, terem bancos de dados isolados, serem observáveis (logs, métricas, tracing), garantirem resiliência usando Circuit Breakers e terem deploy e escalabilidade independentes.

# Como Funciona o Circuit Breaker

O Circuit Breaker protege um sistema contra falhas em cascata ao interromper temporariamente chamadas para serviços que apresentam falhas consecutivas. Ele possui três estados: Fechado (chamadas normais), Aberto (falhas detectadas, interrompendo chamadas) e Meio Aberto (tentativa de recuperação antes de voltar ao estado normal).

# Diferença entre Interface e Classe Abstrata

Uma interface define um contrato sem implementação, permitindo que múltiplas classes a implementem independentemente. Já uma classe abstrata pode conter implementações parciais e estado compartilhado, sendo útil quando há comportamento comum entre subclasses, mas sem instância direta.

Logs, métricas e tracing são os três pilares da observabilidade. Logs registram eventos discretos com detalhes sobre a execução da aplicação, geralmente em texto estruturado e com níveis de severidade (INFO, ERROR, etc.). Métricas são valores numéricos agregados ao longo do tempo, como CPU, memória, taxa de erro e latência, permitindo monitoramento e alertas. Tracing rastreia requisições entre serviços distribuídos, permitindo visualizar o caminho de uma chamada e identificar gargalos. Enquanto logs fornecem detalhes pontuais e métricas mostram tendências, o tracing ajuda a entender o fluxo end-to-end das operações.