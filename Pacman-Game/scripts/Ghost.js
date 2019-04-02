Ghost = function (game, mainGame, x, y, animStartIndex) {
    //Inherit from Sprite
    Phaser.Sprite.call(this, game, (x * 16) + 8, (y * 16) + 8, 'ghosts', animStartIndex);
    this.speed = 150;
    this.threshold = 3;
    this.inplay = false;
    this.lastIntersection = null;
    this.game = game;
    this.distanceToPac = 0;
    this.mainGame = mainGame;
    this.marker = new Phaser.Point();
    this.turnPoint = new Phaser.Point();
    this.directions = [null, null, null, null, null];
    this.opposites = [Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP];
    this.current = Phaser.NONE;
    this.turning = Phaser.NONE;

    //Animations
    this.animations.add('up', [animStartIndex, animStartIndex + 1], 10, true);
    this.animations.add('down', [animStartIndex + 2, animStartIndex + 3], 10, true);
    this.animations.add('left', [animStartIndex + 4, animStartIndex + 5], 10, true);
    this.animations.add('right', [animStartIndex + 6, animStartIndex + 7], 10, true);

    game.physics.arcade.enable(this);
    this.body.setSize(16, 16, 0, 0);
    this.play('right');
    //this.move(Phaser.LEFT);
    this.leaveHouse();
}

Ghost.prototype = Object.create(Phaser.Sprite.prototype);
Ghost.prototype.constructor = Ghost;

Ghost.prototype.checkDirection = function (turnTo) {
    if (this.directions[turnTo] === null || this.directions[turnTo].index !== this.mainGame.moveabletile) {
        //  Invalid direction if they're already set to turn that way
        //  Or there is no tile there, or the tile isn't index 1 (a floor tile)
        console.log("returning nothing checkdir");
        return;
    }

    //  Check if they want to turn around and can
    if (this.current === this.opposites[turnTo]) {
        this.move(turnTo);
    }
    else {
        this.turning = turnTo;
        this.turnPoint.x = (this.marker.x * this.mainGame.gridsize) + (this.mainGame.gridsize / 2);
        this.turnPoint.y = (this.marker.y * this.mainGame.gridsize) + (this.mainGame.gridsize / 2);
    }
}

Ghost.prototype.move = function (direction) {
    var speed = this.speed;
    if (direction === Phaser.LEFT || direction === Phaser.UP) {
        speed = -speed;
    }

    //Depending on direction apply speed to x velocity or y velocity.
    direction === Phaser.LEFT || direction === Phaser.RIGHT ? this.body.velocity.x = speed : this.body.velocity.y = speed;

    //Play animation depending on direction
    switch (direction) {
        case Phaser.LEFT:
            this.play('left');
            break;
        case Phaser.RIGHT:
            this.play('right');
            break;
        case Phaser.UP:
            this.play('up');
            break;
        case Phaser.DOWN:
            this.play('down');
            break;
    }

    this.current = direction;

}

Ghost.prototype.turn = function () {

    var cx = Math.floor(this.x);
    var cy = Math.floor(this.y);

    //  This needs a threshold, because at high speeds you can't turn because the coordinates skip past
    if (!this.mainGame.math.fuzzyEqual(cx, this.turnPoint.x, this.threshold) || !this.mainGame.math.fuzzyEqual(cy, this.turnPoint.y, this.threshold)) {
        return false;
    }

    //  Grid align before turning
    this.x = this.turnPoint.x;
    this.y = this.turnPoint.y;

    this.body.reset(this.turnPoint.x, this.turnPoint.y);
    this.move(this.turning);
    this.turning = Phaser.NONE;
    return true;

}

Ghost.prototype.checkDistance = function (direction) {
    return Phaser.Math.distance(this.directions[direction].worldX, this.directions[direction].worldY, this.mainGame.pacman.x, this.mainGame.pacman.y);
}

Ghost.prototype.leaveHouse = function () {
    var tweenA = this.game.add.tween(this).to({ x: 226, y: 234 }, 1000, Phaser.Easing.Linear.None);
    var tweenB = this.game.add.tween(this).to({ x: 226, y: 184 }, 1000, Phaser.Easing.Linear.None);
    tweenA.chain(tweenB);
    tweenB.onComplete.add(this.start, this);
    tweenA.start();
}

Ghost.prototype.start = function () {
    this.move(Phaser.LEFT);
    this.inplay = true;
}

Ghost.prototype.checkMove = function () {

    //Set inplay once we collide into a wall.
    if (this.directions[this.current].index !== this.mainGame.moveabletile) {
        this.inplay = true;
    }

    //Initialize the variables we need.
    var dist = 10000; //Just set to a high number.
    var dir = null;

    //Check if were at an intersection
    //Then choose the tile with the closest direction to pacman
    if (this.inplay && this.lastIntersection != this.mainGame.map.getTile(this.marker.x, this.marker.y, this.mainGame.layer.index)) {
        for (var i = 1; i <= 4; i++) {
            if (this.directions[i].index === this.mainGame.moveabletile && this.directions[i] !== this.current && this.opposites[i] != this.current) {
                if (this.checkDistance(i) < dist) {
                    dir = i;
                    dist = this.checkDistance(i);
                }
                this.lastIntersection = this.mainGame.map.getTile(this.marker.x, this.marker.y, this.mainGame.layer.index);
            }
        }
        dir != null ? this.checkDirection(dir) : console.log("Pathing Error");
    }
}

Ghost.prototype.update = function () {
    game.physics.arcade.collide(this, this.mainGame.layer);

    //Corridor that goes to other side of the map
    if (this.x < -8) {
        this.x = 452;
    }
    else if (this.x > 452) {
        this.x = -8;
    }

    this.distanceToPac = Phaser.Math.distance(this.x, this.y, this.mainGame.pacman.x, this.mainGame.pacman.y)


    this.marker.x = this.mainGame.math.snapToFloor(Math.floor(this.x), this.mainGame.gridsize) / this.mainGame.gridsize;
    this.marker.y = this.mainGame.math.snapToFloor(Math.floor(this.y), this.mainGame.gridsize) / this.mainGame.gridsize;

    //  Update our grid sensors
    this.directions[1] = this.mainGame.map.getTileLeft(this.mainGame.layer.index, this.marker.x, this.marker.y);
    this.directions[2] = this.mainGame.map.getTileRight(this.mainGame.layer.index, this.marker.x, this.marker.y);
    this.directions[3] = this.mainGame.map.getTileAbove(this.mainGame.layer.index, this.marker.x, this.marker.y);
    this.directions[4] = this.mainGame.map.getTileBelow(this.mainGame.layer.index, this.marker.x, this.marker.y);

    //Do movement when in bounds
    if (this.inplay && this.x > 16 && this.x < 432) {
        this.checkMove();
    }

    if (this.turning !== Phaser.NONE) {
        this.turn();
    }
}