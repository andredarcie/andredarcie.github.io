// 095 - VX Fog System: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================#
// VX Fog System By VitorJ
//==============================================================================#
// Classes modificadas com esse Script:
// Game_Map, Spriteset_Map
//==============================================================================#
// Como usar:
// Aqui comandos que haviam no RPG Maker XP
// Todos os comandos devem ser usado no comando de evento "Chamar script".
// $game_map.start_fog_tone_change(tone, duration)
// tone é a tonalidade que deve ser Tone.new(r,g,b,s) (r=Vermelho,g=Verde,b=Azul,s=Saturação)
// pode ser usado valor negativo no Tone.new
// duration é o tempo que vai demorar para mudar a tonalidade em frames
//
// $game_map.start_fog_opacity_change(opacity,duration)
// opacity é a opacidade de 0 a 255 quanto maior mais visivel.
// duration é o tempo que vai demorar para mudar a opacidade em frames
//==============================================================================#
// Para mudar o nome da fog use:
// $game_map.fog_name = "nome"
// no lugar de nome coloque o nome da imagen que esta na pasta Graphics\System
//
// Para mudar a tonalidade instantaniamente use:
// $game_map.fog_hue = tone
// tone é a tonalidade que deve ser Tone.new(r,g,b,s) (r=Vermelho,g=Verde,b=Azul,s=Saturação)
// pode ser usado valor negativo no Tone.new
//
// Para mudar a opacidade instantaniamente use:
// $game_map.fog_opacity = opacity
// opacity é a opacidade de 0 a 255 quanto maior mais visivel.
//
// Para mudar a velocidade de movimento use:
// $game_map.fog_sx = velo # para horizontal
// $game_map.fog_sy = velo # para vertical
// velo é a velocidade de movimento, pode ser usado valo negativo, para mover
// na diagonal mude o valor dos 2
//
// Para mudar o zoom use:
// $game_map.fog_zoom = zoom
// coloque um zoom, 100 é o padrão 50 é a metade e 200 é o dobro e assim por diante
globalThis.FogVX = rb.modulo("FogVX");
FogVX.FOG_MAP = [5, 20]; // Mapas que já vão começar com FOG.
FogVX.FOG_NAME = ["001-Fog01", "001-Fog01"]; // Nome do fog, Na mesma ordem dos mapas.
FogVX.FOG_HUE = [Tone.new(0, 0, 0, 0), Tone.new(0, 0, 0, 0)]; // Tonalidade da fog
FogVX.FOG_OPA = [100, 100]; // Opacidade da fog
FogVX.FOG_BLEND = [1, 1]; // Sintencidade da fog (0 normal,1 multiplicar, 2 inverter)
FogVX.FOG_ZOOM = [150, 100]; // Zoom do fog.
FogVX.FOG_SX = [1, 3]; // Velocidade horizontal do fog.
FogVX.FOG_SY = [-1, 3]; // Velocidade vertical do fog.
//###########
// Game_Map #
//###########
rb.incluir(Game_Map, FogVX);
rb.reabrir(Game_Map, class extends rb.superDe(Game_Map) {
  get fog_name() { return this._fog_name; }
  set fog_name(v) { this._fog_name = v; } // nome do arquivo de Névoa
  get fog_hue() { return this._fog_hue; }
  set fog_hue(v) { this._fog_hue = v; } // cor da névoa
  get fog_opacity() { return this._fog_opacity; }
  set fog_opacity(v) { this._fog_opacity = v; } // nível de opacidade da Névoa
  get fog_blend_type() { return this._fog_blend_type; }
  set fog_blend_type(v) { this._fog_blend_type = v; } // método de combinação de Névoa
  get fog_zoom() { return this._fog_zoom; }
  set fog_zoom(v) { this._fog_zoom = v; } // magnitude de Névea
  get fog_sx() { return this._fog_sx; }
  set fog_sx(v) { this._fog_sx = v; } // sx de Névoa (velocidade x)
  get fog_sy() { return this._fog_sy; }
  set fog_sy(v) { this._fog_sy = v; } // sx de Névoa (velocidade y)
  get fog_ox() { return this._fog_ox; } // Início da coordenada x de Névoa
  get fog_oy() { return this._fog_oy; } // início da coordenada y de Névoa
  get fog_tone() { return this._fog_tone; } // cor da Névoa
});
rb.alias(Game_Map, "vx_fog_bvj_gmap_setup", "setup");
rb.reabrir(Game_Map, class extends rb.superDe(Game_Map) {
  async setup(map_id) {
    let i;
    this._fog_name = "";
    this._fog_hue = Tone.new(0, 0, 0, 0);
    this._fog_opacity = 0;
    this._fog_blend_type = 0;
    this._fog_zoom = 0;
    this._fog_sx = 0;
    this._fog_sy = 0;
    rb.num(this, "_fog_ox", 0, "int");
    rb.num(this, "_fog_oy", 0, "int");
    this._fog_tone = Tone.new(0, 0, 0, 0);
    this._fog_tone_target = Tone.new(0, 0, 0, 0);
    this._fog_tone_duration = 0;
    this._fog_opacity_duration = 0;
    rb.num(this, "_fog_opacity_target", 0, "int");
    for (i of rb.range(0, rb.size(FogVX.FOG_MAP), false)) {
      if (rb.eq(rb.idx(FogVX.FOG_MAP, i), map_id)) {
        this._fog_name = rb.idx(FogVX.FOG_NAME, i);
        this._fog_hue = rb.idx(FogVX.FOG_HUE, i);
        this._fog_tone = rb.idx(FogVX.FOG_HUE, i);
        this._fog_opacity = rb.idx(FogVX.FOG_OPA, i);
        this._fog_blend_type = rb.idx(FogVX.FOG_BLEND, i);
        this._fog_zoom = rb.idx(FogVX.FOG_ZOOM, i);
        this._fog_sx = rb.idx(FogVX.FOG_SX, i);
        this._fog_sy = rb.idx(FogVX.FOG_SY, i);
      }
    }
    return await this.vx_fog_bvj_gmap_setup(map_id);
  }
  // fora do escopo (nada do jogo chama): start_fog_tone_change, start_fog_opacity_change
});
rb.alias(Game_Map, "vx_fog_bvj_gmap_update", "update");
rb.reabrir(Game_Map, class extends rb.superDe(Game_Map) {
  async update() {
    let d, target;
    await this.vx_fog_bvj_gmap_update();
    rb.num(this, "_fog_ox", (this._fog_ox - (this._fog_sx / 8.0)), "float");
    rb.num(this, "_fog_oy", (this._fog_oy - (this._fog_sy / 8.0)), "float");
    if ((this._fog_tone_duration >= 1)) {
      d = this._fog_tone_duration;
      target = this._fog_tone_target;
      this._fog_tone.red = ((((this._fog_tone.red * ((d - 1))) + target.red)) / d);
      this._fog_tone.green = ((((this._fog_tone.green * ((d - 1))) + target.green)) / d);
      this._fog_tone.blue = ((((this._fog_tone.blue * ((d - 1))) + target.blue)) / d);
      this._fog_tone.gray = ((((this._fog_tone.gray * ((d - 1))) + target.gray)) / d);
      this._fog_tone_duration -= 1;
    }
    if ((this._fog_opacity_duration >= 1)) {
      d = this._fog_opacity_duration;
      this._fog_opacity = rb.div((rb.add(rb.mul(this._fog_opacity, ((d - 1))), this._fog_opacity_target)), d);
      return this._fog_opacity_duration -= 1;
    }
  }
});
//###############
// Sriteset_Map #
//###############
rb.alias(Spriteset_Map, "vx_fog_bvj_smap_ini", "initialize");
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  async initialize() {
    this._fog = Plane.new(this._viewport1);
    this._fog.z = 50;
    await this.vx_fog_bvj_smap_ini();
  }
});
rb.alias(Spriteset_Map, "vx_fog_bvj_smap_dispose", "dispose");
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  dispose() {
    this._fog.dispose();
    return this.vx_fog_bvj_smap_dispose();
  }
});
rb.alias(Spriteset_Map, "vx_fog_bvj_smap_update", "update");
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  async update() {
    if ((!rb.eq(this._fog_name, $game_map.fog_name) || !rb.eq(this._fog_hue, $game_map.fog_hue))) {
      this._fog_name = $game_map.fog_name;
      this._fog_hue = $game_map.fog_hue;
      if ((this._fog.bitmap != null)) {
        this._fog.bitmap.dispose();
        this._fog.bitmap = null;
      }
      if ((this._fog_name !== "")) {
        this._fog.bitmap = (await Cache.system(this._fog_name));
        this._fog.tone = this._fog_hue;
      }
      Graphics.frame_reset();
    }
    this._fog.zoom_x = ($game_map.fog_zoom / 100.0);
    this._fog.zoom_y = ($game_map.fog_zoom / 100.0);
    this._fog.opacity = $game_map.fog_opacity;
    this._fog.blend_type = $game_map.fog_blend_type;
    this._fog.ox = rb.add(rb.div($game_map.display_x, 4), $game_map.fog_ox);
    this._fog.oy = rb.add(rb.div($game_map.display_y, 4), $game_map.fog_oy);
    this._fog.tone = $game_map.fog_tone;
    return await this.vx_fog_bvj_smap_update();
  }
});
