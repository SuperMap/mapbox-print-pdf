var mapPrint = require('../../js/mapbox-print-pdf.js');
require('@webcomponents/template');
var map;

function setFormat(builder) {
    var format = $('#formatInp').val();
    if (format != '') builder.format(format);
}

function setDPI(builder) {
    var dpi = parseInt($('#dpiInp').val());
    if (!isNaN(dpi) && dpi > 0) builder.dpi(dpi);
}

function setOrientation(builder) {
    var orientation = $('#orientationInp').val();
    if (orientation === 'l') builder.landscape();
}

function setHeader(builder) {
    var header = $('#headerHtmlInp').val();
    if (header == null || header.trim() === '') return;
    var height = parseInt($('#headerHeightInp').val());
    if (height < 1) return;
    var heightUnit = $('#headerHeightUnitInp').val();
    var baseline = $('#headerBaselineFormatInp').val();
    if (baseline.trim() == '') return;
    var orientation = $('#headerBaselineOrientationInp').val();
    builder.header({
        html: header,
        height: {
            value: height,
            unit: heightUnit
        },
        baseline: {
            format: baseline,
            orientation: orientation
        }
    });
}

function setFooter(builder) {
    var footer = $('#footerHtmlInp').val();
    if (footer == null || footer.trim() === '') return;
    var height = parseInt($('#footerHeightInp').val());
    if (height < 1) return;
    var heightUnit = $('#footerHeightUnitInp').val();
    var baseline = $('#footerBaselineFormatInp').val();
    if (baseline.trim() == '') return;
    var orientation = $('#footerBaselineOrientationInp').val();
    builder.footer({
        html: footer,
        height: {
            value: height,
            unit: heightUnit
        },
        baseline: {
            format: baseline,
            orientation: orientation
        }
    });
}

function setScaleControl(builder) {
    var maxWidth = parseInt($('#scaleMaxWidthInp').val());
    if (isNaN(maxWidth) || maxWidth <= 0) return;
    var unit = $('#scaleUnitInp').val();
    builder.scale({ maxWidthPercent: maxWidth, unit: unit });
}

function getMargin(id) {
    var val = parseInt($('#' + id).val());
    return isNaN(val) || val < 0 ? 0 : val;
}

function setMargins(builder) {
    var obj = {
        top: getMargin('marginTopInp'),
        right: getMargin('marginRightInp'),
        bottom: getMargin('marginBottomInp'),
        left: getMargin('marginLeftInp')
    };
    builder.margins(obj, $('#marginUnitInp').val());
}
function displayPdf(pdf) {
    pdf.save('map.pdf');
}

function showProgress() {
    $('#progressModal').modal('show');
}

function hideProgress() {
    $('#progressModal').modal('hide');
}
function printMap(e) {
    e.preventDefault();

    showProgress();

    var builder = mapPrint.build();
    setFormat(builder);
    setDPI(builder);
    setOrientation(builder);
    setHeader(builder);
    setFooter(builder);
    setScaleControl(builder);
    setMargins(builder);
    builder
        .print(map, mapboxgl)
        .then(displayPdf)
        .then(hideProgress);
}
$(function() {
    map = new mapboxgl.Map({
        container: 'map',
        style:
            'https://iserver.supermap.io/iserver/services/map-jingjin/rest/maps/%E4%BA%AC%E6%B4%A5%E5%9C%B0%E5%8C%BA%E5%9F%8E%E9%95%87%E5%B7%A5%E7%9F%BF%E7%94%A8%E5%9C%B0%E8%A7%84%E6%A8%A1%E6%8E%A7%E5%88%B6%E5%9B%BE/tileFeature/vectorstyles.json?type=MapBox_GL&styleonly=true&tileURLTemplate=ZXY',
        crs: 'EPSG:4326',
        center: [117, 40],
        zoom: 6
    });
    map.on('load', function() {
        //从 iServer 查询
        var idsParam = new SuperMap.GetFeaturesByIDsParameters({
            IDs: [247],
            datasetNames: ['World:Countries']
        });
        var service = new mapboxgl.supermap.FeatureService(
            'https://iserver.supermap.io/iserver/services/data-world/rest/data'
        );
        map.addLayer(
            {
                id: 'simple-tiles',
                type: 'raster',
                source: {
                    type: 'raster',
                    tileSize: 256,
                    tiles: [
                        'https://iserver.supermap.io/iserver/services/map-world/rest/maps/World'
                    ],
                    rasterSource: 'iserver'
                },
                minzoom: 0,
                maxzoom: 22
            },
            'Neighbor_R@Jingjin#1'
        );
        service.getFeaturesByIDs(idsParam, function(serviceResult) {
            map.addSource('queryDatas', {
                type: 'geojson',
                data: serviceResult.result.features
            });
            map.addLayer(
                {
                    id: 'queryDatas',
                    type: 'fill',
                    source: 'queryDatas',
                    paint: {
                        'fill-color': '#008080',
                        'fill-opacity': 0.4
                    },
                    filter: ['==', '$type', 'Polygon']
                },
                'Neighbor_R@Jingjin#1'
            );
        });
    });
    new mapboxgl.Marker().setLngLat([117, 40]).addTo(map);
    $('#progressModal').modal({
        backdrop: 'static',
        keyboard: false,
        show: false
    });
    $('#printForm').on('submit', printMap);
});
