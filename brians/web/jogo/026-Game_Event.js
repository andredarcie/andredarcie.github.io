// 026 - Game_Event: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Event
//------------------------------------------------------------------------------
// 　イベントを扱うクラスです。条件判定によるイベントページ切り替えや、並列処理
// イベント実行などの機能を持っており、Game_Map クラスの内部で使用されます。
//==============================================================================
//--------------------------------------------------------------------------
// ● 公開インスタンス変数
//--------------------------------------------------------------------------
globalThis.Game_Event = rb.classe("Game_Event", class Game_Event extends Game_Character {
  get trigger() { return this._trigger; } // トリガー
  get list() { return this._list; } // 実行内容
  get starting() { return this._starting; } // 起動中フラグ
  //--------------------------------------------------------------------------
  // ● オブジェクト初期化
  //     map_id : マップ ID
  //     event  : イベント (RPG::Event)
  //--------------------------------------------------------------------------
  async initialize(map_id, event) {
    super.initialize();
    this._map_id = map_id;
    this._event = event;
    this._id = rb.id(this._event);
    this._erased = false;
    this._starting = false;
    this._through = true;
    this.moveto(this._event.x, this._event.y); // 初期位置に移動
    await this.refresh();
  }
  //--------------------------------------------------------------------------
  // ● 起動中フラグのクリア
  //--------------------------------------------------------------------------
  clear_starting() {
    return this._starting = false;
  }
  //--------------------------------------------------------------------------
  // ● イベント起動
  //--------------------------------------------------------------------------
  async start() {
    if ((rb.size(this._list) <= 1)) { // 実行内容が空？
      return;
    }
    this._starting = true;
    if ((this._trigger < 3)) {
      this.lock;
    }
    if (!($game_map.interpreter.running_p())) {
      return await $game_map.interpreter.setup_starting_event();
    }
  }
  //--------------------------------------------------------------------------
  // ● 一時消去
  //--------------------------------------------------------------------------
  async erase() {
    this._erased = true;
    return await this.refresh();
  }
  //--------------------------------------------------------------------------
  // ● イベントページの条件合致判定
  //--------------------------------------------------------------------------
  conditions_met_p(page) {
    let c, key, item, actor;
    c = page.condition;
    if (c.switch1_valid) { // スイッチ 1
      if ((rb.idx($game_switches, c.switch1_id) === false)) {
        return false;
      }
    }
    if (c.switch2_valid) { // スイッチ 2
      if ((rb.idx($game_switches, c.switch2_id) === false)) {
        return false;
      }
    }
    if (c.variable_valid) { // 変数
      if ((rb.idx($game_variables, c.variable_id) < c.variable_value)) {
        return false;
      }
    }
    if (c.self_switch_valid) { // セルフスイッチ
      key = [this._map_id, rb.id(this._event), c.self_switch_ch];
      if ((rb.idx($game_self_switches, key) !== true)) {
        return false;
      }
    }
    if (c.item_valid) { // アイテム
      item = rb.idx($data_items, c.item_id);
      if (($game_party.item_number(item) === 0)) {
        return false;
      }
    }
    if (c.actor_valid) { // アクター
      actor = rb.idx($game_actors, c.actor_id);
      if (!(rb.include_p($game_party.members, actor))) {
        return false;
      }
    }
    return true; // 条件合致
  }
  //--------------------------------------------------------------------------
  // ● イベントページのセットアップ
  //--------------------------------------------------------------------------
  async setup(new_page) {
    this._page = new_page;
    if ((this._page == null)) {
      this._tile_id = 0;
      this._character_name = "";
      this._character_index = 0;
      this._move_type = 0;
      this._through = true;
      this._trigger = null;
      this._list = null;
      this._interpreter = null;
    } else {
      this._tile_id = this._page.graphic.tile_id;
      this._character_name = this._page.graphic.character_name;
      this._character_index = this._page.graphic.character_index;
      if (!rb.eq(this._original_direction, this._page.graphic.direction)) {
        this._direction = this._page.graphic.direction;
        this._original_direction = this._direction;
        this._prelock_direction = 0;
      }
      if (!rb.eq(this._original_pattern, this._page.graphic.pattern)) {
        this._pattern = this._page.graphic.pattern;
        this._original_pattern = this._pattern;
      }
      this._move_type = this._page.move_type;
      this._move_speed = this._page.move_speed;
      this._move_frequency = this._page.move_frequency;
      this._move_route = this._page.move_route;
      this._move_route_index = 0;
      this._move_route_forcing = false;
      this._walk_anime = this._page.walk_anime;
      this._step_anime = this._page.step_anime;
      this._direction_fix = this._page.direction_fix;
      this._through = this._page.through;
      this._priority_type = this._page.priority_type;
      this._trigger = this._page.trigger;
      this._list = this._page.list;
      this._interpreter = null;
      if ((this._trigger === 4)) { // トリガーが [並列処理] の場合
        this._interpreter = (await Game_Interpreter.new()); // 並列処理用インタプリタを作成
      }
    }
    return this.update_bush_depth();
  }
  //--------------------------------------------------------------------------
  // ● リフレッシュ
  //--------------------------------------------------------------------------
  async refresh() {
    let new_page, page;
    new_page = null;
    if (!(this._erased)) {
      // 一時消去されていない場合
      for (page of rb.reverse(this._event.pages)) { // 番号の大きいページから順に
        if (!(this.conditions_met_p(page))) {
          continue; // 条件合致判定
        }
        new_page = page;
        break;
      }
    }
    if (!rb.eq(new_page, this._page)) { // イベントページが変わった？
      this.clear_starting(); // 起動中フラグをクリア
      await this.setup(new_page); // イベントページをセットアップ
      return await this.check_event_trigger_auto(); // 自動イベントの起動判定
    }
  }
  //--------------------------------------------------------------------------
  // ● 接触イベントの起動判定
  //--------------------------------------------------------------------------
  async check_event_trigger_touch(x, y) {
    if ($game_map.interpreter.running_p()) {
      return;
    }
    if ((this._trigger === 2) && $game_player.pos_p(x, y)) {
      if (!(this.jumping_p()) && (this._priority_type === 1)) {
        return await this.start();
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● 自動イベントの起動判定
  //--------------------------------------------------------------------------
  async check_event_trigger_auto() {
    if ((this._trigger === 3)) {
      return await this.start();
    }
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    await super.update();
    await this.check_event_trigger_auto(); // 自動イベントの起動判定
    if ((this._interpreter != null)) { // 並列処理が有効
      if (!(this._interpreter.running_p())) {
        // 実行中でない場合
        await this._interpreter.setup(this._list, rb.id(this._event)); // セットアップ
      }
      return await this._interpreter.update(); // インタプリタを更新
    }
  }
});
