class instructions extends Phaser.Scene {
    constructor() {
        super({ key: 'instructions' });
    }

    preload() {
        this.load.atlas('agents', 'Assets/agents.png', 'Assets/agents.json');
    }

    create() {
        this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0xffffff)
                .setOrigin(0)
                .setDepth(0); // Ensure it's at the bottom
        this.add.text(this.game.config.width / 10, this.game.config.height / 2, 'Instructions', { fontSize: '32px', fill: '#000' })
        this.keys = this.input.keyboard.addKeys('ENTER');

    }

    update() { 
    }
    progressToNextTrial(keys) {
        if (keys.ENTER.isDown) {
            this.ws.send(JSON.stringify({ type: 'startGame' }));
        }
    }
}