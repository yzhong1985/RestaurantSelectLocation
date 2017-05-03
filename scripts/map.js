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

var raceLegendText = {
    american: "Black & White %",
    asian: "Asian %",
    euro: "European Ancestry %",
    mexican: "Hispanic %",
    others: "Other Race %",
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
    americanMin: 0,
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

var infoTemplateContent = "<table class='infobox-table'><tr><td><a class='infobox-title' href='${yelp_url}'>${name}</a></td></tr> <tr><td><div class='infobox-stars ${yelp_rating:ratingClass}' title='star rating'></div></td></tr> <tr><td><span>${price}</span></td></tr> <tr><td><span>${address1}<br/>${city},${state}&nbsp;${zip_code}</span></td></tr> <tr><td><span class='infobox-tags'>${tags}</span></td></tr></table> <img class='infobox-img' src='${image_url}'/><table class='infobox2-table'><tr><td colspan='2' class='toptitle'>Business Information</td></tr><tr><td class='infotitle'># Employees:</td><td><span>${location_emp_size_actual}</span></td></tr><tr><td class='infotitle'>Location Sqt:</td><td><span>${sqt_footage}</span></td></tr><tr><td class='infotitle'>Location Sales Volume:</td><td><span>&#36;${location_sales_vol_actual:formatContent}</span></td></tr><tr><td class='infotitle'>Est.Annual Rent:</td><td><span>&#36;${rent_expense_avg_val:formatContent}</span></td></tr><tr><td class='infotitle'>Est.Annual Payroll:</td><td><span>&#36;${payroll_expense_avg_val:formatContent}</span></td></tr><tr><td class='infotitle'>Est.Profit:</td><td><span>&#36;${est_profit:formatContent}</span></td></tr></table>";

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
        basemap: "topo",
        zoom: 13,
        center: [-117.6223, 34.0898],
        minZoom: 13,
        maxZoom: 17
    });
    app.map.infoWindow.resize(400, 350);
    app.initRaceLyr = false;
    app.displayBy = "location";
    app.query = new Query();
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
        return number.format(value, {places: 0, locale: "en-us"});
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
    app.symbolSelection =  new PictureMarkerSymbol('img/restaurant-2-medium.png', 18, 18);
    app.restSymbol = new PictureMarkerSymbol('img/restaurant-2-medium.png', 18, 18);
    app.resLayer.setSelectionSymbol(app.restSymbol);
    app.resSalesRenderer =new SimpleRenderer(app.restSymbol);
    //app.resLayer.setSelectionSymbol(app.symbolSelection);
    //app.resSalesRenderer =new SimpleRenderer(app.symbolSelection);
    app.resLayer.setRenderer(app.resSalesRenderer);

    app.profitSymbol = new SimpleMarkerSymbol();
    app.profitSymbol.setColor(new Color([227,139,79,0.85]));
    app.profitSymbol.outline.setColor(new Color([255,255,255,1.0]));
    app.profitSymbolRenderer = new SimpleRenderer(app.profitSymbol);
    app.profitSymbolRenderer.setSizeInfo({
        field: "est_profit",
        minDataValue: 100000,
        maxDataValue: 1500000,
        minSize: 15,
        maxSize: 50,
        valueUnit: "$",
    });

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
        $('#showDlayerSelect').change(changeDLayer);
        $('#displayByRestSize').change(restSizeChange);
        $('#displayByEmployeeSize').change(numEmpChange);
        $('#displayByRent').change(rentAvgChange);
        $('#restIndxBtn').on("click",showRestIdxIntro);
        $('.closeRestIndx').on("click",closeRestIdxIntro);
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

        if (r.value == "all") {
            app.query.where = "1=1";
            app.map.removeLayer(app.raceLayer);
            $(".raceLayer").hide(100);
        }
        else {
            //app.query.where = "tags LIKE '%" + app.race + "%'";
            app.query.where = buildSQLwhere();
            $(".raceLayer").show(100);
        }

        app.resLayer.selectFeatures(app.query, FeatureLayer.SELECTION_NEW, selectFeatures, errorHandler);
        $("#legend").html("");

        if (app.displayRaceLyr) {
            changeRace(app.race);
        }
    }

    function buildSQLwhere() {
        var finalsql="", racesql="", sqftsql="", numEmpsql="", rentsql="";
        if(app.race=="all" || app.race==null){
            racesql = "1=1";
        }else{
            racesql = "tags LIKE '%" + app.race + "%'";
        }

        if(app.sqft != "0" && app.sqft != null){
            sqftsql = " AND sqt_footage = '"+ app.sqft +"'";
        }

        if(app.numEmp != "0" && app.numEmp != null){
            numEmpsql = " AND (location_emp_size_actual "+ getNumEmpSql(app.numEmp) +")";
        }

        if(app.rentavg !="0"  && app.rentavg != null){
            rentsql = " AND (rent_expense_avg_val "+ getRentAvgSql(app.rentavg) +")";
        }

        finalsql = racesql + sqftsql + numEmpsql + rentsql;
        console.log(finalsql);

        return finalsql;
    }

    function getRentAvgSql(val){
        var s = ">0";
        if(val=="1"){
            s = "<10000";
        }
        else if(val=="2"){
            s = "BETWEEN 10000 AND 25000";
        }
        else if(val=="3"){
            s = "BETWEEN 25001 AND 50000";
        }
        else if(val=="4"){
            s = "BETWEEN 50001 AND 100000";
        }
        else if(val=="5"){
            s = "BETWEEN 100001 AND 250000";
        }
        else if(val=="6"){
            s = "BETWEEN 250001 AND 500000";
        }
        else if(val=="7"){
            s = "> 500000";
        }
        return s;
    }

    function getNumEmpSql(val){
        var s = ">0";
        if(val=="1"){
            s = "BETWEEN 0 AND 9";
        }
        else if(val=="2"){
            s = "BETWEEN 10 AND 29";
        }
        else if(val=="3"){
            s = "BETWEEN 30 AND 59";
        }
        else if(val=="4"){
            s = "BETWEEN 60 AND 119";
        }
        else if(val=="5"){
            s = "> 120";
        }
        return s;
    }

    function displayByChange(e) {
        var r = e.target.selectedOptions[0];
        app.displayBy = r.value;
        if (r.value == "profit") {
            app.resLayer.setSelectionSymbol(app.profitSymbol);
            app.resLayer.setRenderer(app.profitSymbolRenderer);
            app.resLayer.refresh();
        }
        else {
            app.resLayer.setSelectionSymbol(app.restSymbol);
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
        var field, minV, maxV, colorHex, legendTxt;
        if (race == "american") {
            field = raceField.american;
            minV = raceValueBreak.americanMin;
            maxV = raceValueBreak.americanMax;
            colorHex = raceRepColor.american;
            legendTxt = raceLegendText.american;
        }
        else if (race == "asian") {
            field = raceField.asian;
            minV = raceValueBreak.asianMin;
            maxV = raceValueBreak.asianMax;
            colorHex = raceRepColor.asian;
            legendTxt = raceLegendText.asian;
        }
        else if (race == "european") {
            field = raceField.euro;
            minV = raceValueBreak.euroMin;
            maxV = raceValueBreak.euroMax;
            colorHex = raceRepColor.euro;
            legendTxt = raceLegendText.euro;
        }
        else if (race == "mexican") {
            field = raceField.mexican;
            minV = raceValueBreak.mexicanMin;
            maxV = raceValueBreak.mexicanMax;
            colorHex = raceRepColor.mexican;
            legendTxt = raceLegendText.mexican;
        }
        else if (race == "others") {
            field = raceField.others;
            minV = raceValueBreak.othersMin;
            maxV = raceValueBreak.othersMax;
            colorHex = raceRepColor.others;
            legendTxt = raceLegendText.others;
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
        //update legend text
        updateLegendText(legendTxt);
    }

    function restSizeChange(e) {

        var nullSymbol = new SimpleMarkerSymbol().setSize(0);
        app.resLayer.setRenderer(new SimpleRenderer(nullSymbol));
        app.resLayer.refresh();
        app.initRaceLyr = true;

        var r = e.target.selectedOptions[0];
        app.sqft = r.value;
        app.query.where = buildSQLwhere();
        app.resLayer.selectFeatures(app.query, FeatureLayer.SELECTION_NEW, selectFeatures, errorHandler);
    }

    function numEmpChange(e) {
        if(!app.initRaceLyr){
            var nullSymbol = new SimpleMarkerSymbol().setSize(0);
            app.resLayer.setRenderer(new SimpleRenderer(nullSymbol));
            app.resLayer.refresh();
            app.initRaceLyr = true;
        }

        var r = e.target.selectedOptions[0];
        app.numEmp = r.value;
        app.query.where = buildSQLwhere();
        app.resLayer.selectFeatures(app.query, FeatureLayer.SELECTION_NEW, selectFeatures, errorHandler);
    }

    function rentAvgChange(e) {
        if(!app.initRaceLyr){
            var nullSymbol = new SimpleMarkerSymbol().setSize(0);
            app.resLayer.setRenderer(new SimpleRenderer(nullSymbol));
            app.resLayer.refresh();
            app.initRaceLyr = true;
        }
        var r = e.target.selectedOptions[0];
        app.rentavg = r.value;
        app.query.where = buildSQLwhere();
        app.resLayer.selectFeatures(app.query, FeatureLayer.SELECTION_NEW, selectFeatures, errorHandler);
    }

    function updateLegendText(legendTxt) {
        $("table.esriLegendLayer td table td").text(legendTxt);
    }

    function errorHandler(err) {
        console.log("error: ", JSON.stringify(err));
    }

    function selectFeatures(r) {
        updateNumDisplayed(r.length);
    }

    function changeDLayer(e) {
        var r = e.target.selectedOptions[0];
        if(r.value == "none"){
            app.displayRaceLyr = false;
            app.map.removeLayer(app.raceLayer);
            $("#legend").html("");
        }
        else{
            app.displayRaceLyr = true;
            $("#legend").html("");
            showDLayer(r.value);
        }
    }

    function showDLayer(val) {
        var fieldVal = "";
        var dataColor = "";
        var legendTxt = "";
        var mindata=0;
        var maxdata=100;

        if(val == "rest-index"){
            fieldVal = "VALUE11";
            dataColor = "#551a8b";
            legendTxt = "Restaurant Index Score";
            mindata = 45;
            maxdata = 190;
        }
        else if(val=="num-household"){
            fieldVal = "VALUE2";
            dataColor = "#fbbc02";
            legendTxt = "Number of Household";
            mindata = 200;
            maxdata = 1500;
        }
        else if(val=="m-income"){
            fieldVal = "VALUE3";
            dataColor = "#ea4335";
            legendTxt = "Median Income";
            mindata = 30000;
            maxdata = 150000;
        }
        else{
            return;
        }

        app.raceRenderer.setColorInfo({
            field: fieldVal,
            minDataValue: mindata,
            maxDataValue: maxdata,
            colors: [
                new Color.fromHex("#ffffff"),
                new Color.fromHex(dataColor)
            ]
        });
        // Reset layer by removing it and adding it back
        app.raceLayer.setRenderer(app.raceRenderer);
        app.map.removeLayer(app.raceLayer);
        app.map.addLayer(app.raceLayer, 0);
        app.raceLegend.startup();
        updateLegendText(legendTxt);
    }

    function showRestIdxIntro(e) {
        console.log("tt");
        if($(this).hasClass('selected')) {
            deselect($(this));
        } else {
            $(this).addClass('selected');
            $('.messagepop').slideFadeToggle();
        }
        return false;
    }

    function closeRestIdxIntro(e) {
        deselect($('#restIndxBtn'));
        return false;
    }

    function updateNumDisplayed(num) {
        var displaytxt = "";
        if(num==0){
            displaytxt = "No restaurant found";
        }
        else if(num==1) {
            displaytxt = '1 Restaurant displayed';
        }
        else{
            displaytxt =  num +' Restaurants displayed';
        }
        $('#numOfResult').text(displaytxt);
    }

    function deselect(e) {
        $('.messagepop').slideFadeToggle(function() {
            e.removeClass('selected');
        });
    }
    
});



$.fn.slideFadeToggle = function(easing, callback) {
    return this.animate({ opacity: 'toggle', height: 'toggle' }, 'fast', easing, callback);
};

