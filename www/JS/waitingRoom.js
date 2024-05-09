export default class waitingRoom extends Phaser.Scene {
constructor() {
    super({ key: 'waitingRoom' });
}

preload() {
    this.load.atlas('agents', 'Assets/agents.png', 'Assets/agents.json');
}

create() {
    this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0xffffff)
            .setOrigin(0)
            .setDepth(0); // Ensure it's at the bottom
    this.add.text(this.game.config.width / 10, this.game.config.height / 2, 'Waiting for another player to join...', { fontSize: '32px', fill: '#000' })

}

update() { 
}
}
