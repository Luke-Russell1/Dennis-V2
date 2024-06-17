import { clear } from "console";
import exp from "constants";
import { create } from "domain";
import express from "express";
import { stat } from "fs";
import { send } from "process";
import { start } from "repl";
import { json } from "stream/consumers";
import { Server as WSServer } from "ws";
import { WebSocket } from "ws";
const fs = require("fs");

const app = express();
const port = 3000;

app.use(express.static("www"));

const server = app.listen(port, () => {
	console.log(`Server started on http://localhost:3000`);
});

const wss = new WSServer({ server, path: "/coms" });

/*
Below is just declaring the different types and variables that are being used and sent to the players.
  - expConsts: this is an object that stores the constants for the experiment. This includes the length of the trial, the length of the break, the number of trials,
    the size of the tiles, and the file that stores the layout of the level.

  - stage: this is the stage of the game, either instructions or game. This is used to determine what the player sees. 
    OTHER STAGES WILL BE ADDED. THESE ARE JUST PLACEHOLDERS.


  - pot: this is the object for the pot. It stores the x and y coordinates, the number of onions in the pot, the stage of the pot, and the ID of the pot

  - player: this is the object for the player. It stores the x and y coordinates, the status of the player (ready or notReady), the direction the player is facing, 
    the tile the player is interacting with, the score of the player, the number of onions the player has added to the pot, and the timestamp of the player.
    This is used to update the state of the game based on the data each player is sending about their positions, score, interactions etc. The soupsReady
    variable is the number used to handle the order system in the sep condition and is not used in the collab condition. 

  - Dishes: This is used to keep track of dish related variables in the collab condition. The dishesWaiting variable is used to keep track of the number of dishes
    used for the ordering system. Order called indicates whether one player has called the order away and it is ready to be served, used to confirm on the 
    other players screen (both have to confirm for it to work). 

  - initialState: this is the initial state of the game. Only used to dictate positions when they first connect. 

  - sepInitialState: This is the initial state used in the sep condition. Both players start at the same position. It will be added to the regular state on the server
    so that data is consitent across both conditions.
  
  - state: this is the state of the game. This is updated based on the data sent by the players. This is then sent to the players so they can update their game. 
    This is also used to determine what the player sees.

  - Orders: these are randomly generated at the beginning of the exp and stored in blocks for each trial. Trial 1 gets index 0, trial 2 gets index 1, etc. This was
    easier than generating them at the beginning of a trial. 

*/
let data: any[] = [];
let p1Ready = false;
let p2Ready = false;
let conditions = ["sep", "collab"];
let orderNumbers = [3, 5, 7];
let soupNumbers = [1, 2, 3, 4, 5, 6, 7];
let soupPrice = 5;
let orders = createOrders(orderNumbers[0], soupNumbers);
let orderLists = createOrderLists(orderNumbers, soupNumbers, 4);
const expConsts = {
	trialLength: 60,
	breakLength: 5,
	trials: 12,
	tileSize: 45,
	levelFile: "www/layouts/layout_1V2.csv",
	writeData: 0,
	dataDir: "data/",
};
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
	soupsReady: number;
	callingOrder: boolean;
	timestamp: number | Date;
};
type Dishes = {
	dishesWaiting: number;
	orderCalled: boolean;
	timestamp: number | Date;
};

type initialState = {
	block: Array<string>;
	trialNo: number;
	stage: Stage;
	player1: Player;
	player2: Player;
	pots: any;
	teamScore: number;
	orders: any;
	dishes: Dishes;
	timestamp: number | Date;
};
type State = {
	block: Array<string>;
	trialNo: number;
	stage: Stage;
	player1: Player;
	player2: Player;
	teamScore: number;
	pots: any;
	orders: any;
	dishes: Dishes;
	timestamp: number | Date;
};
type sepInitialState = {
	block: Array<string>;
	trialNo: number;
	stage: Stage;
	player1: Player;
	teamScore: number;
	pots: any;
	orders: any;
	dishes: Dishes;
	timestamp: number | Date;
};

const now = new Date();
const potLocations = findPotLocations(expConsts.levelFile, expConsts.tileSize);
const state: State = {
	stage: { name: "game" },
	block: [],
	trialNo: 0,
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
		soupsReady: 0,
		callingOrder: false,
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
		soupsReady: 0,
		callingOrder: false,
		timestamp: now.getTime(),
	},
	teamScore: 0,
	pots: potLocations,
	orders: orderLists.ordersObject[0],
	dishes: { dishesWaiting: 0, orderCalled: false, timestamp: now },
	timestamp: now,
};
const initialstate: initialState = {
	stage: { name: "game" },
	trialNo: 0,
	block: [],
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
		soupsReady: 0,
		callingOrder: false,
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
		soupsReady: 0,
		callingOrder: false,
		timestamp: now.getTime(),
	},
	teamScore: 0,
	pots: potLocations,
	orders: orderLists.ordersObject[0],
	dishes: { dishesWaiting: 0, orderCalled: false, timestamp: now },
	timestamp: now,
};
const sepinitialState: sepInitialState = {
	stage: { name: "game" },
	trialNo: 0,
	block: [],
	player1: {
		x: 9 * 45,
		y: 8 * 45,
		status: "ready",
		direction: "SOUTH",
		interactionTile: null,
		currentlyServing: false,
		score: 0,
		onionsAdded: 0,
		dishesServed: 0,
		callingOrder: false,
		soupsReady: 0,
		timestamp: now.getTime(),
	},
	teamScore: 0,
	pots: potLocations,
	orders: orderLists.ordersObject[0],
	dishes: { dishesWaiting: 0, orderCalled: false, timestamp: now },
	timestamp: now,
};

function randomiseBlocks(blocks: any, state: State, intialstate: initialState) {
	/*
  This randomises the blocks. This is used to randomise the blocks so that the players do not know what order they will be in. 
  This is used to randomise the order of the blocks so that the players do not know what order they will be in. 
  */
	let randomBlocks = shuffle(blocks);
	state.block = randomBlocks;
	intialstate.block = randomBlocks;
	console.log(state.block);
}

function startBlock(
	initialState: initialState,
	sepInitialState: sepInitialState,
	connections: any,
	block: null | "sep" | "collab"
) {
	/*
  This starts the block. The "block" type is used to determine whether the full game is being started,
  or just the collab/sep blocks. This is used for testing. 
  */
	if (block === null) {
		if (state.block[0] === "collab") {
			state.stage.name = "game";
			// Switch player positions for "collab" condition
			let collabInitialState = Object.assign({}, initialState);
			collabInitialState.player1 = initialState.player2;
			collabInitialState.player2 = initialState.player1;

			if (connections.player1) {
				connections.player1.send(
					JSON.stringify({
						type: "startBlock",
						block: "collab",
						data: initialState,
					})
				);
			}
			if (connections.player2) {
				connections.player2.send(
					JSON.stringify({
						type: "startBlock",
						block: "collab",
						data: collabInitialState,
					})
				);
			}
		} else if (state.block[0] === "sep") {
			state.stage.name = "game";

			if (connections.player1) {
				connections.player1.send(
					JSON.stringify({
						type: "startBlock",
						block: "sep",
						data: sepInitialState,
					})
				);
			}
			if (connections.player2) {
				connections.player2.send(
					JSON.stringify({
						type: "startBlock",
						block: "sep",
						data: sepInitialState,
					})
				);
			}
		}
	}
	if (block === "sep") {
		state.stage.name = "game";
		if (connections.player1) {
			connections.player1.send(
				JSON.stringify({
					type: "startBlock",
					block: "sep",
					data: sepInitialState,
				})
			);
		}
		if (connections.player2) {
			connections.player2.send(
				JSON.stringify({
					type: "startBlock",
					block: "sep",
					data: sepInitialState,
				})
			);
		}
	}
	if (block === "collab") {
		state.stage.name = "game";
		// Switch player positions for "collab" condition
		let collabInitialState = Object.assign({}, initialState);
		collabInitialState.player1 = initialState.player2;
		collabInitialState.player2 = initialState.player1;

		if (connections.player1) {
			connections.player1.send(
				JSON.stringify({
					type: "startBlock",
					block: "collab",
					data: initialState,
				})
			);
		}
		if (connections.player2) {
			connections.player2.send(
				JSON.stringify({
					type: "startBlock",
					block: "collab",
					data: collabInitialState,
				})
			);
		}
	}
}

function createOrders(orderAmount: number, soupAmounts: number[]) {
	/*
  This creates and sends the orders and order information to the players. This is used to create the orders for the players to do complete
  At the start of each trial the orders are created and sent to the players, and then drawn on the client side. There will be either 3, 5, or 7 orders
  depending on the orderAmounts array. This will follow a path determined by the shuffle function at the start, and will be fed into this. 
  */
	let soups = sample(soupAmounts, orderAmount);
	let price = soups.map((amount) => amount * soupPrice);
	let completed = [false];
	let completedVec = completed.flatMap((value) =>
		Array(soups.length).fill(value)
	);
	let order = {
		soups: soups,
		price: price,
		orderAmount: orderAmount,
		completed: completedVec,
		p1Completed: completedVec,
		p2Completed: completedVec,
	};
	return order;
}

function createOrderLists(
	orderAmount: number[],
	soupAmounts: number[],
	trialsPerOrder: number
) {
	// Shuffle and expand order numbers list
	let orderNumbersList = shuffle(
		orderAmount
			.map((orderAmount) => Array(trialsPerOrder).fill(orderAmount))
			.flat()
	);

	// Initialize array and object to hold the orders
	let ordersArray = [];
	let ordersObject: { [key: number]: ReturnType<typeof createOrders> } = {};

	// Iterate through the order numbers list and create orders
	for (let i = 0; i < orderNumbersList.length; i++) {
		let order = createOrders(orderNumbersList[i], soupAmounts);
		ordersArray.push(order);
		ordersObject[i] = order;
	}

	// Log the results for demonstration purposes
	return { ordersArray, ordersObject };
}

function sample<T>(array: T[], n: number): T[] {
	// Sampling without replacement function
	if (n > array.length) {
		throw new Error("Sample size cannot be larger than the array size.");
	}

	const shuffled = array.slice(); // Create a copy of the array
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
	}
	return shuffled.slice(0, n); // Return the first n elements
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
					soupsTaken: 0,
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
function shuffle(array: any[]) {
	/*
  Used for randomising blocks and conditions 
  */
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
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

	//)
	recordState(state);
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

	if (player === "player1" && connections.player1) {
		state.timestamp = new Date().getTime();
		connections.player1.send(JSON.stringify({ type: "state", data: state }));
	}
}

function send_playerData(player: "player1" | "player2") {
	/*
  This sends initial states to the players only
  It also switches the player positions so that the player appears as player 1 to themselves
  and the other player always appears as player 2.
  */
	if (player === "player1" && connections.player1) {
		connections.player1.send(
			JSON.stringify({ type: "initialState", data: initialstate })
		);
	}
	if (player === "player2" && connections.player2) {
		let player2State = Object.assign({}, initialstate);
		player2State.player1 = initialstate.player2;
		player2State.player2 = initialstate.player1;
		connections.player2.send(
			JSON.stringify({ type: "initialState", data: player2State })
		);
	}
}
function sendPotData(player: "player1" | "player2") {
	/*
  This sends the pot data to the players. This is used to update the state of the pots on the players end. 
  */
	if (player === "player1" && connections.player1) {
		connections.player1.send(
			JSON.stringify({ type: "pots", data: state.pots })
		);
	}
	if (player === "player2" && connections.player2) {
		connections.player2.send(
			JSON.stringify({ type: "pots", data: state.pots })
		);
	}
}
function updateDishes(player: "player1" | "player2", data: Dishes) {
	/*
  This updates the dishes. This is used to update the dishes based on the data sent by the player. 
  */
	if (player == "player1") {
		state.dishes = data;
		connections.player2?.send(
			JSON.stringify({ type: "dishes", data: state.dishes })
		);
	}
	if (player == "player2") {
		state.dishes = data;
		connections.player1?.send(
			JSON.stringify({ type: "dishes", data: state.dishes })
		);
	}
}
function handleOrderData(state: State) {
	/*
	  This function handles order completion logic. It checks if both players are calling an order and there are dishes waiting.
	  If the waiting dishes match an order and it hasn't been completed yet, it marks it as completed and resets/awards points to players.
	  If the waiting dishes do not match any order, it logs a penalty for both players.
	*/

	if (
		state.player1.callingOrder &&
		state.player2.callingOrder &&
		state.dishes.dishesWaiting !== 0
	) {
		let dishIndex = state.orders.soups.indexOf(state.dishes.dishesWaiting);

		if (dishIndex !== -1 && state.orders.completed[dishIndex] === false) {
			state.orders.completed[dishIndex] = true;
			state.dishes.dishesWaiting = 0;
			state.dishes.orderCalled = false;
			state.player1.callingOrder = false;
			state.player2.callingOrder = false;
			state.player1.currentlyServing = false;
			state.player2.currentlyServing = false;
			state.teamScore += state.orders.price[dishIndex];

			resetPlayersAfterOrder("player1", dishIndex, state.teamScore);
			resetPlayersAfterOrder("player2", dishIndex, state.teamScore);
		} else {
			// Handle penalty when the waiting dishes do not match any order
			state.dishes.dishesWaiting = 0;
			state.dishes.orderCalled = false;
			state.player1.callingOrder = false;
			state.player2.callingOrder = false;

			connections.player1?.send(
				JSON.stringify({
					type: "orderComplete",
					order: dishIndex !== -1 ? dishIndex : -1,
					data: state.player1,
				})
			);

			connections.player2?.send(
				JSON.stringify({
					type: "orderComplete",
					order: dishIndex !== -1 ? dishIndex : -1,
					data: state.player2,
				})
			);
		}
	}
}

function sepHandleOrderData(state: State, player: "player1" | "player2") {
	/*

    */
	if (player === "player1") {
		if (state.player1.soupsReady !== 0) {
			let soupIndex = state.orders.soups.indexOf(state.player1.soupsReady);
			console.log(soupIndex);
			if (soupIndex !== -1) {
				if (state.orders.p1Completed[soupIndex] === false) {
					state.orders.p1Completed[soupIndex] = true;
					state.player1.soupsReady = 0;
					state.player1.currentlyServing = false;
					state.player1.callingOrder = false;
					state.player1.score += state.orders.price[soupIndex];
					connections.player1?.send(
						JSON.stringify({
							type: "orderComplete",
							order: soupIndex,
							data: state.player1,
						})
					);
				}
			}
			if (soupIndex === -1) {
				state.player1.soupsReady = 0;
				state.player1.currentlyServing = false;
				state.player1.callingOrder = false;
				connections.player1?.send(
					JSON.stringify({
						type: "orderComplete",
						order: -1,
						data: state.player1,
					})
				);
			}
		}
	}
	if (player === "player2") {
		if (state.player2.soupsReady !== 0) {
			let soupIndex = state.orders.soups.indexOf(state.player2.soupsReady);
			console.log(soupIndex);
			if (soupIndex !== -1) {
				if (state.orders.p2Completed[soupIndex] === false) {
					state.orders.p2Completed[soupIndex] = true;
					state.player2.soupsReady = 0;
					state.player2.currentlyServing = false;
					state.player2.score += state.orders.price[soupIndex];
					connections.player2?.send(
						JSON.stringify({
							type: "orderComplete",
							order: soupIndex,
							data: state.player2,
						})
					);
				}
			}
			if (soupIndex === -1) {
				state.player2.currentlyServing = false;
				connections.player2?.send(
					JSON.stringify({
						type: "orderComplete",
						order: -1,
						data: state.player2,
					})
				);
			}
		}
	}
}
function resetPlayersAfterOrder(
	player: "player1" | "player2",
	values: number,
	teamScore: number
) {
	if (player === "player1") {
		state.player1.callingOrder = false;
		state.player1.interactionTile = null;
		state.player2.callingOrder = false;
		state.player2.interactionTile = null;
		connections.player1?.send(
			JSON.stringify({
				type: "orderComplete",
				order: values,
				teamScore: teamScore,
			})
		);
		console.log("player 1 reset");
	}
	if (player === "player2") {
		state.player1.callingOrder = false;
		state.player1.interactionTile = null;
		state.player2.callingOrder = false;
		state.player2.interactionTile = null;
		connections.player2?.send(
			JSON.stringify({
				type: "orderComplete",
				order: values,
				teamScore: teamScore,
			})
		);
		console.log("player 2 reset");
	}
}

function startTrialTimer(block: "sep" | "collab") {
	/*
  This starts the timer for the trial. This is set to 45 seconds. A message is emmited to the clients to start the trial and allow movement. 
  A message is also emmitted to end the trial, disallow movement, and start the break.
  The start break function is also called which will start the break timer and reset the environment.
  */
	const timerDuration = expConsts.trialLength * 1000; // 45 seconds

	// Emit a message to clients to start the timer
	connections.player1?.send(JSON.stringify({ type: "timer", data: "start" }));
	connections.player2?.send(JSON.stringify({ type: "timer", data: "start" }));

	// Start the timer on the server side
	const timer = setTimeout(() => {
		// Perform any actions you want to take after the timer expires

		// Emit a message to clients indicating that the timer has expired
		connections.player1?.send(JSON.stringify({ type: "timer", data: "end" }));
		connections.player2?.send(JSON.stringify({ type: "timer", data: "end" }));

		// trial number is .5 because two messages are recieved for each trial
		state.trialNo += 0.5;
		state.orders = orderLists.ordersObject[state.trialNo];
		startBreak(block);
		// Clear the timer if it's no longer needed
		clearTimeout(timer);
	}, timerDuration);
}

function resetPlayerData(
	player: "player1" | "player2",
	block: "sep" | "collab"
) {
	/*
  This resets the player data. This is used to reset the player data after the trial has ended. This is used to reset the player data so that the
  next trial can start. It resends the initial state to the players so that they can start the next trial in the correct positions, scores, 
  onions, etc.
  */
	if (block === "collab") {
		if (connections.player1 && player === "player1") {
			let resetState = Object.assign({}, initialstate);
			resetState.trialNo = state.trialNo;
			resetState.orders = orderLists.ordersObject[state.trialNo];
			connections.player1.send(
				JSON.stringify({ type: "reset", data: resetState })
			);
		}
		if (connections.player2 && player === "player2") {
			let resetState = Object.assign({}, initialstate);
			resetState.trialNo = state.trialNo;
			resetState.player1 = initialstate.player2;
			resetState.player2 = initialstate.player1;
			resetState.orders = orderLists.ordersObject[state.trialNo];
			connections.player2.send(
				JSON.stringify({ type: "reset", data: resetState })
			);
		}
	}
	if (block === "sep") {
		if (connections.player1 && player === "player1") {
			let resetState = Object.assign({}, sepinitialState);
			resetState.trialNo = state.trialNo;
			resetState.orders = orderLists.ordersObject[state.trialNo];
			connections.player1.send(
				JSON.stringify({ type: "reset", data: resetState })
			);
		}
		if (connections.player2 && player === "player2") {
			let resetState = Object.assign({}, sepinitialState);
			resetState.trialNo = state.trialNo;
			resetState.orders = orderLists.ordersObject[state.trialNo];
			connections.player2.send(
				JSON.stringify({ type: "reset", data: resetState })
			);
		}
	}
}
function startBreak(block: "sep" | "collab") {
	/*
  This starts the break timer. This is set to 20 seconds. This is used to allow the players to have a break between trials.
  resetPlayerData is called to reset the player data so that the next trial can start. 
  */
	const breakTime = expConsts.breakLength * 1000; // 20 seconds

	const breakTimer = setTimeout(() => {
		startTrialTimer(block);
		clearTimeout(breakTimer);
		resetPlayerData("player1", block);
		resetPlayerData("player2", block);
		createOrders(orderNumbers[state.trialNo], soupNumbers);
	}, breakTime);
}

function recordState(values: State) {
	/*
  This records the state of the game. This is used to record the state of the game at the end of each trial. This is used to record the state of the game
  at the end of each trial so that the data can be analyzed later. 
  */
	if (expConsts.writeData === 0) {
		return;
	}
	if (expConsts.writeData === 1) {
		data.push(values);
	}
}

function sepApplytoState(
	state: State,
	playerdata: any,
	player: "player1" | "player2"
) {
	/*
  This applies the data to the state. This is used specifically to handle applying data from the sep condition to the state variable 
  used in the collab condition. It's done this way so that the data is roughly consistent across both conditions. This doesn't need
  to be sent to the other player like in the other conditions. 
  */
	if (player === "player1") {
		state.player1 = playerdata;
		state.player1.timestamp = new Date().getTime();
		state.timestamp = new Date().getTime();
	} else if (player === "player2") {
		state.player2 = playerdata;
		state.player2.timestamp = new Date().getTime();
		state.timestamp = new Date().getTime();
	}
	recordState(state);
}
// p1 and p2 Ready are used to check if both players are ready to start the game. When this is true it emits the startGame message to both players
// and sends data to both players.
// This is the connection function. This is used to check if the players are connected and then sends the instructions to the players.
wss.on("connection", function (ws) {
	if (connections.player1 === null) {
		connections.player1 = ws;
	} else if (connections.player2 === null) {
		connections.player2 = ws;

		// Check if both players are not connected
	} else {
		console.error("No available player slots");
	}
	if (!connections.player1 || !connections.player2) {
		if (connections.player1) {
			// Emit a message to player 1 to wait for player 2 to connect
			connections.player1.send(
				JSON.stringify({
					type: "waiting",
					data: "Waiting for player 2 to connect...",
				})
			);
		}
		if (connections.player2) {
			// Emit a message to player 2 to wait for player 1 to connect
			connections.player2.send(
				JSON.stringify({
					type: "waiting",
					data: "Waiting for player 1 to connect...",
				})
			);
		}
	}
	// If both players are connected, send instructions to both
	if (connections.player1 && connections.player2) {
		// creates and shuffles the number of orders for the trials
		let orderTrials = shuffle(
			orderNumbers.map((orderAmount) => Array(4).fill(orderAmount)).flat()
		);
		randomiseBlocks(conditions, state, initialstate);
		connections.player1.send(
			JSON.stringify({
				type: "instructions",
				data: "start instruction",
				conditions: state.block,
			})
		);
		connections.player2.send(
			JSON.stringify({
				type: "instructions",
				data: "start instruction",
				conditions: state.block,
			})
		);
	}
	ws.on("message", function message(m) {
		/*
    On message, this checks what type of message it is:
    - startGame: checks if both players are ready to start the game. If they are, it sends the initial state to both players.

    - CollabSceneReady: starts the trial timer, sending messages to start the trials (which run continuously including breaks). 

    - player: updates the state of the game based on the player data sent, and then sends the other player the updated state. 

    - pots: updates the state of the pots based on the data sent. This will also be sent to the other player so they can update the 
            state of the pots on their end.
    */
		const data = JSON.parse(m.toString("utf-8"));
		switch (data.block) {
			case "startGame":
				if (data.data === "ready") {
					if (connections.player1 === ws) {
						p1Ready = true;
					}
					if (connections.player2 === ws) {
						p2Ready = true;
					}
					if (
						connections.player1 &&
						connections.player2 &&
						p1Ready &&
						p2Ready
					) {
						startBlock(initialstate, sepinitialState, connections, "sep");
					}
				}
				break;

			case "sep":
				switch (data.type) {
					case "SepSceneReady":
						startTrialTimer("sep");
						break;
					case "player":
						if (connections.player1 === ws) {
							sepApplytoState(state, data.data, "player1");
						}
						if (connections.player2 === ws) {
							sepApplytoState(state, data.data, "player2");
						}
						break;
					case "dishes":
						if (connections.player1 === ws) {
							sepApplytoState(state, data.data, "player1");
							sepHandleOrderData(state, "player1");
							console.log("player 1 dishes");
						}
						if (connections.player2 === ws) {
							sepApplytoState(state, data.data, "player2");
							sepHandleOrderData(state, "player2");
							console.log("player 2 dishes");
						}

						break;
				}
				break;
			case "collab":
				switch (data.type) {
					case "CollabSceneReady":
						startTrialTimer("collab");
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
					case "dishes":
						if (connections.player1 === ws) {
							updateDishes("player1", data.data);
						}
						if (connections.player2 === ws) {
							updateDishes("player2", data.data);
						}
						handleOrderData(state);
						break;
				}
		}
	});

	ws.on("close", () => {
		if (connections.player1 === ws) connections.player1 = null;
		else if (connections.player2 === ws) connections.player2 = null;

		if (expConsts.writeData === 0) {
			return;
		} else if (expConsts.writeData === 1) {
			fs.writeFileSync(expConsts.dataDir + "data.json", JSON.stringify(data));
		}
	});

	ws.on("error", console.error);

	// send the state
});
