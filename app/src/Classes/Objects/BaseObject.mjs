import {mat4} from "../../../glMatrix/src/index.js";
import * as Utilities from "../../util.mjs";
import * as Projection from "../../Projection.mjs";
import * as Lighting from "../../Lighting.mjs";

export class BaseObject {
    static programAlias = "Object";
    static Objects = [];
    index = null;
    position = null;
    color = null;
    buffers = {};
    ModelMatrix = mat4.create();

    static variableLocations = [];
    static projectionLocations = [];
    static lightingLocations = [];

    constructor(x, y, z, color) {
        BaseObject.Objects.push(this);
        this.index = BaseObject.Objects.length;
        this.setPositionXYZ(x,y,z);
        this.setColor(color);
    }

    static drawObjects(app, args) {
        BaseObject.Objects.forEach((object) => {
            object.draw(app, args);
        })
    }

    IdToColorArray() {
        let id = this.index+1;
        return [
            ((id >> 0) & 0xFF) / 0xFF,
            ((id >> 8) & 0xFF) / 0xFF,
            ((id >> 16) & 0xFF) / 0xFF,
            ((id >> 24) & 0xFF) / 0xFF,
        ];
    }

    prepToDraw(app, programAlias, VSHADER, FSHADER, uniformNames, attribNames) {
        if (app.programs[programAlias] == null) {
            app.programs[programAlias] = Utilities.initializeObjectShaders(
                app.gl,
                programAlias,
                VSHADER,
                FSHADER
            );
        }

        let newProgram = false;
        if (app.program !== app.programs[programAlias]) {
            app.useProgram(programAlias);
            newProgram = true;
        }

        if (newProgram) {
            BaseObject.variableLocations[programAlias] ??= Utilities.getVariableLocations(
                app.gl,
                app.program,
                uniformNames,
                attribNames
            );

            BaseObject.projectionLocations[programAlias]  ??=  Utilities.getVariableLocations(
                app.gl,
                app.program,
                Projection.projectionMatrixNames
            );

            BaseObject.lightingLocations[programAlias]  ??= Utilities.getVariableLocations(
                app.gl,
                app.program,
                Lighting.lightingUniformNames
            );
        }

        Utilities.handleProjectionAndLighting(
            app,
            this.ModelMatrix,
            BaseObject.projectionLocations[programAlias],
            BaseObject.lightingLocations[programAlias]
        );

        return BaseObject.variableLocations[programAlias];
    }

    setColor(color) {
        if (color == null) {
            this.color = {
                r: 1.0,
                g: 1.0,
                b: 1.0,
                a: 1.0
            };
            return;
        }
        this.color = color;
    }

    setPositionXYZ(x,y,z) {
        this.position = {
            x: x ?? 0.0,
            y: y ?? 0.0,
            z: z ?? 0.0
        }
    }

    setPosition(position) {
        if (position == null) {
            this.setPositionXYZ(0,0,0);
            return;
        }
        this.position = position;
    }

    setColorHSV(h, s, v) {
        this.color = Utilities.HSVtoRGB(h ?? 1.0, s ?? 1.0, v ?? 1.0);
    }

    setColorRGB(r, g, b) {
        this.position = {
            r: r ?? 0.0,
            g: g ?? 0.0,
            b: b ?? 0.0,
            a: 1.0
        }
    }
}

