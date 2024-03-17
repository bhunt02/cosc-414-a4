import {Ellipsoid} from "./Ellipsoid.mjs";
import {mat4, vec3} from "../../../glMatrix/src/index.js"

export class Bacterium extends Ellipsoid {

    static maxSize = 0.5;

    static attackedMin = -0.5;
    size = 0;
    normal = null;
    attacked = false;

    constructor(position,normal,size,color) {
        super(position.x,position.y,position.z, null, null, null, null, color);
        this.size = size;
        this.normal = normal;
        this.setDenominators(1,2,1);
        this.setSegments(30, 30);
    }

    generateModelMatrix() {
        let position = this.position;
        let model = mat4.fromTranslation(mat4.create(), vec3.fromValues(position.x,position.y,position.z));

        let scale = this.size;
        if (scale <= 0) this.scale = 0;
        if (scale >= Bacterium.maxSize) scale = Bacterium.maxSize;

        let v_norm = vec3.fromValues(this.normal.x,this.normal.y,this.normal.z);
        let v_up = vec3.fromValues(1,0,0);

        let axis = vec3.cross(vec3.create(),v_up,v_norm);
        let angle = Math.atan2(vec3.length(axis), vec3.dot(v_up,v_norm));
        vec3.normalize(axis,axis);

        mat4.rotate(model, model, angle, axis);
        mat4.scale(model, model, vec3.fromValues(scale,scale,scale));

        mat4.translate(model, model, vec3.fromValues(-position.x,-position.y,-position.z));

        this.setDenominators(1,2 - (1.5*scale),1);
        this.ModelMatrix = model;
    }
    draw(app, args) {
        if (this.size <= 0) return;
        this.generateModelMatrix();
        super.draw(app, args);
    }
}