import {Ellipsoid} from "./Ellipsoid.mjs";

export class Sphere extends Ellipsoid {
    constructor(x,y,z,r,color) {
        super(x, y, z, r, null, null, null, {r: color?.r ?? 1.0, g: color?.g ?? 1.0, b: color?.b ?? 1.0, a: 1.0});
    }

    draw(app, args) {
        if (args == null) {
            args = {wireframe: true};
        } else {
            args.wireframe = true;
        }
        super.draw(app, args);
    }
}