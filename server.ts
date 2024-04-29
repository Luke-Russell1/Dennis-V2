
import express from 'express'
import { stat } from 'fs'
import { send } from 'process'
import { Server as WSServer } from 'ws'
import { WebSocket } from 'ws'
const fs = require('fs');

const app = express()
const port = 3000

app.use(express.static('www'))

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

const wss = new WSServer({ server, path: '/coms' });



const connections: {
  player1: WebSocket | null,
  player2: WebSocket | null
} = {
  player1: null,
  player2: null,
}

type Stage = {
  name: 'instructions' | 'game',
}
type WhichPlayer = {
  name: 'P1' | 'P2' | 'null',
}
type Pot = {
  x: number,
  y: number,
  onions: 0 | 1 | 2 | 3, 
  stage: 0 | 1 | 2 | 3, 
  id: string,
}
type Player = {
  x: number,
  y: number,
  status: 'ready' | 'notReady',
  direction: 'SOUTH' | 'NORTH' | 'EAST' | 'WEST',
  interactionTile: string|null,
  score: number,
  onionsAdded: number,
  timestamp: number | Date,

}

type initialState = {
  whichPlayer: WhichPlayer,
  stage: Stage,
  player1: Player,
  player2: Player,
  pots:any
  timestamp: number | Date,
}
type State = {
  stage: Stage,
  player1: Player,
  player2: Player,
  pots:any
  timestamp: number | Date,
}

const now = new Date();
const levelFile = 'www/layouts/layout_1V2.csv';
const tileSize = 45;
const potLocations = findPotLocations(levelFile, tileSize);
console.log('Pots:', potLocations);

const state: State = {
  stage: { name: 'game' },
  player1: { x: 8*45, y: 8*45, status: 'ready', direction: 'SOUTH', interactionTile: null, score: 0, onionsAdded: 0, timestamp: now.getTime()},
  player2: { x: 10*45,y: 8*45, status: 'ready',direction: 'SOUTH', interactionTile: null, score: 0, onionsAdded: 0, timestamp: now.getTime()},
  pots:potLocations,
  timestamp: now,
}
const initialstate: initialState = {
  whichPlayer: {name: 'null'},
  stage: { name: 'game' },
  player1: { x: 8*45, y: 8*45, status: 'ready', direction: 'SOUTH', interactionTile: null, score: 0, onionsAdded: 0, timestamp: now.getTime()},
  player2: { x: 10*45,y: 8*45, status: 'ready',direction: 'SOUTH', interactionTile: null, score: 0, onionsAdded: 0, timestamp: now.getTime()},
  pots:potLocations,
  timestamp: now,
}


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
  const csvData = fs.readFileSync(levelFile, 'utf-8');

  // Parse the CSV data
  const parsedData = csvData.split('\n').map((row: string) => row.split(','));

  // Define the tile index representing pots (assuming it's 4)
  const potIndex = 4;

  // Array to store pot objects
  const pots = [];

  // Counter for assigning pot numbers
  let potNum = 1;
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
                  potNum: potNum++
              };
              // Push the pot object into the pots array
              pots.push(pot);
          }
      }
  }
  // Return the array of pot objects
  return pots;
}

function applyToState(player: 'player1' | 'player2', values: Player) {
  /*
  
  */
  if (player === 'player1') {
    state.player1 = values;
    state.player1.timestamp = new Date().getTime();
    state.timestamp = new Date().getTime();
    if (connections.player2)
      connections.player2.send(JSON.stringify(state))
  }
  else if (player === 'player2') {
    state.player2 = values;
    state.player2.timestamp = new Date().getTime();
    state.timestamp = new Date().getTime();
    if (connections.player1)
      connections.player1.send(JSON.stringify(state))
  }

  //console.log('State is now', JSON.stringify(state, null, 2))
}
function send_Data(player: 'player1' | 'player2') {

  if (player === 'player2' && connections.player2) {
    const stateToSend = Object.assign({}, state)
    const temp = state.player1;
    stateToSend.player1 = state.player2;
    stateToSend.player2 = temp;
    stateToSend.timestamp = new Date().getTime();
    connections.player2.send(JSON.stringify(stateToSend));
  }
  else if (connections.player1) {
    state.timestamp = new Date().getTime();
    connections.player1.send(JSON.stringify(state));
  }

}


function send_playerData(player: 'player1' | 'player2') {
  if (player === 'player1' && connections.player1) {
      initialstate.whichPlayer.name = 'P1';
      connections.player1.send(JSON.stringify(initialstate));
      console.log(initialstate);

  } if (player === 'player2' && connections.player2) {
      initialstate.whichPlayer.name = 'P2';
      connections.player2.send(JSON.stringify(initialstate));
      console.log(initialstate);
  }
}

/*
So if two players connect AT THE SAME TIME it seems like the initial state is correctly sent to both players, 
but if one connects before the other and moves then it will incorrectly send the state variable of the first player
leading to both players spawning on top of one another. 
*/

wss.on('connection', function(ws) {
  if (connections.player1 === null) {
    connections.player1 = ws;
    console.log('Player 1 connected');
    // Send only the relevant data to player 1
    send_playerData('player1');
  } else if (connections.player2 === null) {
    connections.player2 = ws;
    console.log('Player 2 connected');
    // Send only the relevant data to player 2
    send_playerData('player2');
  } else {
    console.error('No available player slots');
  }

  ws.on('message', function message(m) {
    const data = JSON.parse(m.toString('utf-8')); 
    switch(data.type) {
      case 'player':
        console.log('Received player data', data.data);
        const playerData = data.data as Player;
        if (connections.player1 === ws) {
          applyToState('player1', playerData);
          send_Data('player2');
        }
        else if (connections.player2 === ws) {
          applyToState('player2', playerData);
          send_Data('player1');
        }
    }
  });

  ws.on('close', () => {
    if (connections.player1 === ws)
      connections.player1 = null;
    else if (connections.player2 === ws)
      connections.player2 = null;
  })

  ws.on('error', console.error);

  // send the state
  ws.send(JSON.stringify(state));
});


