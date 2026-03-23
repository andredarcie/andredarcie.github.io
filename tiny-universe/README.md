# Tiny Universe

Simulação interativa do Sistema Solar em uma única página HTML, com foco em visualização, comparação de escalas e modos temáticos.

## O que o projeto faz

- Exibe os 8 planetas do Sistema Solar em uma visualização animada com `p5.js`
- Permite alternar entre uma visualização artística e uma visualização de `Escala Real`
- Inclui um modo `Pale Blue Dot`, mostrando apenas a Terra como um pequeno ponto
- Inclui um modo `Real Time`, que calcula posições heliocêntricas atuais dos planetas a partir da data/hora atual
- Mostra tooltip com informações básicas dos planetas

## Stack

- HTML
- CSS
- JavaScript
- `p5.js` via CDN

## Estrutura

- [index.html](C:/repos/andredarcie.github.io/tiny-universe/index.html): aplicação inteira

## Como rodar localmente

Como o projeto é uma página estática, o ideal é rodar com um servidor HTTP local em vez de abrir o `index.html` diretamente.

### Opção 1: Python

Se você tiver Python instalado:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

### Opção 2: Node.js

Se você tiver Node instalado:

```bash
npx serve .
```

Ou:

```bash
npx http-server .
```

Depois abra a URL mostrada no terminal.

## Controles

- `Vel.`: ajusta a velocidade da simulação
- `Órbitas`: mostra ou esconde as órbitas
- `Pale Blue Dot`: isola a Terra como um ponto minúsculo
- `Escala Real`: aproxima distâncias e tamanhos para uma representação mais fiel
- `Real Time`: busca as posições reais atuais dos planetas

## Observações

- O modo `Escala Real` é uma representação visualmente legível, não uma reprodução física perfeita em todos os aspectos
- O modo `Real Time` usa cálculo orbital simplificado no navegador para representar a hora atual

## Publicação

Por ser um projeto estático, ele pode ser hospedado facilmente em GitHub Pages, Netlify, Vercel, Cloudflare Pages ou qualquer servidor HTTP simples.
