import {mat4} from "../../glMatrix/src/index.js";

/* Configuration */

export class App {
    gl = null;
    program = null;
    programs = [];
    canvas = null;

    game_settings = {
        running: false,
        paused: false,
        tickspeed: 200,
        species_count: 10,
        growth_rate: 10,
        win_condition: 30,
        last_hit: 0.0
    }
    ui = {
        dragging: false,
        mouse: {
            x: -1,
            y: -1,
            hit: null
        },
        pressedKeys: {},
    };
    render = {
        frameBuffer : null,
        depthBuffer : null,
        target: null
    }
    settings = {
        picking: true,
        gl_enable: {
            cull_face: true,
            depth_test: true,
            polygon_offset: true,
        },
        angle: {
            x: 0,
            y: 0,
        },
        zoom: {
            min: 3,
            max: 7,
            val: 5,
        }
    };

    useProgram(programName) {
        this.gl.useProgram(this.programs[programName]);
        this.program = this.programs[programName];
    }

    setZoom(val) {
        let zoom = this.settings.zoom;
        zoom.val = val;
        if (zoom.val > zoom.max) zoom.val = zoom.max;
        else if (zoom.val < zoom.min) zoom.val = zoom.min;
    }
}