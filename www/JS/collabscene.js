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
    this.load.atlas(
      "terrain",
      "./Assets/environment.png",
      "./Assets/environment.json"
    );
    this.load.atlas("agents", "./Assets/agents.png", "./Assets/agents.json");
    this.load.tilemapCSV("map", "./layouts/layout_1V2.csv");
    this.load.atlas("soups", "./Assets/soups.png", "./Assets/soups.json");
  }

  create() {
    this.ws = this.game.ws;
    this.state = this.initialState;
    this.ws.onmessage = (event) => {
      let playerData = JSON.parse(event.data);
      /*
      On message we check for the TYPE of data that is being sent. If:
      State: Updates other player position, updates their state and updates the score
      Pots: Updates the pots on the map and the images of the environment
      */
      switch (playerData.type) {
        case "state":
          this.updatePlayer(this.otherPlayer, playerData.data.player2);
          this.updateState(this.state, playerData.data.player2);
          this.updateScore(this.state);
          break;
        case "pots":
          this.state.pots = playerData.data;
          this.potOnionUpdate(this.state.pots, this.potImages);
          break;
      }
    };

    // environment variables for interactions
    this.collision_tile = 0;
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
    // controls the pot images so they arent writing over one another
    this.potImages = [];
    // save locations and images for a pot
    this.map.forEachTile((tile) => {
      if (tile.index === 4) {
        const potImage = this.add.sprite(
          tile.pixelX + tile.width / 2,
          tile.pixelY + tile.height / 2,
          "terrain",
          "pot.png"
        );
        potImage.onions = 0;
        this.potImages.push(potImage);
      }
    });
    // Create and assigns player sprites depending on which player they connect as
    this.player = this.physics.add.sprite(
      this.initialState.player1.x,
      this.initialState.player1.y,
      "agents",
      this.initialState.player1.direction + ".png"
    );
    this.otherPlayer = this.physics.add.sprite(
      this.initialState.player2.x,
      this.initialState.player2.y,
      "agents",
      this.initialState.player2.direction + ".png"
    );
    this.hatSprite = this.physics.add.sprite(
      this.initialState.player2.x,
      this.initialState.player2.y,
      "agents",
      "SOUTH-bluehat.png"
    );
    // sets other player red PLACEHOLDER
    this.physics.world.createDebugGraphic();
    // enables collision with map and player
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.otherPlayer, this.layer);
    // Adding the score text to the screen
    this.teamScore = this.state.player1.score + this.state.player2.score;
    this.scoreText = this.add.text(10, 10, "Score: " + this.teamScore, {
      fontSize: "px",
      fill: "#000",
    });
  }
  update() {
    // moves player
    this.tileInteraction();
    this.movePlayer(300, this.keys);
    this.potInteraction(this.state.player1, this.player, this.state.pots);
    this.potOnionUpdate(this.state.pots, this.potImages);
    this.resetPotImage(this.state.pots, this.potImages);
  }
  movePlayer(speed, keys) {
    // Reset velocity
    this.player.body.setVelocity(0);
    // Set velocity based on pressed keys
    if (keys.left.isDown) {
      this.player.body.setVelocityX(-speed);
      this.state.player1.direction = "WEST";
    }
    if (keys.right.isDown) {
      this.player.body.setVelocityX(speed);
      this.state.player1.direction = "EAST";
    }
    if (keys.up.isDown) {
      this.player.body.setVelocityY(-speed);
      this.state.player1.direction = "NORTH";
    }
    if (keys.down.isDown) {
      this.player.body.setVelocityY(speed);
      this.state.player1.direction = "SOUTH";
    }
    // Update player image and position
    this.updatePlayerImage(
      this.player,
      this.state.player1.direction,
      this.state.player1.interactionTile
    );
    this.state.player1.x = this.player.x;
    this.state.player1.y = this.player.y;
    this.ws.send(JSON.stringify({ type: "player", data: this.state.player1 }));
  }
  updatePlayer(player, playerData) {
    player.x = playerData.x;
    player.y = playerData.y;
    this.updatePlayerImage(
      player,
      playerData.direction,
      playerData.interactionTile
    );
  }
  updateState(state, data) {
    // Updates the player state to represent states of the other players
    state.player2 = data;
  }
  handleTileCollision(player, tile) {
    // Store the index of the collided tile for later use
    this.collision_tile = tile.index;
  }

  updatePlayerImage(player, direction, interactionTile) {
    /*
    Updates the player image based on the player image. It will change based on the direction they are facing 
    and the tile they are interaction with. If tile ==  null, only direction changes. If tile is not null
    it updates to the corresponding image. For example, if the interaction tile is "onion" and the player is facing
    south, the image will be "SOUTH-onion.png" and that is the image that will display. 
    */
    if (interactionTile === null) {
      player.setFrame(direction + ".png");
    } else {
      player.setFrame(direction + "-" + interactionTile + ".png");
    }
    console.log("player image updated");
  }
  tileInteraction() {
    /*
		Basically whenever the conditions are met for interaction, the player will interact with the tile
		and it will then send the updated state to the server to update the players image. 
    This also handles the interactions between the pots and the player, such as 
    updating the image after interacting with the pot and for the soups as well. 
		*/
    if (this.keys.interact.isDown && this.state.player1.interactionTile != 0) {
      this.interactionInitiated = true;
      if (this.interactionInitiated && this.collision_tile == 1) {
        this.state.player1.interactionTile = "dish";
        this.ws.send(
          JSON.stringify({ type: "player", data: this.state.player1 })
        );
      }
      if (this.interactionInitiated && this.collision_tile == 3) {
        this.state.player1.interactionTile = "onion";
        this.ws.send(
          JSON.stringify({ type: "player", data: this.state.player1 })
        );
      }
      if (this.interactionInitiated && this.collision_tile == 6) {
        this.state.player1.interactionTile = "tomato";
        this.ws.send(
          JSON.stringify({ type: "player", data: this.state.player1 })
        );
      }
      if (
        this.interactionInitiated &&
        this.collision_tile == 5 &&
        this.state.player1.interactionTile == "soup-onion"
      ) {
        this.state.player1.interactionTile = null;
        this.state.player1.dishesServed += 1;
        this.state.player1.score += 5;
        this.ws.send(
          JSON.stringify({ type: "player", data: this.state.player1 })
        );
      }
      /*
      Calculates the distance between the player and the pots. If the player is close enough to the pot
      and the player is holding a dish, the player will interact with the pot and the pot will be updated.
      pot.resetIMage is called to reset the pot image to it's original state. 
      */
      for (let pot of this.state.pots) {
        const distance = Math.sqrt(
          Math.pow(this.state.player1.x - pot.x, 2) +
            Math.pow(this.state.player1.y - pot.y, 2)
        );
        if (
          this.state.player1.interactionTile === "dish" &&
          distance < 60 &&
          pot.readyToServe === true
        ) {
          this.state.player1.interactionTile = "soup-onion";
          this.state.player1.currentlyServing = true;
          pot.resetPotImage = true;
          this.ws.send(
            JSON.stringify({ type: "player", data: this.state.player1 })
          );
          this.ws.send(JSON.stringify({ type: "pots", data: this.state.pots }));
          break;
        }
      }
    }
  }

  potOnionUpdate(pots, potImages) {
    /*
    This updates the image of the pot to reflect the number of onions currently in there. 
    */
    for (let i = 0; i < pots.length; i++) {
      let pot = pots[i];
      let potImage = potImages[i];
      if (pot.onions <= 3 && pot.onions > 0) {
        potImage.setTexture("soups", "onion-pot-" + pot.onions + ".png");
      }
      if (pot.onions === 3 && !pot.cooking) {
        pot.cooking = true;
        potImage.stage = 1;
        this.ws.send(JSON.stringify({ type: "pots", data: this.state.pots }));
        this.cookPot(pot, potImage);
        console.log(this.state.pots);
      }
    }
  }
  cookPot(pot, potImage) {
    /*
    If the pot has 3 onions in it, it begins the cooking process. The pot will cook for 2 seconds at each stage (CAN BE CHANGED)
    with 3 stages in total. Once done it is ready to serve (as indicated by the pot.readyToServe boolean) and the player can interact
    with it if they are holding the dish. 
    */
    if (pot.stage <= 3) {
      pot.cooking = true;
      pot.onions = 0;
      let index = pot.potNum;
      setTimeout(() => {
        potImage.setTexture("soups", "onion-cooking-" + pot.stage + ".png");
        pot.stage++;
        console.log(this.state.pots);
        this.cookPot(pot, potImage); // Continue cooking process using 'this'
        this.state.pots[index] = pot;
        if (pot.stage === 4) {
          pot.readyToServe = true;
          pot.stage = 0;
        }
        this.ws.send(JSON.stringify({ type: "pots", data: this.state.pots }));
      }, 2000);
    } else {
      pot.cooking = false; // Cooking finished
    }
  }
  resetPotImage(pots, potImages) {
    /*
    When pot.resetPotImage is set to true, this function will reset the pot image to it's original state.
    This function is called after the player takes the soup from the pot. 
    */
    for (let i = 0; i < pots.length; i++) {
      let pot = pots[i];
      let potImage = potImages[i];
      if (pot.resetPotImage) {
        console.log("Resetting pot image");
        potImage.setTexture("terrain", "pot.png");
        pot.resetPotImage = false;
      }
    }
  }
  updateScore(state) {
    /*
    This function updates the score based on the state of the player. The overall state is fed in
    then the player score and the other player score are updated. The team score is calculated by adding them
    both and updated accordingly.
    */
    this.playerScore = state.player1.score;
    this.otherPlayerScore = state.player2.score;
    this.teamScore = this.playerScore + this.otherPlayerScore;
    this.scoreText.setText("Score: " + this.teamScore);
  }
  potInteraction(player, playerSprite, pots) {
    /*
    Handles the interactions between the player and the pots. If the player is close enough to the pot
    and the player is holding an onion, the player will interact with the pot and the pot will be updated.
    The cooldown is set as a janky way to prevent the player from adding multiple onions in one go.
    Could probably make it less, but it is unlikely they will need a shorter amount of time. 
    Will need to be updated if the map is made smaller 
    */
    for (let pot of pots) {
      const distance = Math.sqrt(
        Math.pow(player.x - pot.x, 2) + Math.pow(player.y - pot.y, 2)
      );
      if (
        distance <= 60 &&
        player.interactionTile === "onion" &&
        this.keys.interact.isDown
      ) {
        const indexToUpdate = this.state.pots.findIndex((p) => p.id === pot.id);
        if (indexToUpdate !== -1 && this.state.pots[indexToUpdate].onions < 4) {
          if (!this.interactionCooldown) {
            this.interactionCooldown = true;
            this.state.pots[indexToUpdate].onions += 1;
            player.interactionTile = null;
            // Send updated pot data to the server
            this.ws.send(
              JSON.stringify({ type: "pots", data: this.state.pots })
            );
            // Update player's interaction tile and send updated player data
            player.onionAdded += 1;
            player.score += 2;
            this.updatePlayerImage(playerSprite, player.direction, null);
            this.ws.send(
              JSON.stringify({ type: "player", data: this.state.player1 })
            );
            // Set interaction cooldown
            // Reset interaction cooldown after 2 seconds
            setTimeout(() => {
              // timeout is used because they can add multiple onions in one go
              // adding the timeout makes it so it takes ages for this to happen
              // and they would have probably moved away from the pot by then???
              this.interactionCooldown = false;
            }, 5000); // CHANGE THIS IF LONGER/SHORTER TIME IS NEEDED
          }
          break;
        }
      }
    }
  }
}
