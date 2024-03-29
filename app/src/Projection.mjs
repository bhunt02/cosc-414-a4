import {mat4, vec3} from "../glMatrix/src/index.js";
import {TWO_PI, PI} from "./util.mjs";

/* ------------------------------------------- PROJECTION VARIABLES --------------------------------------------------*/
export const projectionMatrixNames = ["u_ModelViewProjectionMatrix","u_NormalMatrix"];

const View_Orientation = {
    x: {angle: 0, rot_speed: 0, direction: 0},
    y: {angle: 0, rot_speed: 0, direction: 0},
    z: {angle: 0, rot_speed: 0, direction: 0},
}

/* ------------------------------------------- PROJECTION FUNCTIONS --------------------------------------------------*/
function generateProjectionMatrices(app, model) {
    let projection = mat4.create();
    mat4.perspective(projection,120, app.canvas.height/app.canvas.width, 1, 50);

    let angle = app.settings.angle;
    let radius = app.settings.zoom.val;
    let theta = angle.x;
    let phi = angle.y;

    let camera = mat4.create();
    mat4.rotateY(camera,camera,-phi);
    mat4.rotateX(camera,camera,-theta);

    mat4.translate(camera,camera,vec3.fromValues(0,0,radius));

    let view = mat4.invert(mat4.create(),camera);

    let mv = mat4.create();
    mat4.multiply(mv,view,model);
    let normal = generateNormalMatrix(mv);

    let mvp = mat4.create();
    mat4.multiply(mvp,projection,mv);
    //mat4.multiply(mvp,mvp,model);
    return {
        "u_ModelViewProjectionMatrix": mvp,
        "u_NormalMatrix": normal
    };
}

function generateNormalMatrix(modelViewMatrix) {
    let mat = mat4.create();
    mat4.invert(mat, modelViewMatrix);
    mat4.transpose(mat, mat);
    return mat;
}

export function loadProjectionMatrices(app, modelMatrix, varLocations) {
    let matrices = generateProjectionMatrices(app, modelMatrix);
    for (let i in projectionMatrixNames) {
        let matName = projectionMatrixNames[i];
        loadProjectionMatrix(app.gl, varLocations[matName], matrices[matName]);
    }
}

export function loadProjectionMatrix(gl, location, matrix) {
    gl.uniformMatrix4fv(location, false, getMatrixAsArray(matrix));
}

function getMatrixAsArray(matrix) {
    let res = [];
    matrix.forEach((v, i) => res[i] = v);
    return res;
}