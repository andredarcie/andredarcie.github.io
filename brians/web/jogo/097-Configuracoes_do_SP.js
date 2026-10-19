// 097 - Configurações do SP: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
//            Configurações do sistema de particulas
//        Defina novas animações seguindo o tutorial abaixo
//==============================================================================
//==============================================================================
// ** Game_System
//==============================================================================
// [Power] é o numero de particulas para fazer no formato [a,b], sendo:
// [a] numero de particulas, [b] pausa entre elas
// [Speed] É a quantia de tempo entre um novo [Power]
// Por exemplo, [power] [3,5] e [speed] 50:
// Isso irá criar 3 particulas em 5 frames, depois disso haverá
// uma pausa de 50 frames, e se repetirá.
//
// [Intensity] É a opacidade inicial
// [burnout] É o quanto a opacidade altera
// É considerada "feita" quando a particula alcança mais de 255 ou menos de 1
//
// [h_scatter] e [v_scatter] É a quantia randomica que a localização
// inicial da particula (horizontal e vertical) pode ter,
// Exemplo: um [h_scatter] 10 e um [v_scatter] 0:
// Significa que irá criar todas as particulas na mesma localização inicial Y,
// mas com uma diferença randomica de 10 pixels na sua localização inicial X,
// em ambas direções (direita e esquerda)
//
// [Velocity] é o quão rapido ela mudará em cada direção [x,y]
// [acceleration] é o quanto a velocidade altera em cada direção [x,y]
//
// [Angle_change] É o quanto o angulo muda em cada frame
// [achange_delta] É o quanto a mudança de angulo poderá ocorrer em cada frame
//
// [zoom_start] É o valor inicial de zoom para a sprite [x,y]
// [zoom_starts] É quando a transição de zoom irá iniciar (frame) [x,y]
// [zoom_change] É o quanto o zoom mudará [x,y]
//
// [Move_type] Decide o tipo de movimento da particula
// 0: Movimento Linear (em linha)
// 1: Movimento Circular [x,y] X e Y em radianos
// 2: Explodir\Sumir, depende da velocidade ser positiva ou negativa
// 3: Circular em X, linear em Y
// 4: Circular em Y, linear em X
//
// [Lock] Decide se a particula ficará sobre seu alvo ou mudará aonde iniciou
//
// [wAmp], [wLength], [wSpeed] e [wPhase] são os valores para os
// atributos de onda (Leia o Documento do VX abaixo de Sprite para detalhes)
//--------------------------------------------------------------------------
//     Vou comentar o primeiro efeito abaixo para terem uma noção de
//          como funciona na pratica. Veja o efeito "Fumaça"
//--------------------------------------------------------------------------
//==========================================================================
// * Configurações das Particulas
//==========================================================================
rb.reabrir(Game_System, class extends rb.superDe(Game_System) {
  create_particle_settings() {
    let id, p;
    //-----------------------------------
    // Efeitos Padrão (nomes traduzidos)
    //-----------------------------------
    id = "Fumaça"; // Nome do Efeito
    p = Particle_Setting.new(); // Nescessario para criar o efeito
    p.power = [5, 3]; // 5 particulas para 3 frames
    p.speed = 15; // Pausa de 15 frames entre criação de particulas
    p.intensity = 255; // Inicia com opacidade de 255
    p.burnout = 10; // Altera a opacidade em 10
    p.h_scatter = 25; // Randomico de 25 pixels para horizontal
    p.v_scatter = 25; // Randomico de 25 pixels para vertical
    p.velocity = [0, -1.5]; // Velocidade: Horizontal 0 e Vertical -1.5
    p.acceleration = [0, -0.1]; // Aceleração: Horizontal 0 e Vertical -0.1
    p.angle_change = 0; // Não ocorre mudança de angulo (valor=0)
    p.achange_delta = 0; // Não ocorre mudança de angulo (valor=0)
    p.move_type = 0; // Tipo de movimento: Linear (em linha)
    p.lock = false; // A particula ficará sobre seu alvo
    rb.idxSet(this._particle_settings, id, rb.clone(p)); // Nescessario para criar o efeito
    id = "Glitter";
    p = Particle_Setting.new();
    p.power = [5, 10];
    p.speed = 50;
    p.intensity = 255;
    p.burnout = 5;
    p.h_scatter = 8;
    p.v_scatter = 4;
    p.velocity = [0, -0.6];
    p.acceleration = [0, 0];
    p.angle_change = 5;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FogoPequeno";
    p = Particle_Setting.new();
    p.power = [5, 3];
    p.speed = 15;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 2;
    p.v_scatter = 0;
    p.velocity = [0, -1];
    p.acceleration = [0, 0.05];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.zoom_start = [50, 50];
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FogoMedio";
    p = Particle_Setting.new();
    p.power = [2, 0];
    p.speed = 1;
    p.intensity = 255;
    p.burnout = 6;
    p.h_scatter = 5;
    p.v_scatter = 5;
    p.velocity = [0, -2];
    p.acceleration = [0, 0.05];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.zoom_start = [120, 120];
    p.zoom_starts = [0, 0];
    p.zoom_change = [-3, -3];
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FogoGrande";
    p = Particle_Setting.new();
    p.power = [5, 1];
    p.speed = 5;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 20;
    p.v_scatter = 6;
    p.velocity = [0, -3];
    p.acceleration = [0, 0.05];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.zoom_start = [80, 80];
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FumaçaGrande";
    p = Particle_Setting.new();
    p.power = [5, 1];
    p.speed = 15;
    p.intensity = 255;
    p.burnout = 10;
    p.h_scatter = 25;
    p.v_scatter = 10;
    p.velocity = [0, -1];
    p.acceleration = [0, -0.05];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.zoom_start = [80, 80];
    p.zoom_starts = [0, 0];
    p.zoom_change = [4, 4];
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FumaçaPequena";
    p = Particle_Setting.new();
    p.power = [5, 10];
    p.speed = 50;
    p.intensity = 255;
    p.burnout = 8;
    p.h_scatter = 2;
    p.v_scatter = 4;
    p.velocity = [0, -0.5];
    p.acceleration = [0, -0.1];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "ExplosãoMedia";
    p = Particle_Setting.new();
    p.power = [4, 0];
    p.speed = 2;
    p.intensity = 255;
    p.burnout = 15;
    p.h_scatter = 5;
    p.v_scatter = 5;
    p.velocity = [1, 1];
    p.acceleration = [0.5, 0.5];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 2;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "ExplosãoGrande";
    p = Particle_Setting.new();
    p.power = [4, 0];
    p.speed = 2;
    p.intensity = 255;
    p.burnout = 15;
    p.h_scatter = 8;
    p.v_scatter = 8;
    p.velocity = [2, 2];
    p.acceleration = [0.5, 0.5];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 2;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "ExplosãoGrandePulse";
    p = Particle_Setting.new();
    p.power = [4, 0];
    p.speed = 2;
    p.intensity = 255;
    p.burnout = 15;
    p.h_scatter = 4;
    p.v_scatter = 4;
    p.velocity = [6, 6];
    p.acceleration = [-0.1, -0.1];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 2;
    p.zoom_start = [25, 25];
    p.zoom_starts = [0, 0];
    p.zoom_change = [10, 10];
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "Girar";
    p = Particle_Setting.new();
    p.power = [2, 10];
    p.speed = 20;
    p.intensity = 255;
    p.burnout = 15;
    p.h_scatter = 8;
    p.v_scatter = 8;
    p.velocity = [0.1, 0.1];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 1;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FadeEstatico";
    p = Particle_Setting.new();
    p.power = [3, 20];
    p.speed = 60;
    p.intensity = 255;
    p.burnout = 5;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FadeEstatico2x";
    p = Particle_Setting.new();
    p.power = [3, 20];
    p.speed = 60;
    p.intensity = 255;
    p.burnout = 5;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 0];
    p.acceleration = [0, 0];
    p.zoom_start = [200, 200];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FlutuarEsquerda";
    p = Particle_Setting.new();
    p.power = [1, 5];
    p.speed = 5;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 5;
    p.v_scatter = 2;
    p.velocity = [-1, -1];
    p.acceleration = [0, -0.1];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FlutuarDireita";
    p = Particle_Setting.new();
    p.power = [1, 5];
    p.speed = 5;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 5;
    p.v_scatter = 2;
    p.velocity = [1, -1];
    p.acceleration = [0, -0.1];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FlutuarEsquerda2x";
    p = Particle_Setting.new();
    p.power = [1, 5];
    p.speed = 5;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 5;
    p.v_scatter = 2;
    p.velocity = [-1, -2];
    p.acceleration = [0, -0.1];
    p.angle_change = 0;
    p.zoom_start = [200, 200];
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FlutuarDireita2x";
    p = Particle_Setting.new();
    p.power = [1, 5];
    p.speed = 5;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 5;
    p.v_scatter = 2;
    p.velocity = [1, -2];
    p.acceleration = [0, -0.1];
    p.angle_change = 0;
    p.zoom_start = [200, 200];
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "FadeAnimado";
    p = Particle_Setting.new();
    p.power = [5, 10];
    p.speed = 50;
    p.intensity = 255;
    p.burnout = 5;
    p.h_scatter = 8;
    p.v_scatter = 4;
    p.velocity = [0, -0.6];
    p.acceleration = [0, 0];
    p.angle_change = 5;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    p.animation_frames = 4;
    p.animation_speed = 20;
    p.animation_start_frame = -1;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    //-----------------------------------
    // Novos Efeitos (criados por Kbça)
    //-----------------------------------
    id = "Sangue";
    p = Particle_Setting.new();
    p.power = [15, 1];
    p.speed = 1;
    p.intensity = 255;
    p.burnout = 12;
    p.h_scatter = 5;
    p.v_scatter = 2;
    p.velocity = [-2, -5];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "LuzPiscando";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 10;
    p.intensity = 150;
    p.burnout = 10;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 0];
    p.acceleration = [0, 0];
    p.angle_change = 10;
    p.achange_delta = 0;
    p.move_type = 2;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "LuzEstatica";
    p = Particle_Setting.new();
    p.power = [120, 1];
    p.speed = 60;
    p.intensity = 150;
    p.burnout = 20;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 0];
    p.acceleration = [0, 0];
    p.angle_change = 10;
    p.achange_delta = 0;
    p.move_type = 2;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "LuzEstatica2x";
    p = Particle_Setting.new();
    p.power = [60, 1];
    p.speed = 60;
    p.intensity = 150;
    p.burnout = 20;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 2;
    p.zoom_start = [200, 200];
    p.zoom_starts = [0, 0];
    p.zoom_change = [0, 0];
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "Sumir";
    p = Particle_Setting.new();
    p.power = [3, 2];
    p.speed = 2;
    p.intensity = 255;
    p.burnout = 5;
    p.h_scatter = 2;
    p.v_scatter = 4;
    p.velocity = [0, 1];
    p.acceleration = [0, -0.5];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "Faiscas";
    p = Particle_Setting.new();
    p.power = [4, 2];
    p.speed = 2;
    p.intensity = 255;
    p.burnout = 6;
    p.h_scatter = 7;
    p.v_scatter = 4;
    p.velocity = [0, -2];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaAcimaMulti";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 10;
    p.intensity = 255;
    p.burnout = 4;
    p.h_scatter = 2;
    p.v_scatter = 2;
    p.velocity = [0, -2];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaAbaixoMulti";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 10;
    p.intensity = 255;
    p.burnout = 4;
    p.h_scatter = 2;
    p.v_scatter = 2;
    p.velocity = [0, 2];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaDireitaMulti";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 10;
    p.intensity = 255;
    p.burnout = 4;
    p.h_scatter = 2;
    p.v_scatter = 2;
    p.velocity = [2, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaEsquerdaMulti";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 10;
    p.intensity = 255;
    p.burnout = 4;
    p.h_scatter = 2;
    p.v_scatter = 2;
    p.velocity = [-2, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaAcima";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 30;
    p.intensity = 255;
    p.burnout = 8;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, -2];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaAbaixo";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 30;
    p.intensity = 255;
    p.burnout = 8;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 2];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaDireita";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 30;
    p.intensity = 255;
    p.burnout = 8;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [2, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaEsquerda";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 30;
    p.intensity = 255;
    p.burnout = 8;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [-2, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "SetaPiscando";
    p = Particle_Setting.new();
    p.power = [1, 1];
    p.speed = 40;
    p.intensity = 255;
    p.burnout = 10;
    p.h_scatter = 0;
    p.v_scatter = 0;
    p.velocity = [0, 0];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "Cachoeira";
    p = Particle_Setting.new();
    p.power = [8, 2];
    p.speed = 16;
    p.intensity = 255;
    p.burnout = 10;
    p.h_scatter = 5;
    p.v_scatter = 0;
    p.velocity = [0, 1];
    p.acceleration = [0, 0];
    p.angle_change = 0;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "Circulos";
    p = Particle_Setting.new();
    p.power = [5, 10];
    p.speed = 50;
    p.intensity = 255;
    p.burnout = 5;
    p.h_scatter = 3;
    p.v_scatter = 2;
    p.velocity = [0, -1];
    p.acceleration = [0, 0];
    p.angle_change = 6;
    p.achange_delta = 0;
    p.move_type = 0;
    p.lock = false;
    rb.idxSet(this._particle_settings, id, rb.clone(p));
    id = "Neve";
    p = Particle_Setting.new();
    p.power = [5, 10];
    p.speed = 50;
    p.intensity = 255;
    p.burnout = 2;
    p.h_scatter = 8;
    p.v_scatter = 0;
    p.velocity = [0, 0.5];
    p.acceleration = [0, 0];
    p.angle_change = 5;
    p.achange_delta = 0;
    p.move_type = 0;
    p.zoom_start = [70, 70];
    p.zoom_starts = [0, 0];
    p.zoom_change = [0, 0];
    p.lock = false;
    return rb.idxSet(this._particle_settings, id, rb.clone(p));
    //------------------------------------------------------------------------
    //                  Coloque novos efeitos abaixo
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------
    //                 Fim da Configuração dos Efeitos
    //------------------------------------------------------------------------
  }
  //--------------------------------------------------------------------------
  //* class Combat_Effect_Setting - Efeitos De Batalha
  //--------------------------------------------------------------------------
  // * Variaveis de Instancia Publicas
  //--------------------------------------------------------------------------
  //attr_accessor   :particle
  //attr_accessor   :blend
  //attr_accessor   :setting
  //attr_accessor   :duration
  //attr_accessor   :offset
  //--------------------------------------------------------------------------
  // * Declarações de Partículas
  //--------------------------------------------------------------------------
  battle_effect_settings() {
    let id, ces;
    this._combat_settings = rb.hash([]);
    id = 1;
    ces = Combat_Effect_Setting.new();
    ces.particle = "fireball";
    ces.blend = 1;
    ces.setting = "ExplosãoMedia";
    ces.duration = 24;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 2;
    ces = Combat_Effect_Setting.new();
    ces.particle = "energy-ball-white";
    ces.blend = 1;
    ces.setting = "Fumaça";
    ces.duration = 35;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 3;
    ces = Combat_Effect_Setting.new();
    ces.particle = "fireball";
    ces.blend = 1;
    ces.setting = "FogoMedio";
    ces.duration = 120;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 4;
    ces = Combat_Effect_Setting.new();
    ces.particle = "energy-ball-white";
    ces.blend = 1;
    ces.setting = "FumaçaPequena";
    ces.duration = 160;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 5;
    ces = Combat_Effect_Setting.new();
    ces.particle = "thunder1-add";
    ces.blend = 1;
    ces.setting = "FlutuarEsquerda2x";
    ces.duration = 42;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 6;
    ces = Combat_Effect_Setting.new();
    ces.particle = "thunder2-add";
    ces.blend = 1;
    ces.setting = "FlutuarDireita2x";
    ces.duration = 42;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 7;
    ces = Combat_Effect_Setting.new();
    ces.particle = "bolt1-add";
    ces.blend = 1;
    ces.setting = "FadeEstatico2x";
    ces.duration = 42;
    ces.offset = [0, 0];
    rb.idxSet(this._combat_settings, id, rb.clone(ces));
    id = 8;
    ces = Combat_Effect_Setting.new();
    ces.particle = "bolt2-add";
    ces.blend = 1;
    ces.setting = "FadeEstatico2x";
    ces.duration = 42;
    ces.offset = [0, 0];
    return rb.idxSet(this._combat_settings, id, rb.clone(ces));
  }
});
//--------------------------------------------------------------------------
//                  Fim da Configuração de Partículas
//--------------------------------------------------------------------------
