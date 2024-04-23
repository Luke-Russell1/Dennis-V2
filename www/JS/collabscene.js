
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
    this.state = this.initialState

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
    if (this.initialState.whichPlayer.name == 'P1') {
      this.player = this.physics.add.sprite(this.initialState.player1.x, this.initialState.player2.y, "agents", "SOUTH.png");
      this.otherPlayer = this.physics.add.sprite(this.initialState.player2.x, this.initialState.player2.y, "agents", "SOUTH.png");
      this.otherPlayer.setTint(0xff0000);
      console.log(this.state);
    } if (this.initialState.whichPlayer.name == 'P2') {
      this.player = this.physics.add.sprite(this.initialState.player2.x, this.initialState.player2.y, "agents", "SOUTH.png");
      this.otherPlayer = this.physics.add.sprite(this.initialState.player1.x, this.initialState.player1.y, "agents", "SOUTH.png");
      this.otherPlayer.setTint(0xff0000);
      let temp = this.state.player1;
      this.state.player1 = this.state.player2;
      this.state.player2 = temp;
      console.log(this.state);
    } else if (this.initialState.whichPlayer.name == 'null') {
      console.error('No player name given');
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
    this.movePlayer(3, this.keys);
    this.ws.onmessage = (event) => {
      let data = JSON.parse(event.data);
      Object.assign(this.state, data);
      this.updatePlayer(this.player, this.state.player1);
      this.updatePlayer(this.otherPlayer, this.state.player2);
  }
}
  movePlayer(speed, keys){
    if (keys.left.isDown) {
      this.state.player1.x -= speed;
    } else if (keys.right.isDown) {
      this.state.player1.x += speed;
    }
    if (keys.up.isDown) {
      this.state.player1.y -= speed;
    } else if (keys.down.isDown) {
      this.state.player1.y += speed;}
    this.ws.send(JSON.stringify(this.state.player1));
  }
  updatePlayer(player, playerData) {
    player.x = playerData.x;
    player.y = playerData.y;
  }


}

