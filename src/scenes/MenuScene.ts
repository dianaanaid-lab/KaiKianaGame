import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private selectedPlayers: number = 2;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0e0f17');

    const title = this.add.text(480, 120, 'Kai & Kiana: Demon Hunters', {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: '#f5d3ff'
    }).setOrigin(0.5);

    const subtitle = this.add.text(480, 170, 'Anime-style, cute but spooky demons', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#b8f0ff'
    }).setOrigin(0.5);

    const playersText = this.add.text(480, 260, this.getPlayersText(), {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hint = this.add.text(480, 320, 'Left/Right: players 2-4  |  Enter: Start  |  C: Toggle Credits', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#9ee7ff'
    }).setOrigin(0.5);

    const credits = this.add.text(480, 380, 'Kai (7): blonde elf-like hair  |  Kiana (5): dirty blonde hair with bangs', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffd1a3'
    }).setOrigin(0.5).setAlpha(0.8);

    const keyLeft = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const keyRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    const keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    keyLeft.on('down', () => {
      this.selectedPlayers = Math.max(2, this.selectedPlayers - 1);
      playersText.setText(this.getPlayersText());
    });

    keyRight.on('down', () => {
      this.selectedPlayers = Math.min(4, this.selectedPlayers + 1);
      playersText.setText(this.getPlayersText());
    });

    keyEnter.on('down', () => {
      this.scene.start('GameScene', { players: this.selectedPlayers });
    });

    this.tweens.add({
      targets: [title, subtitle],
      y: '+=6',
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.inOut'
    });
  }

  private getPlayersText(): string {
    return `Players: ${this.selectedPlayers} (supports keyboard + up to 4 gamepads)`;
  }
}