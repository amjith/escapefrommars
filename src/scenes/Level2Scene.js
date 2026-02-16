import { updateSidebar } from "../ui/sidebar.js";

const TILE_SIZE = 32;
const FLOOR_FRAME = 21;
const WALL_FRAME = 9;
const BREAKABLE_FRAME = 38;
const CAMERA_ZOOM = 1.1;
const MARTIAN_SPEED = 70;
const BULLET_SPEED = 320;

const LEVEL_LAYOUT = [
  "########################################",
  "#......................#..............##",
  "#..S.G...M.............#..............##",
  "#.P...R.....M..........#..............##",
  "#.......M..........J...#..............##",
  "#......................#################",
  "#...####........##F....##....#....#..###",
  "#...####........###....####.#.##.#.#####",
  "#...####........###....##...#..#.#...###",
  "#.......F..............##.###.##.#.#.###",
  "#.............F........##.#...#..#.#.###",
  "#......................##.#.###.##.#.###",
  "#..........####........ET......#..#..###",
  "#..........####........##.#####.#.##.###",
  "#..........####........##.....#.#..U.###",
  "#...........X.....###..##.###.#.####.###",
  "#.................###..##...#.#....#.###",
  "#.....####........###..##.B.#.##.X.D.###",
  "#.....####.............#################",
  "#.....F###.............#..............##",
  "#.........F............#..............##",
  "#......................#..............##",
  "#......................#..............##",
  "########################################",
];

const MAP_WIDTH = LEVEL_LAYOUT[0].length;
const MAP_HEIGHT = LEVEL_LAYOUT.length;

const toWorld = (tileX, tileY) => ({
  x: tileX * TILE_SIZE + TILE_SIZE * 0.5,
  y: tileY * TILE_SIZE + TILE_SIZE * 0.5,
});

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2Scene");
    this.rover = null;
    this.player = null;
    this.inRover = false;
    this.roverLocked = true;
    this.ambushActive = true;
    this.raygunEquipped = false;
    this.hasJetpack = false;
    this.jetpackFuel = 0;
    this.explosives = 0;
    this.fuelCollected = 0;
    this.requiredFuel = 5;
    this.health = 3;
    this.levelComplete = false;
    this.gameOver = false;
    this.isJetpacking = false;
    this.lastMoveDirection = new Phaser.Math.Vector2(1, 0);
    this.bullets = null;
    this.martians = null;
    this.raygunPickup = null;
    this.sfx = null;
    this.roverDust = null;
    this.jetpackTrail = null;
    this.lastDamageTime = 0;

    this.wallGroup = null;
    this.breakableWalls = null;
    this.roverBlockers = null;

    this.ship = null;
    this.entrancePos = null;
    this.entranceTrigger = null;
    this.entranceTriggerPos = null;
    this.entranceSealed = false;

    this.cursors = null;
    this.keys = null;
    this.statusText = null;
    this.hudText = null;

    this.playerWallCollider = null;
    this.playerBreakableCollider = null;
    this.playerMartianOverlap = null;
    this.roverMartianOverlap = null;
    this.roverWallCollider = null;
    this.roverBreakableCollider = null;
    this.roverBlockerCollider = null;
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
    this.load.image("ship", "assets/ship.png");
    this.load.image("rover", "assets/rover.png");
    this.load.image("martian", "assets/martian.png");
    this.load.image("fuel_canister", "assets/fuel_canister.png");
    this.load.image("jetpack", "assets/jetpack.png");
    this.load.image("explosive", "assets/explosive.png");
    this.load.image("jetpack_fuel", "assets/jetpack_fuel.png");
    this.load.image("raygun", "assets/raygun.png");
    this.load.image("bullet", "assets/bullet.png");
    this.load.image("smoke_puff", "assets/smoke_puff.png");
    this.load.audio("sfx_shot", "assets/sfx_shot.wav");
    this.load.audio("sfx_pickup", "assets/sfx_pickup.wav");
    this.load.audio("sfx_explosion", "assets/sfx_explosion.mp3");
    this.load.audio("sfx_boost", "assets/sfx_boost.wav");
  }

  create() {
    const {
      walls,
      breakables,
      roverBlocks,
      spawn,
      items,
      entrance,
      entranceTriggerPos,
    } = this.buildLevel();
    this.entrancePos = entrance;
    this.entranceTriggerPos = entranceTriggerPos;

    const worldWidth = MAP_WIDTH * TILE_SIZE;
    const worldHeight = MAP_HEIGHT * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(CAMERA_ZOOM);

    this.createAnimations();
    this.sfx = {
      shot: this.sound.add("sfx_shot", { volume: 0.4 }),
      pickup: this.sound.add("sfx_pickup", { volume: 0.6 }),
      explosion: this.sound.add("sfx_explosion", { volume: 0.5 }),
      boost: this.sound.add("sfx_boost", { volume: 0.35 }),
    };

    this.add
      .tileSprite(0, 0, worldWidth, worldHeight, "mars_tiles", FLOOR_FRAME)
      .setOrigin(0);

    this.wallGroup = this.physics.add.staticGroup();
    walls.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      this.wallGroup.create(position.x, position.y, "mars_tiles", WALL_FRAME);
    });

    this.breakableWalls = this.physics.add.staticGroup();
    breakables.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const wall = this.breakableWalls.create(
        position.x,
        position.y,
        "mars_tiles",
        BREAKABLE_FRAME
      );
      wall.setTint(0xb8693a);
      wall.setData("tileX", spot.x);
      wall.setData("tileY", spot.y);
    });

    this.roverBlockers = this.physics.add.staticGroup();
    roverBlocks.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const blocker = this.roverBlockers.create(
        position.x,
        position.y,
        "mars_tiles",
        WALL_FRAME
      );
      blocker.setAlpha(0);
      blocker.setVisible(false);
    });

    const shipPosition = toWorld(spawn.ship.x, spawn.ship.y);
    this.ship = this.physics.add.staticSprite(
      shipPosition.x,
      shipPosition.y,
      "ship"
    );
    this.ship.setScale(2);
    this.ship.refreshBody();
    this.ship.setDepth(2);

    const roverPosition = toWorld(spawn.rover.x, spawn.rover.y);
    this.rover = this.physics.add.sprite(
      roverPosition.x,
      roverPosition.y,
      "rover"
    );
    this.rover.setScale(0.35);
    this.rover.setCollideWorldBounds(true);
    this.rover.setDepth(3);
    if (this.rover.body) {
      this.rover.body.setSize(TILE_SIZE * 0.75, TILE_SIZE * 0.75, true);
    }

    const playerPosition = toWorld(spawn.player.x, spawn.player.y);
    this.player = this.physics.add.sprite(
      playerPosition.x,
      playerPosition.y,
      "spaceman",
      1
    );
    this.player.setCollideWorldBounds(true);
    this.player.setVisible(true);
    this.player.setDepth(4);
    this.inRover = false;
    this.roverLocked = true;
    this.ambushActive = true;
    this.rover.setAlpha(0.6);

    if (this.textures.exists("smoke_puff")) {
      this.roverDust = this.add.particles(0, 0, "smoke_puff", {
        speed: { min: -20, max: 20 },
        angle: { min: 160, max: 200 },
        lifespan: 500,
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.5, end: 0 },
        frequency: 40,
        on: false,
      });
      if (this.roverDust.startFollow) {
        this.roverDust.startFollow(this.rover, 0, 26);
      }

      this.jetpackTrail = this.add.particles(0, 0, "smoke_puff", {
        speed: { min: -15, max: 15 },
        angle: { min: 200, max: 340 },
        lifespan: 400,
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: 0x88ccff,
        frequency: 40,
        on: false,
      });
      if (this.jetpackTrail.startFollow) {
        this.jetpackTrail.startFollow(this.player, 0, 14);
      }
    }

    this.roverWallCollider = this.physics.add.collider(
      this.rover,
      this.wallGroup
    );
    this.roverBreakableCollider = this.physics.add.collider(
      this.rover,
      this.breakableWalls
    );
    this.roverBlockerCollider = this.physics.add.collider(
      this.rover,
      this.roverBlockers
    );
    if (this.roverBlockerCollider) {
      this.roverBlockerCollider.active = false;
    }
    this.playerWallCollider = this.physics.add.collider(
      this.player,
      this.wallGroup
    );
    this.playerBreakableCollider = this.physics.add.collider(
      this.player,
      this.breakableWalls
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,E,SPACE,F");
    this.input.keyboard.on("keydown-L", () => {
      this.scene.start("LevelSelectScene");
    });
    this.input.keyboard.on("keydown-R", () => {
      if (this.gameOver) {
        this.scene.restart();
      }
    });

    this.setupPickups(items);
    this.setupCombat(items);
    this.checkAmbushClear();
    this.setupTriggers();

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    const uiZoom = this.cameras.main.zoom;
    const hudDepth = 1000;
    this.hudBg = this.add
      .rectangle(0, 0, this.scale.width / uiZoom, 70 / uiZoom, 0x140b07, 0.9)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(hudDepth);

    this.statusText = this.add
      .text(16 / uiZoom, 10 / uiZoom, "Ambush! Grab the raygun. F to fire.", {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#f7e9d3",
        stroke: "#3a1c12",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.hudText = this.add
      .text(16 / uiZoom, 38 / uiZoom, "", {
        fontSize: "14px",
        color: "#f7e9d3",
        stroke: "#3a1c12",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.helpText = this.add
      .text(
        (this.scale.width * 0.5) / uiZoom,
        76 / uiZoom,
        "Controls: Move Arrows/WASD · F fire · E interact · SPACE jetpack\nN next level (after refuel) · R retry · L level select",
        {
          fontSize: "12px",
          fontStyle: "bold",
          color: "#fff7bf",
          stroke: "#000000",
          strokeThickness: 2,
          backgroundColor: "rgba(0,0,0,0.45)",
          align: "center",
          wordWrap: { width: (this.scale.width - 40) / uiZoom },
          padding: { x: 8, y: 4 },
        }
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.updateHud();
  }

  update() {
    if (this.levelComplete || this.gameOver) {
      return;
    }

    const target = this.inRover ? this.rover : this.player;
    const speed = this.inRover ? 180 : 120;

    const inputVector = this.getMoveVector();
    if (inputVector.lengthSq() > 0) {
      inputVector.normalize();
      this.lastMoveDirection.copy(inputVector);
      target.setVelocity(inputVector.x * speed, inputVector.y * speed);
      if (!this.inRover) {
        this.player.anims.play("walk", true);
      }
    } else {
      target.setVelocity(0, 0);
      if (!this.inRover) {
        this.player.anims.stop();
        this.player.setFrame(1);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.handleInteract();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) &&
      this.hasJetpack &&
      this.jetpackFuel > 0
    ) {
      this.startJetpack();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
      this.fireRaygun();
    }

    this.updateMartians();
    this.updateRoverDust();
    this.checkAutoRefuel();
  }

  setupPickups(items) {
    this.fuelGroup = this.physics.add.staticGroup();
    items.fuel.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const fuel = this.fuelGroup.create(
        position.x,
        position.y,
        "fuel_canister"
      );
      fuel.setScale(0.3);
      fuel.refreshBody();
    });

    this.decoyGroup = this.physics.add.staticGroup();
    items.decoy.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const decoy = this.decoyGroup.create(
        position.x,
        position.y,
        "fuel_canister"
      );
      decoy.setScale(0.3);
      decoy.setTint(0xcc7755);
      decoy.refreshBody();
      const label = this.add
        .text(position.x, position.y - 18, "FULE", {
          fontSize: "10px",
          color: "#f7e9d3",
          stroke: "#3a1c12",
          strokeThickness: 2,
        })
        .setOrigin(0.5);
      decoy.setData("label", label);
    });

    this.jetpackItem = this.physics.add.staticSprite(
      toWorld(items.jetpack.x, items.jetpack.y).x,
      toWorld(items.jetpack.x, items.jetpack.y).y,
      "jetpack"
    );

    this.jetpackFuelGroup = this.physics.add.staticGroup();
    items.jetpackFuel.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const fuel = this.jetpackFuelGroup.create(
        position.x,
        position.y,
        "jetpack_fuel"
      );
      fuel.setScale(0.9);
      fuel.refreshBody();
    });

    this.explosiveGroup = this.physics.add.staticGroup();
    items.explosives.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const explosive = this.explosiveGroup.create(
        position.x,
        position.y,
        "explosive"
      );
      explosive.setScale(0.15);
      explosive.refreshBody();
    });

    this.physics.add.overlap(this.rover, this.fuelGroup, (rover, fuel) => {
      this.collectFuel(fuel);
    });
    this.physics.add.overlap(this.player, this.fuelGroup, (player, fuel) => {
      this.collectFuel(fuel);
    });

    this.physics.add.overlap(this.player, this.decoyGroup, (player, decoy) => {
      decoy.disableBody(true, true);
      const label = decoy.getData("label");
      if (label) {
        label.destroy();
      }
      this.applyDamage(1, "Decoy canister! It explodes.");
    });
    this.physics.add.overlap(this.rover, this.decoyGroup, (rover, decoy) => {
      decoy.disableBody(true, true);
      const label = decoy.getData("label");
      if (label) {
        label.destroy();
      }
      this.applyDamage(1, "Decoy canister! It explodes.");
    });

    this.physics.add.overlap(this.player, this.jetpackFuelGroup, (player, fuel) => {
      fuel.disableBody(true, true);
      this.jetpackFuel += 1;
      if (this.sfx) {
        this.sfx.pickup.play();
      }
      this.statusText.setText("Jetpack fuel collected.");
      this.updateHud();
    });
    this.physics.add.overlap(this.rover, this.jetpackFuelGroup, (rover, fuel) => {
      fuel.disableBody(true, true);
      this.jetpackFuel += 1;
      if (this.sfx) {
        this.sfx.pickup.play();
      }
      this.statusText.setText("Jetpack fuel collected.");
      this.updateHud();
    });

    this.physics.add.overlap(this.player, this.explosiveGroup, (player, bomb) => {
      bomb.disableBody(true, true);
      this.explosives += 1;
      if (this.sfx) {
        this.sfx.pickup.play();
      }
      this.statusText.setText("Explosive acquired. Press E near a cracked wall.");
      this.updateHud();
    });
    this.physics.add.overlap(this.rover, this.explosiveGroup, (rover, bomb) => {
      bomb.disableBody(true, true);
      this.explosives += 1;
      if (this.sfx) {
        this.sfx.pickup.play();
      }
      this.statusText.setText("Explosive acquired. Press E near a cracked wall.");
      this.updateHud();
    });

    this.physics.add.overlap(this.rover, this.jetpackItem, () => {
      this.acquireJetpack();
    });
    this.physics.add.overlap(this.player, this.jetpackItem, () => {
      this.acquireJetpack();
    });
  }

  setupCombat(items) {
    this.martians = this.physics.add.group();
    items.martians.forEach((spot) => {
      const position = toWorld(spot.x, spot.y);
      const martian = this.martians.create(position.x, position.y, "martian");
      martian.setCollideWorldBounds(true);
      martian.setBounce(0.6);
    });

    if (items.raygun) {
      const raygunPosition = toWorld(items.raygun.x, items.raygun.y);
      this.raygunPickup = this.physics.add.staticSprite(
        raygunPosition.x,
        raygunPosition.y,
        "raygun"
      );
      this.raygunPickup.setScale(0.6);

      this.physics.add.overlap(this.player, this.raygunPickup, () => {
        this.acquireRaygun();
      });
      this.physics.add.overlap(this.rover, this.raygunPickup, () => {
        this.acquireRaygun();
      });
    }

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 30,
    });

    this.physics.add.collider(this.bullets, this.wallGroup, (bullet) => {
      bullet.destroy();
    });
    this.physics.add.collider(this.bullets, this.breakableWalls, (bullet) => {
      bullet.destroy();
    });

    this.physics.add.overlap(this.bullets, this.martians, (bullet, martian) => {
      bullet.destroy();
      martian.destroy();
      if (this.sfx) {
        this.sfx.explosion.play();
      }
      this.checkAmbushClear();
    });

    this.physics.add.collider(this.martians, this.wallGroup);
    this.physics.add.collider(this.martians, this.breakableWalls);
    this.physics.add.collider(this.martians, this.roverBlockers);

    this.playerMartianOverlap = this.physics.add.overlap(
      this.player,
      this.martians,
      () => {
        this.damagePlayer("player");
      }
    );
    this.roverMartianOverlap = this.physics.add.overlap(
      this.rover,
      this.martians,
      () => {
        this.damagePlayer("rover");
      }
    );
    this.syncMartianDamageOverlaps();
  }

  setupTriggers() {
    const entrancePosition = toWorld(
      this.entranceTriggerPos.x,
      this.entranceTriggerPos.y
    );
    this.entranceTrigger = this.add.zone(
      entrancePosition.x,
      entrancePosition.y,
      TILE_SIZE,
      TILE_SIZE
    );
    this.physics.add.existing(this.entranceTrigger, true);

    this.physics.add.overlap(this.player, this.entranceTrigger, () => {
      if (!this.entranceSealed) {
        this.sealEntrance();
      }
    });
  }

  collectFuel(fuel) {
    if (!fuel || !fuel.active) {
      return;
    }
    fuel.disableBody(true, true);
    this.fuelCollected += 1;
    if (this.sfx) {
      this.sfx.pickup.play();
    }
    if (this.fuelCollected >= this.requiredFuel) {
      this.statusText.setText(
        `Fuel secured (${this.fuelCollected}/${this.requiredFuel}). Return to the ship.`
      );
    } else {
      this.statusText.setText(
        `Fuel secured (${this.fuelCollected}/${this.requiredFuel}).`
      );
    }
    this.updateHud();
  }

  acquireJetpack() {
    if (this.hasJetpack) {
      return;
    }
    this.hasJetpack = true;
    this.jetpackFuel = Math.max(this.jetpackFuel, 2);
    this.jetpackItem.disableBody(true, true);
    if (this.sfx) {
      this.sfx.pickup.play();
    }
    this.statusText.setText("Jetpack acquired. Find fuel in the maze.");
    this.updateHud();
  }

  handleInteract() {
    if (this.inRover) {
      if (this.tryExplode(this.rover)) {
        return;
      }
      if (this.isNearEntrance()) {
        this.exitRover();
        return;
      }
      if (this.isAtShip(this.rover)) {
        if (this.fuelCollected < this.requiredFuel) {
          this.statusText.setText("Ship needs more fuel.");
          return;
        }
        this.completeLevel(this.rover);
        return;
      }
      this.statusText.setText("Find the maze entrance to dismount.");
      return;
    }

    if (this.tryExplode(this.player)) {
      return;
    }

    if (this.isAtShip(this.player)) {
      if (this.fuelCollected < this.requiredFuel) {
        this.statusText.setText("Ship needs more fuel.");
        return;
      }
      this.completeLevel(this.player);
      return;
    }

    if (this.physics.overlap(this.player, this.rover)) {
      if (this.roverLocked) {
        this.statusText.setText("Rover locked. Clear the ambush.");
        return;
      }
      this.enterRover();
      return;
    }

    this.statusText.setText("Nothing to interact with.");
  }

  tryExplode(target) {
    if (this.explosives <= 0) {
      return false;
    }
    const wall = this.findBreakableWall(target);
    if (!wall) {
      this.statusText.setText("No breakable wall nearby.");
      return false;
    }
    wall.destroy();
    this.explosives -= 1;
    if (this.sfx) {
      this.sfx.explosion.play();
    }
    this.statusText.setText("Wall blown open.");
    this.updateHud();
    return true;
  }

  exitRover() {
    this.inRover = false;
    this.player.setPosition(this.rover.x, this.rover.y);
    this.player.setVisible(true);
    this.player.setActive(true);
    this.rover.setVelocity(0, 0);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.syncMartianDamageOverlaps();
    this.statusText.setText("On foot. Explore the maze for tools.");
    this.updateHud();
  }

  enterRover() {
    this.inRover = true;
    this.player.setVisible(false);
    this.player.setActive(false);
    this.cameras.main.startFollow(this.rover, true, 0.12, 0.12);
    this.syncMartianDamageOverlaps();
    this.statusText.setText("Back in the rover.");
    this.updateHud();
  }

  startJetpack() {
    if (this.isJetpacking) {
      return;
    }
    const target = this.inRover ? this.rover : this.player;
    if (!target) {
      return;
    }
    this.isJetpacking = true;
    this.jetpackFuel -= 1;
    target.setTint(0x88ccff);
    this.statusText.setText("Jetpack boost!");
    if (this.sfx) {
      this.sfx.boost.play();
    }
    if (this.jetpackTrail && this.jetpackTrail.startFollow) {
      this.jetpackTrail.startFollow(
        target,
        0,
        this.inRover ? 26 : 14
      );
    }
    if (this.jetpackTrail && "on" in this.jetpackTrail) {
      this.jetpackTrail.on = true;
    }
    this.updateHud();

    const disabledColliders = this.inRover
      ? [this.roverWallCollider, this.roverBreakableCollider, this.roverBlockerCollider]
      : [this.playerWallCollider, this.playerBreakableCollider];
    disabledColliders.forEach((collider) => {
      if (collider) {
        collider.active = false;
      }
    });

    const boostVector = this.lastMoveDirection.clone();
    if (boostVector.lengthSq() === 0) {
      boostVector.set(1, 0);
    }
    boostVector.normalize().scale(260);
    target.setVelocity(boostVector.x, boostVector.y);

    this.time.delayedCall(280, () => {
      disabledColliders.forEach((collider) => {
        if (collider) {
          collider.active = true;
        }
      });
      this.isJetpacking = false;
      if (target && target.active) {
        target.clearTint();
      }
      if (this.jetpackTrail && "on" in this.jetpackTrail) {
        this.jetpackTrail.on = false;
      }
    });
  }

  getMoveVector() {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      x -= 1;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      x += 1;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      y -= 1;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      y += 1;
    }
    return new Phaser.Math.Vector2(x, y);
  }

  updateHud() {
    if (!this.hudText) {
      return;
    }
    const mode = this.inRover ? "Rover" : "On Foot";
    const jetpack = this.hasJetpack ? `${this.jetpackFuel}` : "-";
    const raygun = this.raygunEquipped ? "Yes" : "No";
    this.hudText.setText(
      `Mode: ${mode}  Fuel: ${this.fuelCollected}/${this.requiredFuel}  ` +
        `Raygun: ${raygun}  Jetpack Fuel: ${jetpack}  ` +
        `Explosives: ${this.explosives}  Health: ${this.health}`
    );

    const goal = this.levelComplete
      ? "Ship fueled. Press N to continue to Level 3."
      : this.gameOver
        ? "Mission failed. Press R to retry."
        : this.fuelCollected >= this.requiredFuel
          ? "Return to the ship and refuel to finish Level 2."
          : "Collect fuel canisters and survive the hazards.";
    updateSidebar({
      level: "Level 2: Rover Hunt",
      goal,
      health: `${this.health}/3`,
      controls:
        "Move: Arrows/WASD\nF: Fire\nE: Interact\nSPACE: Jetpack\nN: Next level (after refuel)\nR: Retry\nL: Level select",
    });
  }

  sealEntrance() {
    this.entranceSealed = true;
    const position = toWorld(this.entrancePos.x, this.entrancePos.y);
    const wall = this.breakableWalls.create(
      position.x,
      position.y,
      "mars_tiles",
      BREAKABLE_FRAME
    );
    wall.setTint(0xb8693a);
    wall.setData("tileX", this.entrancePos.x);
    wall.setData("tileY", this.entrancePos.y);
    wall.refreshBody();
    this.statusText.setText("Entrance sealed. Find a way out!");
  }

  buildLevel() {
    const walls = [];
    const breakables = [];
    const roverBlocks = [];
    const items = {
      fuel: [],
      decoy: [],
      jetpackFuel: [],
      explosives: [],
      martians: [],
      jetpack: null,
      raygun: null,
    };
    const spawn = {
      rover: null,
      ship: null,
      player: null,
    };
    let entrance = null;
    let entranceTriggerPos = null;

    LEVEL_LAYOUT.forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        switch (cell) {
          case "#":
            walls.push({ x, y });
            break;
          case "B":
            breakables.push({ x, y });
            break;
          case "S":
            spawn.ship = { x, y };
            break;
          case "R":
            spawn.rover = { x, y };
            break;
          case "P":
            spawn.player = { x, y };
            break;
          case "F":
            items.fuel.push({ x, y });
            break;
          case "D":
            items.decoy.push({ x, y });
            break;
          case "J":
            items.jetpack = { x, y };
            break;
          case "U":
            items.jetpackFuel.push({ x, y });
            break;
          case "X":
            items.explosives.push({ x, y });
            break;
          case "M":
            items.martians.push({ x, y });
            break;
          case "G":
            items.raygun = { x, y };
            break;
          case "E":
            entrance = { x, y };
            roverBlocks.push({ x, y });
            break;
          case "T":
            entranceTriggerPos = { x, y };
            break;
          default:
            break;
        }
      });
    });

    if (!spawn.ship) {
      spawn.ship = { x: 2, y: 2 };
    }
    if (!spawn.rover) {
      spawn.rover = { x: spawn.ship.x + 2, y: spawn.ship.y + 1 };
    }
    if (!spawn.player) {
      spawn.player = { x: spawn.ship.x + 1, y: spawn.ship.y };
    }
    if (!items.jetpack) {
      items.jetpack = { x: spawn.rover.x + 3, y: spawn.rover.y + 1 };
    }
    if (!items.raygun) {
      items.raygun = { x: spawn.ship.x + 2, y: spawn.ship.y };
    }
    if (!entrance) {
      entrance = { x: 22, y: 12 };
    }
    if (!entranceTriggerPos) {
      entranceTriggerPos = { x: entrance.x + 1, y: entrance.y };
    }

    return {
      walls,
      breakables,
      roverBlocks,
      spawn,
      items,
      entrance,
      entranceTriggerPos,
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
  }

  isNearEntrance() {
    const entranceWorld = toWorld(this.entrancePos.x, this.entrancePos.y);
    const distance = Phaser.Math.Distance.Between(
      this.rover.x,
      this.rover.y,
      entranceWorld.x,
      entranceWorld.y
    );
    return distance <= TILE_SIZE * 1.1;
  }

  acquireRaygun() {
    if (this.raygunEquipped) {
      return;
    }
    this.raygunEquipped = true;
    if (this.raygunPickup) {
      this.raygunPickup.disableBody(true, true);
    }
    if (this.sfx) {
      this.sfx.pickup.play();
    }
    this.statusText.setText("Raygun ready. Clear the ambush!");
    this.updateHud();
  }

  fireRaygun() {
    if (!this.raygunEquipped || this.levelComplete) {
      return;
    }
    const source = this.inRover ? this.rover : this.player;
    if (!source || !this.bullets) {
      return;
    }
    const bullet = this.bullets.get(source.x, source.y, "bullet");
    if (!bullet) {
      return;
    }
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setScale(0.6);
    bullet.body.allowGravity = false;

    const direction = this.lastMoveDirection.clone();
    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }
    direction.normalize();
    bullet.setVelocity(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED);

    if (this.sfx) {
      this.sfx.shot.play();
    }

    this.time.delayedCall(600, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }

  updateMartians() {
    if (!this.martians || this.martians.getChildren().length === 0) {
      return;
    }
    const target = this.inRover ? this.rover : this.player;
    if (!target) {
      return;
    }
    this.martians.getChildren().forEach((martian) => {
      if (!martian.active) {
        return;
      }
      const direction = new Phaser.Math.Vector2(
        target.x - martian.x,
        target.y - martian.y
      );
      if (direction.lengthSq() === 0) {
        martian.setVelocity(0, 0);
        return;
      }
      direction.normalize();
      martian.setVelocity(direction.x * MARTIAN_SPEED, direction.y * MARTIAN_SPEED);
    });
  }

  updateRoverDust() {
    if (!this.roverDust || !this.rover) {
      return;
    }
    const speed = this.rover.body ? this.rover.body.velocity.length() : 0;
    if ("on" in this.roverDust) {
      this.roverDust.on = this.inRover && speed > 10;
    }
  }

  syncMartianDamageOverlaps() {
    if (this.playerMartianOverlap) {
      this.playerMartianOverlap.active = !this.inRover;
    }
    if (this.roverMartianOverlap) {
      this.roverMartianOverlap.active = this.inRover;
    }
  }

  damagePlayer(source) {
    if (this.levelComplete || this.gameOver) {
      return;
    }
    const activeSource = source || (this.inRover ? "rover" : "player");
    if (activeSource === "rover" && !this.inRover) {
      return;
    }
    if (activeSource === "player" && this.inRover) {
      return;
    }
    const now = this.time.now;
    if (now < this.lastDamageTime + 800) {
      return;
    }
    this.lastDamageTime = now;
    this.applyDamage(1, "Martian hit! Keep moving.");
  }

  checkAmbushClear() {
    if (!this.ambushActive || !this.martians) {
      return;
    }
    if (this.martians.countActive(true) > 0) {
      return;
    }
    this.ambushActive = false;
    this.roverLocked = false;
    this.rover.setAlpha(1);
    this.statusText.setText("Ambush cleared. Rover unlocked. Find fuel.");
  }

  applyDamage(amount, message) {
    if (this.gameOver) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.sfx) {
      this.sfx.explosion.play();
    }
    this.cameras.main.shake(120, 0.01);
    const target = this.inRover ? this.rover : this.player;
    if (target) {
      target.setTint(0xffaaaa);
      this.time.delayedCall(200, () => {
        if (target) {
          target.clearTint();
        }
      });
    }
    if (message) {
      this.statusText.setText(message);
    }
    this.updateHud();
    if (this.health <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    this.physics.pause();
    if (this.roverDust) {
      if ("on" in this.roverDust) {
        this.roverDust.on = false;
      }
    }
    if (this.jetpackTrail) {
      if ("on" in this.jetpackTrail) {
        this.jetpackTrail.on = false;
      }
    }
    this.statusText.setText("Game over. Press R to retry or L for levels.");
    this.updateHud();
  }

  findBreakableWall(target) {
    const source = target || this.player;
    if (!source) {
      return null;
    }
    const playerTile = this.getTileCoords(source.x, source.y);
    const dir = this.lastMoveDirection.clone();
    if (dir.lengthSq() === 0) {
      dir.set(1, 0);
    }
    const targetTile = {
      x: playerTile.x + Math.sign(dir.x || 0),
      y: playerTile.y + Math.sign(dir.y || 0),
    };

    const walls = this.breakableWalls.getChildren();
    let closeWall = null;
    let closestDistance = TILE_SIZE * 0.75;

    for (const wall of walls) {
      if (!wall.active) {
        continue;
      }
      const tileX = wall.getData("tileX");
      const tileY = wall.getData("tileY");
      if (tileX === targetTile.x && tileY === targetTile.y) {
        return wall;
      }
      const distance = Phaser.Math.Distance.Between(
        source.x,
        source.y,
        wall.x,
        wall.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closeWall = wall;
      }
    }
    return closeWall;
  }

  getTileCoords(x, y) {
    return {
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE),
    };
  }

  checkAutoRefuel() {
    if (this.levelComplete || this.fuelCollected < this.requiredFuel) {
      return;
    }
    const target = this.inRover ? this.rover : this.player;
    if (this.isAtShip(target)) {
      this.completeLevel(target);
    }
  }

  completeLevel(target) {
    if (this.levelComplete) {
      return;
    }
    this.levelComplete = true;
    target.setVelocity(0, 0);
    this.physics.pause();
    if (this.roverDust) {
      this.roverDust.on = false;
    }
    if (this.jetpackTrail) {
      this.jetpackTrail.on = false;
    }
    this.statusText.setText("Ship fueled! Level 2 complete. Press N for Level 3.");
    this.updateHud();
    this.input.keyboard.once("keydown-N", () => {
      this.scene.start("Level3Scene");
    });
  }

  isAtShip(target) {
    return this.physics.overlap(target, this.ship);
  }
}
