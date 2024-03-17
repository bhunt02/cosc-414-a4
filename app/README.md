App Module

* `glMatrix/` 
  * Library for Matrix and Vector math (cited below)
* `app/`
  * `index.mjs`: Centralized module for imports of the declared JavaScript modules.
  * `Projection.mjs`: Projection (matrix) operations and variables.
  * `Lighting.mjs`: Lighting operations and variables.
  * `util.mjs`: Miscellaneous operations; mostly WebGL configuration.
  * `app/Classes/`
    * `App.mjs`: Holds the configuration variables of the game application.
    * `app/Classes/Objects/`
      * `BaseObject.mjs`: Base class for objects with static and property variables for usage in designing objects prior to rendering.
      * `Ellipsoid.mjs`: Base class for ellipsoid objects - e.g., Spheres. Designs the vertices of such objects (citation below).
      * `Sphere.mjs`: Basic Sphere class, extends ellipsoid class.
      * `Hemisphere.mjs`: Designs a half-ellipsoid extends ellipsoid class.
      * `Bacterium.mjs`: Designs a dynamic displayable bacterium object used in the game. Aligns to a given normal vector passed to it on initializion. (citation below). Extends the ellipsoid class.

Citations
* Align object to vector:
  * https://stackoverflow.com/a/10923592
  * `Used in: ./app/src/Classes/Objects/Bacterium.mjs`
* OpenGL Sphere
  * https://www.songho.ca/opengl/gl_sphere.html#webgl_sphere
  * `Used in: ./app/src/Classes/Objects/Ellipsoid.mjs (altered)`
* glMatrix Module Source
  * https://glmatrix.net/
  * `Used in: ./app/src/Projection, ./app/src/Classes/App, ./app/src/Classes/Objects/{BaseObject, Bacterium}`
* HSV to RGB Color Conversion
  * https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
  * `Used in: ./app/src/util.mjs`
* webgl-utils.js
  * Course library
  * `Used in ./app/src/util.mjs (altered)`
* cuon-utils.js
  * Course library
  * `Used in ./app/src/util.mjs (altered)`
* WebGL Object Picking
  * https://webglfundamentals.org/webgl/lessons/webgl-picking.html
  * `Used in: ./app/src/util.mjs (altered)`