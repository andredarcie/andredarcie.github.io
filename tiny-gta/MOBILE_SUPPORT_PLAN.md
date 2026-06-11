# Plano mobile 3D para Tiny GTA

## Objetivo

Transformar o Tiny GTA em um jogo totalmente jogavel em mobile, mantendo o desktop intacto. No celular/tablet, o jogo deve funcionar em landscape, com dois analogicos transparentes, botoes touch para interacao/armas/tiro/freio/radio/pausa, HUD responsiva e controles confortaveis para uma camera 3D em terceira pessoa.

## Comparacao com o codigo atual

### O que ja ajuda

- O jogo ja usa DOM para HUD sobre o canvas, o que e adequado para mobile.
- O renderer e a camera ja respondem a `resize` em `js/engine.js`.
- O gameplay ja esta modularizado em `input`, `player`, `hud`, `weapons`, `audio`, `missions` e `diego`.
- `shootWeapon()`, `enterCar()`, `exitCar()`, `radioSwitch()` e `dlgPress()` ja existem e podem ser reaproveitados por botoes touch.
- `refs` em `js/state.js` ja permite consultar estado entre modulos sem criar muitos imports circulares.

### Gaps contra o plano mobile

- `js/player.js` le `keys` diretamente em `updateFoot()` e `updateCar()`. Isso impede analogicos sem duplicar fisica.
- `js/input.js` mistura input fisico, acoes de gameplay, pointer lock, title start e tiro.
- `js/audio.js` tambem depende de `keys` para buzina e derrapagem. O plano precisa incluir audio no input unificado.
- `js/hud.js` gera prompts fixos com tecla `E`, entao o mobile nao tera label contextual correto.
- `js/diego.js` abre dialogo por proximidade, nao por botao. Isso conflita com a boa pratica mobile de evitar modais inesperados durante movimento.
- `index.html` nao tem `viewport-fit=cover`, controles touch ou overlay de orientacao.
- `css/style.css` nao tem media queries, safe areas, `touch-action`, nem layout para HUD em landscape pequeno.
- `js/engine.js` usa `devicePixelRatio` ate `2`, sombras 2048 e resize simples. Em mobile 3D isso pode custar frame time demais.
- `js/main.js` nao possui etapa de normalizacao de input antes da simulacao nem update dos controles touch.

## Decisoes de design mobile

### Layout landscape

```
+------------------------------------------------------------------+
| dinheiro/missao compacta                 wanted/arma/pausa       |
|                                                                  |
|                  centro livre para camera e mira                 |
|                                                                  |
| minimapa    analogico movimento     analogico camera     botoes  |
+------------------------------------------------------------------+
```

Regras:

- O centro da tela e a area baixa central devem ficar livres para leitura 3D.
- O HUD persistente deve ocupar pouco espaco; detalhes longos ficam ocultos ou compactados.
- Sticks e botoes ficam nas bordas, respeitando `env(safe-area-inset-*)`.
- Controles touch devem ser transparentes em repouso e mais opacos durante toque.
- Botoes devem ter alvo de toque de pelo menos 48px; recomendado 60-72px.

### Ergonomia

- Mao esquerda: movimento a pe e direcao/aceleracao do carro.
- Mao direita: camera/mira e botoes de acao.
- Os dois analogicos devem aceitar toque simultaneo com Pointer Events e `setPointerCapture`.
- O botao de tiro deve ficar no polegar direito sem cobrir a mira.
- O botao de interacao deve ser contextual e proximo do tiro, mas menor prioridade visual.
- O freio de mao aparece apenas no carro; nao ocupar espaco quando a pe.

### Estados de controles

Durante gameplay normal:

- Mostrar `stick-move`, `stick-look`, `btn-interact`, `btn-pause`.

A pe com arma:

- Mostrar `btn-shoot`.
- Manter crosshair.

No carro:

- Mostrar `btn-brake` e `btn-radio`.
- Esconder `btn-shoot`.

Em dialogo:

- Bloquear sticks.
- Mostrar apenas `btn-interact` como `OK`.
- Nao permitir tiro, freio ou radio.

Em pause, title, cutscene, mission pass ou portrait bloqueado:

- Resetar input.
- Bloquear acoes persistentes.

## Arquitetura recomendada

### 1. Input fisico separado de acoes

Criar um estado normalizado em `js/state.js`:

```js
export const input = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  run: false,
  brake: false,
  horn: false,
  shootHeld: false,
  touchActive: false,
  lookActive: false,
  lastInput: 'keyboard',
};
```

Convencoes:

- `moveX`: esquerda/direita, `-1` a `1`.
- `moveY`: frente/re, `-1` a `1`, frente positivo.
- `lookX`: yaw em radianos por segundo.
- `lookY`: pitch em radianos por segundo.
- `brake`: freio de mao.
- `horn`: buzina.
- `shootHeld`: tiro automatico por toque segurado, respeitando cooldown de `shootWeapon()`.
- `lookActive`: true quando o analogico direito esta sendo usado, para impedir recentralizacao da camera.

`keys` pode continuar existindo, mas apenas como leitura fisica do teclado.

### 2. Acoes reutilizaveis

Extrair de `js/input.js` funcoes puras de acao:

```js
export function startGameFromUserGesture() {}
export function performInteract() {}
export function performPauseToggle() {}
export function performRadioSwitch() {}
export function performShoot() {}
export function updateKeyboardInput() {}
export function resetInput() {}
```

Essas funcoes devem ser chamadas por teclado, mouse e touch. Isso evita que `touch-controls.js` copie regras de jogo.

### 3. Ordem do loop

Atualizar `js/main.js` para uma ordem clara:

1. Calcular `dt`.
2. Atualizar input fisico para input normalizado.
3. Se pausado/orientacao bloqueada, renderizar sem simular gameplay.
4. Simular player/carro.
5. Simular mundo.
6. Aplicar camera.
7. Atualizar HUD e controles touch.
8. Atualizar audio.
9. Renderizar.

## Mudancas por arquivo

### `js/state.js`

Adicionar `input` e flags mobile:

- `state.mobile`
- `state.orientationBlocked`
- `state.controlsLocked`

Manter `keys`, mas parar de espalhar seu uso.

### `js/input.js`

Refatorar responsabilidades:

- Manter listeners de teclado/mouse.
- Exportar acoes reutilizaveis.
- Implementar `updateKeyboardInput()`.
- Implementar `resetInput()`.
- Evitar `requestPointerLock()` quando `input.touchActive` ou `state.mobile`.
- No start, trocar mensagem inicial em mobile para algo sem tecla, por exemplo `PEGUE O CARRO ROSA`.

`performInteract()` deve ser a unica origem da logica:

- Se `state.dlgActive`: `dlgPress()`.
- Se pausado/cutscene/orientacao bloqueada: ignorar.
- Se pode pegar arma: `pickupWeapon()`.
- Se perto de carro e a pe: `enterCar()`.
- Se no carro e velocidade menor que 6: `exitCar()`.
- Se Diego for refatorado para interacao explicita: abrir/avancar dialogo.

### `js/player.js`

Substituir `keys` por `input`:

- `updateFoot(dt)` usa `input.moveX`, `input.moveY`, `input.run`.
- `updateCar(dt)` usa `input.moveX`, `input.moveY`, `input.brake`.
- `updateCamera(dt)` aplica `input.lookX/lookY` quando o controle nao estiver bloqueado.

Detalhe importante para carro:

- Com `input.moveY > 0`, acelerar.
- Com `input.moveY < 0`, frear se esta indo para frente; dar re depois.
- Direcao deve escalar com velocidade, mantendo a logica atual.
- `input.brake` substitui `keys['Space']`.

### `js/audio.js`

Trocar leituras de teclado:

- `keys['KeyH']` vira `input.horn`.
- `keys['Space']` vira `input.brake`.

Isso evita carro mudo ou derrapagem sem som no mobile.

### `js/touch-controls.js`

Novo modulo.

Responsabilidades:

- Detectar mobile com `matchMedia('(pointer: coarse)')` e viewport pequeno.
- Inicializar sticks e botoes.
- Atualizar `input` com Pointer Events.
- Atualizar labels, visibilidade e estado disabled dos botoes.
- Cuidar de orientation lock/fallback.
- Resetar input em `pointercancel`, `blur`, `visibilitychange` e troca de orientacao.

Nao deve:

- Mexer diretamente em fisica.
- Duplicar logica de `performInteract()`.
- Usar `touchstart` como API principal.

### `js/hud.js`

Criar uma origem unica para acao contextual:

```js
export function getInteractAction() {
  if (state.dlgActive) return { label: 'OK', prompt: 'TOQUE PARA CONTINUAR', enabled: true };
  if (refs.canPickWeapon?.()) return { label: 'PEGAR', prompt: 'PEGAR ARMA', enabled: true };
  if (state.mode === 'car') {
    const speed = Math.abs(refs.getCur?.()?.speed || 0);
    return speed < 6
      ? { label: 'SAIR', prompt: 'SAIR DO CARRO', enabled: true }
      : { label: '...', prompt: '', enabled: false };
  }
  if (refs.isNearDiego?.()) return { label: 'FALAR', prompt: 'FALAR COM DIEGO', enabled: true };
  if (refs.nearestCar?.(3.6)) return { label: 'CARRO', prompt: 'ENTRAR NO CARRO', enabled: true };
  return { label: '...', prompt: '', enabled: false };
}
```

O prompt desktop pode mostrar tecla `E`; o mobile deve usar o label do botao.

### `js/diego.js`

Recomendacao forte: trocar dialogo automatico por interacao explicita.

Motivo:

- Em mobile, aproximar-se de NPC enquanto dirige/anda nao deve abrir modal inesperado.
- Boa pratica 3D: prompts contextuais devem indicar acao; o jogador confirma com botao.

Mudanca sugerida:

- Exportar `isNearDiego()`.
- Exportar `performDiegoInteract()`.
- `updateDiego(dt)` continua animando marcador e item, mas nao abre dialogo automaticamente.
- `performInteract()` chama `performDiegoInteract()` quando perto.

Se quiser preservar comportamento desktop antigo, permitir auto-dialogo apenas atras de flag, mas o ideal e padronizar em interacao explicita.

### `js/engine.js`

Melhorar para mobile 3D:

- Criar `resizeRenderer()` reutilizavel.
- Usar dimensoes do `visualViewport` quando disponivel.
- Escutar `resize`, `orientationchange` e `visualViewport.resize`.
- Limitar pixel ratio:
  - desktop: `Math.min(devicePixelRatio, 2)`.
  - mobile: `Math.min(devicePixelRatio, 1.5)`.
- Considerar reduzir sombras em mobile:
  - `dlight.shadow.mapSize` de `2048` para `1024`.
  - opcional: desligar sombra em aparelhos muito lentos.

### `index.html`

Atualizar viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
```

Adicionar depois do HUD:

```html
<div id="touch-controls" aria-hidden="true">
  <div id="stick-move" class="touch-stick" aria-label="Mover"><div class="stick-knob"></div></div>
  <div id="stick-look" class="touch-stick" aria-label="Camera"><div class="stick-knob"></div></div>
  <button id="btn-interact" class="touch-btn touch-btn-primary" type="button" aria-label="Interagir">...</button>
  <button id="btn-shoot" class="touch-btn touch-btn-danger" type="button" aria-label="Atirar">FIRE</button>
  <button id="btn-brake" class="touch-btn" type="button" aria-label="Freio de mao">BRAKE</button>
  <button id="btn-radio" class="touch-btn touch-btn-small" type="button" aria-label="Trocar radio">RAD</button>
  <button id="btn-pause" class="touch-btn touch-btn-small" type="button" aria-label="Pausar">II</button>
</div>
<div id="rotate-device" role="status" aria-live="polite">Gire o celular</div>
```

Title screen:

- Em mobile, trocar controles desktop por instrucoes curtas: `ANALOGICO ESQ`, `ANALOGICO DIR`, `FIRE`, `ACAO`.
- `CLICK TO PLAY` vira `TOQUE PARA JOGAR`.

### `css/style.css`

Adicionar:

- `touch-action: none` em `html`, `body`, `canvas#game` e controles.
- `overscroll-behavior: none`.
- `#touch-controls` com `pointer-events:none`.
- Filhos dos controles com `pointer-events:auto`.
- Safe areas em HUD e controles.
- Media queries para `(pointer: coarse)` e `max-width`.
- Layout portrait com `#rotate-device`.

Evitar:

- Controles em card grande.
- Texto longo dentro de botoes pequenos.
- HUD fixa sobre o centro da cena.

## Especificacao dos analogicos

### Configuracao inicial

```js
const STICK_DEAD_ZONE = 0.12;
const STICK_CURVE = 1.35;
const MOVE_RADIUS = 58;
const LOOK_RADIUS = 58;
const LOOK_YAW_SPEED = 2.4;
const LOOK_PITCH_SPEED = 1.35;
```

### Normalizacao

```js
function normalizeStick(dx, dy, radius) {
  const x = Math.max(-1, Math.min(1, dx / radius));
  const y = Math.max(-1, Math.min(1, dy / radius));
  const len = Math.hypot(x, y);
  if (len < STICK_DEAD_ZONE) return { x: 0, y: 0, active: false };
  const amount = Math.min(1, (len - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE));
  const curved = Math.pow(amount, STICK_CURVE);
  return { x: (x / len) * curved, y: (y / len) * curved, active: true };
}
```

### Movimento

A pe:

- `input.moveX = stick.x`
- `input.moveY = -stick.y`
- `input.run = hypot(stick.x, stick.y) > 0.88`

No carro:

- `input.moveX = stick.x`
- `input.moveY = -stick.y`
- `input.brake` vem do botao dedicado.

### Camera

- `input.lookX = stick.x * LOOK_YAW_SPEED`
- `input.lookY = -stick.y * LOOK_PITCH_SPEED`
- Aplicar com `dt`.
- Respeitar `cameraRig.invertY`.
- Clamp de pitch permanece `.18` a `.82`.
- Em carro, recentralizar camera atras do veiculo apenas quando `lookActive` estiver false por pelo menos 1.2s.

## Especificacao dos botoes

### Interacao

- `pointerdown`: `performInteract()`.
- Label vem de `getInteractAction()`.
- Estado disabled visual quando sem acao.

### Tiro

- Visivel se `state.hasGun && state.mode === 'foot'`.
- `pointerdown`: `input.shootHeld = true` e `performShoot()`.
- `pointerup/cancel`: `input.shootHeld = false`.
- Loop chama `performShoot()` enquanto `shootHeld`.
- `shootWeapon()` continua controlando cooldown.

### Freio

- Visivel no carro.
- `pointerdown`: `input.brake = true`.
- `pointerup/cancel`: `input.brake = false`.

### Radio

- Visivel no carro.
- `pointerdown`: `performRadioSwitch()`.

### Pausa

- Sempre visivel durante gameplay mobile.
- `pointerdown`: `performPauseToggle()`.

### Buzina

Opcional, mas recomendado porque ja existe audio:

- Botao pequeno no carro ou gesto de toque duplo no freio.
- Mapeia para `input.horn`.

## HUD responsiva

### Mobile landscape

Dimensoes:

- Stick base: `clamp(104px, 18vw, 138px)`.
- Knob: `clamp(42px, 7vw, 56px)`.
- Botao principal: `clamp(60px, 9vw, 74px)`.
- Botao pequeno: `clamp(44px, 7vw, 54px)`.
- Minimap: `clamp(108px, 18vw, 136px)`.

Reposicionamento:

- `#topleft`: top-left com safe area, menor padding.
- `#missionblock`: virar chip compacto; esconder descricao longa em mobile.
- `#topright`: top-right com wanted e stars reduzidos.
- `#weaponhud`: juntar visualmente ao canto direito superior ou ao botao de tiro.
- `#speedo`: acima dos botoes do carro.
- `#mapwrap`: acima/ao lado do stick esquerdo, sem cobrir o polegar.
- `#prompt`: ocultar no mobile quando `btn-interact` tiver label.
- `#msg`: `max-width: 78vw`, `white-space: normal`.
- `#bigtext`: `font-size: clamp(38px, 11vw, 96px)`.

### Portrait

- Mostrar `#rotate-device`.
- Escurecer ou pausar a cena.
- Ocultar sticks e botoes de gameplay.
- Nao confiar em orientation lock como requisito.

### Dialogos e mission pass

- Dialogo deve caber em 667x375.
- Reduzir retrato de Diego ou empilhar horizontalmente apenas se houver espaco.
- `#dlg-prompt` deve trocar texto no mobile para `TOQUE OK`.
- Mission pass deve usar `clamp()` e nao bloquear o reset dos inputs.

## Orientacao e fullscreen

No primeiro gesto do usuario:

1. `initAudio()`.
2. `AC?.resume?.()`.
3. `document.documentElement.requestFullscreen?.()` se mobile.
4. `screen.orientation.lock?.('landscape')` dentro de `try/catch`.
5. Iniciar jogo mesmo que fullscreen/lock falhem.

Fallback:

- `state.orientationBlocked = input.touchActive && innerHeight > innerWidth`.
- Se bloqueado, `resetInput()` e mostrar overlay.
- Escutar `resize`, `orientationchange` e `visualViewport.resize`.

## Performance mobile 3D

Boas praticas para este projeto:

- Limitar pixel ratio mobile a `1.5`.
- Evitar aumentar FOV/camera shake em excesso em telas pequenas.
- Reduzir sombras para `1024` em mobile.
- Manter HUD em DOM, nao desenhar texto em canvas/WebGL.
- Evitar blur pesado em muitos paineis; `backdrop-filter` pode ser caro em mobile.
- Considerar classe `.low-power` se FPS cair:
  - menos opacidade/blur em HUD.
  - sombra menor.
  - menos efeitos de scanline/vignette.
- Testar legibilidade com controles transparentes sobre areas claras do mapa.

## Ordem de implementacao

### Marco 1: Auditoria resolvida e input unificado

Tarefas:

- Adicionar `input` em `state.js`.
- Extrair funcoes de acao em `input.js`.
- Criar `updateKeyboardInput()` e `resetInput()`.
- Migrar `player.js` para `input`.
- Migrar `audio.js` para `input`.

Aceite:

- Desktop continua igual.
- Nenhum uso novo de `keys` aparece fora de `input.js`, exceto legado temporario documentado.

### Marco 2: Controles touch funcionais

Tarefas:

- Adicionar HTML dos controles.
- Criar `touch-controls.js`.
- Implementar dois sticks com Pointer Events.
- Implementar botoes de interacao, tiro, freio, radio e pausa.
- Importar `setupTouchControls()` em `main.js`.

Aceite:

- Dois dedos funcionam simultaneamente.
- Jogador anda e move camera ao mesmo tempo.
- Carro acelera/vira e camera se move ao mesmo tempo.
- Botoes nao disparam clique no canvas.

### Marco 3: Interacao contextual e Diego

Tarefas:

- Criar `getInteractAction()` em `hud.js`.
- Refatorar Diego para interacao explicita.
- Atualizar prompt desktop e botao mobile com a mesma origem.
- Atualizar dialogo para `OK`/`TOQUE OK` no mobile.

Aceite:

- Conversa com Diego nao abre so por encostar no NPC.
- Botao contextual mostra o label correto.
- Desktop ainda permite interagir com `E/F`.

### Marco 4: HUD e orientacao

Tarefas:

- Atualizar meta viewport.
- Criar CSS mobile e safe areas.
- Criar overlay de orientacao.
- Reposicionar HUD em landscape pequeno.
- Ajustar title, dialogo, mission pass, mensagem e big text.

Aceite:

- 667x375, 740x360, 844x390 e 932x430 nao cortam texto critico.
- Centro e baixo-centro da tela ficam livres.
- Portrait mostra instrucao para girar.

### Marco 5: Performance e polimento

Tarefas:

- Melhorar resize em `engine.js`.
- Limitar pixel ratio mobile.
- Reduzir sombras/blur quando mobile.
- Ajustar dead zone, curva e sensibilidade.
- Recentrar camera no carro.
- Resetar input em blur/visibility/orientation.

Aceite:

- Sem stuck input.
- Sem scroll/zoom acidental.
- Sem erros no console.
- Controles legiveis sobre cenarios claros e escuros.

## Matriz de testes

Desktop:

- Chrome e Edge.
- WASD, mouse, click, E/F, Space, H, Tab, P.
- Pointer lock continua funcionando.

Mobile/DevTools:

- 667x375.
- 740x360.
- 844x390.
- 932x430.
- 1024x768.

Mobile real quando possivel:

- Chrome Android.
- Samsung Internet.
- Safari iOS.

Cenarios:

- Iniciar por toque.
- Girar retrato/horizontal.
- Andar, correr e mirar.
- Pegar arma e atirar.
- Segurar tiro.
- Entrar no carro, acelerar, dar re, virar, frear e sair.
- Trocar radio e buzinar.
- Conversar com Diego.
- Completar uma entrega.
- Ver wanted/policia com HUD ativa.
- Pausar e voltar.
- Trocar de aba e voltar sem input preso.

## Criterios de pronto

- O jogo e jogavel em mobile sem teclado/mouse.
- Os dois analogicos funcionam simultaneamente.
- Todas as acoes principais possuem botao touch.
- Desktop nao teve regressao de controles.
- HUD mobile e legivel e nao cobre o gameplay 3D.
- Orientation lock tem fallback funcional.
- Inputs sao resetados em cancelamentos e troca de foco.
- Performance mobile nao degrada por pixel ratio, sombras ou overlays pesados.
- Console fica sem erros nos fluxos principais.
