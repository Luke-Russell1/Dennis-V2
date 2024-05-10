import express from "express";
import { stat } from "fs";
import { send } from "process";
import { Server as WSServer } from "ws";
import { WebSocket } from "ws";
const fs = require("fs");

const app = express();
const port = 3000;

app.use(express.static("www"));

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const wss = new WSServer({ server, path: "/coms" });

/*
Below is just declaring the different types and variables that are being used and sent to the players.
  - stage: this is the stage of the game, either instructions or game. This is used to determine what the player sees. 
    OTHER STAGES WILL BE ADDED. THESE ARE JUST PLACEHOLDERS.

  - whichPlayer: this is used to determine which player the player is. This is used to determine what the player sees for initial state

  - pot: this is the object for the pot. It stores the x and y coordinates, the number of onions in the pot, the stage of the pot, and the ID of the pot

  - player: this is the object for the player. It stores the x and y coordinates, the status of the player (ready or notReady), the direction the player is facing, 
    the tile the player is interacting with, the score of the player, the number of onions the player has added to the pot, and the timestamp of the player.
    This is used to update the state of the game based on the data each player is sending about their positions, score, interactions etc.

  - initialState: this is the initial state of the game. Only used to dictate positions when they first connect. 
  
  - state: this is the state of the game. This is updated based on the data sent by the players. This is then sent to the players so they can update their game. 
    This is also used to determine what the player sees.

*/

const connections: {
  player1: WebSocket | null;
  player2: WebSocket | null;
} = {
  player1: null,
  player2: null,
};

type Stage = {
  name: "instructions" | "game";
};
type WhichPlayer = {
  name: "P1" | "P2" | "null";
};
type Pot = {
  x: number;
  y: number;
  onions: 0 | 1 | 2 | 3;
  stage: 0 | 1 | 2 | 3;
  id: string;
};
type Player = {
  x: number;
  y: number;
  status: "ready" | "notReady";
  direction: "SOUTH" | "NORTH" | "EAST" | "WEST";
  currentlyServing: boolean;
  interactionTile: string | null;
  score: number;
  onionsAdded: number;
  dishesServed: number;
  timestamp: number | Date;
};

type initialState = {
  whichPlayer: WhichPlayer;
  stage: Stage;
  player1: Player;
  player2: Player;
  pots: any;
  timestamp: number | Date;
};
type State = {
  stage: Stage;
  player1: Player;
  player2: Player;
  pots: any;
  timestamp: number | Date;
};

const now = new Date();
const levelFile = "www/layouts/layout_1V2.csv";
const tileSize = 45;
const potLocations = findPotLocations(levelFile, tileSize);
console.log("Pots:", potLocations);

const state: State = {
  stage: { name: "game" },
  player1: {
    x: 8 * 45,
    y: 8 * 45,
    status: "ready",
    direction: "SOUTH",
    interactionTile: null,
    currentlyServing: false,
    score: 0,
    onionsAdded: 0,
    dishesServed: 0,
    timestamp: now.getTime(),
  },
  player2: {
    x: 10 * 45,
    y: 8 * 45,
    status: "ready",
    direction: "SOUTH",
    interactionTile: null,
    currentlyServing: false,
    score: 0,
    onionsAdded: 0,
    dishesServed:0,
    timestamp: now.getTime(),
  },
  pots: potLocations,
  timestamp: now,
};
const initialstate: initialState = {
  whichPlayer: { name: "null" },
  stage: { name: "game" },
  player1: {
    x: 8 * 45,
    y: 8 * 45,
    status: "ready",
    direction: "SOUTH",
    interactionTile: null,
    currentlyServing: false,
    score: 0,
    onionsAdded: 0,
    dishesServed: 0,
    timestamp: now.getTime(),
  },
  player2: {
    x: 10 * 45,
    y: 8 * 45,
    status: "ready",
    direction: "SOUTH",
    interactionTile: null,
    currentlyServing: false,
    score: 0,
    onionsAdded: 0,
    dishesServed: 0,
    timestamp: now.getTime(),
  },
  pots: potLocations,
  timestamp: now,
};

function findPotLocations(levelFile: any, tileSize: number) {
  /*
    Functions reads in the LEVELMAP csv file and finds the locations of the pots, which correspond to the #4 in the file. This then creates a list of 
    pot objects corresponding to the number found on the map. It stores:
    ID: unique ID
    X: X coord (scaled by tilesize)
    Y: y coord (scaled by tilesize)
    onions: number of onions currently in there
    stage: cooking stage, split into 4 (0 no cooking, 1,2,3 for images associated with cooking)
  */
  const csvData = fs.readFileSync(levelFile, "utf-8");
  // Parse the CSV data
  const parsedData = csvData.split("\n").map((row: string) => row.split(","));
  // Define the tile index representing pots (assuming it's 4)
  const potIndex = 4;
  // Array to store pot objects
  const pots = [];
  // Counter for assigning pot numbers
  let potNum = 0;
  for (let y = 0; y < parsedData.length; y++) {
    const row = parsedData[y];
    for (let x = 0; x < row.length; x++) {
      const tileIndex = parseInt(row[x]);
      // Check if the tile index matches the pot index
      if (tileIndex === potIndex) {
        // Create a pot object with x and y coordinates, onions, stage, potNum, and id
        const pot = {
          id: `pot_${potNum}`, // Unique identifier for the pot
          x: x * tileSize + tileSize / 2, // Calculate x coordinate
          y: y * tileSize + tileSize / 2, // Calculate y coordinate
          onions: 0,
          stage: 0,
          cooking: false,
          readyToServe: false,
          resetPotImage:false,
          potNum: potNum++,
        };
        // Push the pot object into the pots array
        pots.push(pot);
      }
    }
  }
  // Return the array of pot objects
  return pots;
}

function applyToState(player: "player1" | "player2", values: Player) {
  /*
    Applies incoming data to the state object. This is used to update the state of the game based on the 
    data each player is sending about their positions, score, interactions etc. 
  */
  if (player === "player1") {
    state.player1 = values;
    state.player1.timestamp = new Date().getTime();
    state.timestamp = new Date().getTime();
  } else if (player === "player2") {
    state.player2 = values;
    state.player2.timestamp = new Date().getTime();
    state.timestamp = new Date().getTime();
  }

  //console.log('State is now', JSON.stringify(state, null, 2))
}
function send_Data(player: "player1" | "player2") {
  /*
  Sends information to the player about the state of the game. This makes each player appear as player 1 to themselves, 
  player 1 on the server is defined as the first player to connect. When sending to this player, it just sends the state as it is stored. 
  When sending to player 2, it swaps the player1 and player2 states so that the player appears as player 1 to themselves. It also creates a new 
  timestap marking when this was sent. 

  TIMESTAMP NEEDS TO BE CHANGED SO IT IS IN SECONDS OR SOMETHING 
  */
  if (player === "player2" && connections.player2) {
    const stateToSend = Object.assign({}, state);
    const temp = state.player1;
    stateToSend.player1 = state.player2;
    stateToSend.player2 = temp;
    stateToSend.timestamp = new Date().getTime();
    connections.player2.send(
      JSON.stringify({ type: "state", data: stateToSend })
    );
  }
  
  if (player === 'player1' && connections.player1) {
    state.timestamp = new Date().getTime();
    connections.player1.send(JSON.stringify({ type: "state", data: state }));
  }
}

function send_playerData(player: "player1" | "player2") {
  /*
  This sends initial states to the players only
  */
  if (player === "player1" && connections.player1) {
    initialstate.whichPlayer.name = "P1";
    connections.player1.send(JSON.stringify({type: 'initialState', data: initialstate}));
    console.log(initialstate);
  }
  if (player === "player2" && connections.player2) {
    initialstate.whichPlayer.name = "P2";
    connections.player2.send(JSON.stringify({type: 'initialState', data: initialstate}));
    console.log(initialstate);
  }
}
function sendPotData(player: "player1" | "player2") {
  /*
  This sends the pot data to the players. This is used to update the state of the pots on the players end. 
  */
  if (player === "player1" && connections.player1) {
    connections.player1.send(JSON.stringify({ type: "pots", data: state.pots }));
  }
  if (player === "player2" && connections.player2) {
    connections.player2.send(JSON.stringify({ type: "pots", data: state.pots }));
  }
}
function startTrialTimer() {
  const timerDuration = 45 * 1000; // 45 seconds

  // Emit a message to clients to start the timer
  connections.player1?.send(JSON.stringify({ type: "timer", data: "start" }));
  connections.player2?.send(JSON.stringify({ type: "timer", data: "start" }));
  console.log('timer starter')

  // Start the timer on the server side
  const timer = setTimeout(() => {
    // Perform any actions you want to take after the timer expires
    console.log("Timer expired after 45 seconds!");

    // Emit a message to clients indicating that the timer has expired
    connections.player1?.send(JSON.stringify({ type: "timer", data: "end" }));
    connections.player2?.send(JSON.stringify({ type: "timer", data: "end" }));
    console.log('timer ended')

    // Clear the timer if it's no longer needed
    clearTimeout(timer);
  }, timerDuration);
}
let p1Ready = false;
let p2Ready = false;
wss.on("connection", function (ws) {
  if (connections.player1 === null) {
    connections.player1 = ws;
    console.log("Player 1 connected");
  } else if (connections.player2 === null) {
    connections.player2 = ws;
    console.log("Player 2 connected");  
    // Check if both players are not connected
  } else {
    console.error("No available player slots");
  }if (!connections.player1 || !connections.player2) {
      if (connections.player1) {
        // Emit a message to player 1 to wait for player 2 to connect
        connections.player1.send(JSON.stringify({ type: "waiting", data: "Waiting for player 2 to connect..." }));
      }
      if (connections.player2) {
        // Emit a message to player 2 to wait for player 1 to connect
        connections.player2.send(JSON.stringify({ type: "waiting", data: "Waiting for player 1 to connect..." }));
      }
    }
      // If both players are connected, send instructions to both
      if (connections.player1 && connections.player2) {
        connections.player1.send(JSON.stringify({ type: "instructions", data: "start instruction"}));
        connections.player2.send(JSON.stringify({ type: "instructions", data: "start instruction"}));
      
  }
  ws.on("message", function message(m) {
    /*
    On message, this checks what type of message it is:
    - player: updates the state of the game based on the player data sent, and then sends the other player the updated state. 
    - pots: updates the state of the pots based on the data sent. This will also be sent to the other player so they can update the 
            state of the pots on their end.
    */
    const data = JSON.parse(m.toString("utf-8"));
    switch (data.type) {
      case 'startGame':
        if (connections.player1 === ws) {
          p1Ready = true;
          console.log(p1Ready, p2Ready);
        }
        if (connections.player2 === ws) {
          p2Ready = true;
          console.log(p1Ready, p2Ready);
        }
        if (connections.player1 && connections.player2 && p1Ready && p2Ready) {
          console.log(p1Ready, p2Ready);
          send_playerData("player1");
          send_playerData("player2");
        }
        break;
      case 'CollabSceneReady':
        startTrialTimer();
        break;
      case "player":
        const playerData = data.data as Player;
        if (connections.player1 === ws) {
          applyToState("player1", playerData);
          send_Data("player2");
        } 
        if (connections.player2 === ws) {
          applyToState("player2", playerData);
          send_Data("player1");
        }
        break;
      case "pots":
        if (connections.player1 === ws) {
          state.pots = data.data;
          sendPotData("player2");
        }
        if (connections.player2 === ws) {
          state.pots = data.data;
          sendPotData("player1");
        } 
        break;
        case 'startGame':
          if (connections.player1 === ws) {
            p1Ready = true;
          }
          if (connections.player2 === ws) {
            p2Ready = true;
          }
          if (p1Ready && p2Ready) {
          send_playerData("player1");
          send_playerData("player2");
          }
        break;
    }
  });

  ws.on("close", () => {
    if (connections.player1 === ws) connections.player1 = null;
    else if (connections.player2 === ws) connections.player2 = null;
  });

  ws.on("error", console.error);

  // send the state
});
