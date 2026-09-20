Original prompt: Crie um site web simples que é uma arena 2d de pequens formas de vida que andam nela feitos de forma geometricas. ELes andam livremente

- Criada arena vanilla com canvas, 12 organismos geométricos e movimento livre com colisão nas bordas.
- Adicionado clique para semear novos organismos, leitura ao vivo, famílias visuais e layout responsivo.
- Expostos `window.render_game_to_text` e `window.advanceTime(ms)` para testes automatizados.
- Teste Playwright concluído: movimento, clique de semeadura e estado textual verificados; sem erros de console.
- Arena expandida para 100% da viewport, com controles e indicadores flutuando sobre o campo.
- Adicionados tamanho uniforme, barras de vida/fome/sede, capim, poças de água, consumo, morte por necessidades zeradas e busca por recurso dentro do campo de visão.
- Adicionada percepção de comida com balão “vi comida”, corrida até o capim e animação “nham nham” durante a alimentação.
- Movimento refatorado com aceleração, inércia, velocidade máxima, passeio sinuoso, curvas orgânicas e quique suave nas bordas.
