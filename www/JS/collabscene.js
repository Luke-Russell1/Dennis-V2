
const envConstants = {
  tileSize: 45,
};

const startPos1 = {
  x: 8 * envConstants.tileSize,
  y: 8 * envConstants.tileSize,
};
const startPos2 = {
  x: 10 * envConstants.tileSize,
  y: 8 * envConstants.tileSize,
};

export default class CollabScene extends Phaser.Scene {
  constructor(config) {
    super("CollabScene");
    this.initialState = config.initialState;
    this.ws = config.ws;

    }

  preload() {
    // Preload assets
    this.load.image("environment", "./Assets/environment.png");
    this.load.atlas('terrain', './Assets/environment.png', './Assets/environment.json');
    this.load.atlas("agents", "./Assets/agents.png", "./Assets/agents.json");
    this.load.tilemapCSV("map", "./layouts/layout_1V2.csv");
    this.load.atlas("soups", "./Assets/soups.png", "./Assets/soups.json");
  }

  create() {
    this.ws = this.game.ws;
    console.log(this.ws)


    // sets input keys
    this.keys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      interact: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      DRT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
    // Sets the player colour depending on which player they connect as
    this.createMap();
    if (this.initialState.whichPlayer == 'P1') {
      this.player = this.physics.add.sprite(this.initialState.player1.x, this.initialState.player2.y, "agents", "SOUTH.png");
      this.otherPlayer = this.physics.add.sprite(this.initialState.player2.x, this.initialState.player2.y, "agents", "SOUTH.png");
      this.otherPlayer.setTint(0xff0000);
    } else {
      this.player = this.physics.add.sprite(this.initialState.player2.x, this.initialState.player2.y, "agents", "SOUTH.png");
      this.otherPlayer = this.physics.add.sprite(this.initialState.player1.x, this.initialState.player1.y, "agents", "SOUTH.png");
      this.otherPlayer.setTint(0xff0000);
    }
    // adds colliders for the world
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.otherPlayer, this.layer);

  }
  createMap() {
    // Create and load the tilemap
    this.map = this.make.tilemap({
      key: "map",
      tileWidth: envConstants.tileSize,
      tileHeight: envConstants.tileSize,
    });
    this.tileset = this.map.addTilesetImage(
      "environment",
      null,
      envConstants.tileSize,
      envConstants.tileSize,
      0,
      0
    );
    // Create collision layer
    this.layer = this.map.createLayer(0, this.tileset, 0, 0);
    const tilesToCollideWith = [0, 1, 3, 4, 5]; // Example tile indices to collide with
    this.layer.setCollision(tilesToCollideWith);
    // Set callbacks for collision events
    this.layer.setTileIndexCallback(
      tilesToCollideWith,
      this.handleTileCollision,
      this
    );
  }
  update() {
  }
  movePlayer(player, speed, keys){
    player.setVelocity(0);
    if (keys.left.isDown) {
      player.setVelocityX(-speed);
    } else if (keys.right.isDown) {
      player.setVelocityX(speed);
    }
    if (keys.up.isDown) {
      player.setVelocityY(-speed);
    } else if (keys.down.isDown) {
      player.setVelocityY(speed);
    }
    this.player.x = player.x;
    this.player.y = player.y;
    this.playerState.x = player.x;
    this.playerState.y = player.y;
  }


}

