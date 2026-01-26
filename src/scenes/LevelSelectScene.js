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
        "1 - Level 1: Mars Maze\n2 - Level 2: Rover Hunt\n3 - Level 3: Space Chase (coming soon)",
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
        height - 80,
        "Keybindings: Arrows/WASD move · F fire · E interact · SPACE jetpack · L level select",
        {
          fontSize: "14px",
          color: "#f7e9d3",
        }
      )
      .setOrigin(0.5);

    this.input.keyboard.on("keydown-ONE", () => {
      this.scene.start("Level1Scene");
    });
    this.input.keyboard.on("keydown-TWO", () => {
      this.scene.start("Level2Scene");
    });
    this.input.keyboard.on("keydown-THREE", () => {
      this.flashMessage("Level 3 is not ready yet.");
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
