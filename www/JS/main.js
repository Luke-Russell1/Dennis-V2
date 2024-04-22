import CollabScene from "./collabscene.js";

var config = {
  type: Phaser.AUTO,
  width: 20 * 45,
  height: 16 * 45,
  pixelArt: true,
  parent: "index",
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
    this.ws = new WebSocket('ws://localhost:3000/coms');
    this.initialState = {};
    this.ws.onopen = () => {
      console.log('Connected to server');
    };
    this.ws.onmessage = (event) => { 
      let data = JSON.parse(event.data);
      Object.assign(this.initialState, data);
    };
    this.ws.onclose = () => {
      console.log('Disconnected from server');
    };
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Start the scene
    this.scene.add("CollabScene", new CollabScene({initialState: this.initialState, ws: this.ws}));
    this.scene.start("CollabScene");
  }
}

window.onload = function () {
  window.game = new Game();
};