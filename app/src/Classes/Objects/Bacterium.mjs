import {Ellipsoid} from "./Ellipsoid.mjs";
import {TWO_PI, PI} from "../../util.mjs";
import {mat4, vec3} from "../../../glMatrix/src/index.js"

export class Bacterium extends Ellipsoid {

    static maxArc = PI/2;

    static attackedMin = -0.5;
    arc = 0;
    normal = null;
    attacked = false;

    constructor(position,normal,arc,color,idx) {
        super(position.x,position.y,position.z, 1.004 + (0.001*idx), 1, 1, 1, color);
        this.arc = arc;
        this.normal = normal;
        this.setSegments(30, 30);
    }

    generateModelMatrix() {
        let position = this.position;
        let model = mat4.fromTranslation(mat4.create(), vec3.fromValues(position.x,position.y,position.z));

        let arc = this.arc;
        if (arc <= 0) arc = 0;
        if (arc >= Bacterium.maxArc) arc = Bacterium.maxArc;

        this.angle_spans.vertical = arc;
        this.generateVertices();

        let v_norm = vec3.fromValues(this.normal.x,this.normal.y,this.normal.z);
        let v_up = vec3.fromValues(0,1,0);

        let axis = vec3.cross(vec3.create(),v_up,v_norm);
        let angle = Math.atan2(vec3.length(axis), vec3.dot(v_up,v_norm));
        vec3.normalize(axis,axis);

        mat4.rotate(model, model, angle, axis);

        mat4.translate(model, model, vec3.fromValues(-position.x,-position.y,-position.z));

        this.ModelMatrix = model;
    }
    draw(app, args) {
        if (this.arc <= 0) return;
        this.generateModelMatrix();
        super.draw(app, args);
    }
}