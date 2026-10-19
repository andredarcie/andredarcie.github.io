// Módulo RPG do RPG Maker VX, linha a linha de web/rgss/rpg.rb (vinha dentro
// do RGSS200E.dll). Os .rvdata originais são carregados nestas classes pelo
// Marshal: os campos são as ivars (`@name` → `_name`) e os attr_accessor
// viram get/set sobre elas.
import * as rb from 'rb';

const RPG = rb.modulo('RPG');
globalThis.RPG = RPG;

// attr_accessor :a, :b…
function acessores(C, nomes) {
  for (const nome of nomes) {
    Object.defineProperty(C.prototype, nome, {
      get() { return this[`_${nome}`]; },
      set(v) { this[`_${nome}`] = v; },
      configurable: true,
    });
  }
}

// class RPG::X (< sup): registra o nome Ruby completo e pendura no módulo/classe pai
function classe(pai, nomeRuby, C, nomes) {
  rb.classe(nomeRuby, C);
  acessores(C, nomes);
  pai[nomeRuby.split('::').pop()] = C;
  return C;
}

const comandoVazio = () => RPG.EventCommand.new();

classe(RPG, 'RPG::Map', class extends rb.Objeto {
  initialize(width, height) {
    this._width = width; this._height = height;
    this._scroll_type = 0;
    this._autoplay_bgm = false; this._bgm = RPG.AudioFile.new();
    this._autoplay_bgs = false; this._bgs = RPG.AudioFile.new('', 80);
    this._disable_dashing = false;
    this._encounter_list = []; this._encounter_step = 30;
    this._parallax_name = ''; this._parallax_loop_x = false; this._parallax_loop_y = false;
    this._parallax_sx = 0; this._parallax_sy = 0; this._parallax_show = false;
    this._data = Table.new(width, height, 3);
    this._events = new rb.RbHash();
  }
}, ['width', 'height', 'scroll_type', 'autoplay_bgm', 'bgm', 'autoplay_bgs', 'bgs',
  'disable_dashing', 'encounter_list', 'encounter_step', 'parallax_name',
  'parallax_loop_x', 'parallax_loop_y', 'parallax_sx', 'parallax_sy',
  'parallax_show', 'data', 'events']);

classe(RPG, 'RPG::MapInfo', class extends rb.Objeto {
  initialize() {
    this._name = ''; this._parent_id = 0; this._order = 0; this._expanded = false;
    this._scroll_x = 0; this._scroll_y = 0;
  }
}, ['name', 'parent_id', 'order', 'expanded', 'scroll_x', 'scroll_y']);

classe(RPG, 'RPG::Area', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._map_id = 0; this._rect = Rect.new(0, 0, 0, 0);
    this._encounter_list = []; this._order = 0;
  }
}, ['id', 'name', 'map_id', 'rect', 'encounter_list', 'order']);

classe(RPG, 'RPG::Event', class extends rb.Objeto {
  initialize(x, y) {
    this._id = 0; this._name = ''; this._x = x; this._y = y;
    this._pages = [RPG.Event.Page.new()];
  }
}, ['id', 'name', 'x', 'y', 'pages']);

classe(RPG.Event, 'RPG::Event::Page', class extends rb.Objeto {
  initialize() {
    this._condition = RPG.Event.Page.Condition.new();
    this._graphic = RPG.Event.Page.Graphic.new();
    this._move_type = 0; this._move_speed = 3; this._move_frequency = 3;
    this._move_route = RPG.MoveRoute.new();
    this._walk_anime = true; this._step_anime = false; this._direction_fix = false;
    this._through = false; this._priority_type = 0; this._trigger = 0;
    this._list = [comandoVazio()];
  }
}, ['condition', 'graphic', 'move_type', 'move_speed', 'move_frequency',
  'move_route', 'walk_anime', 'step_anime', 'direction_fix', 'through',
  'priority_type', 'trigger', 'list']);

classe(RPG.Event.Page, 'RPG::Event::Page::Condition', class extends rb.Objeto {
  initialize() {
    this._switch1_valid = false; this._switch2_valid = false; this._variable_valid = false;
    this._self_switch_valid = false; this._item_valid = false; this._actor_valid = false;
    this._switch1_id = 1; this._switch2_id = 1; this._variable_id = 1; this._variable_value = 0;
    this._self_switch_ch = 'A'; this._item_id = 1; this._actor_id = 1;
  }
}, ['switch1_valid', 'switch2_valid', 'variable_valid', 'self_switch_valid',
  'item_valid', 'actor_valid', 'switch1_id', 'switch2_id', 'variable_id',
  'variable_value', 'self_switch_ch', 'item_id', 'actor_id']);

classe(RPG.Event.Page, 'RPG::Event::Page::Graphic', class extends rb.Objeto {
  initialize() {
    this._tile_id = 0; this._character_name = ''; this._character_index = 0;
    this._direction = 2; this._pattern = 0;
  }
}, ['tile_id', 'character_name', 'character_index', 'direction', 'pattern']);

classe(RPG, 'RPG::EventCommand', class extends rb.Objeto {
  initialize(code = 0, indent = 0, parameters = []) {
    this._code = code; this._indent = indent; this._parameters = parameters;
  }
}, ['code', 'indent', 'parameters']);

classe(RPG, 'RPG::MoveRoute', class extends rb.Objeto {
  initialize() {
    this._repeat = true; this._skippable = false; this._wait = false;
    this._list = [RPG.MoveCommand.new()];
  }
}, ['repeat', 'skippable', 'wait', 'list']);

classe(RPG, 'RPG::MoveCommand', class extends rb.Objeto {
  initialize(code = 0, parameters = []) {
    this._code = code; this._parameters = parameters;
  }
}, ['code', 'parameters']);

classe(RPG, 'RPG::Actor', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._class_id = 1; this._initial_level = 1; this._exp_basis = 25;
    this._exp_inflation = 35; this._character_name = ''; this._character_index = 0;
    this._face_name = ''; this._face_index = 0;
    this._parameters = Table.new(6, 100);
    for (let i = 1; i <= 99; i++) {
      this._parameters.idxSet(0, i, 400 + i * 50);
      this._parameters.idxSet(1, i, 80 + i * 10);
      this._parameters.idxSet(2, i, 15 + rb.div(i * 5, 4));
      this._parameters.idxSet(3, i, 15 + rb.div(i * 5, 4));
      this._parameters.idxSet(4, i, 20 + rb.div(i * 5, 2));
      this._parameters.idxSet(5, i, 20 + rb.div(i * 5, 2));
    }
    this._weapon_id = 0; this._armor1_id = 0; this._armor2_id = 0; this._armor3_id = 0; this._armor4_id = 0;
    this._two_swords_style = false; this._fix_equipment = false; this._auto_battle = false;
    this._super_guard = false; this._pharmacology = false; this._critical_bonus = false;
  }
}, ['id', 'name', 'class_id', 'initial_level', 'exp_basis', 'exp_inflation',
  'character_name', 'character_index', 'face_name', 'face_index', 'parameters',
  'weapon_id', 'armor1_id', 'armor2_id', 'armor3_id', 'armor4_id',
  'two_swords_style', 'fix_equipment', 'auto_battle', 'super_guard',
  'pharmacology', 'critical_bonus']);

classe(RPG, 'RPG::Class', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._position = 0;
    this._weapon_set = []; this._armor_set = [];
    this._element_ranks = Table.new(1); this._state_ranks = Table.new(1);
    this._learnings = [];
    this._skill_name_valid = false; this._skill_name = '';
  }
}, ['id', 'name', 'position', 'weapon_set', 'armor_set', 'element_ranks',
  'state_ranks', 'learnings', 'skill_name_valid', 'skill_name']);

classe(RPG.Class, 'RPG::Class::Learning', class extends rb.Objeto {
  initialize() { this._level = 1; this._skill_id = 1; }
}, ['level', 'skill_id']);

classe(RPG, 'RPG::BaseItem', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._icon_index = 0; this._description = ''; this._note = '';
  }
}, ['id', 'name', 'icon_index', 'description', 'note']);

const escopo = (lista) => function () { return lista.includes(this._scope); };
const ocasiao = (lista) => function () { return lista.includes(this._occasion); };

classe(RPG, 'RPG::UsableItem', class extends RPG.BaseItem {
  initialize() {
    super.initialize();
    this._scope = 0; this._occasion = 0; this._speed = 0; this._animation_id = 0;
    this._common_event_id = 0; this._base_damage = 0; this._variance = 20;
    this._atk_f = 0; this._spi_f = 0;
    this._physical_attack = false; this._damage_to_mp = false; this._absorb_damage = false;
    this._ignore_defense = false;
    this._element_set = []; this._plus_state_set = []; this._minus_state_set = [];
  }
}, ['scope', 'occasion', 'speed', 'animation_id', 'common_event_id',
  'base_damage', 'variance', 'atk_f', 'spi_f', 'physical_attack',
  'damage_to_mp', 'absorb_damage', 'ignore_defense', 'element_set',
  'plus_state_set', 'minus_state_set']);
Object.assign(RPG.UsableItem.prototype, {
  for_opponent_p: escopo([1, 2, 3, 4, 5, 6]),
  for_friend_p: escopo([7, 8, 9, 10, 11]),
  for_dead_friend_p: escopo([9, 10]),
  for_user_p: escopo([11]),
  for_one_p: escopo([1, 3, 4, 7, 9, 11]),
  for_two_p: escopo([5]),
  for_three_p: escopo([6]),
  for_random_p: escopo([4, 5, 6]),
  for_all_p: escopo([2, 8, 10]),
  dual_p: escopo([3]),
  need_selection_p: escopo([1, 3, 7, 9]),
  battle_ok_p: ocasiao([0, 1]),
  menu_ok_p: ocasiao([0, 2]),
});

classe(RPG, 'RPG::Skill', class extends RPG.UsableItem {
  initialize() {
    super.initialize();
    this._scope = 1; this._mp_cost = 0; this._hit = 100; this._message1 = ''; this._message2 = '';
  }
}, ['mp_cost', 'hit', 'message1', 'message2']);

classe(RPG, 'RPG::Item', class extends RPG.UsableItem {
  initialize() {
    super.initialize();
    this._scope = 7; this._price = 0; this._consumable = true;
    this._hp_recovery_rate = 0; this._hp_recovery = 0; this._mp_recovery_rate = 0; this._mp_recovery = 0;
    this._parameter_type = 0; this._parameter_points = 0;
  }
}, ['price', 'consumable', 'hp_recovery_rate', 'hp_recovery',
  'mp_recovery_rate', 'mp_recovery', 'parameter_type', 'parameter_points']);

classe(RPG, 'RPG::Weapon', class extends RPG.BaseItem {
  initialize() {
    super.initialize();
    this._animation_id = 0; this._price = 0; this._hit = 95;
    this._atk = 0; this._def = 0; this._spi = 0; this._agi = 0;
    this._two_handed = false; this._fast_attack = false; this._dual_attack = false;
    this._critical_bonus = false;
    this._element_set = []; this._state_set = [];
  }
}, ['animation_id', 'price', 'hit', 'atk', 'def', 'spi', 'agi', 'two_handed',
  'fast_attack', 'dual_attack', 'critical_bonus', 'element_set', 'state_set']);

classe(RPG, 'RPG::Armor', class extends RPG.BaseItem {
  initialize() {
    super.initialize();
    this._kind = 0; this._price = 0; this._eva = 0;
    this._atk = 0; this._def = 0; this._spi = 0; this._agi = 0;
    this._prevent_critical = false; this._half_mp_cost = false; this._double_exp_gain = false;
    this._auto_hp_recover = false;
    this._element_set = []; this._state_set = [];
  }
}, ['kind', 'price', 'eva', 'atk', 'def', 'spi', 'agi', 'prevent_critical',
  'half_mp_cost', 'double_exp_gain', 'auto_hp_recover', 'element_set', 'state_set']);

classe(RPG, 'RPG::Enemy', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._battler_name = ''; this._battler_hue = 0;
    this._maxhp = 10; this._maxmp = 10; this._atk = 10; this._def = 10; this._spi = 10; this._agi = 10;
    this._hit = 95; this._eva = 5; this._exp = 0; this._gold = 0;
    this._drop_item1 = RPG.Enemy.DropItem.new(); this._drop_item2 = RPG.Enemy.DropItem.new();
    this._levitate = false; this._has_critical = false;
    this._element_ranks = Table.new(1); this._state_ranks = Table.new(1);
    this._actions = [RPG.Enemy.Action.new()]; this._note = '';
  }
}, ['id', 'name', 'battler_name', 'battler_hue', 'maxhp', 'maxmp', 'atk', 'def',
  'spi', 'agi', 'hit', 'eva', 'exp', 'gold', 'drop_item1', 'drop_item2',
  'levitate', 'has_critical', 'element_ranks', 'state_ranks', 'actions', 'note']);

classe(RPG.Enemy, 'RPG::Enemy::DropItem', class extends rb.Objeto {
  initialize() {
    this._kind = 0; this._item_id = 1; this._weapon_id = 1; this._armor_id = 1; this._denominator = 1;
  }
}, ['kind', 'item_id', 'weapon_id', 'armor_id', 'denominator']);

classe(RPG.Enemy, 'RPG::Enemy::Action', class extends rb.Objeto {
  initialize() {
    this._kind = 0; this._basic = 0; this._skill_id = 1;
    this._condition_type = 0; this._condition_param1 = 0; this._condition_param2 = 0;
    this._rating = 5;
  }
  skill_p() { return this._kind === 1; }
}, ['kind', 'basic', 'skill_id', 'condition_type', 'condition_param1',
  'condition_param2', 'rating']);

classe(RPG, 'RPG::Troop', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._members = []; this._pages = [RPG.Troop.Page.new()];
  }
}, ['id', 'name', 'members', 'pages']);

classe(RPG.Troop, 'RPG::Troop::Member', class extends rb.Objeto {
  initialize() {
    this._enemy_id = 1; this._x = 0; this._y = 0; this._hidden = false; this._immortal = false;
  }
}, ['enemy_id', 'x', 'y', 'hidden', 'immortal']);

classe(RPG.Troop, 'RPG::Troop::Page', class extends rb.Objeto {
  initialize() {
    this._condition = RPG.Troop.Page.Condition.new();
    this._span = 0;
    this._list = [comandoVazio()];
  }
}, ['condition', 'span', 'list']);

classe(RPG.Troop.Page, 'RPG::Troop::Page::Condition', class extends rb.Objeto {
  initialize() {
    this._turn_ending = false; this._turn_valid = false; this._enemy_valid = false;
    this._actor_valid = false; this._switch_valid = false;
    this._turn_a = 0; this._turn_b = 0; this._enemy_index = 0; this._enemy_hp = 50;
    this._actor_id = 1; this._actor_hp = 50; this._switch_id = 1;
  }
}, ['turn_ending', 'turn_valid', 'enemy_valid', 'actor_valid',
  'switch_valid', 'turn_a', 'turn_b', 'enemy_index', 'enemy_hp',
  'actor_id', 'actor_hp', 'switch_id']);

classe(RPG, 'RPG::State', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._icon_index = 0; this._restriction = 0; this._priority = 5;
    this._atk_rate = 100; this._def_rate = 100; this._spi_rate = 100; this._agi_rate = 100;
    this._nonresistance = false; this._offset_by_opposite = false; this._slip_damage = false;
    this._reduce_hit_ratio = false; this._battle_only = true; this._release_by_damage = false;
    this._hold_turn = 0; this._auto_release_prob = 0;
    this._message1 = ''; this._message2 = ''; this._message3 = ''; this._message4 = '';
    this._element_set = []; this._state_set = []; this._note = '';
  }
}, ['id', 'name', 'icon_index', 'restriction', 'priority', 'atk_rate',
  'def_rate', 'spi_rate', 'agi_rate', 'nonresistance', 'offset_by_opposite',
  'slip_damage', 'reduce_hit_ratio', 'battle_only', 'release_by_damage',
  'hold_turn', 'auto_release_prob', 'message1', 'message2', 'message3',
  'message4', 'element_set', 'state_set', 'note']);

classe(RPG, 'RPG::Animation', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = '';
    this._animation1_name = ''; this._animation1_hue = 0;
    this._animation2_name = ''; this._animation2_hue = 0;
    this._position = 1; this._frame_max = 1;
    this._frames = [RPG.Animation.Frame.new()];
    this._timings = [];
  }
}, ['id', 'name', 'animation1_name', 'animation1_hue', 'animation2_name',
  'animation2_hue', 'position', 'frame_max', 'frames', 'timings']);

classe(RPG.Animation, 'RPG::Animation::Frame', class extends rb.Objeto {
  initialize() {
    this._cell_max = 0;
    this._cell_data = Table.new(0, 0);
  }
}, ['cell_max', 'cell_data']);

classe(RPG.Animation, 'RPG::Animation::Timing', class extends rb.Objeto {
  initialize() {
    this._frame = 0;
    this._se = RPG.SE.new('', 80);
    this._flash_scope = 0;
    this._flash_color = Color.new(255, 255, 255, 255);
    this._flash_duration = 5;
  }
}, ['frame', 'se', 'flash_scope', 'flash_color', 'flash_duration']);

classe(RPG, 'RPG::CommonEvent', class extends rb.Objeto {
  initialize() {
    this._id = 0; this._name = ''; this._trigger = 0; this._switch_id = 1;
    this._list = [comandoVazio()];
  }
}, ['id', 'name', 'trigger', 'switch_id', 'list']);

classe(RPG, 'RPG::System', class extends rb.Objeto {
  initialize() {
    this._game_title = ''; this._version_id = 0; this._party_members = [1];
    this._elements = [null, '']; this._switches = [null, '']; this._variables = [null, ''];
    this._passages = Table.new(8192);
    this._boat = RPG.System.Vehicle.new(); this._ship = RPG.System.Vehicle.new();
    this._airship = RPG.System.Vehicle.new();
    this._title_bgm = RPG.BGM.new(); this._battle_bgm = RPG.BGM.new();
    this._battle_end_me = RPG.ME.new(); this._gameover_me = RPG.ME.new();
    this._sounds = []; for (let i = 0; i < 20; i++) this._sounds.push(RPG.SE.new());
    this._test_battlers = []; this._test_troop_id = 1;
    this._start_map_id = 1; this._start_x = 0; this._start_y = 0;
    this._terms = RPG.System.Terms.new();
    this._battler_name = ''; this._battler_hue = 0; this._edit_map_id = 1;
  }
}, ['game_title', 'version_id', 'party_members', 'elements', 'switches',
  'variables', 'passages', 'boat', 'ship', 'airship', 'title_bgm',
  'battle_bgm', 'battle_end_me', 'gameover_me', 'sounds', 'test_battlers',
  'test_troop_id', 'start_map_id', 'start_x', 'start_y', 'terms',
  'battler_name', 'battler_hue', 'edit_map_id']);

classe(RPG.System, 'RPG::System::Vehicle', class extends rb.Objeto {
  initialize() {
    this._character_name = ''; this._character_index = 0;
    this._bgm = RPG.AudioFile.new();
    this._start_map_id = 0; this._start_x = 0; this._start_y = 0;
  }
}, ['character_name', 'character_index', 'bgm', 'start_map_id', 'start_x', 'start_y']);

const TERMOS = ['level', 'level_a', 'hp', 'hp_a', 'mp', 'mp_a', 'atk', 'def', 'spi', 'agi',
  'weapon', 'armor1', 'armor2', 'armor3', 'armor4', 'weapon1', 'weapon2',
  'attack', 'skill', 'guard', 'item', 'equip', 'status', 'save', 'game_end',
  'fight', 'escape', 'new_game', 'continue', 'shutdown', 'to_title',
  'cancel', 'gold'];
classe(RPG.System, 'RPG::System::Terms', class extends rb.Objeto {
  initialize() { for (const t of TERMOS) this[`_${t}`] = ''; }
}, TERMOS);

classe(RPG.System, 'RPG::System::TestBattler', class extends rb.Objeto {
  initialize() {
    this._actor_id = 1; this._level = 1;
    this._weapon_id = 0; this._armor1_id = 0; this._armor2_id = 0; this._armor3_id = 0; this._armor4_id = 0;
  }
}, ['actor_id', 'level', 'weapon_id', 'armor1_id', 'armor2_id', 'armor3_id', 'armor4_id']);

classe(RPG, 'RPG::AudioFile', class extends rb.Objeto {
  initialize(name = '', volume = 100, pitch = 100) {
    this._name = name; this._volume = volume; this._pitch = pitch;
  }
}, ['name', 'volume', 'pitch']);

// BGM e BGS lembram o último tocado (@@last do Ruby)
classe(RPG, 'RPG::BGM', class extends RPG.AudioFile {
  play() {
    if (rb.empty_p(this._name)) {
      Audio.bgm_stop();
      RPG.BGM.__cv_last = RPG.BGM.new();
    } else {
      Audio.bgm_play(`Audio/BGM/${this._name}`, this._volume, this._pitch);
      RPG.BGM.__cv_last = this;
    }
  }
  static stop() { Audio.bgm_stop(); RPG.BGM.__cv_last = RPG.BGM.new(); }
  static fade(time) { Audio.bgm_fade(time); RPG.BGM.__cv_last = RPG.BGM.new(); }
  static last() { return RPG.BGM.__cv_last; }
}, []);
RPG.BGM.__cv_last = RPG.BGM.new();

classe(RPG, 'RPG::BGS', class extends RPG.AudioFile {
  play() {
    if (rb.empty_p(this._name)) {
      Audio.bgs_stop();
      RPG.BGS.__cv_last = RPG.BGS.new();
    } else {
      Audio.bgs_play(`Audio/BGS/${this._name}`, this._volume, this._pitch);
      RPG.BGS.__cv_last = this;
    }
  }
  static stop() { Audio.bgs_stop(); RPG.BGS.__cv_last = RPG.BGS.new(); }
  static fade(time) { Audio.bgs_fade(time); RPG.BGS.__cv_last = RPG.BGS.new(); }
  static last() { return RPG.BGS.__cv_last; }
}, []);
RPG.BGS.__cv_last = RPG.BGS.new();

classe(RPG, 'RPG::ME', class extends RPG.AudioFile {
  play() {
    if (rb.empty_p(this._name)) Audio.me_stop();
    else Audio.me_play(`Audio/ME/${this._name}`, this._volume, this._pitch);
  }
  static stop() { Audio.me_stop(); }
  static fade(time) { Audio.me_fade(time); }
}, []);

classe(RPG, 'RPG::SE', class extends RPG.AudioFile {
  play() {
    if (!rb.empty_p(this._name)) Audio.se_play(`Audio/SE/${this._name}`, this._volume, this._pitch);
  }
  static stop() { Audio.se_stop(); }
}, []);
