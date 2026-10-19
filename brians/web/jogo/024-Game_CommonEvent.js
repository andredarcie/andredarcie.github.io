// 024 - Game_CommonEvent: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_CommonEvent
//------------------------------------------------------------------------------
// 　コモンイベントを扱うクラスです。並列処理イベントを実行する機能を持っていま
// す。このクラスは Game_Map クラス ($game_map) の内部で使用されます。
//==============================================================================
//--------------------------------------------------------------------------
// ● オブジェクト初期化
//     common_event_id : コモンイベント ID
//--------------------------------------------------------------------------
globalThis.Game_CommonEvent = rb.classe("Game_CommonEvent", class Game_CommonEvent extends rb.Objeto {
  async initialize(common_event_id) {
    this._common_event_id = common_event_id;
    this._interpreter = null;
    await this.refresh();
  }
  //--------------------------------------------------------------------------
  // ● 名前の取得
  //--------------------------------------------------------------------------
  get name() {
    return rb.idx($data_common_events, this._common_event_id).name;
  }
  //--------------------------------------------------------------------------
  // ● トリガーの取得
  //--------------------------------------------------------------------------
  get trigger() {
    return rb.idx($data_common_events, this._common_event_id).trigger;
  }
  //--------------------------------------------------------------------------
  // ● 条件スイッチ ID の取得
  //--------------------------------------------------------------------------
  get switch_id() {
    return rb.idx($data_common_events, this._common_event_id).switch_id;
  }
  //--------------------------------------------------------------------------
  // ● 実行内容の取得
  //--------------------------------------------------------------------------
  get list() {
    return rb.idx($data_common_events, this._common_event_id).list;
  }
  //--------------------------------------------------------------------------
  // ● リフレッシュ
  //--------------------------------------------------------------------------
  async refresh() {
    if ((this.trigger === 2) && (rb.idx($game_switches, this.switch_id) === true)) {
      if ((this._interpreter == null)) {
        return this._interpreter = (await Game_Interpreter.new());
      }
    } else {
      return this._interpreter = null;
    }
  }
  //--------------------------------------------------------------------------
  // ● フレーム更新
  //--------------------------------------------------------------------------
  async update() {
    if ((this._interpreter != null)) { // 並列処理が有効の場合
      if (!(this._interpreter.running_p())) {
        // 実行中でなければ
        await this._interpreter.setup(this.list); // セットアップ
      }
      return await this._interpreter.update(); // インタプリタを更新
    }
  }
});
