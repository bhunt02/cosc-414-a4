import {Ellipsoid} from "./Ellipsoid.mjs";
import * as Utilities from "../../util.mjs";
import {PI, TWO_PI} from "../../util.mjs";

export class ProjectedCircle extends Ellipsoid {
    static programAlias = "ProjectedCircle";

    static attributeNames = {
        default: ["a_Position3", "a_Normal3"],
        picking: ["a_Position3", "a_Normal3"]
    }
    static uniformNames = {
        default: ["u_Color3"],
        picking: ["u_ObjectId4"]
    };

    surface = null;
    normal = null;
    regenerate = false;

    constructor(x,y,z,r,color,surface,surface_normal) {
        super(x, y, z, null, null, null, null, {r: color?.r ?? 1.0, g: color?.g ?? 1.0, b: color?.b ?? 1.0, a: 1.0});

        this.surface = surface;
        this.normal = surface_normal;
    }

    generateVertices() {
        let vertices = [],
            normals = [],
            indices = [],
            wires = [];

        let verticalSegments = Math.ceil(this.radius*5),
            horizontalSegments = 15; // TODO: Dynamically determine # of sections

        for (let i = 0; i <= verticalSegments; i++) {
            for (let j = 0; j <= horizontalSegments; j++) {
            }
        }
        let angle = 10;
        let arc = angle * this.r; // TODO: Get arc length from center to furthest point in radius

        let arcAngle_inc = arc/verticalSegments,
            circAngle_inc = TWO_PI/horizontalSegments;

        let center_position = this.position;
        let center_normal = this.normal;

        for (let i = 1; i <= verticalSegments; i++) {
            let phi = (i * arcAngle_inc);

            let idx0 = (i * (horizontalSegments + 1)) + 1, // start of this (i-th) longitudinal strip
                idx1 = (idx0 + horizontalSegments + 1) + 1; // beginning of next longitudinal strip

            for (let j = 0; j < horizontalSegments; j++) {
                let theta = (j * circAngle_inc);

                let idx2 = idx0 + 1, // next-index-to-right from idx0
                    idx3 = idx1 + 1; // next-index-to-right from idx1

                let x, y, z;
                x = (this.surface.radius*1.1 * Math.sin(phi) * Math.sin(theta))/this.denominators.b;
                y = (this.surface.radius*1.1 * Math.cos(phi))/this.denominators.c;
                z = (this.surface.radius*1.1 * Math.sin(phi) * Math.cos(theta))/this.denominators.a;

                normals.push(x,y,z);

                vertices.push(
                    (x+this.surface.position.x),
                    (y+this.surface.position.y),
                    (z+this.surface.position.z)
                );

                wires.push(idx0,idx1);

                if (i !== 0) {
                    indices.push(idx0,idx1,idx2);
                    wires.push(idx0,idx2);
                }
                if (i !== (verticalSegments-1)) {
                    indices.push(idx2, idx1, idx3);
                }
            }
        }

        this.indices = Uint16Array.from(indices);
        this.wires = Uint16Array.from(wires);
        this.vertices = Float32Array.from(vertices);
        this.normals = Float32Array.from(normals);
        this.buffers = {};
    }

    draw(app, args) {
        super.draw(app, args);
    }
}