import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import Level3Scene from "./scenes/Level3Scene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [LevelSelectScene, Level1Scene, Level2Scene, Level3Scene],
  backgroundColor: "#2b140d",
};

new Phaser.Game(config);
