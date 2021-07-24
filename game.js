// note: No need for fps limiter, rendering engine and physics engine work separately.

//Update Interval
const PHYSICS_UPDATE_INTERVAL = 10; // ms
//Image
const ISLAND_IMAGE = "island.svg";
const PLAYER_IMAGE = "player.svg";
const PLAYER_IMAGE_2 = "player2.svg";
const ENEMY_IMAGE = "enemy.svg";
const ENEMY_IMAGE_2 = "enemy2.svg"
const BULLET_IMAGE = "bullet.svg";
const CROSS_IMAGE = "cross.svg";
//Size
const CANVAS_SIZE = [2560, 1440];
const CROSS_SIZE = [190, 190];
const ISLAND_SIZE = [16000, 16000];
const FIGHTER_SIZE = [125, 125];
const BULLET_SIZE = [88, 88];
//Amount Limit
const ENEMY_LIMIT = 4;

// Bullet
const BULLET_TIME_OUT = 800;
const PLAYER_BULLET_LIMIT = 8;
const ENEMY_BULLET_LIMIT = 5;
//Blood
const ENEMY_BLOOD = 2;
const PLAYER_BLOOD = 25;
//Speed
const PLAYER_SPEED = [0.85, 1.3]; // Player speed limit
const ENEMY_SPEED = [0.5, 0.85];
const BULLET_SPEED = 5.5; 

//Cam
const CAM_SPEED = [0, 2]
const CAM_RADIUS = 500;
const CAM_TIME = 1000; //ms

let objs = [];
let moving_objs = [];
let bullets = [];
let islands = [];
let fighters = [];

class Physics {
    constructor(){
        this.log = []; // 0 position, 1 velocity
        this.forced_v = null;
        this.speed_limit = null;
        this.delta_v = [0, 0];
    }
    get_position() {let i = this.log.pop(); this.log.push(i); return i[0];}
    get_velocity() {let i = this.log.pop(); this.log.push(i); return i[1];}
    get_speed() {let i = this.get_velocity(); return Math.sqrt(i[0]**2 + i[1]**2);}
    get_direction() {let i = this.get_velocity(); return Math.atan2(i[1], i[0]);}
    update() {
        let last_p = this.get_position();
        let last_v = this.get_velocity();
        let delta_v = this.delta_v;
        let new_v;
        if (this.forced_v){ new_v = this.forced_v; this.forced_v = null;}
        else{new_v = [last_v[0] + delta_v[0], last_v[1] + delta_v[1]];}
        if (this.speed_limit){
            if (trans_speed(new_v) > this.speed_limit[1]){new_v = trans_velocity(this.speed_limit[1], trans_direction(new_v));}
            if (trans_speed(new_v) < this.speed_limit[0]){new_v = trans_velocity(this.speed_limit[0], trans_direction(new_v));}
        }
        let new_p = [last_p[0] + new_v[0] * PHYSICS_UPDATE_INTERVAL, last_p[1] + new_v[1] * PHYSICS_UPDATE_INTERVAL];
        let new_log = [new_p, new_v];
        if (this.log.push(new_log) > 5){this.log.shift();}
        if (delta_v !== [0, 0]){this.delta_v = [0, 0];}

    }
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
class Obj{
    constructor(position = [0, 0], velocity = [0, 0]){
        this.reference = [];
        this.physics = new Physics();
        this.info = {
            image : new Image(),
            size : CROSS_SIZE,
        }
        this.physics.log.push([position, velocity]);
        this.info.image.src = CROSS_IMAGE;
        this.insert(objs)
    }
    insert(array){
        array.push(this);
        this.reference.push(array)
    }
    delete(){
        for(let array of this.reference){
            let index = array.indexOf(this);
            if (index !== -1){
                array.splice(index, 1)
            }
        }
    }
}
class Player extends Obj{
    constructor(position = [0, 0], velocity = [0, 0]){
        super(position, velocity);
        this.insert(moving_objs);
        this.insert(fighters);
        this.info.size = FIGHTER_SIZE;
        this.info.image.src = PLAYER_IMAGE;
        this.info.image2 = new Image();
        this.info.image2.src = PLAYER_IMAGE_2;
        this.physics.speed_limit = PLAYER_SPEED;
        this.blood = PLAYER_BLOOD;
        this.bullets = [];
        this.enemies = [];
        this.counter = 0;
    }
    generate_emeny(position){
        if (this.enemies.length < ENEMY_LIMIT){
            let enemy = new Enemy(this, position);
            let stop_code_1 = setInterval(() => {
                // update delta_v (AI)
                let p_position = this.physics.get_position();
                let e_position = enemy.physics.get_position();
                // let distance = trans_distance(p_position, e_position);
                let speed = get_random(-0.001, 0.08);
                let direction = trans_direction(delta_position(e_position, p_position));
                let delta_v = trans_velocity(speed, direction);
                enemy.physics.delta_v = delta_v;
            }, 20);
            let stop_code_2 = setInterval(() => {
                let p_position = this.physics.get_position();
                let e_position = enemy.physics.get_position();
                let distance = trans_distance(p_position, e_position);
                if (distance < 1000 && Math.random() <  0.1){
                    enemy.shoot();
                }
            }, 50);
            let stop_code_3 = setInterval(() => {
                // check hit
                for (let bullet of this.bullets){
                    if (bullet.check_hit(enemy)){
                        bullet.delete();
                        enemy.blood -= 1;
                        enemy.info.image = enemy.info.image2;
                        if (enemy.blood < 1){
                            enemy.delete();
                            this.counter += 1;
                            new Obj(enemy.physics.get_position());
                            clearInterval(stop_code_1);
                            clearInterval(stop_code_2);
                            clearInterval(stop_code_3);
                        }
                    }
                }
            }, 10);
        }
    }
    shoot(){
        if (this.blood < 1){return;}
        if (this.bullets.length > PLAYER_BULLET_LIMIT){return;}
        let bullet = new Bullet(this);
        setTimeout(() => {
            bullet.delete();
        }, BULLET_TIME_OUT);
    }
}
class Enemy extends Obj{
    constructor(obj = new Player(), position = [0, 0]){
        // random position
        obj.physics.get_position();
        super(position);
        this.info.size = FIGHTER_SIZE;
        this.info.image.src = ENEMY_IMAGE;
        this.info.image2 = new Image();
        this.info.image2.src = ENEMY_IMAGE_2;
        this.physics.speed_limit = ENEMY_SPEED;
        this.target = obj;
        this.blood = ENEMY_BLOOD;
        this.bullets = [];
        this.insert(moving_objs);
        this.insert(fighters);
        this.insert(obj.enemies);
    }
    shoot(){
        if (this.bullets.length > ENEMY_BULLET_LIMIT){return;}
        let bullet = new Bullet(this);
        setTimeout(() => {
            bullet.delete();
        }, BULLET_TIME_OUT);
        let stop_code = setInterval(() => {
            if (bullet.check_hit(this.target)){
                bullet.delete();
                clearInterval(stop_code);
                this.target.blood -= 1;
                if (this.target.blood < 5){
                    this.target.info.image = this.target.info.image2;
                }
                if (this.target.blood < 1){
                    this.target.delete();
                    new Obj(this.target.physics.get_position());
                    // ending
                    let ending_words;
                    if (!this.target.counter) {ending_words = "0, But a nice try! ";}
                    else if (this.target.counter === 1) {ending_words = "One enemy was killed! Good try!";}
                    else if (this.target.counter > 5) {ending_words = "Wow!\na total of " + this.target.counter + " enemies were killed! ";}
                    else {ending_words = "Great job!\n" + this.target.counter + " enemies were killed. "}
                    window.location.reload(); // https://developer.mozilla.org/en-US/docs/Web/API/Window/location
                    window.alert(ending_words);
                }
            }
        }, PHYSICS_UPDATE_INTERVAL);
    }
}
class Bullet extends Obj{
    constructor(obj = new Player()){
        let velocity = obj.physics.get_velocity();
        let offset = trans_velocity(0.5 * (FIGHTER_SIZE[0] + BULLET_SIZE[0]), obj.physics.get_direction());
        let position = [obj.physics.get_position()[0] + offset[0], obj.physics.get_position()[1] + offset[1]];
        velocity = [velocity[0] + trans_velocity(BULLET_SPEED, trans_direction(velocity))[0], velocity[1] + trans_velocity(BULLET_SPEED, trans_direction(velocity))[1]];
        super(position, velocity);
        this.info.size = BULLET_SIZE;
        this.info.image.src = BULLET_IMAGE;
        this.insert(moving_objs);
        this.insert(bullets);
        this.insert(obj.bullets);
    }
    check_hit(obj = new Player()){
        let target = obj;
        let b_position = this.physics.get_position();
        let t_position = target.physics.get_position();
        let distance = trans_distance(b_position, t_position);
        if (distance < (FIGHTER_SIZE[0] + BULLET_SIZE[0]) / 2){
            return true;
        }
        else{
            return false;
        }
    }
}
class Island extends Obj{
    constructor(){
        super();
        this.info.size = ISLAND_SIZE;
        this.info.image.src = ISLAND_IMAGE;
        this.insert(islands);
    }
}

class Camera{
    constructor(target){
        this.physics = new Physics();
        this.physics.log.push([[0, 0], [0, 0]]);
        this.physics.speed_limit = CAM_SPEED;
        this.target = target;
        this.canvas = document.createElement("canvas");
        this.canvas.width = CANVAS_SIZE[0];
        this.canvas.height = CANVAS_SIZE[1];
        this.context = this.canvas.getContext("2d");
        this.context.fillStyle = "#4f5a72";
    }
    aim(){
        let k = 0.0815;
        let old_delta_v = this.physics.delta_v;
        let t_speed = this.target.physics.get_speed();
        let t_position = this.target.physics.get_position();
        let c_position = this.physics.get_position();
        let direction = trans_direction(delta_position(c_position, t_position));
        let delta_v_1 = trans_velocity(k, direction);
        let delta_v_2 = [delta_v_1[0] - old_delta_v[0], delta_v_1[1] - old_delta_v[1]];
        let delta_v = [delta_v_1[0] + delta_v_2[0] * 0.03, delta_v_1[1] + delta_v_2[1]* 0.03];
        delta_v = [delta_v[0] * t_speed * 0.75, delta_v[1] * t_speed * 0.75]
        this.physics.speed_limit[1] = t_speed + 0.2;


        this.physics.delta_v = delta_v;
        this.physics.update()
    }
    update(){
        this.context.fillRect(0, 0, CANVAS_SIZE[0], CANVAS_SIZE[1]);
        let center_position = this.physics.get_position();
        let top_left_position = [center_position[0] - 0.5 * CANVAS_SIZE[0], center_position[1] - 0.5 * CANVAS_SIZE[1]];
        let offset = [-1 * top_left_position[0], -1 * top_left_position[1]];
        let objs_in_sight = [];
        for (let obj of objs){
            let delta = delta_position_abs(obj.physics.get_position(), this.physics.get_position());
            if (delta[0] < 0.5 * CANVAS_SIZE[0] + 0.5 * obj.info.size[0] && delta[1] < 0.5 * CANVAS_SIZE[1] + 0.5 * obj.info.size[1]){
                objs_in_sight.push(obj);
            }
        }
        for (let obj of objs_in_sight){
            let obj_abs_position = obj.physics.get_position();
            let obj_relative_position = [obj_abs_position[0] + offset[0], obj_abs_position[1] + offset[1]];
            let size = obj.info.size;
            let center = [obj_relative_position[0], obj_relative_position[1]];
            let position = [center[0] - 0.5 * size[0], center[1] - 0.5 * size[1]];
            let direction = obj.physics.get_direction();
            if (direction !== 0){
                this.context.translate(center[0], center[1]);
                this.context.rotate(direction);
                this.context.translate(-center[0], -center[1]);
                this.context.drawImage(obj.info.image, position[0], position[1], size[0], size[1]);
                this.context.translate(center[0], center[1]);
                this.context.rotate(-direction);
                this.context.translate(-center[0], -center[1]);
            } else {this.context.drawImage(obj.info.image, position[0], position[1], size[0], size[1]);}
        }
    }
}

//init key_map
let key_map = new Map();
key_map.set("ArrowUp", false);
key_map.set("ArrowDown", false);
key_map.set("ArrowLeft", false);
key_map.set("ArrowRight", false);
key_map.set("r", false);
key_map.set("Escape", false);
window.addEventListener("keydown", (key) => {key_map.set(key.key, true);}, false);
window.addEventListener("keyup", (key) => {key_map.set(key.key, false);}, false);
// pause detect
setInterval(() => {
    if (key_map.get("Escape")){
        key_map.set("Escape", false);
        if (player1.counter < 2){
            window.alert("Paused\n"+ player1.counter +" kill\nPress OK to resume.");
        }
        else{
            window.alert("Paused\n"+ player1.counter +" kills\nPress OK to resume.");
        }
    }
}, 10);

let island1 = new Island();
let player1 = new Player([200, 200],[0.1, 0.1]);

// image load check
let stop_code = setInterval(() => {
    const all_mages_loaded = objs.every((obj) => obj.info.image.complete)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/complete
    if (all_mages_loaded){
        start_canvas();
        clearInterval(stop_code);
        console.log("in canvas");
    }
}, 10);

function start_canvas() {
        let cam1 = new Camera(player1);
        
    // set player control mapper
    setInterval(() => {
        let delta_v = [0, 0];
        if (key_map.get("ArrowRight")){delta_v[0] += 0.07;}
        if (key_map.get("ArrowLeft")){delta_v[0] -= 0.07;}
        if (key_map.get("ArrowDown")){delta_v[1] += 0.07;}
        if (key_map.get("ArrowUp")){delta_v[1] -= 0.07;}
        player1.physics.delta_v = delta_v;
    }, 10);
    // set player physics updater
    setInterval(() => {
        for(let obj of moving_objs){
            obj.physics.update();
        }
        cam1.aim();
        // cam1.physics.update();
    }, PHYSICS_UPDATE_INTERVAL);

    setInterval(() => {
        if (key_map.get(" ")){
            player1.shoot();
        }
    }, 80);

    setInterval(() => {
        if (player1.enemies.length < 3 && Math.random() <  0.2){
            let c_position = cam1.physics.get_position();
            let e_position = [0, 0];
            let i = Math.random();
            if (i < 0.5){e_position = [get_random(c_position[0] - CANVAS_SIZE[0] / 2, c_position[0] + CANVAS_SIZE[0] / 2), c_position[1] + CANVAS_SIZE[1] / 2 + FIGHTER_SIZE[1] / 2]}
            else{e_position = [get_random(c_position[0] - CANVAS_SIZE[0] / 2, c_position[0] + CANVAS_SIZE[0] / 2), c_position[1] - CANVAS_SIZE[1] / 2 - FIGHTER_SIZE[1] / 2]} 
            player1.generate_emeny(e_position);
        }
    }, 100);
    let page_w = window.innerWidth;
    let page_h = window.innerHeight;
    console.log(page_h)
    console.log(page_w)
    document.querySelector("div").appendChild(cam1.canvas);
    document.querySelector("canvas").style.margin = "0px";
    document.querySelector("canvas").style.padding = "0px";
    if (page_h > page_w / 16 * 9){
        document.querySelector("canvas").style.width = "100%";
    }
    else{
        let fit_width = page_h / 9 * 16;
        document.querySelector("canvas").style.width = fit_width + "px";
    }
    
    function draw() {
        window.requestAnimationFrame(draw);
        cam1.update();
    }
    draw();
}

function trans_speed(velocity) {return Math.sqrt(velocity[0]**2 + velocity[1]**2);}
function trans_direction(velocity) {return Math.atan2(velocity[1], velocity[0]);}
function trans_velocity(speed, direction) {return [speed * Math.cos(direction), speed * Math.sin(direction)]}
function trans_distance(position1, position2) {return Math.sqrt((position1[0] - position2[0])**2 + (position1[1] - position2[1])**2);}
function delta_position_abs(position1, position2) {return [Math.abs(position1[0] - position2[0]), Math.abs(position1[1] - position2[1])];}
function delta_position(from_position, to_position) {return [to_position[0] - from_position[0], to_position[1] - from_position[1]];}
function get_random(min, max) {
    return Math.random() * (max - min) + min;
  } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random