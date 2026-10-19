// 025 - Game_Character: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Character
//------------------------------------------------------------------------------
// 　キャラクターを扱うクラスです。このクラスは Game_Player クラスと Game_Event
// クラスのスーパークラスとして使用されます。
//==============================================================================
//--------------------------------------------------------------------------
// ● 公開インスタンス変数
//--------------------------------------------------------------------------
globalThis.Game_Character = rb.classe("Game_Character", class Game_Character extends rb.Objeto {
  get id() { return this._id; } // ID
  get x() { return this._x; } // マップ X 座標 (論理座標)
  get y() { return this._y; } // マップ Y 座標 (論理座標)
  get real_x() { return this._real_x; } // マップ X 座標 (実座標 * 256)
  get real_y() { return this._real_y; } // マップ Y 座標 (実座標 * 256)
  get tile_id() { return this._tile_id; } // タイル ID  (0 なら無効)
  get character_name() { return this._character_name; } // 歩行グラフィック ファイル名
  get character_index() { return this._character_index; } // 歩行グラフィック インデックス
  get opacity() { return this._opacity; } // 不透明度
  get blend_type() { return this._blend_type; } // 合成方法
  get direction() { return this._direction; } // 向き
  get pattern() { return this._pattern; } // パターン
  get move_route_forcing() { return this._move_route_forcing; } // 移動ルート強制フラグ
  get priority_type() { return this._priority_type; } // プライオリティタイプ
  get through() { return this._through; } // すり抜け
  get bush_depth() { return this._bush_depth; } // 茂み深さ
  get animation_id() { return this._animation_id; }
  set animation_id(v) { this._animation_id = v; } // アニメーション ID
  get balloon_id() { return this._balloon_id; }
  set balloon_id(v) { this._balloon_id = v; } // フキダシアイコン ID
  get transparent() { return this._transparent; }
  set transparent(v) { this._transparent = v; } // 透明状態
  //--------------------------------------------------------------------------
  // ● オブジェクト初期化
  //--------------------------------------------------------------------------
  initialize() {
    this._id = 0;
    this._x = 0;
    this._y = 0;
    this._real_x = 0;
    this._real_y = 0;
    this._tile_id = 0;
    this._character_name = "";
    this._character_index = 0;
    this._opacity = 255;
    this._blend_type = 0;
    this._direction = 2;
    this._pattern = 1;
    this._move_route_forcing = false;
    this._priority_type = 1;
    this._through = false;
    this._bush_depth = 0;
    this._animation_id = 0;
    this._balloon_id = 0;
    this._transparent = false;
    this._original_direction = 2; // 元の向き
    this._original_pattern = 1; // 元のパターン
    this._move_type = 0; // 移動タイプ
    this._move_speed = 4; // 移動速度
    this._move_frequency = 6; // 移動頻度
    this._move_route = null; // 移動ルート
    this._move_route_index = 0; // 移動ルートの実行位置
    this._original_move_route = null; // 元の移動ルート
    this._original_move_route_index = 0; // 元の移動ルートの実行位置
    this._walk_anime = true; // 歩行アニメ
    this._step_anime = false; // 足踏みアニメ
    this._direction_fix = false; // 向き固定
    rb.num(this, "_anime_count", 0, "int"); // アニメカウント
    this._stop_count = 0; // 停止カウント
    this._jump_count = 0; // ジャンプカウント
    this._jump_peak = 0; // ジャンプの頂点のカウント
    this._wait_count = 0; // ウェイトカウント
    this._locked = false; // ロックフラグ
    this._prelock_direction = 0; // ロック前の向き
    this._move_failed = false; // 移動失敗フラグ
  }
  //--------------------------------------------------------------------------
  // ● 移動中判定
  //--------------------------------------------------------------------------
  moving_p() {
    return ((!rb.eq(this._real_x, (this._x * 256)) || !rb.eq(this._real_y, (this._y * 256)))); // 論理座標と比較
  }
  //--------------------------------------------------------------------------
  // ● ジャンプ中判定
  //--------------------------------------------------------------------------
  jumping_p() {
    return (this._jump_count > 0);
  }
  //--------------------------------------------------------------------------
  // ● 停止中判定
  //--------------------------------------------------------------------------
  stopping_p() {
    return (!((this.moving_p() || this.jumping_p())));
  }
  //--------------------------------------------------------------------------
  // ● ダッシュ状態判定
  //--------------------------------------------------------------------------
  dash_p() {
    return false;
  }
  //--------------------------------------------------------------------------
  // ● デバッグすり抜け状態判定
  //--------------------------------------------------------------------------
  debug_through_p() {
    return false;
  }
  //--------------------------------------------------------------------------
  // ● 姿勢の矯正
  //--------------------------------------------------------------------------
  straighten() {
    if ((this._walk_anime || this._step_anime)) {
      this._pattern = 1;
    }
    return rb.num(this, "_anime_count", 0, "int");
  }
  //--------------------------------------------------------------------------
  // ● 移動ルートの強制
  //     move_route : 新しい移動ルート
  //--------------------------------------------------------------------------
  async force_move_route(move_route) {
    if ((this._original_move_route == null)) {
      this._original_move_route = this._move_route;
      this._original_move_route_index = this._move_route_index;
    }
    this._move_route = move_route;
    this._move_route_index = 0;
    this._move_route_forcing = true;
    this._prelock_direction = 0;
    this._wait_count = 0;
    return await this.move_type_custom();
  }
  //--------------------------------------------------------------------------
  // ● 座標一致判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  pos_p(x, y) {
    return ((rb.eq(this._x, x) && rb.eq(this._y, y)));
  }
  //--------------------------------------------------------------------------
  // ● 座標一致と「すり抜け OFF」判定 (nt = No Through)
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  pos_nt_p(x, y) {
    return ((this.pos_p(x, y) && !this._through));
  }
  //--------------------------------------------------------------------------
  // ● 通行可能判定
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  passable_p(x, y) {
    x = $game_map.round_x(x); // 横方向ループ補正
    y = $game_map.round_y(y); // 縦方向ループ補正
    if (!($game_map.valid_p(x, y))) {
      return false; // マップ外？
    }
    if ((this._through || this.debug_through_p())) { // すり抜け ON？
      return true;
    }
    if (!(this.map_passable_p(x, y))) {
      return false; // マップが通行不能？
    }
    if (this.collide_with_characters_p(x, y)) { // キャラクターに衝突？
      return false;
    }
    return true; // 通行可
  }
  //--------------------------------------------------------------------------
  // ● マップ通行可能判定
  //     x : X 座標
  //     y : Y 座標
  //    指定された座標のタイルが通行可能かを取得する。
  //--------------------------------------------------------------------------
  map_passable_p(x, y) {
    return $game_map.passable_p(x, y);
  }
  //--------------------------------------------------------------------------
  // ● キャラクター衝突判定
  //     x : X 座標
  //     y : Y 座標
  //    プレイヤーと乗り物を含め、通常キャラの衝突を検出する。
  //--------------------------------------------------------------------------
  collide_with_characters_p(x, y) {
    let event;
    for (event of $game_map.events_xy(x, y)) { // イベントの座標と一致
      if (!(rb.v(event.through))) {
        // すり抜け OFF？
        if (rb.is_a_p(this, Game_Event)) { // 自分がイベント
          return true;
        }
        if ((event.priority_type === 1)) { // 相手が通常キャラ
          return true;
        }
      }
    }
    if ((this._priority_type === 1)) { // 自分が通常キャラ
      if ($game_player.pos_nt_p(x, y)) { // プレイヤーの座標と一致
        return true;
      }
      if ($game_map.boat.pos_nt_p(x, y)) { // 小型船の座標と一致
        return true;
      }
      if ($game_map.ship.pos_nt_p(x, y)) { // 大型船の座標と一致
        return true;
      }
    }
    return false;
  }
  //--------------------------------------------------------------------------
  // ● ロック (実行中のイベントが立ち止まる処理)
  //--------------------------------------------------------------------------
  get lock() {
    if (!(this._locked)) {
      this._prelock_direction = this._direction;
      this.turn_toward_player();
      return this._locked = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● ロック解除
  //--------------------------------------------------------------------------
  unlock() {
    if (this._locked) {
      this._locked = false;
      return this.set_direction(this._prelock_direction);
    }
  }
  //--------------------------------------------------------------------------
  // ● 指定位置に移動
  //     x : X 座標
  //     y : Y 座標
  //--------------------------------------------------------------------------
  moveto(x, y) {
    this._x = rb.mod(x, $game_map.width);
    this._y = rb.mod(y, $game_map.height);
    this._real_x = (this._x * 256);
    this._real_y = (this._y * 256);
    this._prelock_direction = 0;
    this.straighten();
    return this.update_bush_depth();
  }
  //--------------------------------------------------------------------------
  // ● 指定方向に向き変更
  //     direction : 向き
  //--------------------------------------------------------------------------
  set_direction(direction) {
    if (!(rb.v(this._direction_fix)) && (direction !== 0)) {
      this._direction = direction;
      return this._stop_count = 0;
    }
  }
  //--------------------------------------------------------------------------
  // ● オブジェクトタイプ判定
  //--------------------------------------------------------------------------
  object_p() {
    return (((this._tile_id > 0) || (rb.idx(this._character_name, 0, 1) === "!")));
  }
  //--------------------------------------------------------------------------
  // ● 画面 X 座標の取得
  //--------------------------------------------------------------------------
  get screen_x() {
    return ((rb.div((($game_map.adjust_x(this._real_x) + 8007)), 8) - 1000) + 16);
  }
  //--------------------------------------------------------------------------
  // ● 画面 Y 座標の取得
  //--------------------------------------------------------------------------
  get screen_y() {
    let y, n;
    y = ((rb.div((($game_map.adjust_y(this._real_y) + 8007)), 8) - 1000) + 32);
    if (!(this.object_p())) {
      y -= 4;
    }
    if ((this._jump_count >= this._jump_peak)) {
      n = rb.sub(this._jump_count, this._jump_peak);
    } else {
      n = rb.sub(this._jump_peak, this._jump_count);
    }
    return rb.sub(y, rb.div((rb.sub(rb.mul(this._jump_peak, this._jump_peak), rb.mul(n, n))), 2));
  }
  //--------------------------------------------------------------------------
  // ● 画面 Z 座標の取得
  //--------------------------------------------------------------------------
  screen_z() {
    let pass;
    if ((this._priority_type === 2)) {
      return 200;
    } else if ((this._priority_type === 0)) {
      return 60;
    } else if ((this._tile_id > 0)) {
      pass = rb.idx($game_map.passages, this._tile_id);
      if (((pass & 16) === 16)) { // [☆]
        return 160;
      } else {
        return 40;
      }
    } else {
      return 100;
    }
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    if (this.jumping_p()) { // ジャンプ中
      this.update_jump();
    } else if (this.moving_p()) {
      // 移動中
      this.update_move();
    } else {
      // 停止中
      this.update_stop();
    }
    if ((this._wait_count > 0)) { // ウェイト中
      this._wait_count -= 1;
    } else if (this._move_route_forcing) {
      // 移動ルート強制中
      await this.move_type_custom();
    } else if (!(this._locked)) {
      // ロック中以外
      await this.update_self_movement();
    }
    return this.update_animation();
  }
  //--------------------------------------------------------------------------
  // ● ジャンプ時の更新
  //--------------------------------------------------------------------------
  update_jump() {
    this._jump_count -= 1;
    this._real_x = rb.div((rb.add(rb.mul(this._real_x, this._jump_count), (this._x * 256))), ((this._jump_count + 1)));
    this._real_y = rb.div((rb.add(rb.mul(this._real_y, this._jump_count), (this._y * 256))), ((this._jump_count + 1)));
    return this.update_bush_depth();
  }
  //--------------------------------------------------------------------------
  // ● 移動時の更新
  //--------------------------------------------------------------------------
  update_move() {
    let distance;
    distance = (2 ** this._move_speed); // 移動速度から移動距離に変換
    if (this.dash_p()) { // ダッシュ状態ならさらに倍
      distance *= 2;
    }
    if (((this._x * 256) < this._real_x)) {
      this._real_x = rb.max([rb.sub(this._real_x, distance), (this._x * 256)]);
    }
    if (((this._x * 256) > this._real_x)) {
      this._real_x = rb.min([rb.add(this._real_x, distance), (this._x * 256)]);
    }
    if (((this._y * 256) < this._real_y)) {
      this._real_y = rb.max([rb.sub(this._real_y, distance), (this._y * 256)]);
    }
    if (((this._y * 256) > this._real_y)) {
      this._real_y = rb.min([rb.add(this._real_y, distance), (this._y * 256)]);
    }
    if (!(this.moving_p())) {
      this.update_bush_depth();
    }
    if (this._walk_anime) {
      return rb.num(this, "_anime_count", (this._anime_count + 1.5), "float");
    } else if (this._step_anime) {
      return rb.num(this, "_anime_count", (this._anime_count + 1), null);
    }
  }
  //--------------------------------------------------------------------------
  // ● 停止時の更新
  //--------------------------------------------------------------------------
  update_stop() {
    if (this._step_anime) {
      rb.num(this, "_anime_count", (this._anime_count + 1), null);
    } else if (!rb.eq(this._pattern, this._original_pattern)) {
      rb.num(this, "_anime_count", (this._anime_count + 1.5), "float");
    }
    if (!(this._locked)) {
      return this._stop_count += 1;
    }
  }
  //--------------------------------------------------------------------------
  // ● 自律移動の更新
  //--------------------------------------------------------------------------
  async update_self_movement() {
    if ((this._stop_count > (30 * ((5 - this._move_frequency))))) {
      const caso1 = this._move_type;
      if (caso1 === 1) {
        return await this.move_type_random();
      } else if (caso1 === 2) {
        return await this.move_type_toward_player();
      } else if (caso1 === 3) {
        return await this.move_type_custom();
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● アニメカウントの更新
  //--------------------------------------------------------------------------
  update_animation() {
    let speed;
    speed = rb.add(this._move_speed, ((this.dash_p() ? 1 : 0)));
    if ((this._anime_count > (18 - (speed * 2)))) {
      if (!(this._step_anime) && (this._stop_count > 0)) {
        this._pattern = this._original_pattern;
      } else {
        this._pattern = rb.mod(((this._pattern + 1)), 4);
      }
      return rb.num(this, "_anime_count", 0, "int");
    }
  }
  //--------------------------------------------------------------------------
  // ● 茂み深さの更新
  //--------------------------------------------------------------------------
  update_bush_depth() {
    let bush;
    if (((this.object_p() || (this._priority_type !== 1)) || (this._jump_count > 0))) {
      return this._bush_depth = 0;
    } else {
      bush = $game_map.bush_p(this._x, this._y);
      if (bush && !(this.moving_p())) {
        return this._bush_depth = 8;
      } else if (!(bush)) {
        return this._bush_depth = 0;
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● 移動タイプ : ランダム
  //--------------------------------------------------------------------------
  async move_type_random() {
    const caso2 = rb.rand(6);
    if (rb.caseEq(rb.range(0, 1, false), caso2)) {
      return await this.move_random();
    } else if (rb.caseEq(rb.range(2, 4, false), caso2)) {
      return await this.move_forward();
    } else if (caso2 === 5) {
      return this._stop_count = 0;
    }
  }
  //--------------------------------------------------------------------------
  // ● 移動タイプ : 近づく
  //--------------------------------------------------------------------------
  async move_type_toward_player() {
    let sx, sy;
    sx = rb.sub(this._x, $game_player.x);
    sy = rb.sub(this._y, $game_player.y);
    if ((rb.add(rb.abs(sx), rb.abs(sy)) >= 20)) {
      return await this.move_random();
    } else {
      const caso3 = rb.rand(6);
      if (rb.caseEq(rb.range(0, 3, false), caso3)) {
        return await this.move_toward_player();
      } else if (caso3 === 4) {
        return await this.move_random();
      } else if (caso3 === 5) {
        return await this.move_forward();
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● 移動タイプ : カスタム
  //--------------------------------------------------------------------------
  async move_type_custom() {
    let command;
    if (this.stopping_p()) {
      command = rb.idx(this._move_route.list, this._move_route_index); // 移動コマンドを取得
      this._move_failed = false;
      if ((command.code === 0)) { // リストの最後
        if (rb.v(this._move_route.repeat)) { // [動作を繰り返す]
          return this._move_route_index = 0;
        } else if (this._move_route_forcing) {
          // 移動ルート強制中
          this._move_route_forcing = false; // 強制を解除
          this._move_route = this._original_move_route; // オリジナルを復帰
          this._move_route_index = this._original_move_route_index;
          return this._original_move_route = null;
        }
      } else {
        const caso4 = command.code;
        if (caso4 === 1) { // 下に移動
          await this.move_down();
        } else if (caso4 === 2) { // 左に移動
          await this.move_left();
        } else if (caso4 === 3) { // 右に移動
          await this.move_right();
        } else if (caso4 === 4) { // 上に移動
          await this.move_up();
        } else if (caso4 === 5) { // 左下に移動
          this.move_lower_left();
        } else if (caso4 === 6) { // 右下に移動
          this.move_lower_right();
        } else if (caso4 === 7) { // 左上に移動
          this.move_upper_left();
        } else if (caso4 === 8) { // 右上に移動
          this.move_upper_right();
        } else if (caso4 === 9) { // ランダムに移動
          await this.move_random();
        } else if (caso4 === 10) { // プレイヤーに近づく
          await this.move_toward_player();
        } else if (caso4 === 11) { // プレイヤーから遠ざかる
          await this.move_away_from_player();
        } else if (caso4 === 12) { // 一歩前進
          await this.move_forward();
        } else if (caso4 === 13) { // 一歩後退
          await this.move_backward();
        } else if (caso4 === 14) { // ジャンプ
          this.jump(rb.idx(command.parameters, 0), rb.idx(command.parameters, 1));
        } else if (caso4 === 15) { // ウェイト
          this._wait_count = (rb.idx(command.parameters, 0) - 1);
        } else if (caso4 === 16) { // 下を向く
          this.turn_down();
        } else if (caso4 === 17) { // 左を向く
          this.turn_left();
        } else if (caso4 === 18) { // 右を向く
          this.turn_right();
        } else if (caso4 === 19) { // 上を向く
          this.turn_up();
        } else if (caso4 === 20) { // 右に 90 度回転
          this.turn_right_90();
        } else if (caso4 === 21) { // 左に 90 度回転
          this.turn_left_90();
        } else if (caso4 === 22) { // 180 度回転
          this.turn_180();
        } else if (caso4 === 23) { // 右か左に 90 度回転
          this.turn_right_or_left_90();
        } else if (caso4 === 24) { // ランダムに方向転換
          this.turn_random();
        } else if (caso4 === 25) { // プレイヤーの方を向く
          this.turn_toward_player();
        } else if (caso4 === 26) { // プレイヤーの逆を向く
          this.turn_away_from_player();
        } else if (caso4 === 27) { // スイッチ ON
          rb.idxSet($game_switches, rb.idx(command.parameters, 0), true);
          $game_map.need_refresh = true;
        } else if (caso4 === 28) { // スイッチ OFF
          rb.idxSet($game_switches, rb.idx(command.parameters, 0), false);
          $game_map.need_refresh = true;
        } else if (caso4 === 29) { // 移動速度の変更
          this._move_speed = rb.idx(command.parameters, 0);
        } else if (caso4 === 30) { // 移動頻度の変更
          this._move_frequency = rb.idx(command.parameters, 0);
        } else if (caso4 === 31) { // 歩行アニメ ON
          this._walk_anime = true;
        } else if (caso4 === 32) { // 歩行アニメ OFF
          this._walk_anime = false;
        } else if (caso4 === 33) { // 足踏みアニメ ON
          this._step_anime = true;
        } else if (caso4 === 34) { // 足踏みアニメ OFF
          this._step_anime = false;
        } else if (caso4 === 35) { // 向き固定 ON
          this._direction_fix = true;
        } else if (caso4 === 36) { // 向き固定 OFF
          this._direction_fix = false;
        } else if (caso4 === 37) { // すり抜け ON
          this._through = true;
        } else if (caso4 === 38) { // すり抜け OFF
          this._through = false;
        } else if (caso4 === 39) { // 透明化 ON
          this._transparent = true;
        } else if (caso4 === 40) { // 透明化 OFF
          this._transparent = false;
        } else if (caso4 === 41) { // グラフィック変更
          this.set_graphic(rb.idx(command.parameters, 0), rb.idx(command.parameters, 1));
        } else if (caso4 === 42) { // 不透明度の変更
          this._opacity = rb.idx(command.parameters, 0);
        } else if (caso4 === 43) { // 合成方法の変更
          this._blend_type = rb.idx(command.parameters, 0);
        } else if (caso4 === 44) { // SE の演奏
          rb.idx(command.parameters, 0).play();
        } else if (caso4 === 45) { // スクリプト
          rb.eval(rb.idx(command.parameters, 0)) /* eval pela tabela de rb.eval */;
        }
        if (!(this._move_route.skippable) && this._move_failed) {
          return; // [移動できない場合は無視] OFF & 移動失敗
        }
        return this._move_route_index += 1;
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● 歩数増加
  //--------------------------------------------------------------------------
  increase_steps() {
    this._stop_count = 0;
    return this.update_bush_depth();
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーからの X 距離計算
  //--------------------------------------------------------------------------
  distance_x_from_player() {
    let sx;
    sx = rb.sub(this._x, $game_player.x);
    if ($game_map.loop_horizontal_p()) { // 横にループしているとき
      if ((rb.abs(sx) > rb.div($game_map.width, 2))) { // 絶対値がマップの半分より大きい？
        sx = rb.sub(sx, $game_map.width); // マップの幅を引く
      }
    }
    return sx;
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーからの Y 距離計算
  //--------------------------------------------------------------------------
  distance_y_from_player() {
    let sy;
    sy = rb.sub(this._y, $game_player.y);
    if ($game_map.loop_vertical_p()) { // 縦にループしているとき
      if ((rb.abs(sy) > rb.div($game_map.height, 2))) { // 絶対値がマップの半分より大きい？
        sy = rb.sub(sy, $game_map.height); // マップの高さを引く
      }
    }
    return sy;
  }
  //--------------------------------------------------------------------------
  // ● 下に移動
  //     turn_ok : その場での向き変更を許可
  //--------------------------------------------------------------------------
  async move_down(turn_ok = true) {
    if (this.passable_p(this._x, (this._y + 1))) { // 通行可能
      this.turn_down();
      this._y = $game_map.round_y((this._y + 1));
      this._real_y = (((this._y - 1)) * 256);
      this.increase_steps();
      return this._move_failed = false;
    } else {
      // 通行不可能
      if (rb.v(turn_ok)) {
        this.turn_down();
      }
      await this.check_event_trigger_touch(this._x, (this._y + 1)); // 接触イベントの起動判定
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 左に移動
  //     turn_ok : その場での向き変更を許可
  //--------------------------------------------------------------------------
  async move_left(turn_ok = true) {
    if (this.passable_p((this._x - 1), this._y)) { // 通行可能
      this.turn_left();
      this._x = $game_map.round_x((this._x - 1));
      this._real_x = (((this._x + 1)) * 256);
      this.increase_steps();
      return this._move_failed = false;
    } else {
      // 通行不可能
      if (rb.v(turn_ok)) {
        this.turn_left();
      }
      await this.check_event_trigger_touch((this._x - 1), this._y); // 接触イベントの起動判定
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 右に移動
  //     turn_ok : その場での向き変更を許可
  //--------------------------------------------------------------------------
  async move_right(turn_ok = true) {
    if (this.passable_p((this._x + 1), this._y)) { // 通行可能
      this.turn_right();
      this._x = $game_map.round_x((this._x + 1));
      this._real_x = (((this._x - 1)) * 256);
      this.increase_steps();
      return this._move_failed = false;
    } else {
      // 通行不可能
      if (rb.v(turn_ok)) {
        this.turn_right();
      }
      await this.check_event_trigger_touch((this._x + 1), this._y); // 接触イベントの起動判定
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 上に移動
  //     turn_ok : その場での向き変更を許可
  //--------------------------------------------------------------------------
  async move_up(turn_ok = true) {
    if (this.passable_p(this._x, (this._y - 1))) { // 通行可能
      this.turn_up();
      this._y = $game_map.round_y((this._y - 1));
      this._real_y = (((this._y + 1)) * 256);
      this.increase_steps();
      return this._move_failed = false;
    } else {
      // 通行不可能
      if (rb.v(turn_ok)) {
        this.turn_up();
      }
      await this.check_event_trigger_touch(this._x, (this._y - 1)); // 接触イベントの起動判定
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 左下に移動
  //--------------------------------------------------------------------------
  move_lower_left() {
    if (!(rb.v(this._direction_fix))) {
      this._direction = (((this._direction === 6) ? 4 : ((this._direction === 8) ? 2 : this._direction)));
    }
    if (((this.passable_p(this._x, (this._y + 1)) && this.passable_p((this._x - 1), (this._y + 1))) || (this.passable_p((this._x - 1), this._y) && this.passable_p((this._x - 1), (this._y + 1))))) {
      this._x -= 1;
      this._y += 1;
      this.increase_steps();
      return this._move_failed = false;
    } else {
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 右下に移動
  //--------------------------------------------------------------------------
  move_lower_right() {
    if (!(rb.v(this._direction_fix))) {
      this._direction = (((this._direction === 4) ? 6 : ((this._direction === 8) ? 2 : this._direction)));
    }
    if (((this.passable_p(this._x, (this._y + 1)) && this.passable_p((this._x + 1), (this._y + 1))) || (this.passable_p((this._x + 1), this._y) && this.passable_p((this._x + 1), (this._y + 1))))) {
      this._x += 1;
      this._y += 1;
      this.increase_steps();
      return this._move_failed = false;
    } else {
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 左上に移動
  //--------------------------------------------------------------------------
  move_upper_left() {
    if (!(rb.v(this._direction_fix))) {
      this._direction = (((this._direction === 6) ? 4 : ((this._direction === 2) ? 8 : this._direction)));
    }
    if (((this.passable_p(this._x, (this._y - 1)) && this.passable_p((this._x - 1), (this._y - 1))) || (this.passable_p((this._x - 1), this._y) && this.passable_p((this._x - 1), (this._y - 1))))) {
      this._x -= 1;
      this._y -= 1;
      this.increase_steps();
      return this._move_failed = false;
    } else {
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 右上に移動
  //--------------------------------------------------------------------------
  move_upper_right() {
    if (!(rb.v(this._direction_fix))) {
      this._direction = (((this._direction === 4) ? 6 : ((this._direction === 2) ? 8 : this._direction)));
    }
    if (((this.passable_p(this._x, (this._y - 1)) && this.passable_p((this._x + 1), (this._y - 1))) || (this.passable_p((this._x + 1), this._y) && this.passable_p((this._x + 1), (this._y - 1))))) {
      this._x += 1;
      this._y -= 1;
      this.increase_steps();
      return this._move_failed = false;
    } else {
      return this._move_failed = true;
    }
  }
  //--------------------------------------------------------------------------
  // ● ランダムに移動
  //--------------------------------------------------------------------------
  async move_random() {
    const caso5 = rb.rand(4);
    if (caso5 === 0) {
      return await this.move_down(false);
    } else if (caso5 === 1) {
      return await this.move_left(false);
    } else if (caso5 === 2) {
      return await this.move_right(false);
    } else if (caso5 === 3) {
      return await this.move_up(false);
    }
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーに近づく
  //--------------------------------------------------------------------------
  async move_toward_player() {
    let sx, sy;
    sx = this.distance_x_from_player();
    sy = this.distance_y_from_player();
    if (((sx !== 0) || (sy !== 0))) {
      if ((rb.abs(sx) > rb.abs(sy))) { // 横の距離のほうが長い
        ((sx > 0) ? (await this.move_left()) : (await this.move_right()));
        // 左右方向を優先
        if (this._move_failed && (sy !== 0)) {
          return ((sy > 0) ? (await this.move_up()) : (await this.move_down()));
        }
      } else {
        // 縦の距離のほうが長いか等しい
        ((sy > 0) ? (await this.move_up()) : (await this.move_down()));
        // 上下方向を優先
        if (this._move_failed && (sx !== 0)) {
          return ((sx > 0) ? (await this.move_left()) : (await this.move_right()));
        }
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーから遠ざかる
  //--------------------------------------------------------------------------
  async move_away_from_player() {
    let sx, sy;
    sx = this.distance_x_from_player();
    sy = this.distance_y_from_player();
    if (((sx !== 0) || (sy !== 0))) {
      if ((rb.abs(sx) > rb.abs(sy))) { // 横の距離のほうが長い
        ((sx > 0) ? (await this.move_right()) : (await this.move_left()));
        // 左右方向を優先
        if (this._move_failed && (sy !== 0)) {
          return ((sy > 0) ? (await this.move_down()) : (await this.move_up()));
        }
      } else {
        // 縦の距離のほうが長いか等しい
        ((sy > 0) ? (await this.move_down()) : (await this.move_up()));
        // 上下方向を優先
        if (this._move_failed && (sx !== 0)) {
          return ((sx > 0) ? (await this.move_right()) : (await this.move_left()));
        }
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● 一歩前進
  //--------------------------------------------------------------------------
  async move_forward() {
    const caso6 = this._direction;
    if (caso6 === 2) {
      return await this.move_down(false);
    } else if (caso6 === 4) {
      return await this.move_left(false);
    } else if (caso6 === 6) {
      return await this.move_right(false);
    } else if (caso6 === 8) {
      return await this.move_up(false);
    }
  }
  //--------------------------------------------------------------------------
  // ● 一歩後退
  //--------------------------------------------------------------------------
  async move_backward() {
    let last_direction_fix;
    last_direction_fix = this._direction_fix;
    this._direction_fix = true;
    const caso7 = this._direction;
    if (caso7 === 2) {
      await this.move_up(false);
    } else if (caso7 === 4) {
      await this.move_right(false);
    } else if (caso7 === 6) {
      await this.move_left(false);
    } else if (caso7 === 8) {
      await this.move_down(false);
    }
    return this._direction_fix = last_direction_fix;
  }
  //--------------------------------------------------------------------------
  // ● ジャンプ
  //     x_plus : X 座標加算値
  //     y_plus : Y 座標加算値
  //--------------------------------------------------------------------------
  jump(x_plus, y_plus) {
    let distance;
    if ((rb.abs(x_plus) > rb.abs(y_plus))) { // 横の距離のほうが長い
      ((x_plus < 0) ? this.turn_left() : this.turn_right());
    } else if ((rb.abs(x_plus) > rb.abs(y_plus))) {
      // 縦の距離のほうが長い
      ((y_plus < 0) ? this.turn_up() : this.turn_down());
    }
    this._x = rb.add(this._x, x_plus);
    this._y = rb.add(this._y, y_plus);
    distance = rb.round(rb.Math.sqrt(rb.add(rb.mul(x_plus, x_plus), rb.mul(y_plus, y_plus))));
    this._jump_peak = ((10 + distance) - this._move_speed);
    this._jump_count = (this._jump_peak * 2);
    this._stop_count = 0;
    return this.straighten();
  }
  //--------------------------------------------------------------------------
  // ● 下を向く
  //--------------------------------------------------------------------------
  turn_down() {
    return this.set_direction(2);
  }
  //--------------------------------------------------------------------------
  // ● 左を向く
  //--------------------------------------------------------------------------
  turn_left() {
    return this.set_direction(4);
  }
  //--------------------------------------------------------------------------
  // ● 右を向く
  //--------------------------------------------------------------------------
  turn_right() {
    return this.set_direction(6);
  }
  //--------------------------------------------------------------------------
  // ● 上を向く
  //--------------------------------------------------------------------------
  turn_up() {
    return this.set_direction(8);
  }
  //--------------------------------------------------------------------------
  // ● 右に 90 度回転
  //--------------------------------------------------------------------------
  turn_right_90() {
    const caso8 = this._direction;
    if (caso8 === 2) {
      return this.turn_left();
    } else if (caso8 === 4) {
      return this.turn_up();
    } else if (caso8 === 6) {
      return this.turn_down();
    } else if (caso8 === 8) {
      return this.turn_right();
    }
  }
  //--------------------------------------------------------------------------
  // ● 左に 90 度回転
  //--------------------------------------------------------------------------
  turn_left_90() {
    const caso9 = this._direction;
    if (caso9 === 2) {
      return this.turn_right();
    } else if (caso9 === 4) {
      return this.turn_down();
    } else if (caso9 === 6) {
      return this.turn_up();
    } else if (caso9 === 8) {
      return this.turn_left();
    }
  }
  //--------------------------------------------------------------------------
  // ● 180 度回転
  //--------------------------------------------------------------------------
  turn_180() {
    const caso10 = this._direction;
    if (caso10 === 2) {
      return this.turn_up();
    } else if (caso10 === 4) {
      return this.turn_right();
    } else if (caso10 === 6) {
      return this.turn_left();
    } else if (caso10 === 8) {
      return this.turn_down();
    }
  }
  //--------------------------------------------------------------------------
  // ● 右か左に 90 度回転
  //--------------------------------------------------------------------------
  turn_right_or_left_90() {
    const caso11 = rb.rand(2);
    if (caso11 === 0) {
      return this.turn_right_90();
    } else if (caso11 === 1) {
      return this.turn_left_90();
    }
  }
  //--------------------------------------------------------------------------
  // ● ランダムに方向転換
  //--------------------------------------------------------------------------
  turn_random() {
    const caso12 = rb.rand(4);
    if (caso12 === 0) {
      return this.turn_up();
    } else if (caso12 === 1) {
      return this.turn_right();
    } else if (caso12 === 2) {
      return this.turn_left();
    } else if (caso12 === 3) {
      return this.turn_down();
    }
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーの方を向く
  //--------------------------------------------------------------------------
  turn_toward_player() {
    let sx, sy;
    sx = this.distance_x_from_player();
    sy = this.distance_y_from_player();
    if ((rb.abs(sx) > rb.abs(sy))) { // 横の距離のほうが長い
      return ((sx > 0) ? this.turn_left() : this.turn_right());
    } else if ((rb.abs(sx) < rb.abs(sy))) {
      // 縦の距離のほうが長い
      return ((sy > 0) ? this.turn_up() : this.turn_down());
    }
  }
  //--------------------------------------------------------------------------
  // ● プレイヤーの逆を向く
  //--------------------------------------------------------------------------
  turn_away_from_player() {
    let sx, sy;
    sx = this.distance_x_from_player();
    sy = this.distance_y_from_player();
    if ((rb.abs(sx) > rb.abs(sy))) { // 横の距離のほうが長い
      return ((sx > 0) ? this.turn_right() : this.turn_left());
    } else if ((rb.abs(sx) < rb.abs(sy))) {
      // 縦の距離のほうが長い
      return ((sy > 0) ? this.turn_down() : this.turn_up());
    }
  }
  //--------------------------------------------------------------------------
  // ● グラフィックの変更
  //     character_name  : 新しい歩行グラフィック ファイル名
  //     character_index : 新しい歩行グラフィック インデックス
  //--------------------------------------------------------------------------
  set_graphic(character_name, character_index) {
    this._tile_id = 0;
    this._character_name = character_name;
    return this._character_index = character_index;
  }
});
