
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
    // environment variables for interactions
    this.collision_tile = 0;
    console.log(this.collision_tile);
    this.interactionInitiated = false;
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
    this.tileInteraction();
    this.movePlayer(100, this.keys);
    // listens for new player data, 
    this.ws.onmessage = (event) => {
      let data = JSON.parse(event.data);
      Object.assign(this.state, data);
      this.updatePlayer(this.otherPlayer, this.state.player2);
  }

}
movePlayer(speed, keys) {
  // Reset velocity
  this.player.body.setVelocity(0);

  // Set velocity based on pressed keys
  if (keys.left.isDown) {
      this.player.body.setVelocityX(-speed);
      this.state.player1.direction = 'WEST';
  } 
  if (keys.right.isDown) {
      this.player.body.setVelocityX(speed);
      this.state.player1.direction = 'EAST';
  } 
  if (keys.up.isDown) {
      this.player.body.setVelocityY(-speed);
      this.state.player1.direction = 'NORTH';
  } 
  if (keys.down.isDown) {
      this.player.body.setVelocityY(speed);
      this.state.player1.direction = 'SOUTH';
  }

  // Update player image and position
  this.updatePlayerImage(this.player, this.state.player1.direction, this.state.player1.interactionTile);
  this.state.player1.x = this.player.x;
  this.state.player1.y = this.player.y;
  this.ws.send(JSON.stringify(this.state.player1));
}
  updatePlayer(player, playerData) {
    player.x = playerData.x;
    player.y = playerData.y;
    this.updatePlayerImage(player, playerData.direction, playerData.interactionTile);
  }
  handleTileCollision(player,tile) {
    // Log tile information
    console.log("Collided with tile index:", tile.index);
    console.log("Tile coordinates (x, y):", tile.x, tile.y);
    
    // Store the index of the collided tile for later use
    this.collision_tile = tile.index;
}
  
  updatePlayerImage(player, direction, interactionTile) {
    if (interactionTile === null) {
      player.setTexture("agents", direction + ".png");
    }
    else {
      console.log(interactionTile);
      player.setTexture("agents", direction + "-" + interactionTile + ".png");

    }
  }
  tileInteraction () {
    /*
    Basically whenever the conditions are met for interaction, the player will interact with the tile
    and it will then send the updated state to the server to update the players image. 
    */
    if (this.keys.interact.isDown && this.state.player1.interactionTile != 0) {
      this.interactionInitiated = true;
      if (this.interactionInitiated && this.collision_tile == 1){
        this.state.player1.interactionTile = 'dish';
        this.ws.send(JSON.stringify(this.state.player1));
      }
      if (this.interactionInitiated && this.collision_tile == 3){
        this.state.player1.interactionTile = 'onion';
        this.ws.send(JSON.stringify(this.state.player1));
      }
      if (this.interactionInitiated && this.collision_tile == 4){
        this.state.player1.interactionTile = 'pot';
        this.ws.send(JSON.stringify(this.state.player1));
      }
      if (this.interactionInitiated && this.collision_tile == 5){
        this.state.player1.interactionTile = 'serve';
        this.ws.send(JSON.stringify(this.state.player1));
      }
      if (this.interactionInitiated && this.collision_tile == 6){
        this.state.player1.interactionTile = 'tomato';;
        this.ws.send(JSON.stringify(this.state.player1));
      }

    }
  }
}

