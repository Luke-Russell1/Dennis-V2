
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
    console.log(this.initialState)
    // creates map and adds tilesets
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
    const tilesToCollideWith = [0, 1, 3, 4, 5]; 
    this.layer.setCollision(tilesToCollideWith);
    // Set callbacks for collision events
    this.layer.setTileIndexCallback(
      tilesToCollideWith,
      this.handleTileCollision,
      this
    );  

    // Create and assigns player sprites depending on which player they connect as 
    this.player = this.physics.add.sprite(this.initialState.player1.x, this.initialState.player1.y, "agents", this.initialState.player1.direction + ".png");
    this.otherPlayer = this.physics.add.sprite(this.initialState.player2.x, this.initialState.player2.y, "agents", this.initialState.player2.direction + ".png");
    // sets other player red PLACEHOLDER
    this.otherPlayer.setTint(0xff0000);
    this.physics.world.createDebugGraphic();
    // enables collision with map and player
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.otherPlayer, this.layer);
    
    

    

  }
  update() {
    // moves player
    this.movePlayer(40, this.keys);

    // listens for new player data, 
    this.ws.onmessage = (event) => {
      let data = JSON.parse(event.data);
      Object.assign(this.state, data);
      this.updatePlayer(this.otherPlayer, this.state.player2);
  }

}
movePlayer(speed, keys){
  /*
  this current method allows for players to move diagnally, which is ideal for analysis but maybe not for the game?
  For example, it may display a north image on my screen, but while moving north-west, it may display the east image on the other player's screen
  need to think more about this. 
  */
  if (keys.left.isDown) {
    this.player.body.setVelocityX(-speed);
    this.state.player1.direction = 'WEST';
    this.updatePlayerImage(this.player, 'WEST');
  } else if (keys.right.isDown) {
    this.player.body.setVelocityX(speed);
    this.state.player1.direction = 'EAST';
    this.updatePlayerImage(this.player, 'EAST');
  } else {
    this.player.body.setVelocityX(0);
  }
  if (keys.up.isDown) {
    this.player.body.setVelocityY(-speed);
    this.player.direction = 'NORTH';
    this.updatePlayerImage(this.player, 'NORTH');
  } else if (keys.down.isDown) {
    this.player.body.setVelocityY(speed);
    this.player.direction = 'SOUTH';
    this.updatePlayerImage(this.player, 'SOUTH');
  } else {
    this.player.body.setVelocityY(0);
  }

  this.state.player1.x = this.player.x;
  this.state.player1.y = this.player.y;
  this.ws.send(JSON.stringify(this.state.player1));
}
  updatePlayer(player, playerData) {
    player.x = playerData.x;
    player.y = playerData.y;
    this.updatePlayerImage(player, playerData.direction);
  }
  handleTileCollision(player, tile) {
    // Handle collision
    // Stores tile that the player is colliding with to be used for interactions later
    // we want to have a value that we just refer to, but also one that we store for later
    // might be a little redundant??
    let player_collision_tile = tile.index;
    return player_collision_tile;
  }
  updatePlayerImage(player, direction) {
    player.setTexture("agents", direction + ".png");
  }
}

