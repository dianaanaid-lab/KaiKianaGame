import Phaser from 'phaser';

export type GameBootData = { players: number };

type PlayerClass = 'Demon Hunter Ninja' | 'Demon Hunter Mage' | 'Demon Hunter Warrior' | 'Demon Hunter Priest';

interface PlayerStats {
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  attack: number;
  speed: number;
  level: number;
  xp: number;
  xpForNext: number;
  skillPoints: number;
}

interface Weapon {
  name: string;
  damage: number;
  cooldownMs: number;
}

interface LootItem {
  kind: 'heart' | 'potion_health' | 'potion_mana' | 'weapon_upgrade';
  sprite: Phaser.Physics.Arcade.Image;
  value?: number;
}

class Demon extends Phaser.Physics.Arcade.Sprite {
  maxHp: number;
  hp: number;
  speed: number;
  xpReward: number;
  isAlive = true;

  constructor(scene: Phaser.Scene, x: number, y: number, tier: number) {
    super(scene, x, y, 'demonTexture');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Stats scale with tier
    this.maxHp = 20 + tier * 10;
    this.hp = this.maxHp;
    this.speed = 40 + tier * 10;
    this.xpReward = 8 + tier * 4;

    this.setCircle(12);
    this.setDepth(3);
  }
}

class Player extends Phaser.Physics.Arcade.Sprite {
  id: number;
  name: string;
  className: PlayerClass;
  stats: PlayerStats;
  weapon: Weapon;
  lastAttackAt = 0;
  isAlive = true;
  inputKeys?: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; attack: Phaser.Input.Keyboard.Key; skill: Phaser.Input.Keyboard.Key };
  gamepad?: Phaser.Input.Gamepad.Gamepad;

  constructor(scene: Phaser.Scene, x: number, y: number, className: PlayerClass, name: string, id: number) {
    super(scene, x, y, 'playerTexture1');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.id = id;
    this.name = name;
    this.className = className;

    this.setTexture('playerTexture' + id);

    this.stats = Player.createBaseStatsFor(className);
    this.weapon = Player.createBaseWeaponFor(className);

    this.setDepth(5);
    this.setCircle(14);
    this.setCollideWorldBounds(true);
  }

  static createBaseStatsFor(className: PlayerClass): PlayerStats {
    switch (className) {
      case 'Demon Hunter Ninja':
        return { maxHp: 80, hp: 80, maxMana: 40, mana: 40, attack: 14, speed: 140, level: 1, xp: 0, xpForNext: 40, skillPoints: 0 };
      case 'Demon Hunter Mage':
        return { maxHp: 70, hp: 70, maxMana: 80, mana: 80, attack: 12, speed: 120, level: 1, xp: 0, xpForNext: 40, skillPoints: 0 };
      case 'Demon Hunter Warrior':
        return { maxHp: 120, hp: 120, maxMana: 30, mana: 30, attack: 16, speed: 110, level: 1, xp: 0, xpForNext: 40, skillPoints: 0 };
      case 'Demon Hunter Priest':
        return { maxHp: 85, hp: 85, maxMana: 90, mana: 90, attack: 10, speed: 115, level: 1, xp: 0, xpForNext: 40, skillPoints: 0 };
    }
  }

  static createBaseWeaponFor(className: PlayerClass): Weapon {
    switch (className) {
      case 'Demon Hunter Ninja':
        return { name: 'Twin Blades', damage: 14, cooldownMs: 220 };
      case 'Demon Hunter Mage':
        return { name: 'Arcane Slash', damage: 12, cooldownMs: 320 };
      case 'Demon Hunter Warrior':
        return { name: 'Greatsword', damage: 18, cooldownMs: 380 };
      case 'Demon Hunter Priest':
        return { name: 'Sacred Staff', damage: 10, cooldownMs: 300 };
    }
  }

  canAttack(time: number): boolean {
    return time - this.lastAttackAt >= this.weapon.cooldownMs;
  }

  performAttack(time: number, scene: GameScene): void {
    this.lastAttackAt = time;

    const slashRange = 40;
    const origin = new Phaser.Math.Vector2(this.x, this.y);
    const facing = this.body.velocity.clone().normalize();
    if (facing.length() < 0.1) facing.setTo(1, 0);
    const targetPoint = origin.clone().add(facing.scale(slashRange));

    const g = scene.add.graphics();
    g.lineStyle(3, 0xffe066, 1);
    g.beginPath();
    g.moveTo(origin.x, origin.y);
    g.lineTo(targetPoint.x, targetPoint.y);
    g.strokePath();
    scene.time.delayedCall(90, () => g.destroy());

    // Hit demons within small arc
    const hitRadius = 26;
    const demonsHit: Demon[] = [];
    scene.demons.children.each(obj => {
      const d = obj as Demon;
      if (!d.isAlive) return;
      const dist = Phaser.Math.Distance.Between(targetPoint.x, targetPoint.y, d.x, d.y);
      if (dist <= hitRadius) demonsHit.push(d);
    });

    for (const d of demonsHit) {
      scene.damageDemon(d, this.weapon.damage, this);
    }
  }

  tryUseSkill(scene: GameScene): void {
    switch (this.className) {
      case 'Demon Hunter Ninja': {
        const cost = 18;
        if (this.stats.mana < cost) return;
        this.stats.mana -= cost;
        // Dash and slash around
        const dash = scene.tweens.add({
          targets: this,
          duration: 220,
          x: this.x + (this.body.velocity.x || 100) * 0.4,
          y: this.y + (this.body.velocity.y || 0) * 0.4,
          ease: 'Sine.easeOut'
        });
        dash.on('complete', () => this.performAttack(scene.time.now, scene));
        break;
      }
      case 'Demon Hunter Mage': {
        const cost = 24;
        if (this.stats.mana < cost) return;
        this.stats.mana -= cost;
        // Small AoE
        const circle = scene.add.circle(this.x, this.y, 60, 0x88ccff, 0.25).setDepth(2);
        scene.time.delayedCall(220, () => circle.destroy());
        scene.demons.children.each(obj => {
          const d = obj as Demon;
          if (!d.isAlive) return;
          if (Phaser.Math.Distance.Between(this.x, this.y, d.x, d.y) <= 60) {
            scene.damageDemon(d, Math.floor(this.weapon.damage * 0.9), this);
          }
        });
        break;
      }
      case 'Demon Hunter Warrior': {
        const cost = 16;
        if (this.stats.mana < cost) return;
        this.stats.mana -= cost;
        // Cleave stronger hit
        this.performAttack(scene.time.now, scene);
        scene.demons.children.each(obj => {
          const d = obj as Demon;
          if (!d.isAlive) return;
          if (Phaser.Math.Distance.Between(this.x, this.y, d.x, d.y) <= 50) {
            scene.damageDemon(d, Math.floor(this.weapon.damage * 0.5), this);
          }
        });
        break;
      }
      case 'Demon Hunter Priest': {
        const cost = 22;
        if (this.stats.mana < cost) return;
        this.stats.mana -= cost;
        // Heal all players a bit
        for (const p of scene.players) {
          p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 16);
        }
        const halo = scene.add.circle(this.x, this.y, 50, 0xfff3b0, 0.25).setDepth(2);
        scene.time.delayedCall(200, () => halo.destroy());
        break;
      }
    }
  }

  addXp(amount: number): void {
    this.stats.xp += amount;
    while (this.stats.xp >= this.stats.xpForNext) {
      this.stats.xp -= this.stats.xpForNext;
      this.stats.level += 1;
      this.stats.skillPoints += 1;
      this.stats.xpForNext = Math.floor(this.stats.xpForNext * 1.25);
      // Auto-spend skill point according to class identity
      switch (this.className) {
        case 'Demon Hunter Ninja':
          this.stats.speed += 6; this.stats.attack += 2; break;
        case 'Demon Hunter Mage':
          this.stats.maxMana += 10; this.stats.attack += 2; this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 10); break;
        case 'Demon Hunter Warrior':
          this.stats.maxHp += 12; this.stats.attack += 3; this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 12); break;
        case 'Demon Hunter Priest':
          this.stats.maxMana += 12; this.stats.maxHp += 6; this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 12); this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 6); break;
      }
    }
  }
}

export class GameScene extends Phaser.Scene {
  players: Player[] = [];
  demons!: Phaser.Physics.Arcade.Group;
  loot!: Phaser.Physics.Arcade.Group;
  levelIndex = 0;
  maxLevels = 10;
  nextSpawnAt = 0;
  aliveDemons = 0;
  totalToSpawn = 0;

  constructor() {
    super('GameScene');
  }

  init(data: GameBootData): void {
    // Create simple textures for players and demons and loot
    this.createGeneratedTextures();

    const playerCount = Phaser.Math.Clamp(data?.players ?? 2, 2, 4);
    const classOrder: PlayerClass[] = ['Demon Hunter Ninja', 'Demon Hunter Mage', 'Demon Hunter Warrior', 'Demon Hunter Priest'];
    const names = ['Kai', 'Kiana', 'Ally A', 'Ally B'];

    this.players = [];
    const startPositions = [
      new Phaser.Math.Vector2(240, 270),
      new Phaser.Math.Vector2(720, 270),
      new Phaser.Math.Vector2(240, 420),
      new Phaser.Math.Vector2(720, 120)
    ];

    for (let i = 0; i < playerCount; i++) {
      const p = new Player(this, startPositions[i].x, startPositions[i].y, classOrder[i], names[i], i + 1);
      this.players.push(p);
    }

    // Input setup for two keyboards (P1/P2) + gamepads for up to four
    this.setupInputs();

    // Groups
    this.demons = this.physics.add.group({ classType: Demon, runChildUpdate: false });
    this.loot = this.physics.add.group();

    // Collisions
    for (const p of this.players) {
      this.physics.add.collider(p, this.demons);
      this.physics.add.overlap(p, this.loot, (_player, lootObj) => {
        const item = (lootObj as any).lootItem as LootItem;
        if (!item) return;
        this.applyLootToPlayer(p, item);
        lootObj.destroy();
      });
    }

    // Camera
    this.cameras.main.setBounds(0, 0, 960, 540);

    // Start UI scene
    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.updateUI();

    // Start level
    this.levelIndex = 0;
    this.beginLevel(this.levelIndex);
  }

  private createGeneratedTextures(): void {
    // Player textures with anime-inspired color accents
    const createPlayerTexture = (key: string, mainColor: number, hairColor: number) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(mainColor, 1);
      g.fillCircle(16, 16, 14);
      // Hair bangs
      g.fillStyle(hairColor, 1);
      g.fillCircle(12, 10, 5);
      g.fillCircle(20, 10, 5);
      g.fillCircle(16, 8, 5);
      // Eyes
      g.fillStyle(0x1b1f2a, 1);
      g.fillCircle(12, 16, 2);
      g.fillCircle(20, 16, 2);
      // Elf-like ear accent
      g.fillStyle(hairColor, 1);
      g.fillTriangle(30, 16, 26, 14, 26, 18);
      g.generateTexture(key, 32, 32);
      g.destroy();
    };

    createPlayerTexture('playerTexture1', 0x5dd39e, 0xfff2a6); // Kai: blonde
    createPlayerTexture('playerTexture2', 0xffa6c1, 0xd9c69c); // Kiana: dirty blonde
    createPlayerTexture('playerTexture3', 0x9ec9ff, 0xd0bdf4);
    createPlayerTexture('playerTexture4', 0xf6a6ff, 0xffe066);

    // Demon texture: cute and spooky
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x6b6bb2, 1);
      g.fillCircle(12, 12, 12);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10, 12, 2);
      g.fillCircle(14, 12, 2);
      g.fillStyle(0x2b2b4f, 1);
      g.fillRect(8, 16, 8, 2);
      g.generateTexture('demonTexture', 24, 24);
      g.destroy();
    }

    // Loot textures
    const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void, w = 20, h = 20) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    mk('heartTexture', g => { g.fillStyle(0xff6b6b, 1); g.fillCircle(7, 8, 6); g.fillCircle(13, 8, 6); g.fillTriangle(2, 10, 18, 10, 10, 20); }, 20, 20);
    mk('potionHealthTexture', g => { g.fillStyle(0xff9fbf, 1); g.fillRect(4, 6, 12, 10); g.fillStyle(0xffffff, 1); g.fillRect(8, 2, 4, 4); }, 20, 20);
    mk('potionManaTexture', g => { g.fillStyle(0x9fd9ff, 1); g.fillRect(4, 6, 12, 10); g.fillStyle(0xffffff, 1); g.fillRect(8, 2, 4, 4); }, 20, 20);
    mk('weaponUpTexture', g => { g.fillStyle(0xffe066, 1); g.fillRect(3, 9, 14, 4); g.fillStyle(0x8d99ae, 1); g.fillRect(2, 8, 4, 6); }, 20, 20);

    // Green slime particle texture
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x7CFC00, 1);
      g.fillCircle(2, 2, 2);
      g.generateTexture('slimeParticle', 4, 4);
      g.destroy();
    }
  }

  private setupInputs(): void {
    // Keyboard scheme for P1/P2
    const schemes = [
      { up: 'W', down: 'S', left: 'A', right: 'D', attack: 'J', skill: 'K' },
      { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', attack: 'NUMPAD_ONE', skill: 'NUMPAD_TWO' }
    ];
    for (let i = 0; i < Math.min(2, this.players.length); i++) {
      const s = schemes[i] as any;
      const p = this.players[i];
      p.inputKeys = {
        up: this.input.keyboard!.addKey((Phaser.Input.Keyboard.KeyCodes as any)[s.up]),
        down: this.input.keyboard!.addKey((Phaser.Input.Keyboard.KeyCodes as any)[s.down]),
        left: this.input.keyboard!.addKey((Phaser.Input.Keyboard.KeyCodes as any)[s.left]),
        right: this.input.keyboard!.addKey((Phaser.Input.Keyboard.KeyCodes as any)[s.right]),
        attack: this.input.keyboard!.addKey((Phaser.Input.Keyboard.KeyCodes as any)[s.attack]),
        skill: this.input.keyboard!.addKey((Phaser.Input.Keyboard.KeyCodes as any)[s.skill])
      };
    }

    // Gamepads for others
    this.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      const freePlayer = this.players.find(p => !p.gamepad);
      if (freePlayer) freePlayer.gamepad = pad;
    });
  }

  beginLevel(index: number): void {
    // Clear remaining demons and loot
    this.demons.clear(true, true);
    this.loot.clear(true, true);

    // Level parameters
    const baseCount = 10 + index * 4; // total demons to spawn
    this.totalToSpawn = baseCount;
    this.aliveDemons = 0;
    this.nextSpawnAt = 0;

    // Slight heal and mana refill per new level
    for (const p of this.players) {
      p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 10);
      p.stats.mana = Math.min(p.stats.maxMana, p.stats.mana + 12);
    }

    this.updateUI();
  }

  spawnDemon(): void {
    const border = 30;
    const side = Phaser.Math.Between(0, 3);
    const x = side === 0 ? border : side === 1 ? 960 - border : Phaser.Math.Between(border, 960 - border);
    const y = side === 2 ? border : side === 3 ? 540 - border : Phaser.Math.Between(border, 540 - border);
    const tier = 1 + Math.floor(this.levelIndex / 2);
    const d = new Demon(this, x, y, tier);
    this.demons.add(d);
    this.aliveDemons += 1;
  }

  update(time: number, delta: number): void {
    // Spawning logic
    if (this.totalToSpawn > 0 && time >= this.nextSpawnAt) {
      const batch = Math.min(3, this.totalToSpawn);
      for (let i = 0; i < batch; i++) this.spawnDemon();
      this.totalToSpawn -= batch;
      this.nextSpawnAt = time + Math.max(350 - this.levelIndex * 20, 150);
    }

    // Demon AI: chase nearest player
    this.demons.children.each(obj => {
      const d = obj as Demon;
      if (!d.isAlive) return;
      const target = this.getNearestLivingPlayer(d.x, d.y);
      if (!target) return;
      const v = new Phaser.Math.Vector2(target.x - d.x, target.y - d.y).normalize().scale(d.speed);
      d.setVelocity(v.x, v.y);
    });

    // Players movement and actions
    for (const p of this.players) {
      if (!p.isAlive) continue;
      let vx = 0, vy = 0;
      if (p.inputKeys) {
        vx += p.inputKeys.left.isDown ? -1 : 0; vx += p.inputKeys.right.isDown ? 1 : 0;
        vy += p.inputKeys.up.isDown ? -1 : 0; vy += p.inputKeys.down.isDown ? 1 : 0;
        if (p.inputKeys.attack.isDown && p.canAttack(time)) p.performAttack(time, this);
        if (p.inputKeys.skill.isDown) p.tryUseSkill(this);
      }
      if (p.gamepad) {
        vx += p.gamepad.axes.length > 0 ? p.gamepad.axes[0].getValue() : 0;
        vy += p.gamepad.axes.length > 1 ? p.gamepad.axes[1].getValue() : 0;
        if (p.gamepad.buttons.length > 0 && p.gamepad.buttons[0].pressed && p.canAttack(time)) p.performAttack(time, this);
        if (p.gamepad.buttons.length > 1 && p.gamepad.buttons[1].pressed) p.tryUseSkill(this);
      }
      const len = Math.hypot(vx, vy);
      if (len > 1) { vx /= len; vy /= len; }
      p.setVelocity(vx * p.stats.speed, vy * p.stats.speed);
    }

    // Demon touches player -> damage over time
    this.physics.overlap(this.players, this.demons, (playerObj, demonObj) => {
      const p = playerObj as Player; const d = demonObj as Demon;
      if (!p.isAlive || !d.isAlive) return;
      // Damage cooldown per player handled simply via time check
      if (!('_lastHurt' in p as any)) (p as any)._lastHurt = 0;
      const lastHurt = (p as any)._lastHurt as number;
      if (time - lastHurt > 500) {
        (p as any)._lastHurt = time;
        this.hurtPlayer(p, 6 + Math.floor(this.levelIndex / 2));
      }
    });

    // Level completion
    if (this.totalToSpawn <= 0 && this.aliveDemons <= 0) {
      if (this.levelIndex + 1 < this.maxLevels) {
        this.levelIndex += 1;
        this.beginLevel(this.levelIndex);
      } else {
        this.winGame();
      }
    }

    this.updateUI();
  }

  getNearestLivingPlayer(x: number, y: number): Player | undefined {
    let best: Player | undefined;
    let bestDist = Number.MAX_VALUE;
    for (const p of this.players) {
      if (!p.isAlive) continue;
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  }

  damageDemon(d: Demon, amount: number, source: Player): void {
    if (!d.isAlive) return;
    d.hp -= amount;

    // Green slime burst
    const manager = this.add.particles('slimeParticle');
    const emitter = manager.createEmitter({
      lifespan: 300,
      speed: { min: 50, max: 150 },
      quantity: 8,
      gravityY: 200,
      tint: 0x7CFC00
    });
    manager.setDepth(10);
    emitter.explode(12, d.x, d.y);
    this.time.delayedCall(220, () => manager.destroy());

    if (d.hp <= 0) {
      d.isAlive = false;
      d.setVelocity(0, 0);
      d.disableBody(true, true);
      this.aliveDemons -= 1;

      // XP and loot
      source.addXp(d.xpReward);
      this.maybeDropLoot(d.x, d.y);
    }
  }

  hurtPlayer(p: Player, amount: number): void {
    p.stats.hp -= amount;
    const flash = this.tweens.add({ targets: p, alpha: 0.5, duration: 80, yoyo: true, repeat: 2 });
    flash.on('complete', () => { p.setAlpha(1); });
    if (p.stats.hp <= 0) {
      p.isAlive = false;
      p.setVelocity(0, 0);
      p.disableBody(true, true);
      // If all dead -> game over
      if (!this.players.some(pl => pl.isAlive)) {
        this.gameOver();
      }
    }
  }

  maybeDropLoot(x: number, y: number): void {
    const roll = Math.random();
    let key: string | null = null;
    let kind: LootItem['kind'] | null = null;
    if (roll < 0.25) { key = 'heartTexture'; kind = 'heart'; }
    else if (roll < 0.45) { key = 'potionHealthTexture'; kind = 'potion_health'; }
    else if (roll < 0.65) { key = 'potionManaTexture'; kind = 'potion_mana'; }
    else if (roll < 0.80) { key = 'weaponUpTexture'; kind = 'weapon_upgrade'; }

    if (!key || !kind) return;
    const loot = this.physics.add.image(x, y, key).setDepth(4);
    const item: LootItem = { kind, sprite: loot };
    (loot as any).lootItem = item;

    // Float animation
    this.tweens.add({ targets: loot, y: loot.y - 8, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.inOut' });
  }

  applyLootToPlayer(p: Player, item: LootItem): void {
    switch (item.kind) {
      case 'heart':
        p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 12);
        break;
      case 'potion_health':
        p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 24);
        break;
      case 'potion_mana':
        p.stats.mana = Math.min(p.stats.maxMana, p.stats.mana + 28);
        break;
      case 'weapon_upgrade':
        p.weapon.damage += 2;
        p.weapon.cooldownMs = Math.max(160, p.weapon.cooldownMs - 12);
        break;
    }
  }

  updateUI(): void {
    const ui = this.scene.get('UIScene') as any;
    if (!ui || !ui.updatePlayerStats) return;
    ui.updatePlayerStats(this.players.map(p => ({
      id: p.id,
      name: p.name,
      className: p.className,
      hp: Math.max(0, Math.floor(p.stats.hp)),
      maxHp: p.stats.maxHp,
      mana: Math.max(0, Math.floor(p.stats.mana)),
      maxMana: p.stats.maxMana,
      level: p.stats.level,
      xp: p.stats.xp,
      xpForNext: p.stats.xpForNext
    })));
    ui.updateGameInfo({ levelIndex: this.levelIndex });
  }

  gameOver(): void {
    const t = this.add.text(480, 270, 'Game Over - Press Enter to return to Menu', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffb3c1', align: 'center'
    }).setOrigin(0.5).setDepth(1000);
    const enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enter.once('down', () => this.scene.start('MenuScene'));
  }

  winGame(): void {
    const t = this.add.text(480, 270, 'You cleared all 10 levels! Congrats!', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#baffc9', align: 'center'
    }).setOrigin(0.5).setDepth(1000);
    this.time.delayedCall(2500, () => this.scene.start('MenuScene'));
  }
}