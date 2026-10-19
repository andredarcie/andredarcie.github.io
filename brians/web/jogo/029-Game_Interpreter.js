// 029 - Game_Interpreter: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Interpreter
//------------------------------------------------------------------------------
// 　イベントコマンドを実行するインタプリタです。このクラスは Game_Map クラス、
// Game_Troop クラス、Game_Event クラスの内部で使用されます。
//==============================================================================
//--------------------------------------------------------------------------
// ● オブジェクト初期化
//     depth : ネストの深さ
//     main  : メインフラグ
//--------------------------------------------------------------------------
globalThis.Game_Interpreter = rb.classe("Game_Interpreter", class Game_Interpreter extends rb.Objeto {
  async initialize(depth = 0, main = false) {
    this._depth = depth;
    this._main = main;
    if ((this._depth > 100)) {
      await print("Você excedeu o uso máximo de eventos comuns (100).");
      rb.exit();
    }
    this.clear();
  }
  //--------------------------------------------------------------------------
  // ● クリア
  //--------------------------------------------------------------------------
  clear() {
    this._map_id = 0; // 起動時のマップ ID
    this._original_event_id = 0; // 起動時のイベント ID
    this._event_id = 0; // イベント ID
    this._list = null; // 実行内容
    this._index = 0; // インデックス
    this._message_waiting = false; // メッセージ終了待機中
    this._moving_character = null; // 移動中のキャラクター
    this._wait_count = 0; // ウェイトカウント
    this._child_interpreter = null; // 子インタプリタ
    return this._branch = rb.hash([]); // 分岐データ
  }
  //--------------------------------------------------------------------------
  // ● イベントのセットアップ
  //     list     : 実行内容
  //     event_id : イベント ID
  //--------------------------------------------------------------------------
  setup(list, event_id = 0) {
    this.clear(); // インタプリタの内部状態をクリア
    this._map_id = $game_map.map_id; // マップ ID を記憶
    this._original_event_id = event_id; // イベント ID を記憶
    this._event_id = event_id; // イベント ID を記憶
    this._list = list; // 実行内容を記憶
    this._index = 0; // インデックスを初期化
    return this.cancel_menu_call(); // メニュー呼び出しの取り消し
  }
  //--------------------------------------------------------------------------
  // ● メニュー呼び出しの取り消し
  //    プレイヤーの移動中にキャンセルボタンが押され、メニュー画面の呼び出し
  //    が予約された状態でイベントが起動した場合の対策を行う。
  //--------------------------------------------------------------------------
  cancel_menu_call() {
    if (rb.v(this._main) && ($game_temp.next_scene === "menu") && $game_temp.menu_beep) {
      $game_temp.next_scene = null;
      $game_temp.menu_beep = false;
    }
  }
  //--------------------------------------------------------------------------
  // ● 実行中判定
  //--------------------------------------------------------------------------
  running_p() {
    return (this._list != null);
  }
  //--------------------------------------------------------------------------
  // ● 起動中イベントのセットアップ
  //--------------------------------------------------------------------------
  async setup_starting_event() {
    let event;
    if ($game_map.need_refresh) { // 必要ならマップをリフレッシュ
      await $game_map.refresh();
    }
    if (($game_temp.common_event_id > 0)) { // コモンイベントの呼び出し予約？
      this.setup(rb.idx($data_common_events, $game_temp.common_event_id).list);
      $game_temp.common_event_id = 0;
      return;
    }
    for (event of rb.values($game_map.events)) { // マップイベント
      if (event.starting) { // 起動中のイベントが見つかった場合
        event.clear_starting(); // 起動中フラグをクリア
        this.setup(event.list, rb.id(event)); // イベントをセットアップ
        return;
      }
    }
    for (event of rb.compact($data_common_events)) { // コモンイベント
      if ((event.trigger === 1) && (rb.idx($game_switches, event.switch_id) === true)) { // 条件スイッチが ON の場合
        // トリガーが自動実行かつ
        this.setup(event.list); // イベントをセットアップ
        return;
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    while (true) {
      if (!rb.eq($game_map.map_id, this._map_id)) { // マップがイベント起動時と異なる
        this._event_id = 0; // イベント ID を 0 にする
      }
      if ((this._child_interpreter != null)) { // 子インタプリタが存在する場合
        await this._child_interpreter.update(); // 子インタプリタを更新
        if (this._child_interpreter.running_p()) { // 実行中の場合
          return; // 戻る
        } else {
          // 実行が終わった場合
          this._child_interpreter = null; // 子インタプリタを消去
        }
      }
      if (this._message_waiting) { // メッセージ終了待機中
        return;
      }
      if ((this._moving_character != null)) { // 移動完了待機中
        if (this._moving_character.move_route_forcing) {
          return;
        }
        this._moving_character = null;
      }
      if ((this._wait_count > 0)) { // ウェイト中
        this._wait_count -= 1;
        return;
      }
      if (($game_troop.forcing_battler != null)) { // 戦闘行動の強制中
        return;
      }
      if (($game_temp.next_scene != null)) { // 各種画面を開く途中
        return;
      }
      if ((this._list == null)) { // 実行内容リストが空の場合
        if (rb.v(this._main)) { // 起動中のイベントをセットアップ
          await this.setup_starting_event();
        }
        if ((this._list == null)) { // 何もセットアップされなかった
          return;
        }
      }
      if (((await this.execute_command()) === false)) { // イベントコマンドの実行
        return;
      }
      this._index += 1; // インデックスを進める
    }
  }
  //--------------------------------------------------------------------------
  // ● アクター用イテレータ (ID)
  //     param : 1 以上なら ID、0 なら全体
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● アクター用イテレータ (インデックス)
  //     param : 0 以上ならインデックス、-1 なら全体
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラ用イテレータ (インデックス)
  //     param : 0 以上ならインデックス、-1 なら全体
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● バトラー用イテレータ (敵グループ全体、パーティ全体を考慮)
  //     param1 : 0 なら敵キャラ、1 ならアクター
  //     param2 : 0 以上ならインデックス、-1 なら全体
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 画面系コマンドの対象取得
  //--------------------------------------------------------------------------
  get screen() {
    if ($game_temp.in_battle) {
      return $game_troop.screen;
    } else {
      return $game_map.screen;
    }
  }
  //--------------------------------------------------------------------------
  // ● イベントコマンドの実行
  //--------------------------------------------------------------------------
  async execute_command() {
    if ((this._index >= (rb.size(this._list) - 1))) {
      this.command_end();
      return true;
    } else {
      this._params = rb.idx(this._list, this._index).parameters;
      this._indent = rb.idx(this._list, this._index).indent;
      const caso1 = rb.idx(this._list, this._index).code;
      if (caso1 === 101) { // 文章の表示
        return this.command_101();
      } else if (caso1 === 102) { // 選択肢の表示
        return this.command_102();
      } else if (caso1 === 402) { // [**] の場合
        return this.command_402();
      } else if (caso1 === 403) { // キャンセルの場合
        return this.command_403();
      } else if (caso1 === 103) { // 数値入力の処理
        return this.command_103();
      } else if (caso1 === 111) { // 条件分岐
        return await this.command_111();
      } else if (caso1 === 411) { // それ以外の場合
        return this.command_411();
      } else if (caso1 === 112) { // ループ
        return this.command_112();
      } else if (caso1 === 413) { // 以上繰り返し
        return this.command_413();
      } else if (caso1 === 113) { // ループの中断
        return this.command_113();
      } else if (caso1 === 115) { // イベント処理の中断
        return this.command_115();
      } else if (caso1 === 117) { // コモンイベント
        return await this.command_117();
      } else if (caso1 === 118) { // ラベル
        return this.command_118();
      } else if (caso1 === 119) { // ラベルジャンプ
        return this.command_119();
      } else if (caso1 === 121) { // スイッチの操作
        return this.command_121();
      } else if (caso1 === 122) { // 変数の操作
        return this.command_122();
      } else if (caso1 === 123) { // セルフスイッチの操作
        return this.command_123();
      } else if (caso1 === 124) { // タイマーの操作
        return this.command_124();
      } else if (caso1 === 125) { // 所持金の増減
        return this.command_125();
      } else if (caso1 === 126) { // アイテムの増減
        return this.command_126();
      } else if (caso1 === 127) { // 武器の増減
        return this.command_127();
      } else if (caso1 === 128) { // 防具の増減
        return this.command_128();
      } else if (caso1 === 129) { // メンバーの入れ替え
        return await this.command_129();
      } else if (caso1 === 132) { // バトル BGM の変更
        return this.command_132();
      } else if (caso1 === 133) { // バトル終了 ME の変更
        return this.command_133();
      } else if (caso1 === 134) { // セーブ禁止の変更
        return this.command_134();
      } else if (caso1 === 135) { // メニュー禁止の変更
        return this.command_135();
      } else if (caso1 === 136) { // エンカウント禁止の変更
        return this.command_136();
      } else if (caso1 === 201) { // 場所移動
        return this.command_201();
      } else if (caso1 === 202) { // 乗り物の位置設定
        return this.command_202();
      } else if (caso1 === 203) { // イベントの位置設定
        return await this.command_203();
      } else if (caso1 === 204) { // マップのスクロール
        return this.command_204();
      } else if (caso1 === 205) { // 移動ルートの設定
        return await this.command_205();
      } else if (caso1 === 206) { // 乗り物の乗降
        return await this.command_206();
      } else if (caso1 === 211) { // 透明状態の変更
        return this.command_211();
      } else if (caso1 === 212) { // アニメーションの表示
        return this.command_212();
      } else if (caso1 === 213) { // フキダシアイコンの表示
        return this.command_213();
      } else if (caso1 === 214) { // イベントの一時消去
        return await this.command_214();
      } else if (caso1 === 221) { // 画面のフェードアウト
        return this.command_221();
      } else if (caso1 === 222) { // 画面のフェードイン
        return this.command_222();
      } else if (caso1 === 223) { // 画面の色調変更
        return this.command_223();
      } else if (caso1 === 224) { // 画面のフラッシュ
        return this.command_224();
      } else if (caso1 === 225) { // 画面のシェイク
        return this.command_225();
      } else if (caso1 === 230) { // ウェイト
        return this.command_230();
      } else if (caso1 === 231) { // ピクチャの表示
        return this.command_231();
      } else if (caso1 === 232) { // ピクチャの移動
        return this.command_232();
      } else if (caso1 === 233) { // ピクチャの回転
        return this.command_233();
      } else if (caso1 === 234) { // ピクチャの色調変更
        return this.command_234();
      } else if (caso1 === 235) { // ピクチャの消去
        return await this.command_235();
      } else if (caso1 === 236) { // 天候の設定
        return this.command_236();
      } else if (caso1 === 241) { // BGM の演奏
        return this.command_241();
      } else if (caso1 === 242) { // BGM のフェードアウト
        return this.command_242();
      } else if (caso1 === 245) { // BGS の演奏
        return this.command_245();
      } else if (caso1 === 246) { // BGS のフェードアウト
        return this.command_246();
      } else if (caso1 === 249) { // ME の演奏
        return this.command_249();
      } else if (caso1 === 250) { // SE の演奏
        return this.command_250();
      } else if (caso1 === 251) { // SE の停止
        return this.command_251();
      } else if (caso1 === 301) { // バトルの処理
        return this.command_301();
      } else if (caso1 === 601) { // 勝った場合
        return this.command_601();
      } else if (caso1 === 602) { // 逃げた場合
        return this.command_602();
      } else if (caso1 === 603) { // 負けた場合
        return this.command_603();
      } else if (caso1 === 302) { // ショップの処理
        return this.command_302();
      } else if (caso1 === 303) { // 名前入力の処理
        return this.command_303();
      } else if (caso1 === 311) { // HP の増減
        return await this.command_311();
      } else if (caso1 === 312) { // MP の増減
        return await this.command_312();
      } else if (caso1 === 313) { // ステートの変更
        return await this.command_313();
      } else if (caso1 === 314) { // 全回復
        return await this.command_314();
      } else if (caso1 === 315) { // 経験値の増減
        return await this.command_315();
      } else if (caso1 === 316) { // レベルの増減
        return await this.command_316();
      } else if (caso1 === 317) { // 能力値の増減
        return this.command_317();
      } else if (caso1 === 318) { // スキルの増減
        return this.command_318();
      } else if (caso1 === 319) { // 装備の変更
        return this.command_319();
      } else if (caso1 === 320) { // 名前の変更
        return this.command_320();
      } else if (caso1 === 321) { // 職業の変更
        return this.command_321();
      } else if (caso1 === 322) { // アクターのグラフィック変更
        return this.command_322();
      } else if (caso1 === 323) { // 乗り物のグラフィック変更
        return this.command_323();
      } else if (caso1 === 331) { // 敵キャラの HP 増減
        return await this.command_331();
      } else if (caso1 === 332) { // 敵キャラの MP 増減
        return await this.command_332();
      } else if (caso1 === 333) { // 敵キャラのステート変更
        return await this.command_333();
      } else if (caso1 === 334) { // 敵キャラの全回復
        return await this.command_334();
      } else if (caso1 === 335) { // 敵キャラの出現
        return this.command_335();
      } else if (caso1 === 336) { // 敵キャラの変身
        return this.command_336();
      } else if (caso1 === 337) { // 戦闘アニメーションの表示
        return await this.command_337();
      } else if (caso1 === 339) { // 戦闘行動の強制
        return await this.command_339();
      } else if (caso1 === 340) { // バトルの中断
        return this.command_340();
      } else if (caso1 === 351) { // メニュー画面を開く
        return this.command_351();
      } else if (caso1 === 352) { // セーブ画面を開く
        return this.command_352();
      } else if (caso1 === 353) { // ゲームオーバー
        return this.command_353();
      } else if (caso1 === 354) { // タイトル画面に戻す
        return this.command_354();
      } else if (caso1 === 355) { // スクリプト
        return await this.command_355();
      } else {
        // その他
        return true;
      }
    }
  }
  //--------------------------------------------------------------------------
  // ● イベントの終了
  //--------------------------------------------------------------------------
  command_end() {
    this._list = null; // 実行内容リストをクリア
    if (rb.v(this._main) && (this._event_id > 0)) { // メインのマップイベントの場合
      return rb.idx($game_map.events, this._event_id).unlock(); // イベントのロックを解除
    }
  }
  //--------------------------------------------------------------------------
  // ● コマンドスキップ
  //--------------------------------------------------------------------------
  command_skip() {
    while ((rb.idx(this._list, (this._index + 1)).indent > this._indent)) { // 次のインデントが基準より深い間
      this._index += 1; // インデックスを進める
    }
  }
  //--------------------------------------------------------------------------
  // ● キャラクターの取得
  //     param : -1 ならプレイヤー、0 ならこのイベント、それ以外はイベント ID
  //--------------------------------------------------------------------------
  get_character(param) {
    let events;
    const caso2 = param;
    if (caso2 === -1) { // プレイヤー
      return $game_player;
    } else if (caso2 === 0) { // このイベント
      events = $game_map.events;
      return ((events == null) ? null : rb.idx(events, this._event_id));
    } else {
      // 特定のイベント
      events = $game_map.events;
      return ((events == null) ? null : rb.idx(events, param));
    }
  }
  //--------------------------------------------------------------------------
  // ● 操作する値の計算
  //     operation    : 操作 (0:増やす 1:減らす)
  //     operand_type : オペランドタイプ (0:定数 1:変数)
  //     operand      : オペランド (数値または変数 ID)
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 文章の表示
  //--------------------------------------------------------------------------
  command_101() {
    if (!(rb.v($game_message.busy()))) {
      $game_message.face_name = rb.idx(this._params, 0);
      $game_message.face_index = rb.idx(this._params, 1);
      $game_message.background = rb.idx(this._params, 2);
      $game_message.position = rb.idx(this._params, 3);
      this._index += 1;
      while ((rb.idx(this._list, this._index).code === 401)) { // 文章データ
        rb.push($game_message.texts, rb.idx(rb.idx(this._list, this._index).parameters, 0));
        this._index += 1;
      }
      if ((rb.idx(this._list, this._index).code === 102)) { // 選択肢の表示
        this.setup_choices(rb.idx(this._list, this._index).parameters);
      } else if ((rb.idx(this._list, this._index).code === 103)) {
        // 数値入力の処理
        this.setup_num_input(rb.idx(this._list, this._index).parameters);
      }
      this.set_message_waiting(); // メッセージ待機状態にする
    }
    return false;
  }
  //--------------------------------------------------------------------------
  // ● メッセージ待機中フラグおよびコールバックの設定
  //--------------------------------------------------------------------------
  set_message_waiting() {
    this._message_waiting = true;
    $game_message.main_proc = () => {
      return this._message_waiting = false;
    };
  }
  //--------------------------------------------------------------------------
  // ● 選択肢の表示
  //--------------------------------------------------------------------------
  command_102() {
    if (!(rb.v($game_message.busy()))) {
      this.setup_choices(this._params); // セットアップ
      this.set_message_waiting(); // メッセージ待機状態にする
    }
    return false;
  }
  //--------------------------------------------------------------------------
  // ● 選択肢のセットアップ
  //--------------------------------------------------------------------------
  setup_choices(params) {
    let s;
    if ((rb.size($game_message.texts) <= (4 - rb.size(rb.idx(params, 0))))) {
      $game_message.choice_start = rb.size($game_message.texts);
      $game_message.choice_max = rb.size(rb.idx(params, 0));
      for (s of rb.idx(params, 0)) {
        rb.push($game_message.texts, s);
      }
      $game_message.choice_cancel_type = rb.idx(params, 1);
      $game_message.choice_proc = (n) => {
        return rb.idxSet(this._branch, this._indent, n);
      };
      return this._index += 1;
    }
  }
  //--------------------------------------------------------------------------
  // ● [**] の場合
  //--------------------------------------------------------------------------
  command_402() {
    if (rb.eq(rb.idx(this._branch, this._indent), rb.idx(this._params, 0))) { // 該当する選択肢の場合
      rb.delete(this._branch, this._indent); // 分岐データを削除
      return true; // 継続
    } else {
      // 条件に該当しない場合
      return this.command_skip(); // コマンドスキップ
    }
  }
  command_403() { return rb.foraDoEscopo("Game_Interpreter#command_403", "nenhum evento usa o comando 403"); }
  command_103() { return rb.foraDoEscopo("Game_Interpreter#command_103", "nenhum evento usa o comando 103"); }
  //--------------------------------------------------------------------------
  // ● キャンセルの場合
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 数値入力の処理
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 数値入力のセットアップ
  //--------------------------------------------------------------------------
  setup_num_input(params) {
    if ((rb.size($game_message.texts) < 4)) {
      $game_message.num_input_variable_id = rb.idx(params, 0);
      $game_message.num_input_digits_max = rb.idx(params, 1);
      return this._index += 1;
    }
  }
  //--------------------------------------------------------------------------
  // ● 条件分岐
  //--------------------------------------------------------------------------
  async command_111() {
    let result, value1, value2, key, sec, actor, enemy, character;
    result = false;
    const caso3 = rb.idx(this._params, 0);
    if (caso3 === 0) { // スイッチ
      result = (rb.eq(rb.idx($game_switches, rb.idx(this._params, 1)), ((rb.idx(this._params, 2) === 0))));
    } else if (caso3 === 1) { // 変数
      value1 = rb.idx($game_variables, rb.idx(this._params, 1));
      if ((rb.idx(this._params, 2) === 0)) {
        value2 = rb.idx(this._params, 3);
      } else {
        value2 = rb.idx($game_variables, rb.idx(this._params, 3));
      }
      const caso4 = rb.idx(this._params, 4);
      if (caso4 === 0) { // と同値
        result = (rb.eq(value1, value2));
      } else if (caso4 === 1) { // 以上
        result = ((value1 >= value2));
      } else if (caso4 === 2) { // 以下
        result = ((value1 <= value2));
      } else if (caso4 === 3) { // 超
        result = ((value1 > value2));
      } else if (caso4 === 4) { // 未満
        result = ((value1 < value2));
      } else if (caso4 === 5) { // 以外
        result = (!rb.eq(value1, value2));
      }
    } else if (caso3 === 2) { // セルフスイッチ
      if ((this._original_event_id > 0)) {
        key = [this._map_id, this._original_event_id, rb.idx(this._params, 1)];
        if ((rb.idx(this._params, 2) === 0)) {
          result = ((rb.idx($game_self_switches, key) === true));
        } else {
          result = ((rb.idx($game_self_switches, key) !== true));
        }
      }
    } else if (caso3 === 3) { // タイマー
      if ($game_system.timer_working) {
        sec = rb.div($game_system.timer, Graphics.frame_rate);
        if ((rb.idx(this._params, 2) === 0)) {
          result = ((sec >= rb.idx(this._params, 1)));
        } else {
          result = ((sec <= rb.idx(this._params, 1)));
        }
      }
    } else if (caso3 === 4) { // アクター
      actor = rb.idx($game_actors, rb.idx(this._params, 1));
      if ((actor != null)) {
        const caso5 = rb.idx(this._params, 2);
        if (caso5 === 0) { // パーティにいる
          result = (rb.include_p($game_party.members, actor));
        } else if (caso5 === 1) { // 名前
          result = (rb.eq(actor.name, rb.idx(this._params, 3)));
        } else if (caso5 === 2) { // スキル
          result = (actor.skill_learn_p(rb.idx($data_skills, rb.idx(this._params, 3))));
        } else if (caso5 === 3) { // 武器
          result = (rb.include_p(actor.weapons(), rb.idx($data_weapons, rb.idx(this._params, 3))));
        } else if (caso5 === 4) { // 防具
          result = (rb.include_p(actor.armors(), rb.idx($data_armors, rb.idx(this._params, 3))));
        } else if (caso5 === 5) { // ステート
          result = (actor.state_p(rb.idx(this._params, 3)));
        }
      }
    } else if (caso3 === 5) { // 敵キャラ
      enemy = rb.idx($game_troop.members, rb.idx(this._params, 1));
      if ((enemy != null)) {
        const caso6 = rb.idx(this._params, 2);
        if (caso6 === 0) { // 出現している
          result = (enemy.exist_p());
        } else if (caso6 === 1) { // ステート
          result = (enemy.state_p(rb.idx(this._params, 3)));
        }
      }
    } else if (caso3 === 6) { // キャラクター
      character = this.get_character(rb.idx(this._params, 1));
      if ((character != null)) {
        result = (rb.eq(character.direction, rb.idx(this._params, 2)));
      }
    } else if (caso3 === 7) { // ゴールド
      if ((rb.idx(this._params, 2) === 0)) {
        result = (($game_party.gold >= rb.idx(this._params, 1)));
      } else {
        result = (($game_party.gold <= rb.idx(this._params, 1)));
      }
    } else if (caso3 === 8) { // アイテム
      result = $game_party.has_item_p(rb.idx($data_items, rb.idx(this._params, 1)));
    } else if (caso3 === 9) { // 武器
      result = $game_party.has_item_p(rb.idx($data_weapons, rb.idx(this._params, 1)), rb.idx(this._params, 2));
    } else if (caso3 === 10) { // 防具
      result = $game_party.has_item_p(rb.idx($data_armors, rb.idx(this._params, 1)), rb.idx(this._params, 2));
    } else if (caso3 === 11) { // ボタン
      result = Input.press_p(rb.idx(this._params, 1));
    } else if (caso3 === 12) { // スクリプト
      result = (await rb.eval(rb.idx(this._params, 1)));
    } else if (caso3 === 13) { // 乗り物
      result = (rb.eq($game_player.vehicle_type, rb.idx(this._params, 1)));
    }
    rb.idxSet(this._branch, this._indent, result); // 判定結果をハッシュに格納
    if ((rb.idx(this._branch, this._indent) === true)) {
      rb.delete(this._branch, this._indent);
      return true;
    }
    return this.command_skip();
  }
  //--------------------------------------------------------------------------
  // ● それ以外の場合
  //--------------------------------------------------------------------------
  command_411() {
    if ((rb.idx(this._branch, this._indent) === false)) {
      rb.delete(this._branch, this._indent);
      return true;
    }
    return this.command_skip();
  }
  command_112() { return rb.foraDoEscopo("Game_Interpreter#command_112", "nenhum evento usa o comando 112"); }
  command_413() { return rb.foraDoEscopo("Game_Interpreter#command_413", "nenhum evento usa o comando 413"); }
  command_113() { return rb.foraDoEscopo("Game_Interpreter#command_113", "nenhum evento usa o comando 113"); }
  command_115() { return rb.foraDoEscopo("Game_Interpreter#command_115", "nenhum evento usa o comando 115"); }
  command_117() { return rb.foraDoEscopo("Game_Interpreter#command_117", "nenhum evento usa o comando 117"); }
  command_118() { return rb.foraDoEscopo("Game_Interpreter#command_118", "nenhum evento usa o comando 118"); }
  command_119() { return rb.foraDoEscopo("Game_Interpreter#command_119", "nenhum evento usa o comando 119"); }
  //--------------------------------------------------------------------------
  // ● ループ
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 以上繰り返し
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ループの中断
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● イベント処理の中断
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● コモンイベント
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ラベル
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ラベルジャンプ
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● スイッチの操作
  //--------------------------------------------------------------------------
  command_121() {
    let i;
    for (i of rb.range(rb.idx(this._params, 0), rb.idx(this._params, 1), false)) { // 一括操作ループ
      rb.idxSet($game_switches, i, ((rb.idx(this._params, 2) === 0)));
    }
    $game_map.need_refresh = true;
    return true;
  }
  //--------------------------------------------------------------------------
  // ● 変数の操作
  //--------------------------------------------------------------------------
  command_122() {
    let value, actor, enemy, character, i;
    value = 0;
    const caso7 = rb.idx(this._params, 3);
    // オペランド
    if (caso7 === 0) { // 定数
      value = rb.idx(this._params, 4);
    } else if (caso7 === 1) { // 変数
      value = rb.idx($game_variables, rb.idx(this._params, 4));
    } else if (caso7 === 2) { // 乱数
      value = (rb.idx(this._params, 4) + rb.rand((rb.sub(rb.idx(this._params, 5), rb.idx(this._params, 4)) + 1)));
    } else if (caso7 === 3) { // アイテム
      value = $game_party.item_number(rb.idx($data_items, rb.idx(this._params, 4)));
    } else if (caso7 === 4) { // アクター
      actor = rb.idx($game_actors, rb.idx(this._params, 4));
      if ((actor != null)) {
        const caso8 = rb.idx(this._params, 5);
        if (caso8 === 0) { // レベル
          value = actor.level;
        } else if (caso8 === 1) { // 経験値
          value = actor.exp;
        } else if (caso8 === 2) { // HP
          value = actor.hp;
        } else if (caso8 === 3) { // MP
          value = actor.mp;
        } else if (caso8 === 4) { // MaxHP
          value = actor.maxhp;
        } else if (caso8 === 5) { // MaxMP
          value = actor.maxmp;
        } else if (caso8 === 6) { // 攻撃力
          value = actor.atk;
        } else if (caso8 === 7) { // 防御力
          value = actor.def;
        } else if (caso8 === 8) { // 精神力
          value = actor.spi;
        } else if (caso8 === 9) { // 敏捷性
          value = actor.agi;
        }
      }
    } else if (caso7 === 5) { // 敵キャラ
      enemy = rb.idx($game_troop.members, rb.idx(this._params, 4));
      if ((enemy != null)) {
        const caso9 = rb.idx(this._params, 5);
        if (caso9 === 0) { // HP
          value = enemy.hp;
        } else if (caso9 === 1) { // MP
          value = enemy.mp;
        } else if (caso9 === 2) { // MaxHP
          value = enemy.maxhp;
        } else if (caso9 === 3) { // MaxMP
          value = enemy.maxmp;
        } else if (caso9 === 4) { // 攻撃力
          value = enemy.atk;
        } else if (caso9 === 5) { // 防御力
          value = enemy.def;
        } else if (caso9 === 6) { // 精神力
          value = enemy.spi;
        } else if (caso9 === 7) { // 敏捷性
          value = enemy.agi;
        }
      }
    } else if (caso7 === 6) { // キャラクター
      character = this.get_character(rb.idx(this._params, 4));
      if ((character != null)) {
        const caso10 = rb.idx(this._params, 5);
        if (caso10 === 0) { // X 座標
          value = character.x;
        } else if (caso10 === 1) { // Y 座標
          value = character.y;
        } else if (caso10 === 2) { // 向き
          value = character.direction;
        } else if (caso10 === 3) { // 画面 X 座標
          value = character.screen_x;
        } else if (caso10 === 4) { // 画面 Y 座標
          value = character.screen_y;
        }
      }
    } else if (caso7 === 7) { // その他
      const caso11 = rb.idx(this._params, 4);
      if (caso11 === 0) { // マップ ID
        value = $game_map.map_id;
      } else if (caso11 === 1) { // パーティ人数
        value = rb.size($game_party.members);
      } else if (caso11 === 2) { // ゴールド
        value = $game_party.gold;
      } else if (caso11 === 3) { // 歩数
        value = $game_party.steps;
      } else if (caso11 === 4) { // プレイ時間
        value = rb.div(Graphics.frame_count, Graphics.frame_rate);
      } else if (caso11 === 5) { // タイマー
        value = rb.div($game_system.timer, Graphics.frame_rate);
      } else if (caso11 === 6) { // セーブ回数
        value = $game_system.save_count;
      }
    }
    for (i of rb.range(rb.idx(this._params, 0), rb.idx(this._params, 1), false)) { // 一括操作ループ
      const caso12 = rb.idx(this._params, 2);
      // 操作
      if (caso12 === 0) { // 代入
        rb.idxSet($game_variables, i, value);
      } else if (caso12 === 1) { // 加算
        rb.idxSet($game_variables, i, rb.add(rb.idx($game_variables, i), value));
      } else if (caso12 === 2) { // 減算
        rb.idxSet($game_variables, i, rb.sub(rb.idx($game_variables, i), value));
      } else if (caso12 === 3) { // 乗算
        rb.idxSet($game_variables, i, rb.mul(rb.idx($game_variables, i), value));
      } else if (caso12 === 4) { // 除算
        if ((value !== 0)) {
          rb.idxSet($game_variables, i, rb.div(rb.idx($game_variables, i), value));
        }
      } else if (caso12 === 5) { // 剰余
        if ((value !== 0)) {
          rb.idxSet($game_variables, i, rb.mod(rb.idx($game_variables, i), value));
        }
      }
      if ((rb.idx($game_variables, i) > 99999999)) { // 上限チェック
        rb.idxSet($game_variables, i, 99999999);
      }
      if ((rb.idx($game_variables, i) < -99999999)) { // 下限チェック
        rb.idxSet($game_variables, i, -99999999);
      }
    }
    $game_map.need_refresh = true;
    return true;
  }
  //--------------------------------------------------------------------------
  // ● セルフスイッチの操作
  //--------------------------------------------------------------------------
  command_123() {
    let key;
    if ((this._original_event_id > 0)) {
      key = [this._map_id, this._original_event_id, rb.idx(this._params, 0)];
      rb.idxSet($game_self_switches, key, ((rb.idx(this._params, 1) === 0)));
    }
    $game_map.need_refresh = true;
    return true;
  }
  command_124() { return rb.foraDoEscopo("Game_Interpreter#command_124", "nenhum evento usa o comando 124"); }
  command_125() { return rb.foraDoEscopo("Game_Interpreter#command_125", "nenhum evento usa o comando 125"); }
  command_126() { return rb.foraDoEscopo("Game_Interpreter#command_126", "nenhum evento usa o comando 126"); }
  command_127() { return rb.foraDoEscopo("Game_Interpreter#command_127", "nenhum evento usa o comando 127"); }
  command_128() { return rb.foraDoEscopo("Game_Interpreter#command_128", "nenhum evento usa o comando 128"); }
  command_129() { return rb.foraDoEscopo("Game_Interpreter#command_129", "nenhum evento usa o comando 129"); }
  command_132() { return rb.foraDoEscopo("Game_Interpreter#command_132", "nenhum evento usa o comando 132"); }
  command_133() { return rb.foraDoEscopo("Game_Interpreter#command_133", "nenhum evento usa o comando 133"); }
  command_134() { return rb.foraDoEscopo("Game_Interpreter#command_134", "nenhum evento usa o comando 134"); }
  //--------------------------------------------------------------------------
  // ● タイマーの操作
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 所持金の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● アイテムの増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 武器の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 防具の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● メンバーの入れ替え
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● バトル BGM の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● バトル終了 ME の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● セーブ禁止の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● メニュー禁止の変更
  //--------------------------------------------------------------------------
  command_135() {
    $game_system.menu_disabled = ((rb.idx(this._params, 0) === 0));
    return true;
  }
  command_136() { return rb.foraDoEscopo("Game_Interpreter#command_136", "nenhum evento usa o comando 136"); }
  //--------------------------------------------------------------------------
  // ● エンカウント禁止の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 場所移動
  //--------------------------------------------------------------------------
  command_201() {
    let map_id, x, y, direction;
    if ($game_temp.in_battle) {
      return true;
    }
    if (($game_player.transfer_p() || rb.v($game_message.visible))) { // メッセージ表示中
      // 場所移動中
      return false;
    }
    if ((rb.idx(this._params, 0) === 0)) { // 直接指定
      map_id = rb.idx(this._params, 1);
      x = rb.idx(this._params, 2);
      y = rb.idx(this._params, 3);
      direction = rb.idx(this._params, 4);
    } else {
      // 変数で指定
      map_id = rb.idx($game_variables, rb.idx(this._params, 1));
      x = rb.idx($game_variables, rb.idx(this._params, 2));
      y = rb.idx($game_variables, rb.idx(this._params, 3));
      direction = rb.idx(this._params, 4);
    }
    $game_player.reserve_transfer(map_id, x, y, direction);
    this._index += 1;
    return false;
  }
  command_202() { return rb.foraDoEscopo("Game_Interpreter#command_202", "nenhum evento usa o comando 202"); }
  //--------------------------------------------------------------------------
  // ● 乗り物の位置設定
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● イベントの位置設定
  //--------------------------------------------------------------------------
  async command_203() {
    let character, new_x, new_y, old_x, old_y, character2;
    character = this.get_character(rb.idx(this._params, 0));
    if ((character != null)) {
      if ((rb.idx(this._params, 1) === 0)) { // 直接指定
        await character.moveto(rb.idx(this._params, 2), rb.idx(this._params, 3));
      } else if ((rb.idx(this._params, 1) === 1)) {
        // 変数で指定
        new_x = rb.idx($game_variables, rb.idx(this._params, 2));
        new_y = rb.idx($game_variables, rb.idx(this._params, 3));
        await character.moveto(new_x, new_y);
      } else {
        // 他のイベントと交換
        old_x = character.x;
        old_y = character.y;
        character2 = this.get_character(rb.idx(this._params, 2));
        if ((character2 != null)) {
          await character.moveto(character2.x, character2.y);
          await character2.moveto(old_x, old_y);
        }
      }
      const caso13 = rb.idx(this._params, 4);
      // 向き
      if (caso13 === 8) { // 上
        character.turn_up();
      } else if (caso13 === 6) { // 右
        character.turn_right();
      } else if (caso13 === 2) { // 下
        character.turn_down();
      } else if (caso13 === 4) { // 左
        character.turn_left();
      }
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● マップのスクロール
  //--------------------------------------------------------------------------
  command_204() {
    if ($game_temp.in_battle) {
      return true;
    }
    if ($game_map.scrolling_p()) {
      return false;
    }
    $game_map.start_scroll(rb.idx(this._params, 0), rb.idx(this._params, 1), rb.idx(this._params, 2));
    return true;
  }
  //--------------------------------------------------------------------------
  // ● 移動ルートの設定
  //--------------------------------------------------------------------------
  async command_205() {
    let character;
    if ($game_map.need_refresh) {
      await $game_map.refresh();
    }
    character = this.get_character(rb.idx(this._params, 0));
    if ((character != null)) {
      await character.force_move_route(rb.idx(this._params, 1));
      if (rb.idx(this._params, 1).wait) {
        this._moving_character = character;
      }
    }
    return true;
  }
  command_206() { return rb.foraDoEscopo("Game_Interpreter#command_206", "nenhum evento usa o comando 206"); }
  command_211() { return rb.foraDoEscopo("Game_Interpreter#command_211", "nenhum evento usa o comando 211"); }
  //--------------------------------------------------------------------------
  // ● 乗り物の乗降
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 透明状態の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● アニメーションの表示
  //--------------------------------------------------------------------------
  command_212() {
    let character;
    character = this.get_character(rb.idx(this._params, 0));
    if ((character != null)) {
      character.animation_id = rb.idx(this._params, 1);
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● フキダシアイコンの表示
  //--------------------------------------------------------------------------
  command_213() {
    let character;
    character = this.get_character(rb.idx(this._params, 0));
    if ((character != null)) {
      character.balloon_id = rb.idx(this._params, 1);
    }
    return true;
  }
  command_214() { return rb.foraDoEscopo("Game_Interpreter#command_214", "nenhum evento usa o comando 214"); }
  //--------------------------------------------------------------------------
  // ● イベントの一時消去
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 画面のフェードアウト
  //--------------------------------------------------------------------------
  command_221() {
    if (rb.v($game_message.visible)) {
      return false;
    } else {
      this.screen.start_fadeout(30);
      this._wait_count = 30;
      return true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 画面のフェードイン
  //--------------------------------------------------------------------------
  command_222() {
    if (rb.v($game_message.visible)) {
      return false;
    } else {
      this.screen.start_fadein(30);
      this._wait_count = 30;
      return true;
    }
  }
  //--------------------------------------------------------------------------
  // ● 画面の色調変更
  //--------------------------------------------------------------------------
  command_223() {
    this.screen.start_tone_change(rb.idx(this._params, 0), rb.idx(this._params, 1));
    if (rb.v(rb.idx(this._params, 2))) {
      this._wait_count = rb.idx(this._params, 1);
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● 画面のフラッシュ
  //--------------------------------------------------------------------------
  command_224() {
    this.screen.start_flash(rb.idx(this._params, 0), rb.idx(this._params, 1));
    if (rb.v(rb.idx(this._params, 2))) {
      this._wait_count = rb.idx(this._params, 1);
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● 画面のシェイク
  //--------------------------------------------------------------------------
  command_225() {
    this.screen.start_shake(rb.idx(this._params, 0), rb.idx(this._params, 1), rb.idx(this._params, 2));
    if (rb.v(rb.idx(this._params, 3))) {
      this._wait_count = rb.idx(this._params, 2);
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // ● ウェイト
  //--------------------------------------------------------------------------
  command_230() {
    this._wait_count = rb.idx(this._params, 0);
    return true;
  }
  //--------------------------------------------------------------------------
  // ● ピクチャの表示
  //--------------------------------------------------------------------------
  command_231() {
    let x, y;
    if ((rb.idx(this._params, 3) === 0)) { // 直接指定
      x = rb.idx(this._params, 4);
      y = rb.idx(this._params, 5);
    } else {
      // 変数で指定
      x = rb.idx($game_variables, rb.idx(this._params, 4));
      y = rb.idx($game_variables, rb.idx(this._params, 5));
    }
    rb.idx(this.screen.pictures, rb.idx(this._params, 0)).show(rb.idx(this._params, 1), rb.idx(this._params, 2), x, y, rb.idx(this._params, 6), rb.idx(this._params, 7), rb.idx(this._params, 8), rb.idx(this._params, 9));
    return true;
  }
  //--------------------------------------------------------------------------
  // ● ピクチャの移動
  //--------------------------------------------------------------------------
  command_232() {
    let x, y;
    if ((rb.idx(this._params, 3) === 0)) { // 直接指定
      x = rb.idx(this._params, 4);
      y = rb.idx(this._params, 5);
    } else {
      // 変数で指定
      x = rb.idx($game_variables, rb.idx(this._params, 4));
      y = rb.idx($game_variables, rb.idx(this._params, 5));
    }
    rb.idx(this.screen.pictures, rb.idx(this._params, 0)).move(rb.idx(this._params, 2), x, y, rb.idx(this._params, 6), rb.idx(this._params, 7), rb.idx(this._params, 8), rb.idx(this._params, 9), rb.idx(this._params, 10));
    if (rb.v(rb.idx(this._params, 11))) {
      this._wait_count = rb.idx(this._params, 10);
    }
    return true;
  }
  command_233() { return rb.foraDoEscopo("Game_Interpreter#command_233", "nenhum evento usa o comando 233"); }
  command_234() { return rb.foraDoEscopo("Game_Interpreter#command_234", "nenhum evento usa o comando 234"); }
  //--------------------------------------------------------------------------
  // ● ピクチャの回転
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ピクチャの色調変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ピクチャの消去
  //--------------------------------------------------------------------------
  async command_235() {
    await rb.idx(this.screen.pictures, rb.idx(this._params, 0)).erase();
    return true;
  }
  command_236() { return rb.foraDoEscopo("Game_Interpreter#command_236", "nenhum evento usa o comando 236"); }
  //--------------------------------------------------------------------------
  // ● 天候の設定
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● BGM の演奏
  //--------------------------------------------------------------------------
  command_241() {
    rb.idx(this._params, 0).play();
    return true;
  }
  //--------------------------------------------------------------------------
  // ● BGM のフェードアウト
  //--------------------------------------------------------------------------
  command_242() {
    RPG.BGM.fade((rb.idx(this._params, 0) * 1000));
    return true;
  }
  //--------------------------------------------------------------------------
  // ● BGS の演奏
  //--------------------------------------------------------------------------
  command_245() {
    rb.idx(this._params, 0).play();
    return true;
  }
  //--------------------------------------------------------------------------
  // ● BGS のフェードアウト
  //--------------------------------------------------------------------------
  command_246() {
    RPG.BGS.fade((rb.idx(this._params, 0) * 1000));
    return true;
  }
  command_249() { return rb.foraDoEscopo("Game_Interpreter#command_249", "nenhum evento usa o comando 249"); }
  //--------------------------------------------------------------------------
  // ● ME の演奏
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● SE の演奏
  //--------------------------------------------------------------------------
  command_250() {
    rb.idx(this._params, 0).play();
    return true;
  }
  command_251() { return rb.foraDoEscopo("Game_Interpreter#command_251", "nenhum evento usa o comando 251"); }
  command_301() { return rb.foraDoEscopo("Game_Interpreter#command_301", "nenhum evento usa o comando 301"); }
  command_601() { return rb.foraDoEscopo("Game_Interpreter#command_601", "nenhum evento usa o comando 601"); }
  command_602() { return rb.foraDoEscopo("Game_Interpreter#command_602", "nenhum evento usa o comando 602"); }
  command_603() { return rb.foraDoEscopo("Game_Interpreter#command_603", "nenhum evento usa o comando 603"); }
  command_302() { return rb.foraDoEscopo("Game_Interpreter#command_302", "nenhum evento usa o comando 302"); }
  command_303() { return rb.foraDoEscopo("Game_Interpreter#command_303", "nenhum evento usa o comando 303"); }
  command_311() { return rb.foraDoEscopo("Game_Interpreter#command_311", "nenhum evento usa o comando 311"); }
  command_312() { return rb.foraDoEscopo("Game_Interpreter#command_312", "nenhum evento usa o comando 312"); }
  command_313() { return rb.foraDoEscopo("Game_Interpreter#command_313", "nenhum evento usa o comando 313"); }
  command_314() { return rb.foraDoEscopo("Game_Interpreter#command_314", "nenhum evento usa o comando 314"); }
  command_315() { return rb.foraDoEscopo("Game_Interpreter#command_315", "nenhum evento usa o comando 315"); }
  command_316() { return rb.foraDoEscopo("Game_Interpreter#command_316", "nenhum evento usa o comando 316"); }
  command_317() { return rb.foraDoEscopo("Game_Interpreter#command_317", "nenhum evento usa o comando 317"); }
  command_318() { return rb.foraDoEscopo("Game_Interpreter#command_318", "nenhum evento usa o comando 318"); }
  command_319() { return rb.foraDoEscopo("Game_Interpreter#command_319", "nenhum evento usa o comando 319"); }
  command_320() { return rb.foraDoEscopo("Game_Interpreter#command_320", "nenhum evento usa o comando 320"); }
  command_321() { return rb.foraDoEscopo("Game_Interpreter#command_321", "nenhum evento usa o comando 321"); }
  //--------------------------------------------------------------------------
  // ● SE の停止
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● バトルの処理
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 勝った場合
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 逃げた場合
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 負けた場合
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ショップの処理
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 名前入力の処理
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● HP の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● MP の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● ステートの変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 全回復
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 経験値の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● レベルの増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 能力値の増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● スキルの増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 装備の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 名前の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 職業の変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● アクターのグラフィック変更
  //--------------------------------------------------------------------------
  command_322() {
    let actor;
    actor = rb.idx($game_actors, rb.idx(this._params, 0));
    if ((actor != null)) {
      actor.set_graphic(rb.idx(this._params, 1), rb.idx(this._params, 2), rb.idx(this._params, 3), rb.idx(this._params, 4));
    }
    $game_player.refresh();
    return true;
  }
  command_323() { return rb.foraDoEscopo("Game_Interpreter#command_323", "nenhum evento usa o comando 323"); }
  command_331() { return rb.foraDoEscopo("Game_Interpreter#command_331", "nenhum evento usa o comando 331"); }
  command_332() { return rb.foraDoEscopo("Game_Interpreter#command_332", "nenhum evento usa o comando 332"); }
  command_333() { return rb.foraDoEscopo("Game_Interpreter#command_333", "nenhum evento usa o comando 333"); }
  command_334() { return rb.foraDoEscopo("Game_Interpreter#command_334", "nenhum evento usa o comando 334"); }
  command_335() { return rb.foraDoEscopo("Game_Interpreter#command_335", "nenhum evento usa o comando 335"); }
  command_336() { return rb.foraDoEscopo("Game_Interpreter#command_336", "nenhum evento usa o comando 336"); }
  command_337() { return rb.foraDoEscopo("Game_Interpreter#command_337", "nenhum evento usa o comando 337"); }
  command_339() { return rb.foraDoEscopo("Game_Interpreter#command_339", "nenhum evento usa o comando 339"); }
  command_340() { return rb.foraDoEscopo("Game_Interpreter#command_340", "nenhum evento usa o comando 340"); }
  command_351() { return rb.foraDoEscopo("Game_Interpreter#command_351", "nenhum evento usa o comando 351"); }
  //--------------------------------------------------------------------------
  // ● 乗り物のグラフィック変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラの HP 増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラの MP 増減
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラのステート変更
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラの全回復
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラの出現
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 敵キャラの変身
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 戦闘アニメーションの表示
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● 戦闘行動の強制
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● バトルの中断
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● メニュー画面を開く
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● セーブ画面を開く
  //--------------------------------------------------------------------------
  command_352() {
    $game_temp.next_scene = "save";
    this._index += 1;
    return false;
  }
  command_353() { return rb.foraDoEscopo("Game_Interpreter#command_353", "nenhum evento usa o comando 353"); }
  //--------------------------------------------------------------------------
  // ● ゲームオーバー
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // ● タイトル画面に戻す
  //--------------------------------------------------------------------------
  command_354() {
    $game_temp.next_scene = "title";
    return false;
  }
  //--------------------------------------------------------------------------
  // ● スクリプト
  //--------------------------------------------------------------------------
  async command_355() {
    let script;
    script = (rb.idx(rb.idx(this._list, this._index).parameters, 0) + "\n");
    while (true) {
      if ((rb.idx(this._list, (this._index + 1)).code === 655)) { // スクリプト 2 行目以降
        script = (script + (rb.idx(rb.idx(this._list, (this._index + 1)).parameters, 0) + "\n"));
      } else {
        break;
      }
      this._index += 1;
    }
    await rb.eval(script);
    return true;
  }
  // fora do escopo (nada do jogo chama): iterate_actor_id, iterate_actor_index, iterate_enemy_index, iterate_battler, operate_value
});
