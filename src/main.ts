import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const width = 960;
const height = 540;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width,
  height,
  backgroundColor: '#0e0f17',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MenuScene, GameScene, UIScene]
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game(config);