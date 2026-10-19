// 019 - Game_Actors: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// ■ Game_Actors
//------------------------------------------------------------------------------
// 　アクターの配列を扱うクラスです。このクラスのインスタンスは $game_actors で
// 参照されます。
//==============================================================================
//--------------------------------------------------------------------------
// ● オブジェクト初期化
//--------------------------------------------------------------------------
globalThis.Game_Actors = rb.classe("Game_Actors", class Game_Actors extends rb.Objeto {
  initialize() {
    this._data = [];
  }
  //--------------------------------------------------------------------------
  // ● アクターの取得
  //     actor_id : アクター ID
  //--------------------------------------------------------------------------
  idx(actor_id) {
    if ((rb.idx(this._data, actor_id) == null) && (rb.idx($data_actors, actor_id) != null)) {
      rb.idxSet(this._data, actor_id, Game_Actor.new(actor_id));
    }
    return rb.idx(this._data, actor_id);
  }
});
