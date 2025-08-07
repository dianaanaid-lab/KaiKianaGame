import Phaser from 'phaser';

export type UIPlayerStats = {
  id: number;
  name: string;
  className: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpForNext: number;
};

export type UIGameInfo = {
  levelIndex: number;
};

export class UIScene extends Phaser.Scene {
  private playerTexts: Phaser.GameObjects.Text[] = [];
  private levelText!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.levelText = this.add.text(12, 10, 'Level 1', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e6f7ff'
    }).setDepth(1000);
  }

  updatePlayerStats(stats: UIPlayerStats[]): void {
    for (const text of this.playerTexts) text.destroy();
    this.playerTexts = [];

    let y = 36;
    for (const s of stats) {
      const hpBar = `${'❤'.repeat(Math.round((s.hp / s.maxHp) * 10)).padEnd(10, '·')}`;
      const manaBar = `${'♦'.repeat(Math.round((s.mana / s.maxMana) * 10)).padEnd(10, '·')}`;
      const xpPct = Math.floor((s.xp / s.xpForNext) * 100);
      const t = this.add.text(12, y, `P${s.id} ${s.name} [${s.className}] Lv.${s.level}  HP(${s.hp}/${s.maxHp}) ${hpBar}  MP(${s.mana}/${s.maxMana}) ${manaBar}  XP ${xpPct}%`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff'
      }).setDepth(1000);
      this.playerTexts.push(t);
      y += 18;
    }
  }

  updateGameInfo(info: UIGameInfo): void {
    this.levelText.setText(`Level ${info.levelIndex + 1}`);
  }
}