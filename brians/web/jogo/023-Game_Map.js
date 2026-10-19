// 023 - Game_Map: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Map
//------------------------------------------------------------------------------
// 　マップを扱うクラスです。スクロールや通行可能判定などの機能を持っています。
// このクラスのインスタンスは $game_map で参照されます。
//==============================================================================
//--------------------------------------------------------------------------
// ● 公開インスタンス変数
//--------------------------------------------------------------------------
globalThis.Game_Map = rb.classe("Game_Map", class Game_Map extends rb.Objeto {
  get screen() { return this._screen; } // マップ画面の状態
  get interpreter() { return this._interpreter; } // マップイベント用インタプリタ
  get display_x() { return this._display_x; } // 表示 X 座標 * 256
  get display_y() { return this._display_y; } // 表示 Y 座標 * 256
  get parallax_name() { return this._parallax_name; } // 遠景 ファイル名
  get passages() { return this._passages; } // 通行 テーブル
  get events() { return this._events; } // イベント
  get vehicles() { return this._vehicles; } // 乗り物
  get need_refresh() { return this._need_refresh; }
  set need_refresh(v) { this._need_refresh = v; } // リフレッシュ要求フラグ
  //--------------------------------------------------------------------------
  // ● オブジェクト初期化
  //--------------------------------------------------------------------------
  async initialize() {
    this._screen = Game_Screen.new();
    this._interpreter = (await Game_Interpreter.new(0, true));
    this._map_id = 0;
    this._display_x = 0;
    this._display_y = 0;
    this.create_vehicles();
  }
  //--------------------------------------------------------------------------
  // ● セットアップ
  //     map_id : マップ ID
  //--------------------------------------------------------------------------
  async setup(map_id) {
    this._map_id = map_id;
    this._map = load_data(rb.sprintf("Data/Map%03d.rvdata", this._map_id));
    this._display_x = 0;
    this._display_y = 0;
    this._passages = $data_system.passages;
    this.referesh_vehicles();
    await this.setup_events();
    this.setup_scroll();
    this.setup_parallax();
    return this._need_refresh = false;
  }
  //--------------------------------------------------------------------------
  // ● 乗り物の作成
  //--------------------------------------------------------------------------
  create_vehicles() {
    this._vehicles = [];
    rb.idxSet(this._vehicles, 0, Game_Vehicle.new(0)); // 小型船
    rb.idxSet(this._vehicles, 1, Game_Vehicle.new(1)); // 大型船
    return rb.idxSet(this._vehicles, 2, Game_Vehicle.new(2)); // 飛行船
  }
  //--------------------------------------------------------------------------
  // ● 乗り物のリフレッシュ
  //--------------------------------------------------------------------------
  referesh_vehicles() {
    let vehicle;
    for (vehicle of this._vehicles) {
      vehicle.refresh();
    }
  }
  //--------------------------------------------------------------------------
  // ● 小型船の取得
  //--------------------------------------------------------------------------
  get boat() {
    return rb.idx(this._vehicles, 0);
  }
  //--------------------------------------------------------------------------
  // ● 大型船の取得
  //--------------------------------------------------------------------------
  get ship() {
    return rb.idx(this._vehicles, 1);
  }
  //--------------------------------------------------------------------------
  // ● 飛行船の取得
  //--------------------------------------------------------------------------
  get airship() {
    return rb.idx(this._vehicles, 2);
  }
  //--------------------------------------------------------------------------
  // ● イベントのセットアップ
  //--------------------------------------------------------------------------
  async setup_events() {
    let i;
    this._events = rb.hash([]); // マップイベント
    for (i of rb.keys(this._map.events)) {
      rb.idxSet(this._events, i, (await Game_Event.new(this._map_id, rb.idx(this._map.events, i))));
    }
    this._common_events = rb.hash([]); // コモンイベント
    for (i of rb.range(1, rb.size($data_common_events), true)) {
      rb.idxSet(this._common_events, i, (await Game_CommonEvent.new(i)));
    }
  }
  //--------------------------------------------------------------------------
  // ● スクロールのセットアップ
  //--------------------------------------------------------------------------
  setup_scroll() {
    this._scroll_direction = 2;
    this._scroll_rest = 0;
    this._scroll_speed = 4;
    this._margin_x = rb.div((((this.width - 17)) * 256), 2); // 画面非表示分の横幅 / 2
    return this._margin_y = rb.div((((this.height - 13)) * 256), 2); // 画面非表示分の縦幅 / 2
  }
  //--------------------------------------------------------------------------
  // ● 遠景のセットアップ
  //--------------------------------------------------------------------------
  setup_parallax() {
    this._parallax_name = this._map.parallax_name;
    this._parallax_loop_x = this._map.parallax_loop_x;
    this._parallax_loop_y = this._map.parallax_loop_y;
    this._parallax_sx = this._map.parallax_sx;
    this._parallax_sy = this._map.parallax_sy;
    this._parallax_x = 0;
    return this._parallax_y = 0;
  }
  //--------------------------------------------------------------------------
  // ● 表示位置の設定
  //     x : 新しい表示 X 座標 (*256)
  //     y : 新しい表示 Y 座標 (*256)
  //--------------------------------------------------------------------------
  set_display_pos(x, y) {
    this._display_x = rb.mod((rb.add(x, (this._map.width * 256))), ((this._map.width * 256)));
    this._display_y = rb.mod((rb.add(y, (this._map.height * 256))), ((this._map.height * 256)));
    this._parallax_x = x;
    return this._parallax_y = y;
  }
  //--------------------------------------------------------------------------
  // ● 遠景表示 X 座標の計算
  //     bitmap : 遠景ビットマップ
  //--------------------------------------------------------------------------
  calc_parallax_x(bitmap) {
    let w1, w2;
    if ((bitmap == null)) {
      return 0;
    } else if (rb.v(this._parallax_loop_x)) {
      return rb.div(this._parallax_x, 16);
    } else if (this.loop_horizontal_p()) {
      return 0;
    } else {
      w1 = (bitmap.width - 544);
      w2 = ((this._map.width * 32) - 544);
      if (((w1 <= 0) || (w2 <= 0))) {
        return 0;
      } else {
        return rb.div(rb.div(rb.mul(this._parallax_x, w1), w2), 8);
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● 遠景表示 Y 座標の計算
  //     bitmap : 遠景ビットマップ
  //--------------------------------------------------------------------------
  calc_parallax_y(bitmap) {
    let h1, h2;
    if ((bitmap == null)) {
      return 0;
    } else if (rb.v(this._parallax_loop_y)) {
      return rb.div(this._parallax_y, 16);
    } else if (this.loop_vertical_p()) {
      return 0;
    } else {
      h1 = (bitmap.height - 416);
      h2 = ((this._map.height * 32) - 416);
      if (((h1 <= 0) || (h2 <= 0))) {
        return 0;
      } else {
        return rb.div(rb.div(rb.mul(this._parallax_y, h1), h2), 8);
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● マップ ID の取得
  //--------------------------------------------------------------------------
  get map_id() {
    return this._map_id;
  }
  //--------------------------------------------------------------------------
  // ● 幅の取得
  //--------------------------------------------------------------------------
  get width() {
    return this._map.width;
  }
  //--------------------------------------------------------------------------
  // ● 高さの取得
  //--------------------------------------------------------------------------
  get height() {
    return this._map.height;
  }
  //--------------------------------------------------------------------------
  // ● 横方向にループするか？
  //--------------------------------------------------------------------------
  loop_horizontal_p() {
    return (((this._map.scroll_type === 2) || (this._map.scroll_type === 3)));
  }
  //--------------------------------------------------------------------------
  // ● 縦方向にループするか？
  //--------------------------------------------------------------------------
  loop_vertical_p() {
    return (((this._map.scroll_type === 1) || (this._map.scroll_type === 3)));
  }
  //--------------------------------------------------------------------------
  // ● ダッシュ禁止か否かの取得
  //--------------------------------------------------------------------------
  disable_dash_p() {
    return this._map.disable_dashing;
  }
  //--------------------------------------------------------------------------
  // ● エンカウントリストの取得
  //--------------------------------------------------------------------------
  get encounter_list() {
    return this._map.encounter_list;
  }
  //--------------------------------------------------------------------------
  // ● エンカウント歩数の取得
  //--------------------------------------------------------------------------
  get encounter_step() {
    return this._map.encounter_step;
  }
  //--------------------------------------------------------------------------
  // ● マップデータの取得
  //--------------------------------------------------------------------------
  get data() {
    return this._map.data;
  }
  //--------------------------------------------------------------------------
  // ● 表示座標を差し引いた X 座標の計算
  //     x : X 座標
  //--------------------------------------------------------------------------
  adjust_x(x) {
    if (this.loop_horizontal_p() && (x < rb.sub(this._display_x, this._margin_x))) {
      return rb.add(rb.sub(x, this._display_x), (this._map.width * 256));
    } else {
      return rb.sub(x, this._display_x);
    }
  }
  //--------------------------------------------------------------------------
  // ● 表示座標を差し引いた Y 座標の計算
  //     y : Y 座標
  //--------------------------------------------------------------------------
  adjust_y(y) {
    if (this.loop_vertical_p() && (y < rb.sub(this._display_y, this._margin_y))) {
      return rb.add(rb.sub(y, this._display_y), (this._map.height * 256));
    } else {
      return rb.sub(y, this._display_y);
    }
  }
  //--------------------------------------------------------------------------
  // ● ループ補正後の X 座標計算
  //     x : X 座標
  //--------------------------------------------------------------------------
  round_x(x) {
    if (this.loop_horizontal_p()) {
      return rb.mod((rb.add(x, this.width)), this.width);
    } else {
      return x;
    }
  }
  //--------------------------------------------------------------------------
  // ● ループ補正後の Y 座標計算
  //     y : Y 座標
  //--------------------------------------------------------------------------
  round_y(y) {
    if (this.loop_vertical_p()) {
      return rb.mod((rb.add(y, this.height)), this.height);
    } else {
      return y;
    }
  }
  //--------------------------------------------------------------------------
  // ● 特定の方向に 1 マスずらした X 座標の計算
  //     x         : X 座標
  //     direction : 方向 (2,4,6,8)
  //--------------------------------------------------------------------------
  x_with_direction(x, direction) {
    return this.round_x(rb.add(x, (((direction === 6) ? 1 : ((direction === 4) ? -1 : 0)))));
  }
  //--------------------------------------------------------------------------
  // ● 特定の方向に 1 マスずらした Y 座標の計算
  //     y         : Y 座標
  //     direction : 方向 (2,4,6,8)
  //--------------------------------------------------------------------------
  y_with_direction(y, direction) {
    return this.round_y(rb.add(y, (((direction === 2) ? 1 : ((direction === 8) ? -1 : 0)))));
  }
  //--------------------------------------------------------------------------
  // ● 指定座標に存在するイベントの配列取得
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  events_xy(x, y) {
    let result, event;
    result = [];
    for (event of rb.values($game_map.events)) {
      if (event.pos_p(x, y)) {
        rb.push(result, event);
      }
    }
    return result;
  }
  //--------------------------------------------------------------------------
  // ● BGM / BGS 自動切り替え
  //--------------------------------------------------------------------------
  autoplay() {
    if (this._map.autoplay_bgm) {
      this._map.bgm.play();
    }
    if (this._map.autoplay_bgs) {
      return this._map.bgs.play();
    }
  }
  //--------------------------------------------------------------------------
  // ● リフレッシュ
  //--------------------------------------------------------------------------
  async refresh() {
    let event, common_event;
    if ((this._map_id > 0)) {
      for (event of rb.values(this._events)) {
        await event.refresh();
      }
      for (common_event of rb.values(this._common_events)) {
        await common_event.refresh();
      }
    }
    return this._need_refresh = false;
  }
  //--------------------------------------------------------------------------
  // ● 下にスクロール
  //     distance : スクロールする距離
  //--------------------------------------------------------------------------
  scroll_down(distance) {
    let last_y;
    if (this.loop_vertical_p()) {
      this._display_y = rb.add(this._display_y, distance);
      this._display_y = rb.mod(this._display_y, (this._map.height * 256));
      return this._parallax_y = rb.add(this._parallax_y, distance);
    } else {
      last_y = this._display_y;
      this._display_y = rb.min([rb.add(this._display_y, distance), (((this.height - 13)) * 256)]);
      return this._parallax_y = rb.add(this._parallax_y, rb.sub(this._display_y, last_y));
    }
  }
  //--------------------------------------------------------------------------
  // ● 左にスクロール
  //     distance : スクロールする距離
  //--------------------------------------------------------------------------
  scroll_left(distance) {
    let last_x;
    if (this.loop_horizontal_p()) {
      this._display_x = rb.add(this._display_x, rb.sub((this._map.width * 256), distance));
      this._display_x = rb.mod(this._display_x, (this._map.width * 256));
      return this._parallax_x = rb.sub(this._parallax_x, distance);
    } else {
      last_x = this._display_x;
      this._display_x = rb.max([rb.sub(this._display_x, distance), 0]);
      return this._parallax_x = rb.add(this._parallax_x, rb.sub(this._display_x, last_x));
    }
  }
  //--------------------------------------------------------------------------
  // ● 右にスクロール
  //     distance : スクロールする距離
  //--------------------------------------------------------------------------
  scroll_right(distance) {
    let last_x;
    if (this.loop_horizontal_p()) {
      this._display_x = rb.add(this._display_x, distance);
      this._display_x = rb.mod(this._display_x, (this._map.width * 256));
      return this._parallax_x = rb.add(this._parallax_x, distance);
    } else {
      last_x = this._display_x;
      this._display_x = rb.min([rb.add(this._display_x, distance), (((this.width - 17)) * 256)]);
      return this._parallax_x = rb.add(this._parallax_x, rb.sub(this._display_x, last_x));
    }
  }
  //--------------------------------------------------------------------------
  // ● 上にスクロール
  //     distance : スクロールする距離
  //--------------------------------------------------------------------------
  scroll_up(distance) {
    let last_y;
    if (this.loop_vertical_p()) {
      this._display_y = rb.add(this._display_y, rb.sub((this._map.height * 256), distance));
      this._display_y = rb.mod(this._display_y, (this._map.height * 256));
      return this._parallax_y = rb.sub(this._parallax_y, distance);
    } else {
      last_y = this._display_y;
      this._display_y = rb.max([rb.sub(this._display_y, distance), 0]);
      return this._parallax_y = rb.add(this._parallax_y, rb.sub(this._display_y, last_y));
    }
  }
  //--------------------------------------------------------------------------
  // ● 有効座標判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  valid_p(x, y) {
    return (((((x >= 0) && (x < this.width)) && (y >= 0)) && (y < this.height)));
  }
  //--------------------------------------------------------------------------
  // ● 通行可能判定
  //     x    : X 座標
  //     y    : Y 座標
  //     flag : 調べる通行禁止ビット (通常 0x01、乗り物の場合のみ変更)
  //--------------------------------------------------------------------------
  passable_p(x, y, flag = 1) {
    let event, pass, i, tile_id;
    for (event of this.events_xy(x, y)) { // 座標が一致するイベントを調べる
      if ((event.tile_id === 0)) { // グラフィックがタイルではない
        continue;
      }
      if ((event.priority_type > 0)) { // [通常キャラの下] ではない
        continue;
      }
      if (rb.v(event.through)) { // すり抜け状態
        continue;
      }
      pass = rb.idx(this._passages, event.tile_id); // 通行属性を取得
      if (((pass & 16) === 16)) { // [☆] : 通行に影響しない
        continue;
      }
      if ((rb.and(pass, flag) === 0)) { // [○] : 通行可
        return true;
      }
      if (rb.eq(rb.and(pass, flag), flag)) { // [×] : 通行不可
        return false;
      }
    }
    for (i of [2, 1, 0]) { // レイヤーの上から順に調べる
      tile_id = rb.idx(this._map.data, x, y, i); // タイル ID を取得
      if ((tile_id == null)) { // タイル ID 取得失敗 : 通行不可
        return false;
      }
      pass = rb.idx(this._passages, tile_id); // 通行属性を取得
      if (((pass & 16) === 16)) { // [☆] : 通行に影響しない
        continue;
      }
      if ((rb.and(pass, flag) === 0)) { // [○] : 通行可
        return true;
      }
      if (rb.eq(rb.and(pass, flag), flag)) { // [×] : 通行不可
        return false;
      }
    }
    return false; // 通行不可
  }
  //--------------------------------------------------------------------------
  // ● 小型船の通行可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  boat_passable_p(x, y) {
    return this.passable_p(x, y, 2);
  }
  //--------------------------------------------------------------------------
  // ● 大型船の通行可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  ship_passable_p(x, y) {
    return this.passable_p(x, y, 4);
  }
  //--------------------------------------------------------------------------
  // ● 飛行船の着陸可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  airship_land_ok_p(x, y) {
    return this.passable_p(x, y, 8);
  }
  //--------------------------------------------------------------------------
  // ● 茂み判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  bush_p(x, y) {
    if (!(this.valid_p(x, y))) {
      return false;
    }
    return ((rb.idx(this._passages, rb.idx(this._map.data, x, y, 1)) & 64) === 64);
  }
  //--------------------------------------------------------------------------
  // ● カウンター判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  counter_p(x, y) {
    if (!(this.valid_p(x, y))) {
      return false;
    }
    return ((rb.idx(this._passages, rb.idx(this._map.data, x, y, 0)) & 128) === 128);
  }
  //--------------------------------------------------------------------------
  // ● スクロールの開始
  //     direction : スクロールする方向
  //     distance  : スクロールする距離
  //     speed     : スクロールする速度
  //--------------------------------------------------------------------------
  start_scroll(direction, distance, speed) {
    this._scroll_direction = direction;
    this._scroll_rest = (distance * 256);
    return this._scroll_speed = speed;
  }
  //--------------------------------------------------------------------------
  // ● スクロール中判定
  //--------------------------------------------------------------------------
  scrolling_p() {
    return (this._scroll_rest > 0);
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    if ($game_map.need_refresh) {
      await this.refresh();
    }
    this.update_scroll();
    await this.update_events();
    await this.update_vehicles();
    this.update_parallax();
    return this._screen.update();
  }
  //--------------------------------------------------------------------------
  // ● スクロールの更新
  //--------------------------------------------------------------------------
  update_scroll() {
    let distance;
    if ((this._scroll_rest > 0)) { // スクロール中の場合
      distance = (2 ** this._scroll_speed); // マップ座標系での距離に変換
      const caso1 = this._scroll_direction;
      if (caso1 === 2) { // 下
        this.scroll_down(distance);
      } else if (caso1 === 4) { // 左
        this.scroll_left(distance);
      } else if (caso1 === 6) { // 右
        this.scroll_right(distance);
      } else if (caso1 === 8) { // 上
        this.scroll_up(distance);
      }
      return this._scroll_rest = rb.sub(this._scroll_rest, distance); // スクロールした距離を減算
    }
  }
  //--------------------------------------------------------------------------
  // ● イベントの更新
  //--------------------------------------------------------------------------
  async update_events() {
    let event, common_event;
    for (event of rb.values(this._events)) {
      await event.update();
    }
    for (common_event of rb.values(this._common_events)) {
      await common_event.update();
    }
  }
  //--------------------------------------------------------------------------
  // ● 乗り物の更新
  //--------------------------------------------------------------------------
  async update_vehicles() {
    let vehicle;
    for (vehicle of this._vehicles) {
      await vehicle.update();
    }
  }
  //--------------------------------------------------------------------------
  // ● 遠景の更新
  //--------------------------------------------------------------------------
  update_parallax() {
    if (rb.v(this._parallax_loop_x)) {
      this._parallax_x = rb.add(this._parallax_x, (this._parallax_sx * 4));
    }
    if (rb.v(this._parallax_loop_y)) {
      return this._parallax_y = rb.add(this._parallax_y, (this._parallax_sy * 4));
    }
  }
});
