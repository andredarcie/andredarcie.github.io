// 028 - Game_Player: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Player
//------------------------------------------------------------------------------
// 　プレイヤーを扱うクラスです。イベントの起動判定や、マップのスクロールなどの
// 機能を持っています。このクラスのインスタンスは $game_player で参照されます。
//==============================================================================
globalThis.Game_Player = rb.classe("Game_Player", class Game_Player extends Game_Character {
});
//--------------------------------------------------------------------------
// ● 定数
//--------------------------------------------------------------------------
Game_Player.CENTER_X = (((rb.div(544, 2) - 16)) * 8); // 画面中央の X 座標 * 8
Game_Player.CENTER_Y = (((rb.div(416, 2) - 16)) * 8); // 画面中央の Y 座標 * 8
//--------------------------------------------------------------------------
// ● 公開インスタンス変数
//--------------------------------------------------------------------------
rb.reabrir(Game_Player, class extends rb.superDe(Game_Player) {
  get vehicle_type() { return this._vehicle_type; } // 現在乗っている乗り物の種類 (-1:なし)
  //--------------------------------------------------------------------------
  // ● オブジェクト初期化
  //--------------------------------------------------------------------------
  initialize() {
    super.initialize();
    this._vehicle_type = -1;
    this._vehicle_getting_on = false; // 乗る動作の途中フラグ
    this._vehicle_getting_off = false; // 降りる動作の途中フラグ
    this._transferring = false; // 場所移動フラグ
    this._new_map_id = 0; // 移動先 マップ ID
    this._new_x = 0; // 移動先 X 座標
    this._new_y = 0; // 移動先 Y 座標
    this._new_direction = 0; // 移動後の向き
    this._walking_bgm = null; // 歩行時の BGM 記憶用
  }
  //--------------------------------------------------------------------------
  // ● 停止中判定
  //--------------------------------------------------------------------------
  stopping_p() {
    if (this._vehicle_getting_on) {
      return false;
    }
    if (this._vehicle_getting_off) {
      return false;
    }
    return super.stopping_p();
  }
  //--------------------------------------------------------------------------
  // ● 場所移動の予約
  //     map_id    : マップ ID
  //     x         : X 座標
  //     y         : Y 座標
  //     direction : 移動後の向き
  //--------------------------------------------------------------------------
  reserve_transfer(map_id, x, y, direction) {
    this._transferring = true;
    this._new_map_id = map_id;
    this._new_x = x;
    this._new_y = y;
    return this._new_direction = direction;
  }
  //--------------------------------------------------------------------------
  // ● 場所移動の予約中判定
  //--------------------------------------------------------------------------
  transfer_p() {
    return this._transferring;
  }
  //--------------------------------------------------------------------------
  // ● 場所移動の実行
  //--------------------------------------------------------------------------
  async perform_transfer() {
    if (!(this._transferring)) {
      return;
    }
    this._transferring = false;
    this.set_direction(this._new_direction);
    if (!rb.eq($game_map.map_id, this._new_map_id)) {
      await $game_map.setup(this._new_map_id); // 別マップへ移動
    }
    return await this.moveto(this._new_x, this._new_y);
  }
  //--------------------------------------------------------------------------
  // ● マップ通行可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  map_passable_p(x, y) {
    const caso1 = this._vehicle_type;
    if (caso1 === 0) { // 小型船
      return $game_map.boat_passable_p(x, y);
    } else if (caso1 === 1) { // 大型船
      return $game_map.ship_passable_p(x, y);
    } else if (caso1 === 2) { // 飛行船
      return true;
    } else {
      // 徒歩
      return $game_map.passable_p(x, y);
    }
  }
  //--------------------------------------------------------------------------
  // ● 歩行可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  can_walk_p(x, y) {
    let last_vehicle_type, result;
    last_vehicle_type = this._vehicle_type; // 乗り物タイプを退避
    this._vehicle_type = -1; // 一時的に徒歩に設定
    result = this.passable_p(x, y); // 通行可能判定
    this._vehicle_type = last_vehicle_type; // 乗り物タイプを復元
    return result;
  }
  //--------------------------------------------------------------------------
  // ● 飛行船の着陸可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  airship_land_ok_p(x, y) {
    if (!($game_map.airship_land_ok_p(x, y))) {
      return false; // タイルの通行属性が着陸不能
    }
    if (!(rb.empty_p($game_map.events_xy(x, y)))) {
      return false; // 何らかのイベントがある地点には着陸しない
    }
    return true; // 着陸可
  }
  //--------------------------------------------------------------------------
  // ● 何らかの乗り物に乗っている状態判定
  //--------------------------------------------------------------------------
  in_vehicle_p() {
    return (this._vehicle_type >= 0);
  }
  //--------------------------------------------------------------------------
  // ● 飛行船に乗っている状態判定
  //--------------------------------------------------------------------------
  in_airship_p() {
    return (this._vehicle_type === 2);
  }
  //--------------------------------------------------------------------------
  // ● ダッシュ状態判定
  //--------------------------------------------------------------------------
  dash_p() {
    if (this._move_route_forcing) {
      return false;
    }
    if ($game_map.disable_dash_p()) {
      return false;
    }
    if (this.in_vehicle_p()) {
      return false;
    }
    return Input.press_p(Input.A);
  }
  //--------------------------------------------------------------------------
  // ● デバッグすり抜け状態判定
  //--------------------------------------------------------------------------
  debug_through_p() {
    if (!(rb.v($TEST))) {
      return false;
    }
    return Input.press_p(Input.CTRL);
  }
  //--------------------------------------------------------------------------
  // ● 画面中央に来るようにマップの表示位置を設定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  center(x, y) {
    let display_x, max_x, display_y, max_y;
    display_x = rb.sub((x * 256), Game_Player.CENTER_X); // 座標を計算
    if (!($game_map.loop_horizontal_p())) {
      // 横にループしない？
      max_x = ((($game_map.width - 17)) * 256); // 最大値を計算
      display_x = rb.max([0, rb.min([display_x, max_x])]); // 座標を修正
    }
    display_y = rb.sub((y * 256), Game_Player.CENTER_Y); // 座標を計算
    if (!($game_map.loop_vertical_p())) {
      // 縦にループしない？
      max_y = ((($game_map.height - 13)) * 256); // 最大値を計算
      display_y = rb.max([0, rb.min([display_y, max_y])]); // 座標を修正
    }
    return $game_map.set_display_pos(display_x, display_y); // 表示位置変更
  }
  //--------------------------------------------------------------------------
  // ● 指定位置に移動
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  async moveto(x, y) {
    let vehicle;
    super.moveto(x, y);
    this.center(x, y); // センタリング
    this.make_encounter_count(); // エンカウント初期化
    if (this.in_vehicle_p()) { // 乗り物に乗っている
      vehicle = rb.idx($game_map.vehicles, this._vehicle_type); // 乗り物を取得
      return await vehicle.refresh(); // リフレッシュ
    }
  }
  //--------------------------------------------------------------------------
  // ● 歩数増加
  //--------------------------------------------------------------------------
  increase_steps() {
    super.increase_steps();
    if (this._move_route_forcing) {
      return;
    }
    if (this.in_vehicle_p()) {
      return;
    }
    $game_party.increase_steps();
    return $game_party.on_player_walk();
  }
  //--------------------------------------------------------------------------
  // ● エンカウント カウント取得
  //--------------------------------------------------------------------------
  encounter_count() {
    return this._encounter_count;
  }
  //--------------------------------------------------------------------------
  // ● エンカウント カウント作成
  //--------------------------------------------------------------------------
  make_encounter_count() {
    let n;
    if (($game_map.map_id !== 0)) {
      n = $game_map.encounter_step;
      return this._encounter_count = ((rb.rand(n) + rb.rand(n)) + 1); // サイコロを 2 個振るイメージ
    }
  }
  //--------------------------------------------------------------------------
  // ● エリア内判定
  //     area : エリアデータ (RPG::Area)
  //--------------------------------------------------------------------------
  in_area_p(area) {
    if ((area == null)) {
      return false;
    }
    if (!rb.eq($game_map.map_id, area.map_id)) {
      return false;
    }
    if ((this._x < area.rect.x)) {
      return false;
    }
    if ((this._y < area.rect.y)) {
      return false;
    }
    if ((this._x >= rb.add(area.rect.x, area.rect.width))) {
      return false;
    }
    if ((this._y >= rb.add(area.rect.y, area.rect.height))) {
      return false;
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● エンカウントする敵グループの ID を作成
  //--------------------------------------------------------------------------
  make_encounter_troop_id() {
    let encounter_list, area;
    encounter_list = rb.clone($game_map.encounter_list);
    for (area of rb.values($data_areas)) {
      if (this.in_area_p(area)) {
        encounter_list = rb.add(encounter_list, area.encounter_list);
      }
    }
    if (rb.empty_p(encounter_list)) {
      this.make_encounter_count();
      return 0;
    }
    return rb.idx(encounter_list, rb.rand(rb.size(encounter_list)));
  }
  //--------------------------------------------------------------------------
  // ● リフレッシュ
  //--------------------------------------------------------------------------
  refresh() {
    let actor;
    if ((rb.size($game_party.members) === 0)) {
      this._character_name = "";
      return this._character_index = 0;
    } else {
      actor = rb.idx($game_party.members, 0); // 先頭のアクターを取得
      this._character_name = actor.character_name;
      return this._character_index = actor.character_index;
    }
  }
  //--------------------------------------------------------------------------
  // ● 同位置のイベント起動判定
  //     triggers : トリガーの配列
  //--------------------------------------------------------------------------
  async check_event_trigger_here(triggers) {
    let result, event;
    if ($game_map.interpreter.running_p()) {
      return false;
    }
    result = false;
    for (event of $game_map.events_xy(this._x, this._y)) {
      if (rb.include_p(triggers, event.trigger) && (event.priority_type !== 1)) {
        await event.start();
        if (event.starting) {
          result = true;
        }
      }
    }
    return result;
  }
  //--------------------------------------------------------------------------
  // ● 正面のイベント起動判定
  //     triggers : トリガーの配列
  //--------------------------------------------------------------------------
  async check_event_trigger_there(triggers) {
    let result, front_x, front_y, event;
    if ($game_map.interpreter.running_p()) {
      return false;
    }
    result = false;
    front_x = $game_map.x_with_direction(this._x, this._direction);
    front_y = $game_map.y_with_direction(this._y, this._direction);
    for (event of $game_map.events_xy(front_x, front_y)) {
      if (rb.include_p(triggers, event.trigger) && (event.priority_type === 1)) {
        await event.start();
        result = true;
      }
    }
    if ((result === false) && $game_map.counter_p(front_x, front_y)) {
      front_x = $game_map.x_with_direction(front_x, this._direction);
      front_y = $game_map.y_with_direction(front_y, this._direction);
      for (event of $game_map.events_xy(front_x, front_y)) {
        if (rb.include_p(triggers, event.trigger) && (event.priority_type === 1)) {
          await event.start();
          result = true;
        }
      }
    }
    return result;
  }
  //--------------------------------------------------------------------------
  // ● 接触イベントの起動判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  async check_event_trigger_touch(x, y) {
    let result, event;
    if ($game_map.interpreter.running_p()) {
      return false;
    }
    result = false;
    for (event of $game_map.events_xy(x, y)) {
      if (rb.include_p([1, 2], event.trigger) && (event.priority_type === 1)) {
        await event.start();
        result = true;
      }
    }
    return result;
  }
  //--------------------------------------------------------------------------
  // ● 方向ボタン入力による移動処理
  //--------------------------------------------------------------------------
  async move_by_input() {
    if (!(this.movable_p())) {
      return;
    }
    if ($game_map.interpreter.running_p()) {
      return;
    }
    const caso2 = Input.dir4;
    if (caso2 === 2) {
      return await this.move_down();
    } else if (caso2 === 4) {
      return await this.move_left();
    } else if (caso2 === 6) {
      return await this.move_right();
    } else if (caso2 === 8) {
      return await this.move_up();
    }
  }
  //--------------------------------------------------------------------------
  // ● 移動可能判定
  //--------------------------------------------------------------------------
  movable_p() {
    if (this.moving_p()) { // 移動中
      return false;
    }
    if (this._move_route_forcing) { // 移動ルート強制中
      return false;
    }
    if (this._vehicle_getting_on) { // 乗る動作の途中
      return false;
    }
    if (this._vehicle_getting_off) { // 降りる動作の途中
      return false;
    }
    if (rb.v($game_message.visible)) { // メッセージ表示中
      return false;
    }
    if (this.in_airship_p() && !($game_map.airship.movable_p())) {
      return false;
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    let last_real_x, last_real_y, last_moving;
    last_real_x = this._real_x;
    last_real_y = this._real_y;
    last_moving = this.moving_p();
    await this.move_by_input();
    await super.update();
    this.update_scroll(last_real_x, last_real_y);
    this.update_vehicle();
    return await this.update_nonmoving(last_moving);
  }
  //--------------------------------------------------------------------------
  // ● スクロール処理
  //--------------------------------------------------------------------------
  update_scroll(last_real_x, last_real_y) {
    let ax1, ay1, ax2, ay2;
    ax1 = $game_map.adjust_x(last_real_x);
    ay1 = $game_map.adjust_y(last_real_y);
    ax2 = $game_map.adjust_x(this._real_x);
    ay2 = $game_map.adjust_y(this._real_y);
    if ((ay2 > ay1) && (ay2 > Game_Player.CENTER_Y)) {
      $game_map.scroll_down(rb.sub(ay2, ay1));
    }
    if ((ax2 < ax1) && (ax2 < Game_Player.CENTER_X)) {
      $game_map.scroll_left(rb.sub(ax1, ax2));
    }
    if ((ax2 > ax1) && (ax2 > Game_Player.CENTER_X)) {
      $game_map.scroll_right(rb.sub(ax2, ax1));
    }
    if ((ay2 < ay1) && (ay2 < Game_Player.CENTER_Y)) {
      return $game_map.scroll_up(rb.sub(ay1, ay2));
    }
  }
  //--------------------------------------------------------------------------
  // ● 乗り物の処理
  //--------------------------------------------------------------------------
  update_vehicle() {
    let vehicle;
    if (!(this.in_vehicle_p())) {
      return;
    }
    vehicle = rb.idx($game_map.vehicles, this._vehicle_type);
    if (this._vehicle_getting_on) { // 乗る途中？
      if (!(this.moving_p())) {
        this._direction = vehicle.direction; // 向きを変更
        this._move_speed = vehicle.speed; // 移動速度を変更
        this._vehicle_getting_on = false; // 乗る動作終了
        return this._transparent = true; // 透明化
      }
    } else if (this._vehicle_getting_off) {
      // 降りる途中？
      if (!(this.moving_p()) && (vehicle.altitude === 0)) {
        this._vehicle_getting_off = false; // 降りる動作終了
        this._vehicle_type = -1; // 乗り物タイプ消去
        return this._transparent = false; // 透明を解除
      }
    } else {
      // 乗り物に乗っている
      return vehicle.sync_with_player(); // プレイヤーと同時に動かす
    }
  }
  //--------------------------------------------------------------------------
  // ● 移動中でない場合の処理
  //     last_moving : 直前に移動中だったか
  //--------------------------------------------------------------------------
  async update_nonmoving(last_moving) {
    if ($game_map.interpreter.running_p()) {
      return;
    }
    if (this.moving_p()) {
      return;
    }
    if (rb.v(last_moving)) {
      if (rb.v((await this.check_touch_event()))) {
        return;
      }
    }
    if (!(rb.v($game_message.visible)) && Input.trigger_p(Input.C)) {
      if (rb.v((await this.get_on_off_vehicle()))) {
        return;
      }
      if (rb.v((await this.check_action_event()))) {
        return;
      }
    }
    if (rb.v(last_moving)) {
      return this.update_encounter();
    }
  }
  //--------------------------------------------------------------------------
  // ● エンカウントの更新
  //--------------------------------------------------------------------------
  update_encounter() {
    if (rb.v($TEST) && Input.press_p(Input.CTRL)) { // テストプレイ中？
      return;
    }
    if (this.in_vehicle_p()) { // 乗り物に乗っている？
      return;
    }
    if ($game_map.bush_p(this._x, this._y)) { // 茂みなら
      return this._encounter_count -= 2; // カウントを 2 減らす
    } else {
      // 茂み以外なら
      return this._encounter_count -= 1; // カウントを 1 減らす
    }
  }
  //--------------------------------------------------------------------------
  // ● 接触（重なり）によるイベント起動判定
  //--------------------------------------------------------------------------
  async check_touch_event() {
    if (this.in_airship_p()) {
      return false;
    }
    return await this.check_event_trigger_here([1, 2]);
  }
  //--------------------------------------------------------------------------
  // ● 決定ボタンによるイベント起動判定
  //--------------------------------------------------------------------------
  async check_action_event() {
    if (this.in_airship_p()) {
      return false;
    }
    if (rb.v((await this.check_event_trigger_here([0])))) {
      return true;
    }
    return await this.check_event_trigger_there([0, 1, 2]);
  }
  //--------------------------------------------------------------------------
  // ● 乗り物の乗降
  //--------------------------------------------------------------------------
  async get_on_off_vehicle() {
    if (!(this.movable_p())) {
      return false;
    }
    if (this.in_vehicle_p()) {
      return await this.get_off_vehicle();
    } else {
      return await this.get_on_vehicle();
    }
  }
  //--------------------------------------------------------------------------
  // ● 乗り物に乗る
  //    現在乗り物に乗っていないことが前提。
  //--------------------------------------------------------------------------
  async get_on_vehicle() {
    let front_x, front_y;
    front_x = $game_map.x_with_direction(this._x, this._direction);
    front_y = $game_map.y_with_direction(this._y, this._direction);
    if ($game_map.airship.pos_p(this._x, this._y)) { // 飛行船と重なっている？
      this.get_on_airship();
      return true;
    } else if ($game_map.ship.pos_p(front_x, front_y)) {
      // 正面に大型船がある？
      await this.get_on_ship();
      return true;
    } else if ($game_map.boat.pos_p(front_x, front_y)) {
      // 正面に小型船がある？
      await this.get_on_boat();
      return true;
    }
    return false;
  }
  //--------------------------------------------------------------------------
  // ● 小型船に乗る
  //--------------------------------------------------------------------------
  async get_on_boat() {
    this._vehicle_getting_on = true; // 乗り込み中フラグ
    this._vehicle_type = 0; // 乗り物タイプ設定
    await this.force_move_forward(); // 一歩前進
    this._walking_bgm = RPG.BGM.last(); // 歩行時の BGM 記憶
    return $game_map.boat.get_on(); // 乗り込み処理
  }
  //--------------------------------------------------------------------------
  // ● 大型船に乗る
  //--------------------------------------------------------------------------
  async get_on_ship() {
    this._vehicle_getting_on = true; // 乗る
    this._vehicle_type = 1; // 乗り物タイプ設定
    await this.force_move_forward(); // 一歩前進
    this._walking_bgm = RPG.BGM.last(); // 歩行時の BGM 記憶
    return $game_map.ship.get_on(); // 乗り込み処理
  }
  //--------------------------------------------------------------------------
  // ● 飛行船に乗る
  //--------------------------------------------------------------------------
  get_on_airship() {
    this._vehicle_getting_on = true; // 乗る動作の開始
    this._vehicle_type = 2; // 乗り物タイプ設定
    this._through = true; // すり抜け ON
    this._walking_bgm = RPG.BGM.last(); // 歩行時の BGM 記憶
    return $game_map.airship.get_on(); // 乗り込み処理
  }
  //--------------------------------------------------------------------------
  // ● 乗り物から降りる
  //    現在乗り物に乗っていることが前提。
  //--------------------------------------------------------------------------
  async get_off_vehicle() {
    let front_x, front_y;
    if (this.in_airship_p()) { // 飛行船
      if (!(this.airship_land_ok_p(this._x, this._y))) {
        return; // 着陸できない？
      }
    } else {
      // 小型船・大型船
      front_x = $game_map.x_with_direction(this._x, this._direction);
      front_y = $game_map.y_with_direction(this._y, this._direction);
      if (!(this.can_walk_p(front_x, front_y))) {
        return; // 接岸できない？
      }
    }
    rb.idx($game_map.vehicles, this._vehicle_type).get_off(); // 降りる処理
    if (this.in_airship_p()) { // 飛行船
      this._direction = 2; // 下を向く
    } else {
      // 小型船・大型船
      await this.force_move_forward(); // 一歩前進
      this._transparent = false; // 透明を解除
    }
    this._vehicle_getting_off = true; // 降りる動作の開始
    this._move_speed = 4; // 移動速度を戻す
    this._through = false; // すり抜け OFF
    this._walking_bgm.play(); // 歩行時の BGM 復帰
    return this.make_encounter_count(); // エンカウント初期化
  }
  //--------------------------------------------------------------------------
  // ● 強制的に一歩前進
  //--------------------------------------------------------------------------
  async force_move_forward() {
    this._through = true; // すり抜け ON
    await this.move_forward(); // 一歩前進
    return this._through = false; // すり抜け OFF
  }
});
