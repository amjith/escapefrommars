import { updateSidebar } from "../ui/sidebar.js";

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width * 0.5, 120, "Escape From Mars 2", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#f7e9d3",
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, 200, "Select a Level", {
        fontSize: "18px",
        color: "#f7e9d3",
      })
      .setOrigin(0.5);

    this.add
      .text(
        width * 0.5,
        260,
        "1 - Level 1: Mars Maze\n2 - Level 2: Rover Hunt\n3 - Level 3: Space Chase",
        {
          fontSize: "16px",
          color: "#f7e9d3",
          align: "center",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        width * 0.5,
        height * 0.5 + 120,
        "Controls\nL1: Move Arrows/WASD · N next · L levels\nL2: Move Arrows/WASD · F fire · E interact · SPACE jetpack · N next · R retry · L levels\nL3: Move Arrows/WASD · R restart · L levels",
        {
          fontSize: "14px",
          fontStyle: "bold",
          color: "#fff7bf",
          align: "center",
          stroke: "#000000",
          strokeThickness: 4,
          backgroundColor: "#000000",
          padding: { x: 12, y: 8 },
        }
      )
      .setOrigin(0.5);

    updateSidebar({
      level: "Level Select",
      goal: "Pick a level and complete your mission.",
      health: "-",
      controls: "1: Level 1\n2: Level 2\n3: Level 3",
    });

    this.input.keyboard.on("keydown-ONE", () => {
      this.scene.start("Level1Scene");
    });
    this.input.keyboard.on("keydown-TWO", () => {
      this.scene.start("Level2Scene");
    });
    this.input.keyboard.on("keydown-THREE", () => {
      this.scene.start("Level3Scene");
    });
  }

  flashMessage(text) {
    if (this.notice) {
      this.notice.destroy();
    }
    this.notice = this.add
      .text(this.scale.width * 0.5, 340, text, {
        fontSize: "14px",
        color: "#f7e9d3",
      })
      .setOrigin(0.5);
    this.time.delayedCall(1500, () => {
      if (this.notice) {
        this.notice.destroy();
      }
    });
  }
}
