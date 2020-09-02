var check = require('./type-check.js');
var UNITS = require('./dimensions.js').UNITS;
var QUIESCE_TIMEOUT = 500;
var SCALE_UNITS = ['metric', 'imperial', 'nautical'];

function isValidScaleObject(value) {
    if (!check.isObject(value)) return false;
    if (
        !value.hasOwnProperty('maxWidthPercent') ||
        !value.hasOwnProperty('unit')
    )
        return false;
    if (!check.isNumber(value.maxWidthPercent) || !check.isString(value.unit))
        return false;
    if (value.maxWidthPercent <= 0 || SCALE_UNITS.indexOf(value.unit) === -1)
        return false;
    if (value.maxWidthPercent > 1) value.maxWidthPercent /= 100;
    return true;
}

function calculateMaxSize(map) {
    var maxSize = -1;
    if (map && map.loaded()) {
        var canvas = map.getCanvas();
        var gl = canvas.getContext('experimental-webgl');
        maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    }
    return maxSize;
}

function getDpiForSize(size, map) {
    var maxSize = calculateMaxSize(map);
    if (maxSize <= 0)
        return {
            error: "Couldn't calculate the maximum size of the render buffer"
        };

    return {
        result: maxSize / size.to(UNITS.Inches).value()
    };
}

function calculateMaximumDpi(size, map, dpi) {
    var dpiRes = getDpiForSize(size, map);
    if (dpiRes.error) {
        console.error('Error when calculating dpi for size: ' + dpiRes.error);
        return dpi;
    }
    return dpiRes.result;
}

function waitForMapToRender(map) {
    var noneLoaded = false;
    return new Promise(function(resolve) {
        var quiesce = function() {
            if (
                !noneLoaded ||
                !map.loaded() || !map.isStyleLoaded() || !map.areTilesLoaded()
            ) {
                noneLoaded = true;
                setTimeout(quiesce, QUIESCE_TIMEOUT);
            } else {
                map.off('render', renderListener);
                resolve(map);
            }
        };
        var renderListener = function() {
            noneLoaded = false;
        };
        map.on('render', renderListener);
        quiesce();
    });
}
function addMarkers(map, markers = [], mapboxgl) {
    return new Promise(function(resolve, reject) {
        try {
            markers.forEach(marker => {
                new mapboxgl.Marker({
                    element: marker.getElement().cloneNode(true),
                    anchor: marker._anchor,
                    offset: marker.getOffset(),
                    color: marker._color,
                    draggable: marker.isDraggable()
                })
                    .setLngLat(marker.getLngLat())
                    .addTo(map);
            });
            resolve(map);
        } catch (err) {
            reject(err);
        }
    });
}
function addImages(map, oldMap) {
    return new Promise(function(resolve, reject) {
        try {
            const imageList = oldMap.listImages();
            imageList.forEach(imageId => {
                map.style.addImage(imageId, oldMap.style.getImage(imageId))
            });
            resolve(map);
        } catch (err) {
            reject(err);
        }
    });
}
function addScale(map, scale, mapboxgl) {
    return new Promise(function(resolve, reject) {
        try {
            if (scale) {
                map.addControl(
                    new mapboxgl.ScaleControl({
                        maxWidth:
                            scale.maxWidthPercent * map._container.scrollWidth,
                        unit: scale.unit
                    })
                );
            }
            resolve(map);
        } catch (err) {
            reject(err);
        }
    });
}

function setBounds(map, bounds) {
    return new Promise(function(resolve, reject) {
        try {
            if (bounds) {
                map.fitBounds(bounds);
            }
            resolve(map);
        } catch (err) {
            reject(err);
        }
    });
}

function createPrintMap(map, mapboxgl, container) {
    return new Promise(function(resolve, reject) {
        const options = {
            container: container,
            center: map.getCenter(),
            style: map.getStyle(),
            bearing: map.getBearing(),
            maxZoom: 24,
            pitch: map.getPitch(),
            interactive: false,
            attributionControl: false,
            preserveDrawingBuffer: true
        };
        if (map.getCRS) {
            options.crs = map.getCRS();
        }
        try {
            var renderMap = new mapboxgl.Map(options);
            renderMap.fitBounds(map.getBounds());
            resolve(renderMap);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    calculateMaximumDpi: calculateMaximumDpi,
    createPrintMap: createPrintMap,
    isValidScaleObject: isValidScaleObject,
    addScale: addScale,
    addMarkers: addMarkers,
    addImages: addImages,
    setBounds: setBounds,
    waitForMapToRender: waitForMapToRender
};
