/* -------------------------------------------- LIGHTING VARIABLES ---------------------------------------------------*/

let lightingVarLocations;
export const lightingUniformNames = ["u_ambientLight","u_directionalLightColor","u_directionalVector"];
export const lightingUniformValues = {
    "u_ambientLight" : [0.3, 0.3, 0.3],
    "u_directionalLightColor" : [1, 1, 1],
    "u_directionalVector" : [0, 5, 2]
}

/* -------------------------------------------- LIGHTING FUNCTIONS ---------------------------------------------------*/

export function loadLightingVariables(gl, varLocations) {
    for (let i in lightingUniformNames) {
        let uniName = lightingUniformNames[i];
        gl.uniform3fv(varLocations[uniName],lightingUniformValues[uniName]);
    }
}