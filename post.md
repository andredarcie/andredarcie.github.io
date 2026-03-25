![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0bfrcj35rjsuraxe28d6.png)

Este tutorial mostra como usar um agente de IA para praticar TDD do zero, partindo de um requisito escrito em linguagem simples até uma implementação refatorada e com testes passando.

O exemplo é um caso de uso simples/abstraido: **criar conta de usuário**.

## O que é TDD?

TDD (Test-Driven Development) é uma técnica de desenvolvimento em três fases:

| Fase | O que fazer |
|------|-------------|
| RED | Escrever os testes antes do código. Eles devem falhar. |
| GREEN | Escrever o mínimo de código para os testes passarem. |
| REFACTOR | Melhorar o código sem quebrar os testes. |

### Ameaça e defesa
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vy4awm5rtzx1sqa2xa84.png)

## Passo 1: Definir os requisitos

Antes de escrever qualquer código, escreva o que o sistema precisa fazer em linguagem simples. Use a IA para transformar isso em um documento de requisitos.

**Prompt:**
```markdown
Crie um arquivo .md simples, listando os requisitos
necessários para criar um caso de uso de criar 
conta de usuário com nome, e-mail e senha,
apenas com o básico.
```

**Resultado:**
```markdown
# Criar Conta

## O que é isso?
Permite que uma pessoa crie uma conta na plataforma informando seu nome, e-mail e senha.

## O que o usuário precisa informar?
- Nome
- E-mail
- Senha

## Quando o cadastro é recusado?

| Situação | Motivo |
|----------|--------|
| Nome não foi preenchido | O nome é obrigatório |
| Nome tem menos de 3 letras | Nome muito curto para ser válido |
| E-mail não foi preenchido | O e-mail é obrigatório |
| E-mail está no formato errado | Precisa seguir o padrão nome@dominio.com |
| E-mail já foi usado em outro cadastro | Cada conta precisa ter um e-mail único |
| Senha tem menos de 8 caracteres | Senha muito curta |
| Senha não tem letras e números ao mesmo tempo | Senha fraca demais |

## O que acontece quando o cadastro dá certo?
A conta é criada e o sistema confirma com:
- Código único da conta
- Nome cadastrado
- E-mail cadastrado
- Data e hora do cadastro
```

> **Dica:** Antes de avançar, pergunte à IA se faltou algum edge case. Requisitos incompletos geram testes incompletos.

> **Outra dica:** Peça para um modelo de IA diferente do que você está usando revisar os requisitos e apontar falhas graves, contradições ou cenários não cobertos. Modelos diferentes cometem erros diferentes.

**Prompt:**
```plaintext
Faltou alguma coisa importante que não considerei? Algum edge case?
```

## Passo 2: Visualizar o fluxo

Com os requisitos prontos, gere um fluxograma para validar o entendimento antes de escrever código.

**Prompt:**
```plaintext
Com base no arquivo .md criado, crie um fluxograma
da esquerda para a direita exemplificando o fluxo.
```

**Resultado:**

![Fluxograma do caso de uso CreateUser](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zg4no3nsg30meboxxyox.png)

> **Por que isso importa?** O fluxograma torna visível a ordem das validações e os caminhos de erro. É mais fácil revisar um diagrama com o time do que revisar código.

## Passo 3: Criar a classe sem implementação (RED)

Crie apenas o esqueleto da classe, com as dependências e a assinatura do método, sem nenhuma lógica. O método deve lançar `NotImplementedException`.

**Prompt:**
```java
Crie a classe de Caso de Uso sem implementação alguma no método,
apenas com as dependências possíveis com base nos requisitos.
```

**Resultado:**
```csharp
public class CreateUserUseCase
{
    private readonly IUserReadRepository _readRepository;
    private readonly IUserWriteRepository _writeRepository;
    private readonly IPasswordHasher _passwordHasher;

    public CreateUserUseCase(
        IUserReadRepository readRepository,
        IUserWriteRepository writeRepository,
        IPasswordHasher passwordHasher)
    {
        _readRepository = readRepository;
        _writeRepository = writeRepository;
        _passwordHasher = passwordHasher;
    }

    public Task<Result<CreateUserResponse>> ExecuteAsync(CreateUserCommand command)
    {
        throw new NotImplementedException("Implementação pendente");
    }
}
```

## Passo 4: Escrever os testes (RED)

Com a classe vazia criada, peça à IA para escrever os testes baseando-se nos requisitos. Os testes devem falhar neste momento, isso é esperado e correto.

> **Uma observação sobre o ritmo:** no TDD clássico, o ciclo é executado um teste por vez: escreve um teste, faz passar, refatora, repete. Aqui estamos escrevendo todos os testes de uma vez antes de implementar, o que é uma adaptação prática para trabalhar com IA.

**Prompt:**
```java
Com base no arquivo de requisitos e nessa classe de caso de uso,
escreva os testes unitários que validem cada requisito seguindo o padrão Arrange-Act-Assert, e confirme que eles estão falhando.
```

**Resultado: testes falhando:**

![Testes falhando, fase RED](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kksj373octaqjfva856f.png)

Antes de avançar, verifique se a cobertura está completa.

**Prompt:**
```plaintext
Esses testes estão cobrindo totalmente os requisitos
ou faltou algum caso?
```

> **Regra de ouro do TDD:** só avance para o GREEN depois que todos os testes estiverem escritos e falhando pelo motivo certo: `NotImplementedException`, não erro de compilação.

## Passo 5: Fechar o agente e abrir uma nova sessão

Antes de implementar, **feche o agente completamente e abra uma nova conversa** ou limpe o contexto do agente, por exemplo com `/clean`.

> Na fase GREEN, a única fonte da verdade é o teste. Não o requisito, não o fluxograma, não a conversa anterior.

## Passo 6: Implementar para passar nos testes (GREEN)

Na nova sessão, mostre apenas os testes e a classe vazia. O objetivo aqui é **apenas fazer os testes passarem**, sem se preocupar com qualidade, padrões ou boas práticas ainda.

**Prompt:**
```java
Com base nos testes unitários existentes para a criação de usuário,
crie a implementação do caso de uso.
```

**Resultado: testes passando:**

![Testes passando, fase GREEN](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/c6grspa2q6ex35m65aks.png)

> **Importante:** nesta fase é normal o código ficar feio. Validações inline, strings hardcoded, acoplamentos diretos, tudo isso é esperado. O que importa é: **os testes passam**.

## Passo 7: Identificar os problemas (REFACTOR)

Com os testes verdes, peça à IA para revisar o código com olhar crítico.

> *Pergunte o que está errado, não se está certo.* Modelos de IA tendem a confirmar o que o usuário quer ouvir. "O código está bom?" quase sempre recebe um "sim". "Quais são os problemas?" força uma análise real.

**Prompt:**
```plaintext
Liste os problemas encontrados no código implementado
com base nas boas práticas de desenvolvimento.
```

**Resultado:**

![Problemas encontrados no código](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/331j0ug2wvo4qj2kjrdo.png)

## Passo 8: Refatorar (REFACTOR)

Com a lista de problemas em mãos, peça à IA para corrigi-los. Os testes são a rede de segurança: se alguma refatoração quebrar o comportamento, os testes vão acusar imediatamente.

> **Refatorar é mudar como, não o quê.** O comportamento externo deve permanecer idêntico antes e depois. Se um teste quebra durante a refatoração, significa que ele estava testando um detalhe interno de implementação em vez do comportamento, e provavelmente precisa ser revisado junto com o código.

**Prompt:**
```java
Refatore esses pontos de melhoria no código.
```

**Resultado:**

![Código refatorado](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4oljfano4t7f7kmjq0vh.png)

> Os problemas encontrados foram violações de SRP (uma classe deve ter apenas uma responsabilidade), OCP (aberto para extensão, fechado para         modificação), ISP (interfaces não devem forçar dependências desnecessárias), DIP (dependa de abstrações, não de implementações concretas), DRY (não repita a mesma lógica em lugares diferentes) e um problema de segurança com salt fixo na senha.

## Passo 9: Confirmar que tudo ainda passa

Após a refatoração, rode os testes novamente para garantir que nenhum comportamento foi quebrado.

**Prompt:**
```shell
Execute novamente todos os testes.
```

**Resultado: 24/24 passando:**

![Todos os testes passando após refatoração](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/e665v8k8tcvrcjxi92lo.png)

## Passo 10: Testar manualmente e em homologação

Com os testes automatizados passando, valide o comportamento real da feature em ambiente de homologação ou por meio de testes manuais. Ferramentas e integrações que os testes unitários não cobrem só aparecem aqui.

Se algo der errado, não tente corrigir diretamente no código. Volte ao Passo 1 e trate o bug como uma nova demanda:

Descreva o comportamento incorreto como um requisito, o que deveria acontecer e o que está acontecendo, volte para o passo 1.

> **Por que isso importa?** Um bug corrigido sem teste pode voltar sem que ninguém perceba. O teste que comprova o bug é a garantia de que ele nunca mais vai passar despercebido.

## Conclusão

O ciclo completo ficou assim:

```plaintext
Requisitos → Fluxograma → Esqueleto → Testes falhando
→ Fechar agente → Implementação passando → Refatoração → Testes passando
```

TDD com IA significa usar o agente de IA para acelerar cada etapa do ciclo enquanto você, desenvolvedor, mantém o controle das decisões importantes: o que o sistema deve fazer, quais casos precisam ser testados e quando o código está bom o suficiente para ir para produção. 