import {Ellipsoid} from "./Ellipsoid.mjs";
import {PI, TWO_PI} from "../../util.mjs";

export class Hemisphere extends Ellipsoid {
    constructor(x,y,z,r,color) {
        super(x, y, z, r, null, null, null, color);
        this.setRadius(r);
        this.setAngleSpans(PI, PI);
        this.setSegments(30, 30);
    }
}