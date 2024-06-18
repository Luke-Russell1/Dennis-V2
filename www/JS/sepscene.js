const envConstants = {
	tileSize: 45,
};

export default class SepScene extends Phaser.Scene {
	constructor(config) {
		super("SepScene");
		this.initialState = config.initialState;
		this.ws = config.ws;
	}

	preload() {
		// Preload assets
		this.load.image("environment", "./Assets/environmentV2.png");
		this.load.atlas(
			"terrain",
			"./Assets/environmentV2.png",
			"./Assets/environmentV2.json"
		);
		this.load.atlas("agents", "./Assets/agents.png", "./Assets/agents.json");
		this.load.tilemapCSV("map", "./layouts/layout_1V2.csv");
		this.load.atlas("soups", "./Assets/soups.png", "./Assets/soups.json");
	}

	create() {
		this.ws = this.game.ws;
		this.state = this.initialState;
		this.trialTime = 45;
		this.ws.send(JSON.stringify({ block: "sep", type: "SepSceneReady" }));
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
						this.trialBegin = true;
						this.breakRectangle.setAlpha(0);
						this.breakText.setAlpha(0);
						this.displayOrders();
						this.trialTime = 45;
						this.timerText.setText("Time: " + this.trialTime);
						if (this.timer) {
							this.timer.remove(false);
						}
						this.timer = this.time.addEvent({
							delay: 1000,
							callback: this.trialTimer,
							callbackScope: this,
							loop: true,
						});
						this.soupsWaitingText.setAlpha(1);

					}

					if (playerData.data === "end") {
						this.trialBegin = false;
						this.orderTextGroup.clear(true, true);
						this.breakRectangle.setAlpha(1);
						this.breakText.setAlpha(1);
						this.state.trialNo += 0.5;
						if (this.timer) {
							this.timer.remove(false);
						}
						this.soupsWaitingText.setAlpha(0);
						console.log(this.state.trialNo);
					}
					break;
				case "reset":
					console.log("resetting");
					this.state = playerData.data;
					this.trialTime = 45;
					// Reset player positions to initial positions
					this.updatePlayer(this.player, this.state.player1);
					break;
				case "pots":
					this.state.pots = playerData.data;
					break;
				case "orderComplete":
					this.state.player1 = playerData.data;
					this.resetPlayerAfterOrder();
					this.updateOrderStatus(playerData.order);
					this.updatePlayer(this.player, this.state.player1);
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
			confirm: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
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
		const tilesToCollideWith = [0, 1, 3, 4, 5, 7];
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
		// sets other player red PLACEHOLDER
		// enables collision with map and player
		this.physics.add.collider(this.player, this.layer);
		// Adding the score text to the screen
		this.totalScore = this.state.player1.score;
		this.scoreText = this.add.text(10, 10, "Score: " + this.totalScore, {
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
		// add group so that they can be removed if needed
		this.orderTextGroup = this.add.group();
		this.soupsWaitingText = this.add.text(10, 50, "", {
			fontSize: "18px",
			fill: "#000",
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
		this.updateScore(this.state);
		this.updateSoupsWaitingText(this.state.player1.soupsReady);
	}
	displayOrders() {
		/*
      Function displays the orders one the screen. It displays the info found in the this.state.orders object, 
      which is updated from the server. It will display the soups in the order and the price of the order.
      The orders are added to a group so they can be removed at the end of the trial, and given an index 
      so they can individually be crossed out/removed when completed. 
      */
		this.orderTextGroup.clear(true, true);
		this.orderTextObjects = [];

		for (let i = 0; i < this.state.orders.orderAmount; i++) {
			let orderText = this.add.text(
				10,
				100 + i * 75,
				`Order In!\n Soups: ${this.state.orders.soups[i]}\n Price: \$${this.state.orders.price[i]}\n`,
				{
					fontSize: "18px",
					fill: "#000",
				}
			);
			this.orderTextGroup.add(orderText);
			this.orderTextObjects.push(orderText);
		}
	}
	updateOrderStatus(orderIndex) {
		/*
      This removes a corresponding order when it is completed. This function is called in [GIVE FUNCTION NAME HERE]. 
      */
		if (this.orderTextObjects[orderIndex]) {
			this.orderTextObjects[orderIndex].setStyle({ fill: "#888" });
		}
	}
	updateSoupsWaitingText(soupsWaiting) {
		this.soupsWaitingText.setText("Soups Waiting: " + soupsWaiting);
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
				JSON.stringify({
					block: "sep",
					type: "player",
					data: this.state.player1,
				})
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
		if (interactionTile === null || interactionTile === "orderCalled") {
			player.setFrame(direction + ".png");
		} else {
			player.setFrame(direction + "-" + interactionTile + ".png");
		}
	}
	sendDishes() {
		/*
    This function updates player info and dishes info on the server side, which is then sent to the other client. 
    We update the order called for dishes and for the player, so that the same player cannot send it. BOTH players need to call 
    it for the order to be sent. If this is true, it is consistnetly sent to the server until it the other person replies. 
    */
		if (
			this.state.player1.soupsReady > 0 &&
			!this.state.player1.currentlyServing
		) {
			this.state.player1.currentlyServing = true;
			this.ws.send(
				JSON.stringify({
					block: "sep",
					type: "dishes",
					data: this.state.player1,
				})
			);
		}
	}
	resetPlayerAfterOrder() {
		let newState = this.state;
		newState.player1.soupsReady = 0;
		newState.player1.currentlyServing = false;
		newState.player1.interactionTile = null;
		Object.assign(this.state, newState);
		this.updatePlayer(this.player, this.state.player1);
		console.log("players reset");
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
					JSON.stringify({
						block: "sep",
						type: "player",
						data: this.state.player1,
					})
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
				this.state.player1.soupsReady += 1;

				this.state.player1.score += 5;
				this.ws.send(
					JSON.stringify({
						block: "sep",
						type: "player",
						data: this.state.player1,
					})
				);
			}
			if (this.interactionInitiated && this.collision_tile == 7) {
				this.state.player1.interactionTile = "orderCalled";
				this.state.dishes.orderCalled = true;
				this.ws.send(
					JSON.stringify({
						block: "collab",
						type: "player",
						data: this.state.player1,
					})
				);
				this.sendDishes();
			}
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
				distance < 50 &&
				this.keys.interact.isDown &&
				!player.currentlyServing
			) {
				player.currentlyServing = true;
				this.pauseMovement = true;
				setTimeout(() => {
					this.pauseMovement = false;
					player.interactionTile = "soup-onion";
					player.soupsServed += 1;

					player.currentlyServing = true;
					this.ws.send(
						JSON.stringify({
							block: "sep",
							type: "player",
							data: this.state.player1,
						})
					);
					this.ws.send(
						JSON.stringify({
							block: "sep",
							type: "pots",
							data: this.state.pots,
						})
					);
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
		this.scoreText.setText("Score: " + this.playerScore);

		// Update breakText content
		let breakScreenText =
			" Break Time! \n" +
			"\n Your Score: " +
			this.playerScore +
			"\n Have a 10 second break!";
		this.breakText.setText(breakScreenText);
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
