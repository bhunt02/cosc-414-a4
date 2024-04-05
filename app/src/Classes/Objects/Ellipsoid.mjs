import {BaseObject} from "./BaseObject.mjs";
import * as Utilities from "../../util.mjs";
import {TWO_PI, PI} from "../../util.mjs";

export class Ellipsoid extends BaseObject {
    static programAlias = "Ellipsoid";

    static Default = {
        position : {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        },
        radius: 1,
        denominators : {
            a: 1.0,
            b: 1.0,
            c: 1.0,
        },
        angle_spans : {
            horizontal: TWO_PI,
            vertical: PI,
        },
        segments: {
            horizontal: 60,
            vertical: 60,
        },
        color: {
            r: 1.0,
            g: 1.0,
            b: 1.0,
            a: 1.0
        }
    };

    static VSHADERS = {
        default : //language=glsl
        `
        uniform vec3 u_Color3;
        uniform vec3 u_ABC;
        uniform vec3 u_Position3;
        uniform float u_Radius;
        
        attribute float a_Phi;
        attribute float a_Theta;
        
        void main() {
            vec4 normal = vec4(
                (u_Radius * sin(a_Phi) * cos(a_Theta))/u_ABC.x,
                (u_Radius * cos(a_Phi))/u_ABC.z,
                (u_Radius * sin(a_Phi) * sin(a_Theta))/u_ABC.y,
                1.0
            );
            transformedNormal = u_NormalMatrix * normal;
            
            vec4 pos = vec4(
                u_Position3.x + normal.x,
                u_Position3.y + normal.y,
                u_Position3.z + normal.z,
                1.0
            );
            
            normal = normalize(normal);
            
            gl_Position = u_ModelViewProjectionMatrix * pos;
        }
        `,
        picking : //language=glsl
        `
        uniform vec4 u_ObjectId4;
        
        uniform vec3 u_ABC;
        uniform vec3 u_Position3;
        uniform float u_Radius;

        attribute float a_Phi;
        attribute float a_Theta;
        
        void main() {
            vec4 normal = vec4(
                (u_Radius * sin(a_Phi) * cos(a_Theta))/u_ABC.x,
                (u_Radius * cos(a_Phi))/u_ABC.z,
                (u_Radius * sin(a_Phi) * sin(a_Theta))/u_ABC.y,
                1.0
            );
            transformedNormal = u_NormalMatrix * normal;

            vec4 pos = vec4(
                u_Position3.x + normal.x,
                u_Position3.y + normal.y,
                u_Position3.z + normal.z,
                1.0
            );

            gl_Position = u_ModelViewProjectionMatrix * pos;
        }
        `,
    }

    static FSHADERS = {
        default: //language=glsl
        `
        uniform vec3 u_Color3;

        void main() {
            float directionalRatio = max(dot(transformedNormal.xyz, normalize(u_directionalVector)), 0.0);
            vec3 lighting = u_ambientLight + (u_directionalLightColor * directionalRatio);
            gl_FragColor = vec4(u_Color3.xyz * lighting, 1.0);
        }
        `,
        picking: //language=glsl
        `
        uniform vec4 u_ObjectId4;
        
        void main() {
            float directionalRatio = max(dot(transformedNormal.xyz, normalize(u_directionalVector)), 0.0);
            vec3 lighting = u_ambientLight + (u_directionalLightColor * directionalRatio);
            gl_FragColor = vec4(u_ObjectId4.xyz * lighting, u_ObjectId4.w);
            
            gl_FragColor = u_ObjectId4;
        }
        `,
    }



    static attributeNames = {
        default: ["a_Theta", "a_Phi"],
        picking: ["a_Theta", "a_Phi"]
    }
    static uniformNames = {
        default: ["u_Color3","u_Position3","u_ABC","u_Radius"],
        picking: ["u_ObjectId4","u_Position3","u_ABC","u_Radius"]
    };

    radius = null;
    segments = {
        horizontal: Ellipsoid.Default.segments.horizontal,
        vertical: Ellipsoid.Default.segments.vertical,
    };
    angle_spans = {
        horizontal: Ellipsoid.Default.angle_spans.horizontal,
        vertical: Ellipsoid.Default.angle_spans.vertical,
    };
    denominators = {
        a: Ellipsoid.Default.denominators.a,
        b: Ellipsoid.Default.denominators.b,
        c: Ellipsoid.Default.denominators.c
    };
    thetas = null;
    phis = null;
    indices = null;
    wires = null;
    regenerate = false;

    constructor(x,y,z,r,a,b,c,color) {
        super(x, y, z, color);
        this.setRadius(r);
        this.setDenominators(a,b,c);
    }

    generateVertices() {
        let shrinkageHorizontal = this.angle_spans.horizontal/TWO_PI,
            shrinkageVertical = this.angle_spans.vertical/PI;

        let verticalSegments = Math.floor(this.segments.vertical * shrinkageVertical),
            horizontalSegments = Math.floor(this.segments.horizontal * shrinkageHorizontal);

        let horizontalAngle_Inc = this.angle_spans.horizontal/horizontalSegments,
            verticalAngle_Inc = this.angle_spans.vertical/verticalSegments;

        let thetas = [],
            phis = [],
            indices = [],
            wires = [];

        for (let i = 0; i <= verticalSegments; ++i) {
            let phi = (i * verticalAngle_Inc);

            let idx0 = i * (horizontalSegments + 1), // start of this (i-th) longitudinal strip
                idx1 = idx0 + horizontalSegments + 1; // beginning of next longitudinal strip

            for (let j = 0; j <= horizontalSegments; ++j, ++idx0, ++idx1) {
                let theta = (j * horizontalAngle_Inc);

                let idx2 = idx0 + 1, // next-index-to-right from idx0
                    idx3 = idx1 + 1; // next-index-to-right from idx1

                thetas.push(theta);
                phis.push(phi);

                wires.push(idx0,idx1);

                if (i !== 0) {
                    indices.push(idx0,idx1,idx2);
                    wires.push(idx0,idx2);
                }
                if (i !== (verticalSegments)) {
                    indices.push(idx2, idx1, idx3);
                }
            }
        }

        this.indices = Uint16Array.from(indices);
        this.wires = Uint16Array.from(wires);
        this.thetas = Float32Array.from(thetas);
        this.phis = Float32Array.from(phis);
        this.buffers = {};
    }

    prepToDraw(app, args) {
        if (this.vertices == null || this.regenerate) {
            this.generateVertices();
            this.regenerate = false;
        }

        let VSHADER, FSHADER, programAlias, uniformNames, attributeNames;
        if (args?.picking) {
            VSHADER = args?.VSHADER ?? Ellipsoid.VSHADERS.picking;
            FSHADER = args?.FSHADER ?? Ellipsoid.FSHADERS.picking;
            programAlias = args?.programAlias ?? Ellipsoid.programAlias+"Picking";
            uniformNames = args?.uniformNames ?? Ellipsoid.uniformNames.picking;
            attributeNames = args?.attributeNames ?? Ellipsoid.attributeNames.picking;
        } else {
            VSHADER = args?.VSHADER ?? Ellipsoid.VSHADERS.default;
            FSHADER = args?.FSHADER ?? Ellipsoid.FSHADERS.default;
            programAlias = args?.programAlias ?? Ellipsoid.programAlias;
            uniformNames = args?.uniformNames ?? Ellipsoid.uniformNames.default;
            attributeNames = args?.attributeNames ?? Ellipsoid.attributeNames.default;
        }

        return super.prepToDraw(
            app,
            programAlias,
            VSHADER,
            FSHADER,
            uniformNames,
            attributeNames
        );
    }

    draw(app, args) {
        let variableLocations = this.prepToDraw(app, args)
        let gl = app.gl;

        // Uniforms
        if (args?.picking) {
            gl.uniform4fv(
                variableLocations["u_ObjectId4"],
                this.IdToColorArray()
            );
        } else {
            gl.uniform3fv(variableLocations["u_Color3"],
                [
                    this.color.r,
                    this.color.g,
                    this.color.b
                ]
            );
        }

        gl.uniform3fv(variableLocations["u_ABC"],[this.denominators.a,this.denominators.b,this.denominators.c]);
        gl.uniform3fv(variableLocations["u_Position3"],[this.position.x,this.position.y,this.position.z]);
        gl.uniform1f(variableLocations["u_Radius"],this.radius);

        // Attributes
        let bufferSettings = {
            bufferType : gl.ARRAY_BUFFER,
            drawMethod : gl.STATIC_DRAW,
            size : 1,
            stride: 0,
            offset: 0,
            normalized: false,
            dataType : gl.FLOAT,
            dataSize: Float32Array.BYTES_PER_ELEMENT,
        }

        Utilities.loadBuffer(gl, "a_Theta", this.thetas, bufferSettings, this.buffers, variableLocations);
        Utilities.loadBuffer(gl, "a_Phi", this.phis, bufferSettings, this.buffers, variableLocations);

        bufferSettings = {
            bufferType: gl.ELEMENT_ARRAY_BUFFER,
            drawMethod: gl.STATIC_DRAW,
        }
        Utilities.loadBuffer(gl, "index", this.indices, bufferSettings, this.buffers);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        if (args?.wireframe) {
            gl.polygonOffset(0.2, 0.2);

            gl.uniform3fv(variableLocations["u_Color3"], [this.color.r / 1.25, this.color.g / 1.25, this.color.b / 1.25]);

            Utilities.loadBuffer(gl, "index_Lines", this.wires, bufferSettings, this.buffers);
            gl.drawElements(gl.LINES, this.wires.length, gl.UNSIGNED_SHORT, 0);

            gl.polygonOffset(0.0, 0.0);
        }
    }

    setDenominators(a,b,c) {
        this.denominators = {
            a: a ?? Ellipsoid.Default.denominators.a,
            b: b ?? Ellipsoid.Default.denominators.b,
            c: c ?? Ellipsoid.Default.denominators.c
        }
        this.regenerate = true;
    }

    setAngleSpans(h, v) {
        this.angle_spans = {
            horizontal : h ?? Ellipsoid.Default.angle_spans.horizontal,
            vertical : v ?? Ellipsoid.Default.angle_spans.vertical,
        };
        this.regenerate = true;
    }

    setSegments(h, v) {
        this.segments = {
            horizontal : h ?? Ellipsoid.Default.segments.horizontal,
            vertical : v ?? Ellipsoid.Default.segments.vertical,
        };
        this.regenerate = true;
    }

    setRadius(radius) {
        this.radius = radius ?? Ellipsoid.Default.radius;
        this.regenerate = true;
    }
}