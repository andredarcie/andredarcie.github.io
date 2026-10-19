// 002 - Vocab: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Vocab
//------------------------------------------------------------------------------
// Esta classe controla o vocabulário e mensagens do jogo. Algumas mensagens
// são adquiridas utilizando a variável global $data_system.
//==============================================================================
globalThis.Vocab = rb.modulo("Vocab");
// Frases de loja
Vocab.ShopBuy = "Comprar";
Vocab.ShopSell = "Vender";
Vocab.ShopCancel = "Sair";
Vocab.Possession = "Possui";
// Frases de status
Vocab.ExpTotal = "Experiência Total";
Vocab.ExpNext = "Próximo %s";
// Frases de salvar/carregar
Vocab.SaveMessage = "Deseja salvar em qual arquivo?";
Vocab.LoadMessage = "Deseja carregar qual arquivo?";
Vocab.File = "Arquivo";
// Nome do grupo de personagens
Vocab.PartyName = "%s";
// Mensagens iniciais de batalha
Vocab.Emerge = "%s apareceu!";
Vocab.Preemptive = "%s ataca primeiro!";
Vocab.Surprise = "%s chegou de surpresa!";
Vocab.EscapeStart = "%s você fugiu!";
Vocab.EscapeFailure = "Você não conseguiu fugir!";
// Mensagens finais de batalha
Vocab.Victory = "O grupo de %s venceu a batalha!";
Vocab.Defeat = "O grupo de %s foi derrotado!";
Vocab.ObtainExp = "%s pontos de experiência!";
Vocab.ObtainGold = "Você recebeu %s%s!";
Vocab.ObtainItem = "Você adquiriu  %s!";
Vocab.LevelUp = "%s subiu para o nível %s %s!";
Vocab.ObtainSkill = "Aprendeu a habilidade %s!";
// Mensagens de batalha
Vocab.DoAttack = "%s ataca!";
Vocab.DoGuard = "%s defende-se";
Vocab.DoEscape = "%s fugiu da batalha";
Vocab.DoWait = "%s está esperando por algo";
Vocab.UseItem = "%s usou %s!";
// Danos críticos
Vocab.CriticalToEnemy = "Dano crítico!";
Vocab.CriticalToActor = "Dano crítico!";
// Resultados de ações (Personagem)
Vocab.ActorDamage = "%s recebeu %s pontos de dano!";
Vocab.ActorLoss = "%s perdeu %s de %s!";
Vocab.ActorDrain = "%s de %s de %s perdeu!";
Vocab.ActorNoDamage = "%s não recebeu dano!";
Vocab.ActorNoHit = "Errou! %s não recebeu dano!";
Vocab.ActorEvasion = "%s escapou do ataque!";
Vocab.ActorRecovery = "%s recuperou %s de %s!";
// Resultados de ações (Inimigo)
Vocab.EnemyDamage = "%s recebeu %s pontos de dano!";
Vocab.EnemyLoss = "%s perdeu %s de %s!";
Vocab.EnemyDrain = "%s absorveu %s de %s!";
Vocab.EnemyNoDamage = "%s não recebeu dano!";
Vocab.EnemyNoHit = "Errou! %s não recebeu dano!";
Vocab.EnemyEvasion = "%s escapou do ataque!";
Vocab.EnemyRecovery = "%s recuperou %s de %s!";
// Caso não haja efeito do item
Vocab.ActionFailure = "%s não causou nenhum efeito!";
// Nível
rb.singleton(Vocab, {
  // Nível (abreviado)
  // HP
  // HP (abreviado)
  // MP
  // MP (abreviado)
  // Ataque
  // Defesa
  // Inteligência
  // Agilidade
  // Arma
  // Escudo
  // Elmo
  // Armadura
  // Acessório
  // Arma 1
  // Arma 2
  // Atacar
  // Habilidades
  // Defender
  // Itens
  // Equipamento
  // Status
  // Salvar
  // Sair
  // Atacar
  // Fugir
  // Novo Jogo
  get new_game() {
    return $data_system.terms.new_game;
  },
  // Continuar
  get continue() {
    return $data_system.terms.continue;
  },
  // Sair
  get shutdown() {
    return $data_system.terms.shutdown;
  },
  // Tela Título
  // Cancelar
  // G (unidade monetária)
  get gold() {
    return $data_system.terms.gold;
  },
  // fora do escopo (nada do jogo chama): level, level_a, hp, hp_a, mp, mp_a, atk, def, spi, agi, weapon, armor1, armor2, armor3, armor4, weapon1, weapon2, attack, skill, guard, item, equip, status, save, game_end, fight, escape, to_title, cancel
});
