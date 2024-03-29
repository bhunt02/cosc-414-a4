/*
    Bridgette Hunt
    COSC 414 001 2023WW
*/

import {App, BaseObject, Sphere, Bacterium, Utilities} from "./app/src/index.mjs";

let STATE = new App();
const TWO_PI = Utilities.TWO_PI;
function wheel(event) {
    event.preventDefault();
    STATE.setZoom(STATE.settings.zoom.val + (event.deltaY * 0.001));
}

function keydown(event) {
    switch(event.code) {
        case "ArrowUp":
            STATE.setZoom(STATE.settings.zoom.val - 0.1);
            break;
        case "ArrowDown":
            STATE.setZoom(STATE.settings.zoom.val + 0.1);
            break;
    }
}

function mouseup() {
    STATE.ui.dragging = false;
}

function mousemove(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX-rect.left, y = event.clientY-rect.top;

    let ui = STATE.ui, settings = STATE.settings;
    if (ui.dragging) {
        let factor = 10/STATE.canvas.height;
        let dx = factor * (x - ui.mouse.x), dy = factor * (y - ui.mouse.y);

        settings.angle.y = settings.angle.y + dx;
        settings.angle.x = settings.angle.x + dy;
    }

    ui.mouse.x = x;
    ui.mouse.y = y;
}

function mousedown(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX-rect.left, y = event.clientY-rect.top;

    let ui = STATE.ui;
    if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
        ui.mouse.x = x;
        ui.mouse.y = y;
        ui.dragging = true;
    }
}

function mouseclick(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX-rect.left, y = event.clientY-rect.top;
    let mouse = STATE.ui.mouse;

    let dis = Utilities.distance({x: x, y: y, z: 0}, {x: mouse.x, y: mouse.y, z: 0});

    console.log(dis);
    if (mouse.hit != null && dis <= 0 && mouse.hit instanceof Bacterium && STATE.game_settings.running && !STATE.game_settings.paused) {
        let bacterium = mouse.hit;
        if (bacterium.attacked) return;

        bacterium.attacked = true;
        bacterium.reachedThreshold = false; // Reset threshold reached value for bacteria (it will regrow)

        STATE.game_settings.growth_rate += 0.5; // Ramp up the difficulty as the game goes on
        STATE.game_settings.last_hit = 0; // Reset timer for player's last hit

        changePlayerPoints(PLAYER_POINTS + 1);
    }
}

/* ------------------------------------------------ BACTERIA ---------------------------------------------------------*/

let Bacteria = function(index, x, y, z, s, color) {
    this.index = index;
    this.setPositionXYZ(x, y, z);
    this.setSize(s);
    this.setColor(color);
}

Bacteria.prototype = {
    index: null,
    position: null,
    size: 0,
    color: null,

    setPositionXYZ(x,y,z) {
        this.position = {x: x, y: y, z: z};
    },

    setSize(size) {
        this.size = size;
    },

    setColor(color) {
        this.color = color;
    }
}

/* ---------------------------------------------- GAME VARIABLES -----------------------------------------------------*/

let GAME_POINTS = 0;
let PLAYER_POINTS = 0;

function getCanvas() {
    let canvas = document.getElementsByTagName("canvas").item(0);
    if (!canvas) return;
    STATE.canvas = canvas;
}

/* --------------------------------------------- GAME FUNCTIONS ------------------------------------------------------*/
function main() {
    STATE.game_settings.running = true;

    getCanvas();
    if (STATE.canvas == null) {
        console.log("Error: Unable to locate canvas element in document.");
        return;
    }

    STATE = Utilities.initializeWebGL(
        STATE,
        {r: 0.0, g: 0.0, b: 0.0, a: 1.0}
    );

    new Sphere();
    generateBacteria(STATE.game_settings.species_count);

    const holder = document.getElementById("game-container");
    document.body.addEventListener("keydown", keydown);
    holder.addEventListener("wheel", wheel);
    holder.addEventListener("mousemove", mousemove);
    holder.addEventListener("mousedown",mousedown);
    holder.addEventListener("mouseup",mouseup);
    holder.addEventListener("click",mouseclick);

    let t_0 = Date.now();
    let gameLoop = function() {
        let t_1 = Date.now();
        STATE.game_settings.last_hit += t_1-t_0;
        t_0 = t_1;

        // If player hasn't hit any bacteria in 1 second, award 1 point to the game.
        /*if (STATE.game_settings.last_hit > 1000) {
            changeGamePoints(GAME_POINTS += 1);
            STATE.game_settings.last_hit = 0;
        }*/

        if (!STATE.game_settings.paused) {
            BaseObject.Objects.filter(v => v instanceof Bacterium).forEach((bacterium) => {
                if (bacterium.attacked) {
                    bacterium.size -= STATE.game_settings.growth_rate/1000;
                    if (bacterium.size <= Bacterium.attackedMin) {
                        bacterium.attacked = false;
                    }
                } else {
                    bacterium.size += STATE.game_settings.growth_rate/10000;
                }

                if (bacterium.reachedThreshold === false && bacterium.size >= Bacterium.maxSize) {
                    bacterium.reachedThreshold = true;
                    //changeGamePoints(GAME_POINTS += 2); // Game gains two points each time a bacterium reaches the threshold
                }
            })

            RenderStep();

            determineOutcome();
        }

        if (STATE.game_settings.running) {
            tick().then();
            requestAnimationFrame(gameLoop);
        }
    }

    const tick = () => {
        return new Promise(resolve => setTimeout(resolve, STATE.game_settings.tickspeed));
    };

    window.requestAnimationFrame(gameLoop);
} window.addEventListener('load', main);

function RenderStep() {
    let gl = STATE.gl;

    Utilities.clearRender(gl, STATE.settings.gl_enable.depth_test);

    /* FROM https://webglfundamentals.org/webgl/lessons/webgl-picking.html WITH MODIFICATIONS */
    let frameBuffer = STATE.render.frameBuffer;
    if (frameBuffer != null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        Utilities.clearRender(gl, STATE.settings.gl_enable.depth_test);

        BaseObject.drawObjects(STATE, {picking: true});

        let mouse = STATE.ui.mouse;
        const pixelX = mouse.x * gl.canvas.width / gl.canvas.clientWidth;
        const pixelY = gl.canvas.height - mouse.y * gl.canvas.height / gl.canvas.clientHeight - 1;

        const data = new Uint8Array(4);
        gl.readPixels(
            pixelX,            // x
            pixelY,            // y
            1,                 // width
            1,                 // height
            gl.RGBA,           // format
            gl.UNSIGNED_BYTE,  // type
            data);             // typed array to hold result
        const id = (data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24));
        mouse.hit = BaseObject.Objects.filter(v => v.index === id-1).at(0);
    }
    /* -------------------------------------------------------------------------------------------------------------- */

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    BaseObject.drawObjects(STATE);
}

function changePlayerPoints(mod) {
    PLAYER_POINTS = mod;
    const text = document.getElementById("player-points");
    text.innerHTML = "<b>PLAYER: "+PLAYER_POINTS+"</b>";
}

function changeGamePoints(mod) {
    GAME_POINTS = mod;
    const text = document.getElementById("bacteria-points");
    text.innerHTML = "<b>BACTERIA: "+GAME_POINTS+"</b>";
}

function determineOutcome() {
    let gameOver = false;

    if (GAME_POINTS >= STATE.game_settings.win_condition) {
        const text = document.getElementById("outcome-text");
        text.innerHTML = "<b>YOU LOSE!</b>"
        text.style.setProperty("color","red");
        gameOver = true;
    } else if (PLAYER_POINTS >= STATE.game_settings.win_condition) {
        const text = document.getElementById("outcome-text");
        text.innerHTML = "<b>YOU WIN!</b>"
        text.style.setProperty("color","green");
        gameOver = true;
    }

    if (gameOver) {
        const div = document.getElementById("end-container");
        div.style.setProperty("display","inline-block");
        STATE.game_settings.paused = true;
        STATE.game_settings.running = false;
    }
}

function generateBacteria(speciesCount) {
    const hueIncrement = 0.95/speciesCount;
    let surface = BaseObject.Objects.filter((value) => value instanceof Sphere).at(0);
    for (let i = 0; i < speciesCount; i++) {
        let phi = TWO_PI * Math.random(), theta = TWO_PI * Math.random();

        let z = (surface.radius * Math.sin(phi) * Math.cos(theta))/surface.denominators.a,
            x = (surface.radius * Math.sin(phi) * Math.sin(theta))/surface.denominators.b,
            y = (surface.radius * Math.cos(phi))/surface.denominators.c;

        new Bacterium(
            {
                x: x+surface.position.x,
                y: y+surface.position.y,
                z: z+surface.position.z
            },
            0,
            Utilities.HSVtoRGB(hueIncrement*i,1,1),
            surface,
            {
                x: x,
                y: y,
                z: z
            },
        );
    }
}