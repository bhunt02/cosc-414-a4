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
            VERTICAL: PI,
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
        
        attribute vec3 a_Position3;
        attribute vec3 a_Normal3;
        
        void main() {
            vec4 pos = vec4(
                a_Position3,
                1.0
            );
            
            gl_Position = u_ModelViewProjectionMatrix * pos;
    
            gl_PointSize = 10.0;
            
            vec4 transformedNormal = u_NormalMatrix * vec4(a_Normal3, 1.0);
            float directionalRatio = max(dot(transformedNormal.xyz, normalize(u_directionalVector)), 0.0);
            v_Lighting = u_ambientLight + (u_directionalLightColor * directionalRatio);
        }
        `,
        picking : //language=glsl
        `
        uniform vec4 u_ObjectId4;
        
        attribute vec3 a_Position3;
        attribute vec3 a_Normal3;
        
        void main() {
            vec4 pos = vec4(
                a_Position3,
                1.0
            );
            
            gl_Position = u_ModelViewProjectionMatrix * pos;
    
            gl_PointSize = 10.0;

            vec4 transformedNormal = u_NormalMatrix * vec4(a_Normal3, 1.0);
            float directionalRatio = max(dot(transformedNormal.xyz, normalize(u_directionalVector)), 0.0);
            v_Lighting = u_ambientLight + (u_directionalLightColor * directionalRatio);
            v_Lighting = vec3(1,1,1);
        }
        `,
    }

    static FSHADERS = {
        default: //language=glsl
        `
        uniform vec3 u_Color3;

        void main() {
            gl_FragColor = vec4(u_Color3.xyz * v_Lighting, 1.0);
        }
        `,
        picking: //language=glsl
        `
        uniform vec4 u_ObjectId4;
        
        void main() {
            gl_FragColor = vec4(u_ObjectId4.xyz * v_Lighting, u_ObjectId4.w);
            gl_FragColor = u_ObjectId4;
        }
        `,
    }



    static attributeNames = {
        default: ["a_Position3", "a_Normal3"],
        picking: ["a_Position3", "a_Normal3"]
    }
    static uniformNames = {
        default: ["u_Color3"],
        picking: ["u_ObjectId4"]
    };

    radius = null;
    segments = {
        horizontal: 60,
        vertical: 60,
    };
    angle_spans = {
        horizontal: TWO_PI,
        vertical: PI,
    };
    denominators = {
        a: 1.0,
        b: 1.0,
        c: 1.0
    };
    vertices = null;
    normals = null;
    indices = null;
    wires = null;
    regenerate = false;

    constructor(x,y,z,r,a,b,c,color) {
        super(x, y, z, color);
        this.setRadius(r);
        this.setDenominators(a,b,c);
    }

    generateVertices() {
        let verticalSegments = this.segments.vertical,
            horizontalSegments = this.segments.horizontal;
        let horizontalAngle_Inc = this.angle_spans.horizontal/horizontalSegments,
            verticalAngle_Inc = this.angle_spans.vertical/verticalSegments;

        let vertices = [],
            normals = [],
            indices = [],
            wires = [];

        for (let i = 0; i <= verticalSegments; ++i) {
            let phi = (i * verticalAngle_Inc);

            let idx0 = (i * horizontalSegments), // start of this (i-th) longitudinal strip
                idx1 = idx0 + horizontalSegments + 1; // beginning of next longitudinal strip

            for (let j = 0; j <= horizontalSegments; ++j, ++idx0, ++idx1) {
                let theta = (j * horizontalAngle_Inc);

                let idx2 = idx0 + 1, // next-index-to-right from idx0
                    idx3 = idx1 + 1; // next-index-to-right from idx1

                let z = (this.radius * Math.sin(phi) * Math.cos(theta))/this.denominators.a,
                    x = (this.radius * Math.sin(phi) * Math.sin(theta))/this.denominators.b,
                    y = (this.radius * Math.cos(phi))/this.denominators.c;

                normals.push(x,y,z);

                vertices.push(
                    (x+this.position.x),
                    (y+this.position.y),
                    (z+this.position.z)
                );

                wires.push(idx0,idx1);

                if (i !== 0) {
                    indices.push(idx0,idx1,idx2);
                    wires.push(idx0,idx2);
                }
                if (i !== verticalSegments) {
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

        // Attributes
        let bufferSettings = {
            bufferType : gl.ARRAY_BUFFER,
            drawMethod : gl.STATIC_DRAW,
            size : 3,
            stride: 3,
            offset: 0,
            normalized: false,
            dataType : gl.FLOAT,
            dataSize: Float32Array.BYTES_PER_ELEMENT,
        }

        Utilities.loadBuffer(gl, "a_Position3", this.vertices, bufferSettings, this.buffers, variableLocations);
        bufferSettings.normalized = true;
        Utilities.loadBuffer(gl, "a_Normal3", this.normals, bufferSettings, this.buffers, variableLocations);

        bufferSettings = {
            bufferType: gl.ELEMENT_ARRAY_BUFFER,
            drawMethod: gl.STATIC_DRAW,
        }
        Utilities.loadBuffer(gl, "index", this.indices, bufferSettings, this.buffers);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        if (args?.wireframe) {
            gl.polygonOffset(0.2, 0.2);

            gl.uniform3fv(variableLocations["u_Color3"], [this.color.r / 2, this.color.g / 2, this.color.b / 2]);

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