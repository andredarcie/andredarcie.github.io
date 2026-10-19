// 098 - Tutorial do SP: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

/*
==============================================================================
                   Tutorial do Sistema de Particulas
                              por Kbça
==============================================================================

------------------------------------------------------------------------------
                        Criando novos efeitos
------------------------------------------------------------------------------

Leia atentamente o script "Configurações do SP"
Um efeito é composto de varias configurações, tomarei um como exemplo:

    id = "Fumaça"               # Nome do Efeito
    p = Particle_Setting.new    # Nescessario para criar o efeito
    p.power = [5,3]             # 5 particulas para 3 frames 
    p.speed = 15                # Pausa de 15 frames entre criação de particulas
    p.intensity = 255           # Inicia com opacidade de 255
    p.burnout = 10              # Altera a opacidade em 10
    p.h_scatter = 25            # Randomico de 25 pixels para horizontal
    p.v_scatter = 25            # Randomico de 25 pixels para vertical
    p.velocity = [0,-1.5]       # Velocidade: Horizontal 0 e Vertical -1.5
    p.acceleration = [0,-0.1]   # Aceleração: Horizontal 0 e Vertical -0.1
    p.angle_change = 0          # Não ocorre mudança de angulo (valor=0)
    p.achange_delta = 0         # Não ocorre mudança de angulo (valor=0)
    p.move_type = 0             # Tipo de movimento: Linear (em linha)
    p.lock = false              # A particula ficará sobre seu alvo
    @particle_settings[id] = p.clone # Nescessario para criar o efeito

Esse efeito será nomeado como Fumaça e exibirá 5 particulas em 3 frames,
fazendo uma pausa de 15 frames a cada vez.Ele iniciará com opacidade total (255)
e irá diminuir sua opacidade em 10 a cada frame. A particula gerada irá iniciar 
numa localização X ramdomica de 25 pixels e a mesma coisa em Y. A particula
se moverá a -1.5 Y e irá acelerar  -0.1 Y.

Para criar novos efeitos, coloque o código correspondente (como a configuração 
do efeito "Fumaça") aonde diz "Coloque novos efeitos abaixo!"


------------------------------------------------------------------------------
                          Usando os efeitos
                           por  Comentário
------------------------------------------------------------------------------

Quando usamos um efeito por comentario ele será exibido constantemente.
Coloque o comentario na pagina do evento que quiser ele ativo, assim
você pode colocar diversos efeitos por pagina do evento.

1º Adicione a palavra PART no nome do evento

2º Coloque um comentario, usando o seguinte formato:

PARTICLE=imagem-da-particula,modo-de-imagem,efeito-usado,posição-x,posição-y


O que cada "coisa" significa:

imagem-da-particula 
o nome da imagem da pasta "Graphics\Particles" que será usada

modo-de-imagem
o modo que a imagem será carregada:
    0 - Modo Normal (exibe a imagem normalmente
    1 - Modo Adição (exibe a imagem tirando os tons de preto)
    2 - Modo Subtração (exibe a imagem com cores "invertidas")

efeito-usado
o nome do efeito configurado no script "Configurações do SP"

posição-x
o valor x que é adicionado a coordenada da particula.
Iguale a 0 para posição original

posição-y
o valor y que é adicionado a coordenada da particula.
Iguale a 0 para posição original


Exemplo:
PARTICLE=sparkle-blue,1,Glitter,0,0

usará a imagem sparkle-blue, sob o modo Adicionar, usando o efeito Glitter,
nas coordenadas x e y originais do evento.


------------------------------------------------------------------------------
                          Usando os efeitos
                         por "Chamar Script"
------------------------------------------------------------------------------

Para usar efeitos num determinado momento (como a explosão de algo) você pode
usar o comando "Chamar Script" para executar um efeito de particula.

Use o seguinte

particula = "energy-ball-white"
evento_alvo = $game_map.events[23]
efeito = "Sumir"
modo = 1
tempo = 10
p1 = $scene.ap(particula, evento_alvo, modo, tempo, efeito)
self.add_effect(1,p1)

Onde:

particula = "energy-ball-white"  <<<<----------- PARTICULA (IMAGEM) A SER USADA
evento_alvo = $game_map.events[23] <<<<--------- EVENTO ALVO DA PARTICULA
efeito = "Sumir" <<<<--------------------------- EFEITO USADO
modo = 1 <<<<----------------------------------- MODO DE IMAGEM
tempo = 10 <<<<--------------------------------- TEMPO (EM FRAMES)
p1 = $scene.ap(particula, evento_alvo, modo, tempo, efeito) <-- NÂO ALTERE NADA AQUI
self.add_effect(1,p1) <<<<------------------------------------- NÂO ALTERE NADA AQUI

Bem simples não?

Observação:
Para executar a particula em eventos, 
igualamos evento_alvo a $game_map.events[id_do_evento]
onde id_do_evento tem que ser substituido pelo numero do ID do evento

Para executar a particula no personagem principal, 
igualamos evento_alvo a $game_player

Para executar a particula no evento em que foi chamada, 
igualamos evento_alvo a $game_map.events[original_event_id]


Fim =D

Qualquer duvida poste no tópico do sistema

==============================================================================
                   Tutorial do Sistema de Particulas
                              por Kbça
==============================================================================
*/
