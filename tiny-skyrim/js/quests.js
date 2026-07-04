// Quest flow: speak with the elder, learn the Word, slay the dragon.
// Also owns interaction prompts and dialog.

import { WALL_POS } from 'world';

export class Quests {
  constructor(game) {
    this.game = game;
    this.talked = false;
    this.learned = false;
    this.slain = false;
    this.dialog = null;
    this.cineStage = 0;
    this.cineT = 0;
    this.victoryT = -1;
  }

  get dialogActive() {
    return this.dialog !== null;
  }

  start() {
    this.game.hud.announce('TINY SKYRIM', 'The tiniest of all the holds');
    this.updateObjective();
    this.game.audio.quest();
  }

  updateObjective() {
    const hud = this.game.hud;
    if (!this.learned) {
      hud.setObjective(this.talked
        ? 'Learn the Word of Power at the Old Wall'
        : 'Speak with Elder Yngvar in Whitewind');
    } else if (!this.slain) {
      hud.setObjective('Slay Korvaldr the Black');
    } else {
      hud.setObjective('Explore Tiny Skyrim');
    }
  }

  getMarkerPos() {
    if (!this.learned) {
      if (!this.talked) return this.game.world.elderPos;
      return WALL_POS;
    }
    if (!this.slain) {
      const d = this.game.enemies.dragon;
      if (d && d.alive) return d.group.position;
      return WALL_POS;
    }
    return null;
  }

  elderLines() {
    if (this.slain) {
      return ['It is done. Songs will be sung of you, Dragonborn.'];
    }
    if (this.learned) {
      return ['I heard the mountain speak... The Voice is yours now. Bring him down!'];
    }
    if (this.talked) {
      return ['The Old Wall waits in the north-east peaks. The draugr guard it — take care.'];
    }
    return [
      'Dragonborn... so the old blood still walks.',
      'Korvaldr the Black has returned. He burned three farms east of the river last night.',
      'Steel alone will not bring him down. You need the Voice.',
      'An Old Wall stands in the mountains to the north-east. It keeps a Word of Power.',
      'Follow your compass. Learn the Word. Then send that beast to the grave.',
    ];
  }

  update(dt) {
    const game = this.game;
    const hud = game.hud;
    const player = game.player;
    const input = game.input;

    // word wall cinematic
    if (this.cineStage > 0) {
      this.cineT += dt;
      if (this.cineStage === 1 && this.cineT >= 2.6) {
        this.cineStage = 2;
        hud.announce('WORD OF POWER LEARNED', 'VUS — "Force"');
        player.shoutUnlocked = true;
        game.audio.quest();
      } else if (this.cineStage === 2 && this.cineT >= 4.6) {
        this.cineStage = 0;
        player.locked = false;
        game.audio.roar();
        hud.announce('KORVALDR HAS FOUND YOU',
          game.touch.enabled ? 'Use SHOUT to bring him down' : 'Press Q to Shout — bring him down');
        game.enemies.spawnDragon();
        this.updateObjective();
      }
    }

    // victory delay after the soul is absorbed
    if (this.victoryT >= 0) {
      this.victoryT -= dt;
      if (this.victoryT < 0) game.onVictory();
    }

    // dialog advance
    if (this.dialog) {
      hud.setPrompt(null);
      if (input.interact) {
        input.interact = false;
        this.dialog.i++;
        if (this.dialog.i >= this.dialog.lines.length) {
          const wasQuestTalk = !this.talked && this.dialog.quest;
          this.dialog = null;
          hud.hideDialog();
          player.locked = false;
          if (wasQuestTalk) {
            this.talked = true;
            this.updateObjective();
            game.audio.quest();
          }
        } else {
          hud.showDialog(this.dialog.name, this.dialog.lines[this.dialog.i]);
          game.audio.blip();
        }
      }
      return;
    }

    // find nearest usable interactable
    let best = null, bestD = 1e9;
    if (player.alive && !player.locked) {
      for (const it of game.world.interactables) {
        if (it.type === 'chest' && it.opened) continue;
        if (it.type === 'wall' && (it.used || this.learned)) continue;
        const d = Math.hypot(player.pos.x - it.x, player.pos.z - it.z);
        if (d < it.r && d < bestD) { best = it; bestD = d; }
      }
    }
    if (best) {
      const label = best.type === 'npc' ? 'Talk to ' + best.name
        : best.type === 'wall' ? 'Read the Word Wall'
        : 'Open chest';
      hud.setPrompt(game.touch.enabled ? label : '[E] ' + label);
      if (input.interact) {
        input.interact = false;
        this.use(best);
      }
    } else {
      hud.setPrompt(null);
    }
    input.interact = false;
  }

  use(it) {
    const game = this.game;
    if (it.type === 'npc') {
      const lines = this.elderLines();
      this.dialog = { name: it.name, lines, i: 0, quest: !this.talked && !this.learned };
      game.player.locked = true;
      game.hud.showDialog(it.name, lines[0]);
      game.audio.blip();
    } else if (it.type === 'chest') {
      it.opened = true;
      game.world.openChest(it);
      game.audio.chest();
      if (it.loot.gold) game.player.addGold(it.loot.gold);
      if (it.loot.heal) {
        game.player.heal(50);
        game.hud.toast('You feel restored (+50 HP)');
      }
      if (it.loot.blade) {
        game.player.swordBonus = 10;
        game.player.setBladeUpgraded();
        game.hud.toast('Ancient Blade equipped (+10 damage)');
      }
    } else if (it.type === 'wall') {
      it.used = true;
      this.learned = true;
      game.player.locked = true;
      this.cineStage = 1;
      this.cineT = 0;
      game.audio.chant();
      game.world.setWallLit();
      game.hud.screenFlash('rgba(140,220,255,0.5)', 2.4);
    }
  }

  onDragonSlain() {
    this.slain = true;
    this.updateObjective();
    this.game.hud.announce('DRAGON SOUL ABSORBED', 'You are Dragonborn.');
    this.victoryT = 2.2;
  }
}
