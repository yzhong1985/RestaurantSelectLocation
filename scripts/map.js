var app = {};

// VALUE1:	Spatial ID
// VALUE2:	# Asian Population, 2016
// VALUE3:	% European Ancestry, 2016
// VALUE4:	% Asian Population, 2016
// VALUE5:	% Black Population, 2016
// VALUE6:	% Hispanic Population, 2016
// VALUE7:	% Other Race Population, 2016
// VALUE8:	% White Population, 2016
var raceField = {
    american: "VALUE9",
    asian: "VALUE5",
    euro: "VALUE4",
    mexican: "VALUE7",
    others: "VALUE8",
    numOfHousehold: "VALUE2",
    medianHouseholdIncome: "VALUE3",
    restaurantIndex: "VALUE11"
};

var raceRepColor = {
    american: "#0054f4",
    asian: "#CD3B00",
    euro: "#f400d7",
    mexican: "#03B300",
    others: "#000000",

};

var raceValueBreak = {
    americanMax: 90,
    americanMin: 35,
    asianMax: 35,
    asianMin: 0,
    euroMax: 15,
    euroMin: 0,
    mexicanMax: 100,
    mexicanMin: 5,
    othersMax: 60,
    othersMin: 0,
};

//var infoTemplateContent = "<span class='restitle'>${name}</span><br><img class='resimg' src='${image_url}'/><br>Estimated Sales: &#36;${location_sales_vol_actual:formatContent}";

var infoTemplateContent = "<table class='infobox-table'><tr><td><a class='infobox-title' href='${yelp_url}'>${name}</a></td></tr> <tr><td><div class='infobox-stars ${yelp_rating:ratingClass}' title='star rating'></div></td></tr> <tr><td><span>${price}</span></td></tr> <tr><td><span>${address1}<br/>${city},${state}&nbsp;${zip_code}</span></td></tr> <tr><td><span class='infobox-tags'>${tags}</span></td></tr></table> <img class='infobox-img' src='${image_url}'/>"

require([
    "dojo/on", "dojo/number", "esri/InfoTemplate", "esri/layers/FeatureLayer", "esri/map",
    "esri/renderers/HeatmapRenderer", "esri/tasks/query", "esri/dijit/Legend",
    "esri/dijit/HomeButton", "esri/renderers/SimpleRenderer", "esri/Color",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleMarkerSymbol","esri/symbols/PictureMarkerSymbol",
    "dojo/domReady!"
], function (on, number, InfoTemplate, FeatureLayer, Map,
             HeatmapRenderer, Query, Legend,
             HomeButton, SimpleRenderer, Color,
             SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, PictureMarkerSymbol) {

    app.map = new Map("map", {
        basemap: "streets",
        zoom: 13,
        center: [-117.6223, 34.0898],
        minZoom: 13,
        maxZoom: 17
    });
    app.map.infoWindow.resize(400, 300);
    app.initRaceLyr = false;
    app.displayBy = "location";
    on(app.map, "load", function () {
        $(document).ready(loadjQuery);
    });

    //setup a home button
    var home = new HomeButton({
        map: app.map
    }, "HomeButton");
    home.startup();

    //setup the content of the popup box in the map
    formatContent = function (value, key, data) {
        return number.format(value, {places: 1, locale: "en-us"});
    };
    ratingClass = function (value, key, data) {
        var ratingCss = "rating-regular-";
        var valueTxt = value.toString();
        valueTxt = valueTxt.replace(".5", "-half");
        ratingCss+= valueTxt;

        return ratingCss;
    };

    var rTemplate = new InfoTemplate("Restaurant Details", infoTemplateContent);
    //restaurants data layer -> use featuremap
    app.dataURL_res = "http://services.arcgis.com/q3Zg9ERurv23iysr/arcgis/rest/services/Restaurants_in_five_cities/FeatureServer/0";
    app.resLayer = new FeatureLayer(app.dataURL_res,{
        infoTemplate:rTemplate,
        outFields: ["*"]
    });
    // app.symbolSelection = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
    //     new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([247, 34, 101, 0.9]), 1), new Color([227, 0, 0, 0.6]));
    app.symbolSelection =  new PictureMarkerSymbol('img/restaurant-2-medium.png', 15, 15);
    app.restSymbol = new PictureMarkerSymbol('img/restaurant-2-medium.png', 15, 15);
    app.resLayer.setSelectionSymbol(app.restSymbol);
    app.resSalesRenderer =new SimpleRenderer(app.restSymbol);
    //app.resLayer.setSelectionSymbol(app.symbolSelection);
    //app.resSalesRenderer =new SimpleRenderer(app.symbolSelection);
    app.resLayer.setRenderer(app.resSalesRenderer);

    //five Cities Race Layer -> use featuremap
    //app.dataURL_race = "http://services.arcgis.com/q3Zg9ERurv23iysr/arcgis/rest/services/Race_Population_Percentage_update/FeatureServer/0";
    app.dataURL_race = "http://services.arcgis.com/q3Zg9ERurv23iysr/arcgis/rest/services/Five_Cities_Demography/FeatureServer/0";
    app.raceLayer = new FeatureLayer(app.dataURL_race);
    app.raceLayer.setOpacity(0.6);
    app.raceRenderer = new SimpleRenderer(new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.3).setColor(new Color([128, 128, 128]))));
    app.raceLegend = new Legend({
        map: app.map,
        layerInfos: [{title: "Percentage of Population", layer: app.raceLayer}]
    }, "legend");

    //add restaurants layer first
    app.map.addLayer(app.resLayer);

    function loadjQuery() {
        bindEvents();
    }

    function bindEvents() {
        $("#basemapSelect").change(basemapChange);
        $("#raceGroupSelect").change(raceGroupChange);
        $("#displayBySelect").change(displayByChange);
        $("#showRaceLayer").change(showRaceLayerChk);
        $("#showAdvanceOptions").change(showAdvance);
    }

    //Event handlers

    function basemapChange(e) {
        var r = e.target.selectedOptions[0];
        app.map.setBasemap(r.value);
    }

    function raceGroupChange(e) {
        if(!app.initRaceLyr){
            var nullSymbol = new SimpleMarkerSymbol().setSize(0);
            app.resLayer.setRenderer(new SimpleRenderer(nullSymbol));
            app.resLayer.refresh();
            app.initRaceLyr = true;
        }

        var r = e.target.selectedOptions[0];
        app.race = r.value;

        var query = new Query();
        if (r.value == "all") {
            query.where = "1=1";
            app.map.removeLayer(app.raceLayer);
            $(".raceLayer").hide(100);
        }
        else {
            query.where = "tags LIKE '%" + app.race + "%'";
            $(".raceLayer").show(100);
        }

        app.resLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, selectFeatures, errorHandler);
        $("#legend").html("");

        if (app.displayRaceLyr) {
            changeRace(app.race);
        }
    }

    function displayByChange(e) {
        var r = e.target.selectedOptions[0];
        app.displayBy = r.value;
        if (r.value == "sales") {
            app.resSalesRenderer.setSizeInfo({
                field: "location_sales_vol_actual",
                minSize: 6,
                maxSize: 36,
                minDataValue: 100000,
                maxDataValue: 5000000,
                valueUnit: "$"
            });
            app.resLayer.setRenderer(app.resSalesRenderer);
            app.resLayer.refresh();
        }
        else {
            app.resLayer.setRenderer(new SimpleRenderer(app.symbolSelection));
            app.resLayer.refresh();
        }
    }

    function showRaceLayerChk(e) {
        var chk = e.target.checked;
        if (!chk) {
            app.displayRaceLyr = false;
            app.map.removeLayer(app.raceLayer);
            $("#legend").html("");
        }
        else {
            app.displayRaceLyr = true;
            changeRace(app.race);
        }
    }

    function changeRace(race) {
        var field, minV, maxV, colorHex;
        if (race == "american") {
            field = raceField.american;
            minV = raceValueBreak.americanMin;
            maxV = raceValueBreak.americanMax;
            colorHex = raceRepColor.american;
        }
        else if (race == "asian") {
            field = raceField.asian;
            minV = raceValueBreak.asianMin;
            maxV = raceValueBreak.asianMax;
            colorHex = raceRepColor.asian;
        }
        else if (race == "european") {
            field = raceField.euro;
            minV = raceValueBreak.euroMin;
            maxV = raceValueBreak.euroMax;
            colorHex = raceRepColor.euro;
        }
        else if (race == "mexican") {
            field = raceField.mexican;
            minV = raceValueBreak.mexicanMin;
            maxV = raceValueBreak.mexicanMax;
            colorHex = raceRepColor.mexican;
        }
        else if (race == "others") {
            field = raceField.others;
            minV = raceValueBreak.othersMin;
            maxV = raceValueBreak.othersMax;
            colorHex = raceRepColor.others;
        }
        else {
            return;
        }

        app.raceRenderer.setColorInfo({
            field: field,
            minDataValue: minV,
            maxDataValue: maxV,
            colors: [
                new Color.fromHex("#ffffff"),
                new Color.fromHex(colorHex)
            ]
        });
        // Reset layer by removing it and adding it back
        app.raceLayer.setRenderer(app.raceRenderer);
        app.map.removeLayer(app.raceLayer);
        app.map.addLayer(app.raceLayer, 0);
        app.raceLegend.startup();
    }

    function errorHandler(err) {
        console.log("error: ", JSON.stringify(err));
    }

    function selectFeatures(r) {
        console.log(r);
    }

    function showAdvance(e) {
        $("#advanceOptDiv").slideToggle(100);
    }
});


