// 092 - Variavel na Tela: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Janela de Variável [VX]
//------------------------------------------------------------------------------
// Adiciona uma janela que exibe o nome da variável definido no Bando de Dados
// e seu atual valor no jogo.
//------------------------------------------------------------------------------
// Autor      : Kyo Panda
// Site       : http://www.mundorpgmaker.com/
// Lançado em : 8 de Dezembro de 2010
// Versão     : 1.0
//==============================================================================
//==============================================================================
// Agradecimentos:
//------------------------------------------------------------------------------
// * danielxd : Idealizador do script.
//==============================================================================
//==============================================================================
// Como usar:
//------------------------------------------------------------------------------
//
// #--------------------------------------------------------------------------
// # Instalação
// #--------------------------------------------------------------------------
//
// • Cole o script acima do "▼ Principal" e abaixo dos "▼ Scripts Adicionais"
//   no Editor de Scripts do RPG Maker VX.
//
// • Configure o script no guia "Configuração" logo abaixo.
//
// #--------------------------------------------------------------------------
// # Utilização
// #--------------------------------------------------------------------------
//
// • Utilize os seguintes comandos com o "Comando de Evento" "Script" em um
//   evento qualquer:
//
//   $wvar.show
//   * Para exibir a janela de variável
//
//   $wvar.hide
//   * Para ocultar a janela de variável
//
//   $wvar.var_id
//   * Para retornar a ID da variável da janela
//
//   $wvar.var_id = valor
//   * Para modificar o ID da variável da janela, onde valor ó o novo ID
//
//   $wvar.visible?
//   * Para retornar se a janela está visível ou não
//
//==============================================================================
//==============================================================================
// Histórico de versões:
//------------------------------------------------------------------------------
// • Versão 1.0, 8 de Dezembro de 2010:
//   * Primeira versão do script.
//==============================================================================
//==============================================================================
// Window_VariableSettings
//------------------------------------------------------------------------------
// Módulo de configução do script Janela de Variável.
//==============================================================================
globalThis.Window_VariableSettings = rb.modulo("Window_VariableSettings");
//--------------------------------------------------------------------------
// Configuração
//--------------------------------------------------------------------------
// Defina aqui o estado padrão da janela de exibição do nome e valor de
// determinada variável. Defina true para exibir e false para ocultar.
Window_VariableSettings.DEFAULT_STATE = true;
// Defina aqui o ID da variável padrão da janela de exibição do nome e valor
// de determinada variável.
Window_VariableSettings.DEFAULT_VARIABLE_ID = 1;
// Defina aqui as configurações referentes à janela de exibição de nome e
// valor da variável.
// Os valores seguem uma determinada ordem, que será citada:
//
// X  : Posicionamento horizontal da janela
// Y  : Posicionamento vertical da janela
// L  : Largura da janela
// A  : Altura da janela
// O  : Opacidade da janela
// Z  : Prioridade da janela
// W  : Windowskin da janela
// NF : Nome da fonte da janela
// TF : Tamanho da fonte da janela
// C1 : Cor do nome da variável (Definido pela paleta de cores da windowskin)
// C2 : Cor do valor da variável (Definido pela paleta de cores da windowskin)
//        [ X ,  Y ,  L ,  A,  O ,  Z ,     W   ,       NF      , TF, C1, C2]
Window_VariableSettings.WINDOW = [460, -45, 136, 300, 0, 200, "Window", "Trebuchet MS", 30, 16, 0];
//--------------------------------------------------------------------------
// Fim da configuração
//--------------------------------------------------------------------------
//==============================================================================
// Window_VariableCommands
//------------------------------------------------------------------------------
// Módulo de comandos para o script Janela de Variável.
//==============================================================================
//--------------------------------------------------------------------------
// Exibe a janela de variável
//--------------------------------------------------------------------------
globalThis.Window_VariableCommands = rb.modulo("Window_VariableCommands");
rb.singleton(Window_VariableCommands, {
  show() {
    $game_temp.wvar_visible = true;
  },
  //--------------------------------------------------------------------------
  // Oculta a janela de variável
  //--------------------------------------------------------------------------
  hide() {
    $game_temp.wvar_visible = false;
  },
  // fora do escopo (nada do jogo chama): var_id, var_id=, visible?
});
//--------------------------------------------------------------------------
// Retorna o ID da variável da janela de variável
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// Modifica o ID da variável da janela de variável
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// Retona se a janela está visível
//--------------------------------------------------------------------------
//==============================================================================
// Object
//------------------------------------------------------------------------------
// Classe que rege os objetos em Ruby.
//==============================================================================
// classe Object: fora do escopo (o jogo não usa; README.md)
$wvar = Window_VariableCommands;
//==============================================================================
// Game_Temp
//------------------------------------------------------------------------------
// Esta classe controla dados que não são salvos pelo jogo, os dados temporários
// Pode ser acessada utilizando $game_temp
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
rb.reabrir(Game_Temp, class extends rb.superDe(Game_Temp) {
  get wvar_visible() { return this._wvar_visible; }
  set wvar_visible(v) { this._wvar_visible = v; }
  get wvar_var_id() { return this._wvar_var_id; }
  set wvar_var_id(v) { this._wvar_var_id = v; }
});
//--------------------------------------------------------------------------
// Alias da inicialização do objeto
//--------------------------------------------------------------------------
rb.alias(Game_Temp, "kpn_window_variable_initialize", "initialize");
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
rb.reabrir(Game_Temp, class extends rb.superDe(Game_Temp) {
  initialize() {
    this._wvar_visible = Window_VariableSettings.DEFAULT_STATE;
    this._wvar_var_id = Window_VariableSettings.DEFAULT_VARIABLE_ID;
    this.kpn_window_variable_initialize();
  }
});
//==============================================================================
// Game_Variables
//------------------------------------------------------------------------------
// Classe que gerencia as variáveis.
// Pode ser acessada utilizando $game_variables.
//==============================================================================
//--------------------------------------------------------------------------
// Retorna o nome da variável
//--------------------------------------------------------------------------
rb.reabrir(Game_Variables, class extends rb.superDe(Game_Variables) {
  name(variable_id) {
    return rb.idx($data_system.variables, variable_id);
  }
});
//==============================================================================
// Window_Variable
//------------------------------------------------------------------------------
// Janela que exibe o nome e valor de determinada variável
//==============================================================================
globalThis.Window_Variable = rb.classe("Window_Variable", class Window_Variable extends Window_Base {
});
//--------------------------------------------------------------------------
// Inclusão das constantes e métodos do módulo Window_VariableSettings
//--------------------------------------------------------------------------
rb.incluir(Window_Variable, Window_VariableSettings);
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
rb.reabrir(Window_Variable, class extends rb.superDe(Window_Variable) {
  get variable_id() { return this._variable_id; }
  set variable_id(v) { this._variable_id = v; }
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //--------------------------------------------------------------------------
  async initialize() {
    this._variable_id = $game_temp.wvar_var_id;
    await super.initialize(0, 0, 56, 56);
    await this.setup();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    if (!rb.eq(this.visible, $game_temp.wvar_visible)) {
      this.visible = $game_temp.wvar_visible;
    }
    return this.refresh();
  }
  //--------------------------------------------------------------------------
  // Configuração da janela
  //--------------------------------------------------------------------------
  async setup() {
    this.x = rb.idx(Window_VariableSettings.WINDOW, 0);
    this.y = rb.idx(Window_VariableSettings.WINDOW, 1);
    this.width = rb.idx(Window_VariableSettings.WINDOW, 2);
    this.height = rb.idx(Window_VariableSettings.WINDOW, 3);
    this.contents = Bitmap.new((this.width - 32), (this.height - 32));
    this.opacity = rb.idx(Window_VariableSettings.WINDOW, 4);
    this.z = rb.idx(Window_VariableSettings.WINDOW, 5);
    this.windowskin = (await Cache.system(rb.idx(Window_VariableSettings.WINDOW, 6)));
    this.contents.font.name = rb.idx(Window_VariableSettings.WINDOW, 7);
    this.contents.font.size = rb.idx(Window_VariableSettings.WINDOW, 8);
    return this.refresh();
  }
  //--------------------------------------------------------------------------
  // Atualização
  //--------------------------------------------------------------------------
  refresh() {
    let cw, fs;
    if (!(this.need_refresh)) {
      return;
    }
    rb.clear(this.contents);
    this._variable_id = $game_temp.wvar_var_id;
    this._name = $game_variables.name(this._variable_id);
    this._value = rb.idx($game_variables, this._variable_id);
    cw = this.contents.width;
    fs = rb.size(this.contents.font);
    this.contents.font.color = this.text_color(rb.idx(Window_VariableSettings.WINDOW, 9));
    this.contents.draw_text(0, 0, cw, fs, this._name, 1);
    this.contents.font.color = this.text_color(rb.idx(Window_VariableSettings.WINDOW, 10));
    return this.contents.draw_text(0, fs, cw, fs, this._value, 1);
  }
  //--------------------------------------------------------------------------
  // Necessidade de atualização
  //--------------------------------------------------------------------------
  get need_refresh() {
    if (!rb.eq(this._variable_id, $game_temp.wvar_var_id)) {
      return true;
    }
    if (!rb.eq(rb.idx($game_variables, this._variable_id), this._value)) {
      return true;
    }
    if (!rb.eq($game_variables.name(this._variable_id), this._name)) {
      return true;
    }
    return false;
  }
});
//==============================================================================
// Spriteset_Map
//------------------------------------------------------------------------------
// Classe responsável pela compilação dos sprites utilizados nos mapas.
// Esta classe é utilizada dentro da classe Scene_Map.
//==============================================================================
//--------------------------------------------------------------------------
// Alias da inicialização do objeto
//--------------------------------------------------------------------------
rb.alias(Spriteset_Map, "kpn_window_variable_initialize", "initialize");
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  async initialize() {
    this._variable_window = (await Window_Variable.new());
    await this.kpn_window_variable_initialize();
  }
});
//--------------------------------------------------------------------------
// Alias do dispose
//--------------------------------------------------------------------------
rb.alias(Spriteset_Map, "kpn_window_variable_dispose", "dispose");
//--------------------------------------------------------------------------
// Dispose
//--------------------------------------------------------------------------
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  dispose() {
    this._variable_window.dispose();
    return this.kpn_window_variable_dispose();
  }
});
//--------------------------------------------------------------------------
// Alias da atualização da tela
//--------------------------------------------------------------------------
rb.alias(Spriteset_Map, "kpn_window_variable_update", "update");
//--------------------------------------------------------------------------
// Atualização da tela
//--------------------------------------------------------------------------
rb.reabrir(Spriteset_Map, class extends rb.superDe(Spriteset_Map) {
  async update() {
    this._variable_window.update();
    return await this.kpn_window_variable_update();
  }
});
