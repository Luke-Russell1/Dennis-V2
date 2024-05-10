export default class instructions extends Phaser.Scene {
    constructor(ws) {
        super({ key: 'instructions' });
        this.ws = ws;
    }

    preload() {
        this.load.atlas('agents', 'Assets/agents.png', 'Assets/agents.json');
    }

    create() {
        /*
        This is the instructions screen for the game. When they have read it and have pressed enter, the game will start
        WILL NEED TO ADD INSTRUCTIONS AND A FORCED TIMEOUT SO THEY ACTUALLY READ IT
        */
        this.ws = this.game.ws;
        this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0xffffff)
                .setOrigin(0)
                .setDepth(0); // Ensure it's at the bottom
        let instructionsText = 'This is the instructions for the game \n Press Enter to start the game'
        this.add.text(this.game.config.width / 4, this.game.config.height / 2, instructionsText, { fontFamily: 'Arial, sans serif', fontSize: '24px', fill: '#000' })
        this.keys = this.input.keyboard.addKeys('ENTER');

    }

    update() { 
        this.progressToNextTrial(this.keys);
    }
    progressToNextTrial(keys) {
        if (keys.ENTER.isDown) {
            this.ws.send(JSON.stringify({ type: 'startGame' }));
            console.log("Sent message: startGame");
        }
    }
}