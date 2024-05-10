export default class waitingRoom extends Phaser.Scene {
constructor() {
    super({ key: 'waitingRoom' });
}

preload() {
    this.load.atlas('agents', 'Assets/agents.png', 'Assets/agents.json');
}

create() {
    this.add.rectangle(0, 0, this.game.config.width, this.game.config.height,  0xffffff)
            .setOrigin(0)
            .setDepth(0); // Ensure it's at the bottom
    let waitingText = 'Waiting for another player to join...'
    this.add.text(this.game.config.width / 4, this.game.config.height / 2, waitingText, {fontFamily: 'Arial, sans-serif', fontSize: '28px', fill: '#000'});
}

update() { 
}
}
