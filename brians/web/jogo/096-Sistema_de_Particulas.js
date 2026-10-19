// 096 - Sistema de Particulas: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Sistema de Partículas VX
//------------------------------------------------------------------------------
// Autor: Andrew McKellar (Anaryu) (anmckell@gmail.com)
// Versão: 1.2
//
// Versão 2.0
// - Tradução para PT-Br por Kbça
// - Modificação da Pasta por Kbça
// - Modificação: ID Reader
// - Novos efeitos por Kbça
// - Tutorial completo por Kbça
//
// Todas as partículas serão carregadas da pasta Particles.
// Por favor, dê créditos se usar este script.
//==============================================================================
//------------------------------------------------------------------------------
//        Adiciona o Carregamento das Particulas
//            filename : nome do arquivo
//
// Para mudar a pasta aonde as particulas são armazenadas
//   Altere "Graphics/Particles/" para o local desejado
//------------------------------------------------------------------------------
rb.singleton(Cache, {
  async particle(filename) {
    return await this.load_bitmap("Graphics/Particles/", filename);
  },
});
//------------------------------------------------------------------------------
//                      Modificação: ID Reader
//    Permite que o Sistema de Particulas tenha acesso ao ID do Evento
//------------------------------------------------------------------------------
rb.reabrir(Game_Interpreter, class extends rb.superDe(Game_Interpreter) {
  get original_event_id() { return this._original_event_id; }
});
//------------------------------------------------------------------------------
//==============================================================================
// ** Configuração das Particulas
//------------------------------------------------------------------------------
//  Instancia das configurações de particulas
//==============================================================================
//--------------------------------------------------------------------------
// * Variaveis de Instancia Publicas
//--------------------------------------------------------------------------
// [Speed] É a quantia de tempo (em frames)
// [Power] Quantia de particulas por [speed]
// Então [Power] 2 e [Speed] 3 significa 2 particulas em 3 frames
globalThis.Particle_Setting = rb.classe("Particle_Setting", class Particle_Setting extends rb.Objeto {
  get power() { return this._power; }
  set power(v) { this._power = v; }
  get speed() { return this._speed; }
  set speed(v) { this._speed = v; }
  // [Intensity] é a opacidade inicial e
  // [burnout] é quanto a particula muda sua opacidade
  // é considerado "feito" quando a opacidade é maior que 255 ou menor que 1
  get intensity() { return this._intensity; }
  set intensity(v) { this._intensity = v; }
  get burnout() { return this._burnout; }
  set burnout(v) { this._burnout = v; }
  // H e V scatter são a quantia randomica da localização inicial da particula
  //(horizontal e vertical) pode ter, então um [h_scatter] 10 e um [v_scatter] 0
  // significa que irá criar todas as particulas na mesma localização inicial Y,
  // mas com uma diferença randomica de 10 pixels na sua localização inicial X,
  // em ambas direções (direita e esquerda)
  get h_scatter() { return this._h_scatter; }
  set h_scatter(v) { this._h_scatter = v; }
  get v_scatter() { return this._v_scatter; }
  set v_scatter(v) { this._v_scatter = v; }
  // [Velocity] é o quão rapido ela mudará em cada direção
  // [acceleration] é o quanto a velocidade [velocity] altera em cada direção
  get velocity() { return this._velocity; }
  set velocity(v) { this._velocity = v; }
  get acceleration() { return this._acceleration; }
  set acceleration(v) { this._acceleration = v; }
  // [Angle_change] É o quanto o angulo muda em cada frame
  // [achange_delta] É o quanto essa mudança de angulo poderá ocorrer em cada frame
  get angle_change() { return this._angle_change; }
  set angle_change(v) { this._angle_change = v; }
  get achange_delta() { return this._achange_delta; }
  set achange_delta(v) { this._achange_delta = v; }
  // [zoom_start] É o valor inicial de zoom para a sprite [x,y]
  // [zoom_starts] É quando a transição de zoom irá iniciar (frame) [x,y]
  // [zoom_change] É o quanto o zoom mudará [x,y]
  get zoom_start() { return this._zoom_start; }
  set zoom_start(v) { this._zoom_start = v; }
  get zoom_starts() { return this._zoom_starts; }
  set zoom_starts(v) { this._zoom_starts = v; }
  get zoom_change() { return this._zoom_change; }
  set zoom_change(v) { this._zoom_change = v; }
  // [Move_type] Decide o tipo de movimento da particula
  // 0: Movimento Linear (em linha)
  // 1: Movimento Circular [x,y] X e Y em radianos
  // 2: Explodir\Sumir, depende da velocidade ser positiva ou negativa
  // 3: Circular em X, linear em Y
  // 4: Circular em Y, linear em X
  get move_type() { return this._move_type; }
  set move_type(v) { this._move_type = v; }
  // [Lock] Decide se a particula ficará sobre seu alvo ou mudará aonde iniciou
  get lock() { return this._lock; }
  set lock(v) { this._lock = v; }
  // [wAmp], [wLength], [wSpeed] e [wPhase] são os valores para os
  // atributos de onda (Leia o Documento do VX abaixo de Sprite para detalhes)
  get wamp() { return this._wamp; }
  set wamp(v) { this._wamp = v; }
  get wlength() { return this._wlength; }
  set wlength(v) { this._wlength = v; }
  get wspeed() { return this._wspeed; }
  set wspeed(v) { this._wspeed = v; }
  get wphase() { return this._wphase; }
  set wphase(v) { this._wphase = v; }
  // [Animation_Frames] se configurado irá criar uma particula animada,
  // a qual irá entrar em loop enquanto a imagem assumir
  // seu comprimento / [animation_frames]
  // irá produzir o exato numero de frames e irá ficar em loop nesses
  // respectivos frames, [Animation_Speed] É a pausa entre cada frame
  get animation_frames() { return this._animation_frames; }
  set animation_frames(v) { this._animation_frames = v; }
  get animation_speed() { return this._animation_speed; }
  set animation_speed(v) { this._animation_speed = v; }
  // O frame inicial da particula, se configurado para -1 irá ser randomico,
  // se configurado depois da limitação padrão, ele será o primeiro.
  get animation_start_frame() { return this._animation_start_frame; }
  set animation_start_frame(v) { this._animation_start_frame = v; }
});
//==============================================================================
//         Inicio do Script, não nescessita de tradução
//        (qualquer duvida pergunte no tópico do sistema)
//==============================================================================
//==============================================================================
// ** Particle
//------------------------------------------------------------------------------
//  A Particle is the actual particle itself.
//==============================================================================
//--------------------------------------------------------------------------
// * Public Instance Variables
//--------------------------------------------------------------------------
globalThis.Combat_Effect_Setting = rb.classe("Combat_Effect_Setting", class Combat_Effect_Setting extends rb.Objeto {
  get particle() { return this._particle; }
  set particle(v) { this._particle = v; }
  get blend() { return this._blend; }
  set blend(v) { this._blend = v; }
  get setting() { return this._setting; }
  set setting(v) { this._setting = v; }
  get duration() { return this._duration; }
  set duration(v) { this._duration = v; }
  get offset() { return this._offset; }
  set offset(v) { this._offset = v; }
});
//==============================================================================
// ** Game_Character
//------------------------------------------------------------------------------
//  This class deals with characters. It's used as a superclass of the
// Game_Player and Game_Event classes.
//==============================================================================
//--------------------------------------------------------------------------
// * Get X for Particle Engine System
//--------------------------------------------------------------------------
rb.reabrir(Game_Character, class extends rb.superDe(Game_Character) {
  get_pe_x() {
    return this._real_x;
  }
  //--------------------------------------------------------------------------
  // * Get Y for Particle Engine System
  //--------------------------------------------------------------------------
  get_pe_y() {
    return this._real_y;
  }
});
//==============================================================================
// ** Game_Event
//------------------------------------------------------------------------------
//  This class deals with events. It handles functions including event page
// switching via condition determinants, and running parallel process events.
// It's used within the Game_Map class.
//==============================================================================
//--------------------------------------------------------------------------
// * Public Instance Variables
//--------------------------------------------------------------------------
rb.reabrir(Game_Event, class extends rb.superDe(Game_Event) {
  get particles() { return this._particles; }
});
//--------------------------------------------------------------------------
// * Object Initialization
//     map_id : map ID
//     event  : event (RPG::Event)
//--------------------------------------------------------------------------
rb.alias(Game_Event, "pre_pe_initialize", "initialize");
rb.reabrir(Game_Event, class extends rb.superDe(Game_Event) {
  async initialize(map_id, event) {
    // Generate particle variables
    this._particles = [];
    this._particles_created = false;
    // Normal init
    await this.pre_pe_initialize(map_id, event);
  }
  //--------------------------------------------------------------------------
  // * Create Particles
  //--------------------------------------------------------------------------
  create_particles() {
    let item, id, particle_settings, ps, particle;
    // Check to see if we have particles
    if (rb.include_p(this._event.name, "PART") && !(this._particles_created)) {
      // Add effects found in the event codes
      if ((this.list != null)) {
        for (item of this.list) {
          if ((item.code === 108) && rb.include_p(rb.idx(item.parameters, 0), "PARTICLE=")) {
            id = rb.split(rb.idx(item.parameters, 0), "=");
            particle_settings = rb.to_s(rb.idx(id, 1));
            ps = rb.split(particle_settings, ",");
            if ((rb.size(ps) === 3)) {
              particle = $scene.ap(rb.to_s(rb.idx(ps, 0)), this, rb.to_i(rb.idx(ps, 1)), -1, rb.to_s(rb.idx(ps, 2)));
              rb.push(this._particles, particle);
            } else if ((rb.size(ps) === 5)) {
              particle = $scene.ap(rb.to_s(rb.idx(ps, 0)), this, rb.to_i(rb.idx(ps, 1)), -1, rb.to_s(rb.idx(ps, 2)), [rb.to_i(rb.idx(ps, 3)), rb.to_i(rb.idx(ps, 4))]);
              rb.push(this._particles, particle);
            }
          }
        }
      }
    }
    return this._particles_created = true;
  }
});
//--------------------------------------------------------------------------
// * Clear Starting Flag
//--------------------------------------------------------------------------
rb.alias(Game_Event, "pre_pe_clear_starting", "clear_starting");
rb.reabrir(Game_Event, class extends rb.superDe(Game_Event) {
  clear_starting() {
    let i;
    this.pre_pe_clear_starting();
    // Also clear particle flags and clear all particles
    for (i of rb.range(0, rb.size(this._particles), true)) {
      rb.idx(this._particles, i).dispose();
      rb.idxSet(this._particles, i, null);
    }
    rb.delete(this._particles, null);
    return this._particles_created = false;
  }
  //--------------------------------------------------------------------------
  // * Clear Starting Flag
  //--------------------------------------------------------------------------
  clear_particles() {
    let i;
    if ((this._particles == null)) {
      this._particles = [];
    }
    // Also clear particle flags and clear all particles
    for (i of rb.range(0, rb.size(this._particles), true)) {
      rb.idx(this._particles, i).dispose();
      rb.idxSet(this._particles, i, null);
    }
    rb.delete(this._particles, null);
    return this._particles_created = false;
  }
});
//==============================================================================
// ** Game_Player
//------------------------------------------------------------------------------
//  This class handles maps. It includes event starting determinants and map
// scrolling functions. The instance of this class is referenced by $game_map.
//==============================================================================
//--------------------------------------------------------------------------
// * Execute Player Transfer
//--------------------------------------------------------------------------
rb.alias(Game_Player, "pre_pe_perform_transfer", "perform_transfer");
rb.reabrir(Game_Player, class extends rb.superDe(Game_Player) {
  async perform_transfer() {
    let event;
    // Perform normal transfer
    await this.pre_pe_perform_transfer();
    // If we're staying on the same map, remake the particles
    if (rb.eq($game_map.map_id, this._new_map_id)) {
      for (event of rb.values($game_map.events)) {
        event.clear_particles();
      }
    }
  }
});
//==============================================================================
// ** Game_System
//------------------------------------------------------------------------------
//  This class handles data surrounding the system. Backround music, etc.
//  is managed here as well. Refer to "$game_system" for the instance of
//  this class.
//==============================================================================
rb.reabrir(Game_System, class extends rb.superDe(Game_System) {
  get particle_level() { return this._particle_level; }
  set particle_level(v) { this._particle_level = v; }
  get particle_settings() { return this._particle_settings; }
  set particle_settings(v) { this._particle_settings = v; }
  get combat_settings() { return this._combat_settings; }
  set combat_settings(v) { this._combat_settings = v; }
});
rb.alias(Game_System, "pre_pe_initialize", "initialize");
rb.reabrir(Game_System, class extends rb.superDe(Game_System) {
  initialize() {
    // Run original initialize
    this.pre_pe_initialize();
    // Set new values
    this._particle_level = 100;
    this._particle_settings = rb.hash([]);
    this._combat_settings = rb.hash([]);
    this.battle_effect_settings();
  }
});
//==============================================================================
// ** Interpreter
//------------------------------------------------------------------------------
//  This interpreter runs event commands. This class is used within the
//  Game_System class and the Game_Event class.
//==============================================================================
rb.reabrir(Game_Interpreter, class extends rb.superDe(Game_Interpreter) {
  get effects() { return this._effects; }
  set effects(v) { this._effects = v; }
});
//--------------------------------------------------------------------------
// * Object Initialization
//--------------------------------------------------------------------------
rb.alias(Game_Interpreter, "pre_pe_initialize", "initialize");
rb.reabrir(Game_Interpreter, class extends rb.superDe(Game_Interpreter) {
  async initialize(depth = 0, main = false) {
    this._effects = [];
    await this.pre_pe_initialize(depth, main);
  }
  // fora do escopo (nada do jogo chama): add_effect, dispose_effect
});
//--------------------------------------------------------------------------
// * Add Effect
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// * Dispose Effect
//--------------------------------------------------------------------------
//==============================================================================
// ** Particle_Effect
//------------------------------------------------------------------------------
//  A Particle_Effect will generate particles based on it's settings.
//==============================================================================
//--------------------------------------------------------------------------
// * Execute Screen Switch
//--------------------------------------------------------------------------
rb.alias(Scene_Map, "pre_pe_update_scene_change", "update_scene_change");
rb.reabrir(Scene_Map, class extends rb.superDe(Scene_Map) {
  async update_scene_change() {
    let clear, event;
    // Set clear flag
    clear = (($game_temp.next_scene != null));
    // Run normal function
    await this.pre_pe_update_scene_change();
    // Clear particles as the scene has changed
    if (clear) {
      for (event of rb.values($game_map.events)) {
        event.clear_particles();
      }
    }
  }
  //--------------------------------------------------------------------------
  // * Add Particle Effect
  //--------------------------------------------------------------------------
  ap(name, target, blend, duration, setting, offset = [0, 0]) {
    let s;
    s = rb.idx($game_system.particle_settings, setting);
    if (this.target_p(target)) {
      return this._spriteset.ap(name, target, blend, duration, s, rb.clone(offset));
    } else {
      return this._spriteset.ap(name, rb.clone(target), blend, duration, s, rb.clone(offset));
    }
  }
});
//--------------------------------------------------------------------------
// * Frame Update
//--------------------------------------------------------------------------
rb.alias(Scene_Map, "pre_pe_update", "update");
rb.reabrir(Scene_Map, class extends rb.superDe(Scene_Map) {
  async update() {
    let event;
    // Run normal update
    await this.pre_pe_update();
    // Update particles
    if (rb.is_a_p($scene, Scene_Map)) {
      for (event of rb.values($game_map.events)) {
        event.create_particles();
      }
    }
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  async add_particle(target, name, blend, setting, offset, v = null, a = null) {
    return await this._spriteset.add_particle(target, name, blend, setting, offset, v, a);
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  target_p(t) {
    if (rb.is_a_p(t, Game_Character)) {
      return true;
    }
    if (rb.is_a_p(t, Sprite_Battler)) {
      return true;
    }
    return false;
  }
});
//==============================================================================
// ** Scene_Battle
//------------------------------------------------------------------------------
//  This class performs battle screen processing.
//==============================================================================
//--------------------------------------------------------------------------
// * Start processing
//--------------------------------------------------------------------------
rb.alias(Scene_Battle, "pre_pe_start", "start");
rb.reabrir(Scene_Battle, class extends rb.superDe(Scene_Battle) {
  // fora do escopo (nada do jogo chama): start, ap, add_particle, target?
});
//--------------------------------------------------------------------------
// * Add Particle Effect
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// * Add Particle
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// * Add Particle
//--------------------------------------------------------------------------
//==============================================================================
// ** Sprite_Base
//------------------------------------------------------------------------------
//  A sprite class with animation display processing added.
//==============================================================================
//--------------------------------------------------------------------------
// * SE and Flash Timing Processing
//     timing : timing data (RPG::Animation::Timing)
//--------------------------------------------------------------------------
rb.alias(Sprite_Base, "pre_pe_animation_process_timing", "animation_process_timing");
rb.reabrir(Sprite_Base, class extends rb.superDe(Sprite_Base) {
  animation_process_timing(timing) {
    let c, e, offset;
    c = timing.flash_color;
    if ((c.alpha === 0) && (c.red === 1)) {
      e = rb.idx($game_system.combat_settings, timing.flash_duration);
      if (rb.is_a_p($scene, Scene_Battle)) {
        offset = [rb.idx(e.offset, 0), rb.idx(e.offset, 1)];
        rb.idxSet(offset, 0, (rb.idx(offset, 0) + c.green));
        rb.idxSet(offset, 1, (rb.idx(offset, 1) + c.blue));
        return $scene.ap(e.particle, this, e.blend, e.duration, e.setting, offset);
      }
    } else {
      return this.pre_pe_animation_process_timing(timing);
    }
  }
  //--------------------------------------------------------------------------
  // * Get X for Particle Engine System
  //--------------------------------------------------------------------------
  get_pe_x() {
    return ((this._battler.screen_x * 8));
  }
  //--------------------------------------------------------------------------
  // * Get Y for Particle Engine System
  //--------------------------------------------------------------------------
  get_pe_y() {
    return ((((this._battler.screen_y * 8)) - ((this._height * 4))));
  }
});
//==============================================================================
// ** Spriteset
//------------------------------------------------------------------------------
//  A Particle_Effect will generate particles based on it's settings.
//==============================================================================
//--------------------------------------------------------------------------
// * Public Instance Variables
//--------------------------------------------------------------------------
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  get particles() { return this._particles; }
  get effects() { return this._effects; }
});
//--------------------------------------------------------------------------
// * Initialization
//--------------------------------------------------------------------------
rb.alias(Spriteset_Map, "pre_pe_initialize", "initialize");
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  async initialize() {
    this._frame = 0;
    this._particles = [];
    this._effects = [];
    if (($game_system.particle_settings == null)) {
      $game_system.particle_settings = rb.hash([]);
    }
    $game_system.create_particle_settings();
    await this.pre_pe_initialize();
  }
});
//--------------------------------------------------------------------------
// * Dispose
//--------------------------------------------------------------------------
rb.alias(Spriteset_Map, "pre_pe_dispose", "dispose");
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  dispose() {
    let particle;
    for (particle of this._particles) {
      particle.dispose();
    }
    return this.pre_pe_dispose();
  }
});
//--------------------------------------------------------------------------
// * Frame Update
//--------------------------------------------------------------------------
rb.alias(Spriteset_Map, "pre_pe_update", "update");
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  async update() {
    let i, dispose;
    // Set the particle level if it's nil to 100 (full amount)
    if (($game_system.particle_level == null)) {
      $game_system.particle_level = 100;
    }
    // Go through and update effects
    for (i of rb.range(0, rb.size(this._effects), true)) {
      // Update only if on_screen (or close)
      if (rb.v(this.on_screen(rb.idx(this._effects, i)))) {
        await rb.idx(this._effects, i).update();
      }
      // Nil it if it's time to dispose it
      if (rb.idx(this._effects, i).dispose_p()) {
        rb.idxSet(this._effects, i, null);
      }
    }
    // Delete those disposed effects
    rb.delete(this._effects, null);
    // Updated particles
    for (i of rb.range(0, rb.size(this._particles), true)) {
      // Update
      await rb.idx(this._particles, i).update();
      // Check if disposed
      dispose = rb.idx(this._particles, i).dispose_p();
      // If disposed dispose and nil it
      if (dispose) {
        rb.idx(this._particles, i).dispose();
      }
      if (dispose) {
        rb.idxSet(this._particles, i, null);
      }
    }
    // Delete disposed particles
    rb.delete(this._particles, null);
    // Run standard update
    return await this.pre_pe_update();
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  ap(name, target, blend, duration, setting, offset = [0, 0]) {
    let s, t, effect;
    s = rb.idx($game_system.particle_settings, setting);
    t = target;
    if (!(this.target_p(target))) {
      t = rb.clone(target);
    }
    effect = Particle_Effect.new(name, target, blend, duration, setting, rb.clone(offset));
    rb.push(this._effects, effect);
    return effect;
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  async add_particle(target, name, blend, setting, offset, v = null, a = null) {
    let particle;
    particle = (await Particle.new(this._viewport1, target, name, blend, setting, offset, v, a));
    return rb.push(this._particles, particle);
  }
  //--------------------------------------------------------------------------
  // * On Screen
  //--------------------------------------------------------------------------
  on_screen(effect) {
    let x, y, x_range, y_range;
    x = rb.idx(effect.origin, 0);
    y = rb.idx(effect.origin, 1);
    x_range = ((((x <= (($game_map.display_x + 4352)))) && ((x >= (($game_map.display_x - 512))))));
    y_range = ((((y <= (($game_map.display_y + 3072)))) && ((y >= (($game_map.display_y - 512))))));
    if (x_range && y_range) {
      return true;
    }
    return false;
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  target_p(t) {
    if (rb.is_a_p(t, Game_Character)) {
      return true;
    }
    if (rb.is_a_p(t, Sprite_Battler)) {
      return true;
    }
    return false;
  }
});
//==============================================================================
// ** Spriteset
//------------------------------------------------------------------------------
//  A Particle_Effect will generate particles based on it's settings.
//==============================================================================
// classe Spriteset_Battle: fora do escopo (o jogo não usa; README.md)
//==============================================================================
// ** Particle_Effect
//------------------------------------------------------------------------------
//  A Particle_Effect will generate particles based on it's settings.
//==============================================================================
//--------------------------------------------------------------------------
// * Public Instance Variables
//--------------------------------------------------------------------------
globalThis.Particle_Effect = rb.classe("Particle_Effect", class Particle_Effect extends rb.Objeto {
  get origin() { return this._origin; }
  set origin(v) { this._origin = v; } // starting location in realx/realy location
  get target() { return this._target; }
  set target(v) { this._target = v; } // game character or starting [x,y] origin
  get power() { return this._power; } // higher power means more particles per tick
  get speed() { return this._speed; } // higher speed means faster particle generation
  get blend() { return this._blend; } // blend type 0 = normal, 1 = add, 2 = subtract
  get velocity() { return this._velocity; } // initial speed [x,y]
  get acceleration() { return this._acceleration; } // amount to change speed [x,y]
  get duration() { return this._duration; } // length of frames to produce particles
  get h_scatter() { return this._h_scatter; } // magnitude of random horizontal offsets
  get v_scatter() { return this._v_scatter; } // magnitude of random vertical offsets
  get particle() { return this._particle; } // name of the picture file to use
  get lock() { return this._lock; } // locked on target or not?
  get offset() { return this._offset; } // [x,y] offset
  get disposed() { return this._disposed; }
  set disposed(v) { this._disposed = v; } // should this be disposed of now?
  get frame() { return this._frame; } // frames, starts at zero and increases over time
  //--------------------------------------------------------------------------
  // * Object Initialization
  //--------------------------------------------------------------------------
  initialize(name, target, blend, duration, setting, offset) {
    // Assign starting values
    if (this.target_p(target)) {
      this._origin = [target.get_pe_x(), target.get_pe_y()];
      this._target = target;
    } else {
      this._origin = [rb.idx(target, 0), rb.idx(target, 1)];
      this._target = rb.clone(target);
    }
    this._name = name;
    this._setting = setting;
    this._blend = blend;
    this._duration = duration;
    this._particle = name;
    this._offset = offset;
    this._frames = 0;
    this._powered = 0;
    this._disposed = false;
  }
  //--------------------------------------------------------------------------
  // * Frame Update
  //--------------------------------------------------------------------------
  async update() {
    let gen_frame, powed, rand, i, x_rand, y_rand, neg1, neg2, offset, x_mod, y_mod, v, a;
    // Add new particles if necessary
    gen_frame = ((rb.mod(this._frames, this._setting.speed) === 0));
    powed = (((rb.idx(this._powered, 1) === 0) || (((rb.idx(this._powered, 0) > 0) && (rb.mod(this._frames, rb.idx(this._powered, 1)) === 0)))));
    // Check if the level of particles set will allow us to generate or not
    rand = ($game_system.particle_level > rb.rand(100));
    // Use the checks to determine if we should generate a particle right now
    if (((gen_frame || powed)) && rand) {
      // If we're going to generate more than one per tick, do it!
      ((rb.idx(this._setting.power, 1) === 0) ? this._repeat = rb.idx(this._setting.power, 0) : this._repeat = 1);
      for (i of rb.range(0, this._repeat, true)) {
        // Set the powered value
        if ((rb.idx(this._powered, 0) <= 0)) {
          this._powered = rb.clone(this._setting.power);
        }
        // Generate scattered start points
        x_rand = rb.rand((this._setting.h_scatter + 1));
        y_rand = rb.rand((this._setting.v_scatter + 1));
        // Scatter in all directions, not just one
        neg1 = rb.rand(2);
        if ((neg1 === 1)) {
          x_rand *= -1;
        }
        neg2 = rb.rand(2);
        if ((neg2 === 1)) {
          y_rand *= -1;
        }
        // Apply the scatter values
        offset = [rb.add(rb.idx(this._offset, 0), x_rand), rb.add(rb.idx(this._offset, 1), y_rand)];
        // Set the particles starting conditions based on move_type
        const caso1 = this._setting.move_type;
        if (caso1 === 0 || caso1 === 1 || caso1 === 3 || caso1 === 4) {
          // Create the particles with the offset
          offset = [rb.add(rb.idx(this._offset, 0), x_rand), rb.add(rb.idx(this._offset, 1), y_rand)];
          await $scene.add_particle(this._target, this._name, this._blend, this._setting, offset);
        } else if (caso1 === 2) {
          // Get a scatter value
          x_mod = ((rb.abs(x_rand) * 1.0) / ((this._setting.h_scatter + 1)));
          y_mod = ((rb.abs(y_rand) * 1.0) / ((this._setting.v_scatter + 1)));
          // Clone our velocity and accelerate to accomodate random start place
          // but identical ending location
          v = [(rb.idx(this._setting.velocity, 0) * x_mod), (rb.idx(this._setting.velocity, 1) * y_mod)];
          a = [(rb.idx(this._setting.acceleration, 0) * x_mod), (rb.idx(this._setting.acceleration, 1) * y_mod)];
          // Invert values if necessary
          if ((neg1 === 1)) {
            v = [(rb.idx(v, 0) * -1.0), rb.idx(v, 1)];
            a = [(rb.idx(a, 0) * -1.0), rb.idx(a, 1)];
          }
          if ((neg2 === 1)) {
            v = [rb.idx(v, 0), (rb.idx(v, 1) * -1.0)];
            a = [rb.idx(a, 0), (rb.idx(a, 1) * -1.0)];
          }
          // Fix origin to accomodate moving characters
          if (this.target_p(this.target)) {
            this._origin = [this.target.get_pe_x(), this.target.get_pe_y()];
          }
          // Add the particle
          await $scene.add_particle(this._target, this._name, this._blend, this._setting, offset, v, a);
        }
        // Reduced our powered value
        rb.idxSet(this._powered, 0, (rb.idx(this._powered, 0) - 1));
      }
    }
    // Increase frame
    return this._frames += 1;
  }
  //--------------------------------------------------------------------------
  // * Frame Update
  //--------------------------------------------------------------------------
  dispose_p() {
    // Return true if we're set to be disposed
    if (this._disposed) {
      return true;
    }
    // Return false immediately if our duration is 01
    if ((this._duration === -1)) {
      return false;
    }
    // Return true if our frames are at or past duration
    if ((this._frames > this._duration)) {
      return true;
    }
    // Default false
    return false;
  }
  //--------------------------------------------------------------------------
  // * Frame Update
  //--------------------------------------------------------------------------
  dispose() {
    return this._disposed = true;
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  target_p(t) {
    if (rb.is_a_p(t, Game_Character)) {
      return true;
    }
    if (rb.is_a_p(t, Sprite_Battler)) {
      return true;
    }
    return false;
  }
});
//==============================================================================
// ** Particle
//------------------------------------------------------------------------------
//  A Particle is the actual particle itself.
//==============================================================================
//--------------------------------------------------------------------------
// * Public Instance Variables
//--------------------------------------------------------------------------
globalThis.Particle = rb.classe("Particle", class Particle extends Sprite {
  get target() { return this._target; } // game character or starting [x,y] origin
  get velocity() { return this._velocity; } // initial speed [x,y]
  get acceleration() { return this._acceleration; } // amount to change speed [x,y]
  get duration() { return this._duration; } // length of frames to produce particles
  get particle() { return this._particle; } // name of the picture file to use
  get offset() { return this._offset; } // [x,y] offset
  get opacity() { return this._opacity; } // current opacity
  get achange() { return this._achange; } // angle change
  get opacity() { return this._opacity; } // current opacity
  get setting() { return this._setting; } // the particle settings to use
  //--------------------------------------------------------------------------
  // * Object Initialization
  //--------------------------------------------------------------------------
  async initialize(viewport, target, name, blend, setting, offset = [0, 0], v = null, a = null) {
    super.initialize(viewport);
    this.bitmap = (await Cache.particle(name));
    // Set the setting variable
    this._s = setting;
    // Set x/y based on target
    this._target = target;
    this._offset = rb.clone(offset);
    // Set wave and angle defaults
    if ((this._s.wamp != null)) {
      this.wave_amp = this._s.wamp;
    }
    if ((this._s.wlength != null)) {
      this.wave_length = this._s.wlength;
    }
    if ((this._s.wspeed != null)) {
      this.wave_speed = this._s.wspeed;
    }
    if ((this._s.wphase != null)) {
      this.wave_phase = this._s.wphase;
    }
    this._angle = this.angle;
    // Set the angle values
    this._achange = this._s.angle_change;
    // Set starting point based on target type (character vs. array)
    if (this.target_p(this._target)) {
      this.x = rb.add((rb.div(this._target.get_pe_x(), 8)), rb.idx(this._offset, 0));
      this.y = rb.add((rb.div(this._target.get_pe_y(), 8)), rb.idx(this._offset, 1));
      this._origin = [rb.add((rb.div(this._target.get_pe_x(), 8)), rb.idx(this._offset, 0)), rb.add((rb.div(this._target.get_pe_y(), 8)), rb.idx(this._offset, 1))];
    } else {
      this.x = rb.add(rb.idx(this._target, 0), rb.idx(this._offset, 0));
      this.y = rb.add(rb.idx(this._target, 1), rb.idx(this._offset, 1));
      this._origin = [rb.add(rb.idx(this._target, 0), rb.idx(this._offset, 0)), rb.add(rb.idx(this._target, 1), rb.idx(this._offset, 1))];
    }
    // Set zoome values if they're there
    if ((this._s.zoom_start != null)) {
      this._zoom = [((rb.idx(this._s.zoom_start, 0) / 100.0)), ((rb.idx(this._s.zoom_start, 1) / 100.0))];
      this.zoom_x = rb.idx(this._zoom, 0);
      this.zoom_y = rb.idx(this._zoom, 1);
    }
    // Set width and height for animation
    this._width = this.bitmap.width;
    if (this.animated_p()) {
      this._width = rb.div(this.bitmap.width, this._s.animation_frames);
    }
    this._height = this.bitmap.height;
    // Offset x/y based on our sprite size
    this.ox = (rb.div(this._width, 2));
    this.oy = (rb.div(this._height, 2));
    // Set default extra x/y for tile offset
    this._x_extra = 0;
    this._y_extra = 0;
    // Set the extra offset if we're a special case type
    this.set_extra_offset();
    // Set blend type and other values
    this.blend_type = blend;
    this._opacity = this._s.intensity;
    this._velocity = rb.clone(this._s.velocity);
    this._acceleration = rb.clone(this._s.acceleration);
    if ((v != null)) {
      this._velocity = v;
    }
    if ((a != null)) {
      this._acceleration = a;
    }
    // Set internal variables
    this._delta = [0, 0];
    this._frame = 0;
    // Set pattern and animation variables
    if ((this._s.animation_start_frame != null)) {
      if ((this._s.animation_start_frame === -1)) {
        this._pattern = rb.rand(((this._s.animation_frames + 1)));
      } else {
        if ((this._s.animation_start_frame > this._s.animation_frames)) {
          this._pattern = 0;
        } else {
          this._pattern = this._s.animation_start_frame;
        }
      }
    }
    // Run first frame
    this.update();
    this.update_pattern();
  }
  //--------------------------------------------------------------------------
  // * Should I be disposed?
  //--------------------------------------------------------------------------
  dispose_p() {
    // We're dead if our opacity is zero
    return ((((this._opacity <= 0)) || ((this._opacity > 255))));
  }
  //--------------------------------------------------------------------------
  // * Should I be disposed?
  //--------------------------------------------------------------------------
  animated_p() {
    // We're dead if our opacity is zero
    return (((this._s.animation_frames != null) && (this._s.animation_frames > 0)));
  }
  //--------------------------------------------------------------------------
  // * Update Transfer Origin Rectangle
  //--------------------------------------------------------------------------
  update_pattern() {
    let sx, sy;
    if (this.animated_p()) {
      sx = rb.mul(this._pattern, this._width);
      sy = 0;
      return this.src_rect.set(sx, sy, this._width, this._height);
    }
  }
  //--------------------------------------------------------------------------
  // * Frame Update
  //--------------------------------------------------------------------------
  update() {
    let x_screen, y_screen;
    // Change angle
    this._achange = rb.add(this._achange, this._s.achange_delta);
    this._angle = rb.add(this._angle, this._achange);
    this.angle = this._angle;
    // Decay opacity
    this._opacity = rb.sub(this._opacity, this._s.burnout);
    this.opacity = this._opacity;
    // Update animation
    // working
    if (this.animated_p()) {
      if ((this._s.animation_speed > 0) && (rb.mod(this._frame, this._s.animation_speed) === 0)) {
        this._pattern = (rb.mod(((this._pattern + 1)), this._s.animation_frames));
        this.update_pattern();
      }
    }
    // Change velocity
    rb.idxSet(this._velocity, 0, rb.add(rb.idx(this._velocity, 0), rb.idx(this._acceleration, 0)));
    rb.idxSet(this._velocity, 1, rb.add(rb.idx(this._velocity, 1), rb.idx(this._acceleration, 1)));
    rb.idxSet(this._delta, 0, rb.add(rb.idx(this._delta, 0), rb.idx(this._velocity, 0)));
    rb.idxSet(this._delta, 1, rb.add(rb.idx(this._delta, 1), rb.idx(this._velocity, 1)));
    // Check zoom changes
    if ((this._s.zoom_starts != null)) {
      // Check each zoom starts frame to see if we start on that axis yet
      if ((rb.idx(this._s.zoom_starts, 0) <= this._frame)) {
        rb.idxSet(this._zoom, 0, (rb.idx(this._zoom, 0) + ((rb.idx(this._s.zoom_change, 0) / 100.0))));
      }
      if ((rb.idx(this._s.zoom_starts, 1) <= this._frame)) {
        rb.idxSet(this._zoom, 1, (rb.idx(this._zoom, 1) + ((rb.idx(this._s.zoom_change, 1) / 100.0))));
      }
      // Reset zoom values
      this.zoom_x = rb.idx(this._zoom, 0);
      this.zoom_y = rb.idx(this._zoom, 1);
    }
    // Set Z value
    if (rb.is_a_p(this._target, Game_Character)) {
      if ((this._target.priority_type != null) && (this._target.priority_type === 2)) {
        this.z = (this._target.screen_z() + 1000);
      } else {
        if ((this.y > ((this._target.screen_y - 64)))) {
          this.z = rb.add((this._target.screen_z() + 32), rb.idx(this._delta, 1));
        } else {
          this.z = rb.add((this._target.screen_z() - 16), rb.idx(this._delta, 1));
        }
      }
    } else if (rb.is_a_p(this._target, Sprite_Base)) {
      this.z = (this._target.z + 100);
    } else if (($game_player != null)) {
      if ((this.y > (($game_player.screen_y - 16)))) {
        this.z = rb.add(($game_player.screen_z() + 32), rb.idx(this._delta, 1));
      } else {
        this.z = rb.add(($game_player.screen_z() - 16), rb.idx(this._delta, 1));
      }
    }
    // Set Screen offsets
    x_screen = 0;
    y_screen = 0;
    if (($game_map != null)) {
      x_screen = rb.div($game_map.display_x, 8);
      y_screen = rb.div($game_map.display_y, 8);
    }
    // Set x/y location
    const caso2 = this._s.move_type;
    // Standard acceleration based vector movement
    if (caso2 === 0 || caso2 === 2) {
      if (this.target_p(this._target)) {
        if (rb.v(this._s.lock)) {
          this.x = rb.sub((rb.add(rb.add((rb.div(this._target.get_pe_x(), 8)), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = rb.sub((rb.add(rb.add((rb.div(this._target.get_pe_y(), 8)), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        } else {
          this.x = rb.sub((rb.add(rb.add(rb.idx(this._origin, 0), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = rb.sub((rb.add(rb.add(rb.idx(this._origin, 1), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        }
      } else {
        if (rb.v(this._s.lock)) {
          this.x = rb.sub((rb.add(rb.add(rb.idx(this._target, 0), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = rb.sub((rb.add(rb.add(rb.idx(this._target, 1), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        } else {
          this.x = rb.sub((rb.add(rb.add(rb.idx(this._origin, 0), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = rb.sub((rb.add(rb.add(rb.idx(this._origin, 1), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        }
      }
    // Circles around the target
    } else if (caso2 === 1) {
      if (this.target_p(this._target)) {
        if (rb.v(this._s.lock)) {
          this.x = (((((rb.div(this._target.get_pe_x(), 8)) + this._x_extra)) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = (((((rb.div(this._target.get_pe_y(), 8)) + this._y_extra)) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        } else {
          this.x = ((rb.idx(this._origin, 0) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = ((rb.idx(this._origin, 1) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        }
      } else {
        if (rb.v(this._s.lock)) {
          this.x = ((((rb.idx(this._target, 0) + this._x_extra)) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = ((((rb.idx(this._target, 1) + this._y_extra)) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        } else {
          this.x = ((rb.idx(this._origin, 0) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = ((rb.idx(this._origin, 1) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        }
      }
    // Circles around the X moves in Y
    } else if (caso2 === 3) {
      if (this.target_p(this._target)) {
        if (rb.v(this._s.lock)) {
          this.x = (((((rb.div(this._target.get_pe_x(), 8)) + this._x_extra)) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = rb.sub((rb.add(rb.add((rb.div(this._target.get_pe_y(), 8)), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        } else {
          this.x = ((rb.idx(this._origin, 0) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = rb.sub((rb.add(rb.add(rb.idx(this._origin, 1), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        }
      } else {
        if (rb.v(this._s.lock)) {
          this.x = ((((rb.idx(this._target, 0) + this._x_extra)) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = rb.sub((rb.add(rb.add(rb.idx(this._target, 1), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        } else {
          this.x = ((rb.idx(this._origin, 0) + (rb.idx(this._offset, 0) * rb.Math.cos(rb.mul(rb.idx(this._velocity, 0), this._frame)))) - x_screen);
          this.y = rb.sub((rb.add(rb.add(rb.idx(this._origin, 1), rb.idx(this._offset, 1)), rb.idx(this._delta, 1)) + this._y_extra), y_screen);
        }
      }
    // Circles around the Y and moves in X
    } else if (caso2 === 4) {
      if (this.target_p(this._target)) {
        if (rb.v(this._s.lock)) {
          this.x = rb.sub((rb.add(rb.add((rb.div(this._target.get_pe_x(), 8)), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = (((((rb.div(this._target.get_pe_y(), 8)) + this._y_extra)) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        } else {
          this.x = rb.sub((rb.add(rb.add(rb.idx(this._origin, 0), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = ((rb.idx(this._origin, 1) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        }
      } else {
        if (rb.v(this._s.lock)) {
          this.x = rb.sub((rb.add(rb.add(rb.idx(this._target, 0), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = ((((rb.idx(this._target, 1) + this._y_extra)) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        } else {
          this.x = rb.sub((rb.add(rb.add(rb.idx(this._origin, 0), rb.idx(this._offset, 0)), rb.idx(this._delta, 0)) + this._x_extra), x_screen);
          this.y = ((rb.idx(this._origin, 1) + (rb.idx(this._offset, 1) * rb.Math.sin(rb.mul(rb.idx(this._velocity, 1), this._frame)))) - y_screen);
        }
      }
    }
    // Increase frame count
    return this._frame += 1;
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  target_p(t) {
    if (rb.is_a_p(t, Game_Character)) {
      return true;
    }
    if (rb.is_a_p(t, Sprite_Battler)) {
      return true;
    }
    return false;
  }
  //--------------------------------------------------------------------------
  // * Add Particle
  //--------------------------------------------------------------------------
  set_extra_offset() {
    if (rb.is_a_p(this._target, Game_Character)) {
      this._x_extra = 16;
      return this._y_extra = 16;
    }
  }
});
