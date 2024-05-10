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
