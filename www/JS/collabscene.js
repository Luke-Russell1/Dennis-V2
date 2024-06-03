const envConstants = {
  tileSize: 45,
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
    this.trialTime = 45;
    this.ws.send(JSON.stringify({ type: "CollabSceneReady" }));
    this.ws.onmessage = (event) => {
      let playerData = JSON.parse(event.data);
      /*
      On message we check for the TYPE of data that is being sent. If:
      Timer: Begins the trial. THis calls a function that starts the clock on the client side
            and when it expires pauses movement. On start it hides the white rectangle and break text
            on end it shows the white rectangle and break text with players scores etc.
      Reset: Resets the game state to the initial state. This is called when the break between 
            trials is over.
      State: Updates other player position, updates their state and updates the score
      Pots: Updates the pots on the map and the images of the environment

      */

      switch (playerData.type) {
        case "timer":
          if (playerData.data === "start") {
            console.log("timer start")
            console.log(this.state.orders);
            this.trialBegin = true;
            this.breakRectangle.setAlpha(0);
            this.breakText.setAlpha(0);
          }
          if (playerData.data === "end") {
            this.trialBegin = false;
            this.breakRectangle.setAlpha(1);
            this.breakText.setAlpha(1);
            this.state.trialNo += 0.5;
          }
          break;
        case "reset":
          this.state = playerData.data;

          this.trialTime = 45;
          // Reset player positions to initial positions
          this.updatePlayer(this.player, this.state.player1);
          this.updatePlayer(this.otherPlayer, this.state.player2);
          break;
        case "orders":
          console.log(playerData.data);
          console.log("order received")
          break;
        case "state":
          this.updatePlayer(this.otherPlayer, playerData.data.player2);
          this.updateState(this.state, playerData.data.player2);
          this.updateScore(this.state);
          break;
        case "pots":
          this.state.pots = playerData.data;
          break;
      }
    };

    // environment variables for interactions
    this.collision_tile = 0;
    this.interactionInitiated = false;
    this.allowMovement = false;
    this.pauseMovement = false;
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
          "soups",
          "onion-cooking-3.png"
        );
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
    // enables collision with map and player
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.otherPlayer, this.layer);
    // Adding the score text to the screen
    this.teamScore = this.state.player1.score + this.state.player2.score;
    this.scoreText = this.add.text(10, 10, "Score: " + this.teamScore, {
      fontSize: "18px",
      fill: "#000",
    });
    // adds the countdown timer to the screen
    this.timerText = this.add.text(10, 30, "Time: " + 45, {
      fontSize: "18px",
      fill: "#000",
    });
    // below deals with what is shown between breaks
    this.breakRectangle = this.add.rectangle(
      this.game.config.width,
      this.game.config.height,
      this.game.config.width,
      this.game.config.height,
      0xffffff
    );
    this.breakRectangle.setAlpha(0);
    this.breakRectangle.setOrigin(1, 1);
    this.breakText = this.add.text(
      this.game.config.width / 2,
      this.game.config.height / 2,
      "",
      { fontFamily: "Arial, sans serif", fontSize: "24px", fill: "#000" }
    );
    this.breakText.setOrigin(0.5, 0.5);
    this.breakText.setAlpha(0);

    // Create a timer event that repeats every second (1000 ms)
    this.timer = this.time.addEvent({
      delay: 1000,
      callback: this.trialTimer,
      callbackScope: this,
      loop: true,
    });
  }
  update() {
    // moves player
    this.tileInteraction();
    this.beginTrial(this.trialBegin);
    this.handlePotInteraction(
      this.state.pots,
      this.state.player1,
      this.pauseMovement
    );
    this.movePlayer(400, this.keys, this.allowMovement, this.pauseMovement);
  }
  movePlayer(speed, keys, allowMovement, pauseMovement) {
    /*
    This function moves the player based on the keys that are pressed. The player will move in the direction
    that the key is pressed. The player will not move if allowMovement is set to false. This is set to false when the trial
    is not running/timer ends. 
    updatePlayerImage is called when the player moves to update the image of the player based on the direction they are facing
    and the tile they are interacting with. This is then sent to the server so that it can be emitted to the other player.
    */
    if (!allowMovement || pauseMovement) {
      return;
    }
    if (allowMovement || !pauseMovement) {
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
      this.ws.send(
        JSON.stringify({ type: "player", data: this.state.player1 })
      );
    }
  }
  updatePlayer(player, playerData) {
    /*
    This is called to update the position and image of the other player. This is called above when a message is recieved from the server. 
    */
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
      if (
        this.interactionInitiated &&
        this.collision_tile == 5 &&
        this.state.player1.interactionTile == "soup-onion"
      ) {
        this.state.player1.currentlyServing = false;
        this.state.player1.interactionTile = null;
        this.state.player1.dishesServed += 1;
        this.state.player1.score += 5;
        this.ws.send(
          JSON.stringify({ type: "player", data: this.state.player1 })
        );
      }
    }
  }
  figureOutPotDist(pots, player) {
    for (let pot of this.state.pots) {
      const distance = Math.sqrt(
        Math.pow(this.state.player1.x - pot.x, 2) +
          Math.pow(this.state.player1.y - pot.y, 2)
      );
    }
  }
  handlePotInteraction(pots, player) {
    /*
      Calculates the distance between the player and the pots. If the player is close enough to the pot
      and the player is holding a dish, the player will interact with the pot and the pot will be updated.
      pot.resetIMage is called to reset the pot image to it's original state. 
      */
    for (let pot of pots) {
      const distance = Math.sqrt(
        Math.pow(this.state.player1.x - pot.x, 2) +
          Math.pow(this.state.player1.y - pot.y, 2)
      );
      if (
        player.interactionTile === "dish" &&
        distance < 60 &&
        this.keys.interact.isDown &&
        !player.currentlyServing
      ) {
        player.currentlyServing = true;
        this.pauseMovement = true;
        setTimeout(() => {
          this.pauseMovement = false;
          player.interactionTile = "soup-onion";
          pot.soupsTaken += 1;

          player.currentlyServing = true;
          this.ws.send(
            JSON.stringify({ type: "player", data: this.state.player1 })
          );
          this.ws.send(JSON.stringify({ type: "pots", data: this.state.pots }));
        }, 2000);
        break;
      }
    }
  }

  updateScore(state) {
    /*
    This function updates the score based on the state of the player. The overall state is fed in
    then the player score and the other player score are updated. The team score is calculated by adding them
    both and updated accordingly. Additionally, update the breakText content to reflect the new scores.
    */
    this.playerScore = state.player1.score;
    this.otherPlayerScore = state.player2.score;
    this.teamScore = this.playerScore + this.otherPlayerScore;
    this.scoreText.setText("Score: " + this.teamScore);

    // Update breakText content
    let breakScreenText =
      " Break Time! \n team Score: " +
      this.teamScore +
      "\n Your Score: " +
      this.playerScore +
      "\n Teammate's Score: " +
      this.otherPlayerScore +
      "\n Have a 10 second break!";
    this.breakText.setText(breakScreenText);
  }
  resetPots(pots, potImages) {
    /*
    Resets the pots to their original state. This is called when the trial ends. 
    */
    for (let i = 0; i < pots.length; i++) {
      let pot = pots[i];
      let potImage = potImages[i];
      pot.onions = 0;
      pot.stage = 0;
      pot.cooking = false;
      pot.readyToServe = false;
      potImage.setTexture("terrain", "pot.png");
    }
  }

  beginTrial(trialBegin) {
    /*
    This function is called when the trial begins and ends. It will pause and unpause the timer
    and allow/disallow the movement of the player. 
    */

    if (trialBegin) {
      this.allowMovement = true; // Set allowMovement to true
      this.timer.paused = false; // Unpause the timer
    }
    // Check if the message data is about ending the trial
    if (!trialBegin) {
      this.allowMovement = false; // Set allowMovement to false
      this.timer.paused = true; // Pause the timer
    }
  }
  trialTimer() {
    /*
    Function controls the timer displayed in the game. It will decrease the trial time by 1 every second
    and update the timer text. If the trial time reaches 0, it will stop the timer and pause the movement of the player.
    If the server sends the "timer end" message it will pause before the timer reaches 0.
    */
    this.trialTime--; // Decrease the trial time
    this.timerText.setText("Time: " + this.trialTime); // Update the timer text
    // Check if the trial time has reached 0
    if (this.trialTime === 0) {
      this.allowMovement = false;
      this.timer.remove(false); // Stop the timer
    }
  }
}
