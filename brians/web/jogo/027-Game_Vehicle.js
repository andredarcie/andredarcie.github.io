// 027 - Game_Vehicle: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Vehicle
//------------------------------------------------------------------------------
// 　乗り物を扱うクラスです。このクラスは Game_Map クラスの内部で使用されます。
// 現在のマップに乗り物がないときは、マップ座標 (-1,-1) に設定されます。
//==============================================================================
globalThis.Game_Vehicle = rb.classe("Game_Vehicle", class Game_Vehicle extends Game_Character {
});
//--------------------------------------------------------------------------
// ● 定数
//--------------------------------------------------------------------------
Game_Vehicle.MAX_ALTITUDE = 32; // 飛行船が飛ぶ高さ
//--------------------------------------------------------------------------
// ● 公開インスタンス変数
//--------------------------------------------------------------------------
rb.reabrir(Game_Vehicle, class extends rb.superDe(Game_Vehicle) {
  get type() { return this._type; } // 乗り物タイプ (0..2)
  get altitude() { return this._altitude; } // 高さ (飛行船用)
  get driving() { return this._driving; } // 運転中フラグ
  //--------------------------------------------------------------------------
  // ● オブジェクト初期化
  //     type : 乗り物タイプ (0:小型船 1:大型船 2:飛行船)
  //--------------------------------------------------------------------------
  initialize(type) {
    super.initialize();
    this._type = type;
    this._altitude = 0;
    this._driving = false;
    this._direction = 4;
    this._walk_anime = false;
    this._step_anime = false;
    this.load_system_settings();
  }
  //--------------------------------------------------------------------------
  // ● システム設定のロード
  //--------------------------------------------------------------------------
  load_system_settings() {
    let sys_vehicle;
    const caso1 = this._type;
    if (caso1 === 0) {
      sys_vehicle = $data_system.boat;
    } else if (caso1 === 1) {
      sys_vehicle = $data_system.ship;
    } else if (caso1 === 2) {
      sys_vehicle = $data_system.airship;
    } else {
      sys_vehicle = null;
    }
    if ((sys_vehicle != null)) {
      this._character_name = sys_vehicle.character_name;
      this._character_index = sys_vehicle.character_index;
      this._bgm = sys_vehicle.bgm;
      this._map_id = sys_vehicle.start_map_id;
      this._x = sys_vehicle.start_x;
      return this._y = sys_vehicle.start_y;
    }
  }
  //--------------------------------------------------------------------------
  // ● リフレッシュ
  //--------------------------------------------------------------------------
  refresh() {
    if (this._driving) {
      this._map_id = $game_map.map_id;
      this.sync_with_player();
    } else if (rb.eq(this._map_id, $game_map.map_id)) {
      this.moveto(this._x, this._y);
    }
    const caso2 = this._type;
    if (caso2 === 0) {
      this._priority_type = 1;
      this._move_speed = 4;
    } else if (caso2 === 1) {
      this._priority_type = 1;
      this._move_speed = 5;
    } else if (caso2 === 2) {
      this._priority_type = (this._driving ? 2 : 0);
      this._move_speed = 6;
    }
    this._walk_anime = this._driving;
    return this._step_anime = this._driving;
  }
  //--------------------------------------------------------------------------
  // ● 位置の変更
  //     map_id : マップ ID
  //     x      : X 座標
  //     y      : Y 座標
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 座標一致判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  pos_p(x, y) {
    return (rb.e(rb.eq(this._map_id, $game_map.map_id), () => super.pos_p(x, y)));
  }
  //--------------------------------------------------------------------------
  // ● 透明判定
  //--------------------------------------------------------------------------
  get transparent() {
    return (rb.ou(!rb.eq(this._map_id, $game_map.map_id), () => super.transparent));
  }
  //--------------------------------------------------------------------------
  // ● 乗り物に乗る
  //--------------------------------------------------------------------------
  get_on() {
    this._driving = true;
    this._walk_anime = true;
    this._step_anime = true;
    if ((this._type === 2)) { // 飛行船の場合
      this._priority_type = 2; // プライオリティを「通常キャラの上」に変更
    }
    return this._bgm.play(); // BGM 開始
  }
  //--------------------------------------------------------------------------
  // ● 乗り物から降りる
  //--------------------------------------------------------------------------
  get_off() {
    this._driving = false;
    this._walk_anime = false;
    this._step_anime = false;
    return this._direction = 4;
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーとの同期
  //--------------------------------------------------------------------------
  sync_with_player() {
    this._x = $game_player.x;
    this._y = $game_player.y;
    this._real_x = $game_player.real_x;
    this._real_y = $game_player.real_y;
    this._direction = $game_player.direction;
    return this.update_bush_depth();
  }
  //--------------------------------------------------------------------------
  // ● 速度の取得
  //--------------------------------------------------------------------------
  get speed() {
    return this._move_speed;
  }
  //--------------------------------------------------------------------------
  // ● 画面 Y 座標の取得
  //--------------------------------------------------------------------------
  get screen_y() {
    return rb.sub(super.screen_y, this.altitude);
  }
  //--------------------------------------------------------------------------
  // ● 移動可能判定
  //--------------------------------------------------------------------------
  movable_p() {
    if (((this._type === 2) && (this._altitude < Game_Vehicle.MAX_ALTITUDE))) {
      return false;
    }
    return (!this.moving_p());
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    await super.update();
    if ((this._type === 2)) { // 飛行船の場合
      if (this._driving) {
        if ((this._altitude < Game_Vehicle.MAX_ALTITUDE)) {
          return this._altitude += 1; // 高度を上げる
        }
      } else if ((this._altitude > 0)) {
        this._altitude -= 1; // 高度を下げる
        if ((this._altitude === 0)) {
          return this._priority_type = 0; // プライオリティを「通常キャラの下」に戻す
        }
      }
    }
  }
  // fora do escopo (nada do jogo chama): set_location
});
