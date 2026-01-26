const TILE_SIZE = 32;
const FLOOR_FRAME = 21;
const WALL_FRAME = 9;
const CAMERA_ZOOM = 1.35;
const MARTIAN_SPEED = 85;
const MARTIAN_TRAIL_GAP = 0;
const MARTIAN_TRAIL_MAX = 2000;

const LEVEL_LAYOUT = [
  "##############################",
  "#P....#.............#......S.#",
  "#.#######.#####.###.#.######.#",
  "#.......#.....#...#.#........#",
  "#####.#.#####.###.#.#####.#..#",
  "#.....#.....#.....#.....#.#..#",
  "#.#########.#######.###.#.#..#",
  "#.#.......#.........#.#.#.#..#",
  "#.#.#####.#########.#.#.#.#..#",
  "#...#...#.....#.....#...#....#",
  "###.#.#.#####.#.###########..#",
  "#...#.#.....#.#.....#........#",
  "#.###.#####.#.#####.#.#####..#",
  "#.#.....#...#.....#.#.#......#",
  "#.#####.#.#######.#.#.#.###..#",
  "#.....#.#.......#.#.#.#.#....#",
  "#.###.#.#####.#.#.#.#.#.#.##.#",
  "#...#.#.....#.#.#.#.#.#.#....#",
  "#K..#..M..#...#...#..M..#....#",
  "##############################",
];

const toWorld = (tileX, tileY) => ({
  x: tileX * TILE_SIZE + TILE_SIZE * 0.5,
  y: tileY * TILE_SIZE + TILE_SIZE * 0.5,
});

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1Scene");
    this.player = null;
    this.martians = null;
    this.cursors = null;
    this.keys = null;
    this.statusText = null;
    this.hudText = null;
    this.hasAccessGem = false;
    this.spawnPoint = { x: 1, y: 1 };
    this.levelComplete = false;
    this.health = 3;
    this.maxHealth = 3;
    this.playerTrail = [];
  }

  preload() {
    this.load.spritesheet("mars_tiles", "assets/mars_tiles.png", {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 1,
    });
    this.load.spritesheet("spaceman", "assets/spaceman.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("martian", "assets/martian.png");
    this.load.image("ship", "assets/ship.png");
    this.load.spritesheet("access_gem", "assets/access_gem.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create() {
    const { walls, spawn } = this.buildLevel();
    this.spawnPoint = spawn.player;

    const worldWidth = LEVEL_LAYOUT[0].length * TILE_SIZE;
    const worldHeight = LEVEL_LAYOUT.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(CAMERA_ZOOM);

    this.createAnimations();

    this.add
      .tileSprite(0, 0, worldWidth, worldHeight, "mars_tiles", FLOOR_FRAME)
      .setOrigin(0);

    const wallGroup = this.physics.add.staticGroup();
    walls.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      wallGroup.create(position.x, position.y, "mars_tiles", WALL_FRAME);
    });

    const playerPosition = toWorld(spawn.player.x, spawn.player.y);
    this.player = this.physics.add.sprite(
      playerPosition.x,
      playerPosition.y,
      "spaceman",
      1
    );
    this.player.setCollideWorldBounds(true);

    const shipPosition = toWorld(spawn.ship.x, spawn.ship.y);
    const ship = this.physics.add.staticSprite(
      shipPosition.x,
      shipPosition.y,
      "ship"
    );

    const gemPosition = toWorld(spawn.gem.x, spawn.gem.y);
    const accessGem = this.physics.add.staticSprite(
      gemPosition.x,
      gemPosition.y,
      "access_gem",
      0
    );
    accessGem.anims.play("gemPulse");

    this.martians = this.physics.add.group();
    spawn.martians.forEach((spot, index) => {
      const position = toWorld(spot.x, spot.y);
      const martian = this.martians.create(position.x, position.y, "martian");
      martian.setCollideWorldBounds(true);
      martian.setBounce(0);
      martian.setData("trailIndex", 0);
      martian.setData("trailOffset", (index + 1) * MARTIAN_TRAIL_GAP);
    });

    this.physics.add.collider(this.player, wallGroup);
    this.physics.add.collider(this.martians, wallGroup);
    this.physics.add.collider(this.player, this.martians, () => {
      this.handleMartianHit();
    });
    this.physics.add.overlap(this.player, accessGem, () => {
      this.hasAccessGem = true;
      accessGem.disableBody(true, true);
      this.statusText.setText("Access gem secured. Head to the ship.");
    });
    this.physics.add.overlap(this.player, ship, () => {
      if (!this.hasAccessGem) {
        this.statusText.setText("Ship is locked. Find the access gem.");
        return;
      }
      if (this.levelComplete) {
        return;
      }
      this.levelComplete = true;
      this.statusText.setText("Ship unlocked! Press N for Level 2.");
      this.physics.pause();
      this.player.setTint(0x88ffcc);
      this.player.anims.stop();
      this.input.keyboard.once("keydown-N", () => {
        this.scene.start("Level2Scene");
      });
    });

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-L", () => {
      this.scene.start("LevelSelectScene");
    });

    this.statusText = this.add
      .text(16, 16, "Find the access gem to unlock the ship.", {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#f7e9d3",
        stroke: "#3a1c12",
        strokeThickness: 3,
      })
      .setScrollFactor(0);

    this.hudText = this.add
      .text(16, 40, "", {
        fontSize: "14px",
        color: "#f7e9d3",
        stroke: "#3a1c12",
        strokeThickness: 2,
      })
      .setScrollFactor(0);

    this.helpText = this.add
      .text(
        16,
        this.scale.height - 32,
        "Keys: Arrows/WASD move · N next level (after unlock) · L level select",
        {
          fontSize: "14px",
          color: "#f7e9d3",
          stroke: "#3a1c12",
          strokeThickness: 2,
        }
      )
      .setScrollFactor(0);

    this.recordPlayerTrail(true);
    this.updateHud();
  }

  update() {
    if (!this.player || !this.player.body) {
      return;
    }
    if (this.levelComplete) {
      return;
    }

    const speed = 120;
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      velocityX = -1;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      velocityX = 1;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown) {
      velocityY = -1;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      velocityY = 1;
    }

    const vector = new Phaser.Math.Vector2(velocityX, velocityY);
    if (vector.lengthSq() > 0) {
      vector.normalize().scale(speed);
      this.player.setVelocity(vector.x, vector.y);
      if (!this.player.anims.isPlaying) {
        this.player.anims.play("walk", true);
      }
    } else {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(1);
    }

    this.recordPlayerTrail(false);
    this.updateMartians();
  }

  buildLevel() {
    const walls = [];
    const spawn = {
      player: { x: 1, y: 1 },
      ship: { x: 1, y: 1 },
      gem: { x: 1, y: 1 },
      martians: [],
    };

    LEVEL_LAYOUT.forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        if (cell === "P") {
          spawn.player = { x, y };
        }
        if (cell === "S") {
          spawn.ship = { x, y };
        }
        if (cell === "K") {
          spawn.gem = { x, y };
        }
        if (cell === "M") {
          spawn.martians.push({ x, y });
        }
        if (cell === "#") {
          walls.push({ x, y });
        }
      });
    });

    return { walls, spawn };
  }

  resetPlayer() {
    const position = toWorld(this.spawnPoint.x, this.spawnPoint.y);
    this.player.setPosition(position.x, position.y);
    this.player.setVelocity(0, 0);
  }

  handleMartianHit() {
    this.health = Math.max(0, this.health - 1);
    this.resetPlayer();
    if (this.health <= 0) {
      this.health = this.maxHealth;
      this.statusText.setText("Health depleted. Regrouping at spawn.");
    } else {
      this.statusText.setText("Caught by martians. Try again.");
    }
    this.updateHud();
  }

  updateHud() {
    if (!this.hudText) {
      return;
    }
    this.hudText.setText(`Health: ${this.health}/${this.maxHealth}`);
  }

  recordPlayerTrail(force) {
    if (!this.player) {
      return;
    }
    const tile = this.getTileCoords(this.player.x, this.player.y);
    const last = this.playerTrail[this.playerTrail.length - 1];
    if (force || !last || last.x !== tile.x || last.y !== tile.y) {
      this.playerTrail.push({ x: tile.x, y: tile.y });
      if (this.playerTrail.length > MARTIAN_TRAIL_MAX) {
        this.playerTrail.shift();
        if (this.martians) {
          this.martians.getChildren().forEach((martian) => {
            const currentIndex = martian.getData("trailIndex") || 0;
            martian.setData("trailIndex", Math.max(0, currentIndex - 1));
          });
        }
      }
    }
  }

  updateMartians() {
    if (!this.martians || !this.playerTrail.length) {
      return;
    }
    const lastIndex = this.playerTrail.length - 1;
    this.martians.getChildren().forEach((martian) => {
      if (!martian.active) {
        return;
      }
      const offset = martian.getData("trailOffset") || 0;
      const desiredIndex = Math.max(0, lastIndex - offset);
      let trailIndex = martian.getData("trailIndex");
      if (trailIndex === undefined || trailIndex === null) {
        trailIndex = desiredIndex;
      } else if (trailIndex > desiredIndex) {
        trailIndex = desiredIndex;
      }

      let targetTile = this.playerTrail[trailIndex];
      if (!targetTile) {
        return;
      }
      let targetPos = toWorld(targetTile.x, targetTile.y);
      let dx = targetPos.x - martian.x;
      let dy = targetPos.y - martian.y;
      let distance = Math.hypot(dx, dy);

      while (distance < 4 && trailIndex < desiredIndex) {
        trailIndex += 1;
        targetTile = this.playerTrail[trailIndex];
        if (!targetTile) {
          break;
        }
        targetPos = toWorld(targetTile.x, targetTile.y);
        dx = targetPos.x - martian.x;
        dy = targetPos.y - martian.y;
        distance = Math.hypot(dx, dy);
      }

      if (distance < 4) {
        martian.setVelocity(0, 0);
      } else {
        martian.setVelocity((dx / distance) * MARTIAN_SPEED, (dy / distance) * MARTIAN_SPEED);
      }
      martian.setData("trailIndex", trailIndex);
    });
  }

  getTileCoords(x, y) {
    return {
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE),
    };
  }

  createAnimations() {
    if (!this.anims.exists("walk")) {
      this.anims.create({
        key: "walk",
        frames: this.anims.generateFrameNumbers("spaceman", {
          frames: [1, 2, 4, 5],
        }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists("gemPulse")) {
      this.anims.create({
        key: "gemPulse",
        frames: this.anims.generateFrameNumbers("access_gem", {
          start: 0,
          end: 3,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

}
