import CollabScene from "./collabscene.js";
import waitingRoom from "./waitingRoom.js";
import instructions from "./instructions.js";

var config = {
  fps: {
    target: 50,
    forceSetTimeOut: true,
  },
  type: Phaser.AUTO,
  width: 20 * 45,
  height: 16 * 45,
  pixelArt: true,
  parent: "main",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

class Game extends Phaser.Game {
  constructor() {
    super(config);

    // Initialize WebSocket connection
    this.ws = new WebSocket("ws://localhost:3000/coms");
    this.initialState = {};
    this.ws.onopen = () => {
      console.log("Connected to server");
    };
    this.ws.onmessage = (event) => {
      /*
      This handles the messages that are sent from the server. It will check the type of message and then act accordingly
      waiting: This is the waiting room (waiting.js) that they use while the other player is connecting
      instructions: This is the instructions screen (instructions.js) that they use to read the instructions
      initialState: This is the initial state of the game that is sent to the client, and calls the game (collabscene.js)
                    to start. WILL PROBABLY NEED TO CHANGE THIS AS WELL TO DEAL WITH COLLAB AND SEP
      */
      let data = JSON.parse(event.data);
      switch(data.type) {
        case "waiting":
          console.log("Waiting for another player to join...");
          this.scene.add("waitingRoom", waitingRoom);
          this.scene.start("waitingRoom");
          break;
        case 'instructions':
            this.scene.add("instructions", new instructions({ws:this.ws}));
            this.scene.start("instructions");
            break;
        case 'initialState':
          console.log("Received initial state");
          this.scene.stop("instructions");
          // feeds initial state into the CollabScene constructor
          Object.assign(this.initialState, data.data);
          console.log(this.initialState);
          this.scene.add("CollabScene", new CollabScene({initialState: this.initialState, ws: this.ws}));
          this.scene.start("CollabScene");
          break;
      }
    };
    this.ws.onclose = () => {
      console.log("Disconnected from server");
    };
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    }
}

window.onload = function () {
  window.game = new Game();
};
