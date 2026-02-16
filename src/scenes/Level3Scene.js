import { updateSidebar } from "../ui/sidebar.js";

const PLAYER_ACCEL = 260;
const PLAYER_MAX_SPEED = 240;
const HUNTER_SPEED = 160;
const SHOT_SPEED = 320;
const ASTEROID_COUNT = 8;
const BOSS_TRIGGER_TIME = 12;
const ESCAPE_DURATION = 30;
const BOSS_ASTEROID_RADIUS = 64;
const BOSS_ASTEROID_SCALE = 1.25;

export default class Level3Scene extends Phaser.Scene {
  constructor() {
    super("Level3Scene");
    this.player = null;
    this.hunter = null;
    this.asteroids = null;
    this.enemyShots = null;
    this.bossAsteroid = null;
    this.starfield = null;

    this.cursors = null;
    this.keys = null;
    this.statusText = null;
    this.hudText = null;
    this.helpText = null;

    this.health = 3;
    this.lastHitTime = 0;
    this.hitCooldown = 900;
    this.elapsedMs = 0;
    this.bossSpawned = false;
    this.levelComplete = false;
    this.gameOver = false;
  }

  preload() {
    this.load.image("ship", "assets/ship.png");
    this.load.image("martian", "assets/martian.png");
    this.load.image("bullet", "assets/bullet.png");
    this.load.audio("sfx_shot", "assets/sfx_shot.wav");
  }

  create() {
    const { width, height } = this.scale;

    this.createStarfieldTexture();
    this.createAsteroidTextures();

    this.add.rectangle(0, 0, width, height, 0x05070d).setOrigin(0);
    this.starfield = this.add
      .tileSprite(0, 0, width, height, "starfield")
      .setOrigin(0);

    this.physics.world.setBounds(0, 0, width, height);

    this.player = this.physics.add.image(width * 0.25, height * 0.5, "ship");
    this.player.setScale(1.1);
    this.player.setDrag(140, 140);
    this.player.setMaxVelocity(PLAYER_MAX_SPEED);

    this.hunter = this.physics.add.image(width * 0.8, height * 0.5, "martian");
    this.hunter.setTint(0xff6f6f);
    this.hunter.setDrag(80, 80);
    this.hunter.setMaxVelocity(HUNTER_SPEED);

    this.asteroids = this.physics.add.group();
    for (let i = 0; i < ASTEROID_COUNT; i += 1) {
      this.spawnAsteroid();
    }

    this.enemyShots = this.physics.add.group({
      maxSize: 30,
    });

    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: this.fireEnemyShot,
      callbackScope: this,
    });

    this.physics.add.overlap(this.player, this.asteroids, () => {
      this.handlePlayerHit();
    });

    this.physics.add.overlap(this.player, this.enemyShots, (player, shot) => {
      shot.destroy();
      this.handlePlayerHit();
    });

    this.physics.add.overlap(this.player, this.hunter, () => {
      this.handlePlayerHit();
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-L", () => {
      this.scene.start("LevelSelectScene");
    });
    this.input.keyboard.on("keydown-R", () => {
      this.scene.restart();
    });

    this.statusText = this.add
      .text(16, 16, "Survive the chase and dodge the asteroid!", {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#f7e9d3",
        stroke: "#1a0f0a",
        strokeThickness: 3,
      })
      .setScrollFactor(0);

    this.hudText = this.add
      .text(16, 42, "", {
        fontSize: "14px",
        color: "#f7e9d3",
        stroke: "#1a0f0a",
        strokeThickness: 2,
      })
      .setScrollFactor(0);

    this.helpText = this.add
      .text(
        this.scale.width * 0.5,
        76,
        "Controls: Move Arrows/WASD · R restart · L level select",
        {
          fontSize: "12px",
          fontStyle: "bold",
          color: "#fff7bf",
          stroke: "#000000",
          strokeThickness: 2,
          backgroundColor: "rgba(0,0,0,0.45)",
          align: "center",
          wordWrap: { width: this.scale.width - 40 },
          padding: { x: 8, y: 4 },
        }
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.updateHud(ESCAPE_DURATION);
  }

  update(time, delta) {
    if (this.levelComplete || this.gameOver) {
      return;
    }

    this.elapsedMs += delta;
    const remaining = Math.max(0, ESCAPE_DURATION - this.elapsedMs / 1000);

    this.starfield.tilePositionX += 0.3;

    const input = this.getInputVector();
    if (input.lengthSq() > 0) {
      input.normalize().scale(PLAYER_ACCEL);
      this.player.setAcceleration(input.x, input.y);
    } else {
      this.player.setAcceleration(0, 0);
    }

    this.rotateShipToVelocity(this.player);

    this.updateHunter();
    this.updateAsteroids();
    this.updateEnemyShots();

    if (!this.bossSpawned && remaining <= BOSS_TRIGGER_TIME) {
      this.spawnBossAsteroid();
    }

    if (
      this.bossAsteroid &&
      this.bossAsteroid.x < -this.bossAsteroid.displayWidth * 0.6
    ) {
      this.completeLevel();
    }

    this.updateHud(remaining);

    if (this.player && this.player.body) {
      this.physics.world.wrap(this.player, 16);
    }
    if (this.hunter && this.hunter.body) {
      this.physics.world.wrap(this.hunter, 16);
    }
  }

  getInputVector() {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      x -= 1;
    }
    if (this.cursors.right.isDown || this.keys.D.isDown) {
      x += 1;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      y -= 1;
    }
    if (this.cursors.down.isDown || this.keys.S.isDown) {
      y += 1;
    }
    return new Phaser.Math.Vector2(x, y);
  }

  rotateShipToVelocity(ship) {
    if (!ship || !ship.body) {
      return;
    }
    const velocity = ship.body.velocity;
    if (velocity.lengthSq() < 4) {
      return;
    }
    ship.setRotation(Math.atan2(velocity.y, velocity.x));
  }

  updateHunter() {
    if (!this.hunter || !this.hunter.active || !this.player) {
      return;
    }
    const direction = new Phaser.Math.Vector2(
      this.player.x - this.hunter.x,
      this.player.y - this.hunter.y
    );
    if (direction.lengthSq() === 0) {
      this.hunter.setAcceleration(0, 0);
      return;
    }
    direction.normalize();
    this.hunter.setAcceleration(direction.x * 120, direction.y * 120);
    this.rotateShipToVelocity(this.hunter);
  }

  fireEnemyShot() {
    if (
      this.gameOver ||
      this.levelComplete ||
      !this.hunter ||
      !this.hunter.active ||
      !this.player
    ) {
      return;
    }
    const bullet = this.enemyShots.get(this.hunter.x, this.hunter.y, "bullet");
    if (!bullet) {
      return;
    }
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setScale(0.8);
    bullet.body.allowGravity = false;

    const direction = new Phaser.Math.Vector2(
      this.player.x - this.hunter.x,
      this.player.y - this.hunter.y
    );
    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }
    direction.normalize();
    bullet.setVelocity(direction.x * SHOT_SPEED, direction.y * SHOT_SPEED);

    if (this.sound.get("sfx_shot")) {
      this.sound.play("sfx_shot", { volume: 0.6 });
    }

    this.time.delayedCall(1400, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }

  updateEnemyShots() {
    if (!this.enemyShots) {
      return;
    }
    const { width, height } = this.scale;
    this.enemyShots.getChildren().forEach((shot) => {
      if (!shot.active) {
        return;
      }
      if (shot.x < -40 || shot.x > width + 40 || shot.y < -40 || shot.y > height + 40) {
        shot.destroy();
      }
    });
  }

  spawnAsteroid() {
    const { width, height } = this.scale;
    const asteroid = this.physics.add.image(
      Phaser.Math.Between(0, width),
      Phaser.Math.Between(0, height),
      "asteroid"
    );
    asteroid.setCircle(16);
    asteroid.setScale(1);
    asteroid.setVelocity(
      Phaser.Math.Between(-120, 120),
      Phaser.Math.Between(-120, 120)
    );
    asteroid.setAngularVelocity(Phaser.Math.Between(-90, 90));
    this.asteroids.add(asteroid);
  }

  updateAsteroids() {
    if (!this.asteroids) {
      return;
    }
    this.asteroids.getChildren().forEach((asteroid) => {
      if (!asteroid.active) {
        return;
      }
      this.physics.world.wrap(asteroid, 24);
    });
  }

  spawnBossAsteroid() {
    if (this.bossSpawned) {
      return;
    }
    this.bossSpawned = true;
    const { width, height } = this.scale;
    const bossVisualRadius = BOSS_ASTEROID_RADIUS * BOSS_ASTEROID_SCALE;
    this.statusText.setText("Warning: massive asteroid incoming!");
    this.bossAsteroid = this.physics.add.image(
      width + bossVisualRadius + 140,
      Phaser.Math.Between(bossVisualRadius + 40, height - bossVisualRadius - 40),
      "asteroid_big"
    );
    this.bossAsteroid.setScale(BOSS_ASTEROID_SCALE);
    this.bossAsteroid.setCircle(BOSS_ASTEROID_RADIUS);
    this.bossAsteroid.setVelocity(-220, Phaser.Math.Between(-40, 40));
    this.bossAsteroid.setAngularVelocity(40);
    this.bossAsteroid.setImmovable(true);

    this.physics.add.overlap(this.player, this.bossAsteroid, () => {
      this.handlePlayerHit();
    });

    if (this.hunter) {
      this.physics.add.overlap(this.hunter, this.bossAsteroid, () => {
        this.crashHunter();
      });
    }
  }

  crashHunter() {
    if (!this.hunter || !this.hunter.active) {
      return;
    }
    this.statusText.setText("Martian ship destroyed! Keep dodging!");
    this.hunter.setTint(0xff3300);
    this.hunter.setVelocity(-180, 120);
    this.hunter.setAngularVelocity(200);
    this.time.delayedCall(800, () => {
      if (this.hunter && this.hunter.active) {
        this.hunter.destroy();
      }
    });
  }

  handlePlayerHit() {
    if (this.gameOver || this.levelComplete) {
      return;
    }
    if (this.time.now - this.lastHitTime < this.hitCooldown) {
      return;
    }
    this.lastHitTime = this.time.now;
    this.health = Math.max(0, this.health - 1);
    this.player.setTint(0xffb2b2);
    this.cameras.main.shake(120, 0.004);

    this.time.delayedCall(260, () => {
      if (this.player) {
        this.player.clearTint();
      }
    });

    if (this.health <= 0) {
      this.gameOver = true;
      this.physics.pause();
      this.statusText.setText("Hull breach! Press R to retry or L for level select.");
      this.updateHud(Math.max(0, ESCAPE_DURATION - this.elapsedMs / 1000));
      return;
    }
    this.statusText.setText("Hull hit! Keep moving.");
  }

  updateHud(remaining) {
    if (!this.hudText) {
      return;
    }
    const timeText = `${Math.ceil(remaining)}s`;
    this.hudText.setText(`Hull: ${this.health} · Escape: ${timeText}`);

    const goal = this.levelComplete
      ? "You escaped. Press L for level select."
      : this.gameOver
        ? "Hull breach. Press R to retry."
        : this.bossSpawned
          ? "Dodge the massive asteroid and survive."
          : "Survive until the massive asteroid arrives.";
    updateSidebar({
      level: "Level 3: Space Chase",
      goal,
      health: `${this.health}/3`,
      controls: "Move: Arrows/WASD\nR: Restart\nL: Level select",
    });
  }

  completeLevel() {
    if (this.levelComplete) {
      return;
    }
    this.levelComplete = true;
    this.physics.pause();
    this.statusText.setText("You escaped! Press L for level select.");
    this.updateHud(0);
    this.showVictoryCelebration();
  }

  showVictoryCelebration() {
    const { width, height } = this.scale;

    if (!this.textures.exists("confetti_piece")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0, 6, 6);
      graphics.generateTexture("confetti_piece", 6, 6);
      graphics.destroy();
    }

    const panel = this.add
      .rectangle(width * 0.5, height * 0.5, width * 0.7, height * 0.32, 0x05070d, 0.72)
      .setScrollFactor(0)
      .setDepth(3000);
    panel.setStrokeStyle(5, 0xffe8a3, 0.95);

    this.add
      .text(width * 0.5, height * 0.5 - 64, "VICTORY!", {
        fontSize: "68px",
        fontStyle: "bold",
        color: "#fff5c4",
        stroke: "#000000",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    this.add
      .text(width * 0.5, height * 0.5 + 4, "GAME OVER", {
        fontSize: "44px",
        fontStyle: "bold",
        color: "#ffd77d",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    this.add
      .text(width * 0.5, height * 0.5 + 62, "Press L for level select", {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#f7e9d3",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    const confetti = this.add.particles(0, 0, "confetti_piece", {
      x: { min: 0, max: width },
      y: -16,
      lifespan: { min: 2000, max: 3000 },
      speedX: { min: -150, max: 150 },
      speedY: { min: 190, max: 320 },
      gravityY: 260,
      angle: { min: 85, max: 95 },
      rotate: { min: -180, max: 180 },
      scale: { start: 1.2, end: 1.2 },
      quantity: 8,
      tint: [0xff6b6b, 0xffd93d, 0x6bff95, 0x6bc8ff, 0xff9bf6],
      blendMode: "NORMAL",
    });
    confetti.setScrollFactor(0).setDepth(3002);

    this.time.delayedCall(2600, () => {
      if (confetti && confetti.active) {
        confetti.stop();
      }
    });
  }

  createStarfieldTexture() {
    if (this.textures.exists("starfield")) {
      return;
    }
    const size = 128;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x05070d, 1);
    graphics.fillRect(0, 0, size, size);
    for (let i = 0; i < 90; i += 1) {
      const x = Phaser.Math.Between(0, size - 1);
      const y = Phaser.Math.Between(0, size - 1);
      const color = Phaser.Math.Between(0, 10) > 8 ? 0xfff2c2 : 0xffffff;
      graphics.fillStyle(color, 1);
      graphics.fillRect(x, y, 2, 2);
    }
    graphics.generateTexture("starfield", size, size);
    graphics.destroy();
  }

  createAsteroidTextures() {
    if (!this.textures.exists("asteroid")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x9c8b7b, 1);
      graphics.fillCircle(16, 16, 16);
      graphics.fillStyle(0x7d6d60, 1);
      graphics.fillCircle(10, 12, 5);
      graphics.fillCircle(22, 20, 4);
      graphics.generateTexture("asteroid", 32, 32);
      graphics.clear();
      graphics.fillStyle(0x8a7768, 1);
      graphics.fillCircle(64, 64, BOSS_ASTEROID_RADIUS);
      graphics.fillStyle(0x6f5f54, 1);
      graphics.fillCircle(40, 46, 14);
      graphics.fillCircle(80, 74, 11);
      graphics.generateTexture("asteroid_big", 128, 128);
      graphics.destroy();
    }
  }
}
