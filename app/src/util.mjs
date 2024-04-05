import * as Projection from "./Projection.mjs";
import * as Lighting from "./Lighting.mjs";

/* --------------------------------------------- WEBGL VARIABLES -----------------------------------------------------*/
export const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;

/* --------------------------------------------- WEBGL FUNCTIONS -----------------------------------------------------*/
/* All vertex shaders will have this as a stem */
const VSHADER_START =
//language=glsl
    `
        precision mediump float;

        uniform mat4 u_ModelViewProjectionMatrix;
        uniform mat4 u_NormalMatrix;

        uniform vec3 u_ambientLight;
        uniform vec3 u_directionalLightColor;
        uniform vec3 u_directionalVector;

        varying vec4 transformedNormal;
    `

/* All fragment shaders will have this as a stem */
const FSHADER_START =
// language=glsl
    `
        precision mediump float;

        uniform vec3 u_ambientLight;
        uniform vec3 u_directionalLightColor;
        uniform vec3 u_directionalVector;

        varying vec4 transformedNormal;
    `

const VSHADER_DEFAULT =
    //language=glsl
    `
        uniform vec3 u_Position3;
        uniform vec3 u_Color3;

        attribute vec3 a_Position3;

        void main() {
            vec4 pos = vec4(a_Position3,1.0);

            gl_Position = u_ProjectionMatrix * u_ModelMatrix * u_ViewMatrix * pos;

            vec3 VertexNormal = normalize(u_Position3 - pos.xyz);
            vec4 transformedNormal = u_NormalMatrix * vec4(VertexNormal, 1.0);
            float directionalRatio = max(dot(transformedNormal.xyz, normalize(u_directionalVector)), 0.0);
            v_Lighting = u_ambientLight + (u_directionalLightColor * directionalRatio);
        }
    `;

const FSHADER_DEFAULT =
    // language=glsl
    `
        uniform vec3 u_Color3;

        void main() {
            gl_FragColor = vec4(u_Color3 * v_Lighting, 1.0);
        }
    `;

/* Modified from webgl-utils.js */

function setupWebGL(canvas, opt_attribs, opt_onError) {
    if (canvas.addEventListener) {
        canvas.addEventListener("webglcontextcreationerror", function() {
            console.log("Unable to create WebGL context for canvas. ")
        }, false);
    }

    let context = create3DContext(canvas, opt_attribs);
    if (!context) {
        if (!window.WebGLRenderingContext) {
            opt_onError("");
        } else {
            opt_onError("");
        }
    }

    return context;
}

/* Modified from webgl-utils.js */
function create3DContext(canvas, opt_attribs) {
    let names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    let context = null;
    for (let i = 0; i < names.length; ++i) {
        try {
            context = canvas.getContext(names[i], opt_attribs);
        } catch(e) {}
        if (context) {
            break;
        }
    }
    return context;
}

export function initializeWebGL(app, clear_color) {
    let gl = setupWebGL(app.canvas);
    app.gl = gl;
    if (app.settings.gl_enable.polygon_offset) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
    }
    if (app.settings.gl_enable.depth_test) {
        gl.enable(gl.DEPTH_TEST);
    }
    if (app.settings.gl_enable.cull_face) {
        gl.enable(gl.CULL_FACE);
        gl.frontFace(gl.CW);
        gl.cullFace(gl.BACK)
    }
    if (app.settings.picking) {
        app = useFrameBuffer(app);
    }
    if (clear_color) {
        gl.clearColor(
            clear_color.r ?? 0.0,
            clear_color.g ?? 0.0,
            clear_color.b ?? 0.0,
            clear_color.a ?? 1.0);
    }
    return app;
}

export function clearRender(gl, depth_test) {
    if (depth_test) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}

export function initializeObjectShaders(gl, shaderAlias, VSHADER_SOURCE, FSHADER_SOURCE) {
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (VSHADER_SOURCE == null) {
        VSHADER_SOURCE = VSHADER_DEFAULT;
        console.error('Specified vertex shader was null. Using default vertex shader.');
    }

    if (FSHADER_SOURCE == null) {
        FSHADER_SOURCE = FSHADER_DEFAULT;
        console.error('Specified fragment shader was null. Using default fragment shader.');
    }

    // Concatenate stems (start + precision checker) with shader code
    VSHADER_SOURCE = VSHADER_START.concat(VSHADER_SOURCE);
    FSHADER_SOURCE = FSHADER_START.concat(FSHADER_SOURCE);

    gl.shaderSource(vertexShader,VSHADER_SOURCE);
    gl.shaderSource(fragmentShader,FSHADER_SOURCE);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS)) {
        console.error('Failed to compile vertex shader: ', gl.getShaderInfoLog(vertexShader));
        return;
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS)) {
        console.error('Failed to compile vertex shader: ', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Failed to link program: ', gl.getProgramInfoLog(program));
        return;
    }

    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error('Failed to validate program:',gl.getProgramInfoLog(program));
    }

    return program;
}

export function handleProjectionAndLighting(app, modelMatrix, projVarLocs, lightVarLocs) {
    Projection.loadProjectionMatrices(app, modelMatrix, projVarLocs);
    Lighting.loadLightingVariables(app.gl, lightVarLocs);
}
export function getVariableLocations(gl, program, uniformNames, attributeNames) {
    let locations = [];
    if (attributeNames) {
        for (let i in attributeNames) {
            locations[attributeNames[i]] = loadAttributeLocation(gl, program, attributeNames[i]);
        }
    }
    if (uniformNames) {
        for (let i in uniformNames) {
            locations[uniformNames[i]] = loadUniformLocation(gl, program, uniformNames[i]);
        }
    }
    return locations;
}
export function loadAttributeLocation(gl, program, name) {
    const attributeLoc = gl.getAttribLocation(program, name);
    if (attributeLoc == null) {
        console.log("Error: Could not retrieve location of "+name+" attribute in shaders.");
    }
    return attributeLoc;
}

export function loadUniformLocation(gl, program, name) {
    const uniformLoc = gl.getUniformLocation(program, name);
    if (uniformLoc == null) {
        console.log("Error: Could not retrieve location of "+name+" uniform in shaders.");
    }
    return uniformLoc;
}

export function loadBuffer(gl, name, data, bufferSettings, bufferCache, variableLocations) {
    // Check if buffer exists in cache, if not, create it
    let buffer = bufferCache[name];
    if (buffer == null) {
        // Create a buffer of bufferType (e.g., GL.ARRAY_BUFFER)
        buffer = gl.createBuffer();
        gl.bindBuffer(bufferSettings.bufferType, buffer);
        // Bind specified data to buffer
        gl.bufferData(bufferSettings.bufferType, data, bufferSettings.drawMethod);
        // Save buffer to cache
        bufferCache[name] = buffer;
    } else {
        gl.bindBuffer(bufferSettings.bufferType,buffer);
    }

    // If it's a vertex attribute buffer, perform corresponding operations
    if (variableLocations) {
        gl.vertexAttribPointer(
            variableLocations[name],
            bufferSettings.size,
            bufferSettings.dataType,
            bufferSettings.normalized,
            bufferSettings.stride * bufferSettings.dataSize,
            bufferSettings.offset * bufferSettings.dataSize
        );
        gl.enableVertexAttribArray(variableLocations[name]);
    }
}

export function setFramebufferAttachmentSizes(app) {
    /* FROM https://webglfundamentals.org/webgl/lessons/webgl-picking.html WITH MODIFICATIONS */

    let gl = app.gl;
    let framebuffer = app.render.frameBuffer;
    if (framebuffer == null) return;

    gl.bindTexture(gl.TEXTURE_2D, app.render.target);
    // define size and format of level 0
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        app.canvas.width, app.canvas.height, border,
        format, type, data);

    gl.bindRenderbuffer(gl.RENDERBUFFER, app.render.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, app.canvas.width, app.canvas.height);
}

export function useFrameBuffer(app) {
    let gl = app.gl;
    /* FROM https://webglfundamentals.org/webgl/lessons/webgl-picking.html WITH MODIFICATIONS */
    // Create a texture to render to
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create a depth renderbuffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const level = 0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

    // make a depth buffer and the same size as the targetTexture
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    app.render = {
        frameBuffer: fb,
        depthBuffer: depthBuffer,
        target: targetTexture,
    }
    setFramebufferAttachmentSizes(app);
    return app;
}

/* -------------------------------------------- UTILITY VARIABLES ----------------------------------------------------*/
export const PI = Math.PI;
export const TWO_PI = PI*2;

/* -------------------------------------------- UTILITY FUNCTIONS ----------------------------------------------------*/

export function distance(pos0, pos1) {
    return Math.sqrt(Math.pow(pos0.x-pos1.x,2)+Math.pow(pos0.y-pos1.y,2)+Math.pow(pos0.z-pos1.z,2));
}

export function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: {
            r = v; g = t; b = p;
            break;
        }
        case 1: {
            r = q; g = v; b = p;
            break;
        }
        case 2: {
            r = p; g = v; b = t;
            break;
        }
        case 3: {
            r = p; g = q; b = v;
            break;
        }
        case 4: {
            r = t; g = p; b = v;
            break;
        }
        case 5: {
            r = v; g = p; b = q;
            break;
        }
    }

    return {
        r: r,
        g: g,
        b: b
    };
}