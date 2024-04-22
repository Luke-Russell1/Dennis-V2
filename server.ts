
import express from 'express'
import { stat } from 'fs'
import { Server as WSServer } from 'ws'
import { WebSocket } from 'ws'

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

type Player = {
  x: number,
  y: number,
  status: 'ready' | 'notReady',
  timestamp: Date,
}

type initialState = {
  whichPlayer: 'P1' | 'P2'| 'null',
  stage: Stage,
  player1: Player,
  player2: Player,
  timestamp: Date,
}
type State = {
  stage: Stage,
  player1: Player,
  player2: Player,
  timestamp: Date,
}


const now = new Date();

const initialState: initialState = {
  whichPlayer: 'null',
  stage: { name: 'game' },
  player1: { x: 8*45, y: 8*45, status: 'ready', timestamp: now },
  player2: { x: 10*45, y: 8*45, status: 'ready', timestamp: now},
  timestamp: now,
}
const state: State = {
  stage: { name: 'game' },
  player1: { x: 8*45, y: 8*45, status: 'ready', timestamp: now },
  player2: { x: 10*45, y: 8*45, status: 'ready', timestamp: now},
  timestamp: now,
}


function applyToState(player: 'player1' | 'player2', values: Player) {
  if (player === 'player1') {
    state.player1 = values;
    if (connections.player2)
      connections.player2.send(JSON.stringify(state))
  }
  else if (player === 'player2') {
    state.player2 = values;
    if (connections.player1)
      connections.player1.send(JSON.stringify(state))
  }
}

function send_playerData(player: 'player1' | 'player2') {

  if (player === 'player2' && connections.player2) {
    const stateToSend = Object.assign({}, state)
    const temp = state.player1;
    stateToSend.player1 = state.player2;
    stateToSend.player2 = temp;
    console.log(stateToSend.player2)
    connections.player2.send(JSON.stringify(stateToSend));
  }
  else if (connections.player1) {
    connections.player1.send(JSON.stringify(state));
    console.log(state)
  }

}


wss.on('connection', function(ws) {
  if (connections.player1 === null) {
    connections.player1 = ws;
    console.log('Player 1 connected');
    initialState.whichPlayer = 'P1';
    // Send only the relevant data to player 1
    connections.player1.send(JSON.stringify(initialState));
  } else if (connections.player2 === null) {
    connections.player2 = ws;
    console.log('Player 2 connected');
    initialState.whichPlayer = 'P2';
    // Send only the relevant data to player 2
    connections.player2.send(JSON.stringify(initialState));
  } else {
    console.error('No available player slots');
  }

  ws.on('message', function message(m) {
    const data = JSON.parse(m.toString('utf-8')) as Player;
    if (connections.player1 === ws) {
      applyToState('player1', data);
      send_playerData('player2');

    }
    else if (connections.player2 === ws) {
      applyToState('player2', data);
      send_playerData('player1');
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


