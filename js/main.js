///
var callbacks = {};
///
var provider = null;
/// Google map
var map = null;
/// Input timer
var input_timer = null;
/// POI`s
var pois_hash = null;
/// Geozones
var geozones_hash = null;
/// Path
var path = null;
/// Markers
var markers = [];
/// Ordered path
var ordered_path = null;
/// Ordered data
var ordered_data = null;
/// Last focused input
var last_focused = "";
/// Async points counter
var points_pending = 0;
/// Async points counter(imutable)
var points_pending_total = 0;
/// Directions data
var directions_data = {directions: [], renderers: []};
///
var LANG = "";
/// Execute callback
function exec_callback(id) {
	if (!callbacks[id])
		return;
	callbacks[id].call();
}
/// Wrap callback
function wrap_callback(callback) {
	var id = (new Date()).getTime();
	callbacks[id] = callback;
	return id;
}
/// IE check
function ie() {
	return (navigator.appVersion.indexOf("MSIE 6") != -1 || navigator.appVersion.indexOf("MSIE 7") != -1 || navigator.appVersion.indexOf("MSIE 8") != -1);
}
/// Fetch varable from 'GET' request
function get_html_var(name) {
	if (!name)
		return null;
	var pairs = decodeURIComponent(document.location.search.substr(1)).split("&");
	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i].split("=");
		if (pair[0] == name) {
			pair.splice(0, 1);
			return pair.join("=");
		}
	}
	return null;
}
/// Format time
function add_zero (i) {
	return (i < 10) ? (i = "0" + i) : i;
}
///
var DAYS = [];
function time_format (time) {
	var nweek = Math.floor(time / (86400 * 7));
	var index = Math.floor((time % (86400 * 7)) / (86400));
	var day = DAYS[index];
	var hour = Math.floor((time % 86400) / 3600);
	var minute = Math.floor((time % 86400) % 3600 / 60);
	if (nweek === 0) {
		return wialon.util.String.sprintf("%s %s:%s", day, add_zero(hour), add_zero(minute));
	} else {
		return wialon.util.String.sprintf("%s %s %s %s:%s", nweek, $.localise.tr("weeks"), day, add_zero(hour), add_zero(minute));
	}
}
///
function stime (time) {
	var hour = Math.floor(time / 3600);
	var minute = Math.floor((time % 3600) / 60);
	return wialon.util.String.sprintf("%s %s %s %s", add_zero(hour), $.localise.tr("h"), add_zero(minute), $.localise.tr("m"));
}
/// Create Gurtam map
function create_gurtam_map() {
	function webgisMapType() {}
	webgisMapType.prototype.tileSize = new google.maps.Size(256, 256);
	webgisMapType.prototype.maxZoom = 17;
	webgisMapType.prototype.minZoom = 4;
	webgisMapType.prototype.name = "Gurtam";
	webgisMapType.prototype.alt = "Gurtam";
	webgisMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
		var url = wialon.core.Session.getInstance().getBaseGisUrl()  + "/gis_render/" + coord.x + "_" + coord.y + "_" + (this.maxZoom - zoom) + "/tile.png";
		var img = ownerDocument.createElement("IMG");
		img.src = url;
		img.style.width = this.tileSize.width + "px";
		img.style.height = this.tileSize.height + "px";
		img.style.border = "0px";
		return img;
	};
	map.mapTypes.set("gurtam_maps", new webgisMapType());
}
/// Load script
function load_script(src, callback) {
	var script = document.createElement("script");
	script.setAttribute("type","text/javascript");
	script.setAttribute("charset","UTF-8");
	script.setAttribute("src", src);
	if (callback && typeof callback == "function") {
		var id = wrap_callback(callback);
		if (ie())
			script.onreadystatechange = function () {
				if (this.readyState == 'complete' || this.readyState == 'loaded')
					callback();
			}
		else
			script.setAttribute("onLoad", "exec_callback(" + wrap_callback(callback) + ")");
	}
	document.getElementsByTagName("head")[0].appendChild(script);
}
/// Center map
function center_map(lat, lon) {
	if (map) {
		map.setCenter(new google.maps.LatLng(lat, lon));
	}
}
/// Resolve coordinates
function rgeocoding(coords, id) {
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode({"latLng": coords, region: LANG.toUpperCase()}, qx.lang.Function.bind(function(id, results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			var html = "";
			for (var i = 0; i < results.length; i++) {
				html += "<option data='0' id='" + id + "' lat='" + results[i].geometry.location.lat() + "' lon='" + results[i].geometry.location.lng() + "'>";
				html += results[i].formatted_address;
				html += "</option>";						
			}
			show_popup(html, id);
		}
	}, this, id));
}
/// Resolve address
function geocoding(address, id) {
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode({"address": address, region: LANG.toUpperCase()}, qx.lang.Function.bind(function(id, results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			var html = "";
			for (var i = 0; i < results.length; i++) {
				html += "<option data='0' id='" + id + "' lat='" + results[i].geometry.location.lat() + "' lon='" + results[i].geometry.location.lng() + "'>";
				html += results[i].formatted_address;
				html += "</option>";						
			}
			show_popup(html, id);
		}
	}, this, id));
}
/// Fetch poi
function process_poi(name, id) {
	if (!pois_hash) {
		pois_hash = [];
		var spec = {itemsType: "avl_resource", propName: "sys_name", propValueMask: "*", sortType: "sys_name" };
		var flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.poi;
		wialon.core.Session.getInstance().loadLibrary("resourcePois");
		wialon.core.Session.getInstance().searchItems(spec, true, flags, 0, 0, qx.lang.Function.bind(function(name, id, code, data) {
			if (code || !data)
				return;
			pois_hash = data.items;
			process_poi(name, id);
		}, this, name, id));
		return;
	}
	// match POI
	var result = [];
	for (var i = 0; i < pois_hash.length; i++) {
		var pois = pois_hash[i].getPois();
		if (!pois)
			continue;
		for (var j in pois) {
			if (wialon.util.Helper.wildcardCompare(pois[j].n, name, true))
				result.push({name: pois[j].n, value: pois[j].r, lat: pois[j].y, lon: pois[j].x})
		}
	}
	// order POI by name
	wialon.util.Helper.sortItems(result, function(a) {return a.name});
	// output
	var html = "";
	for (var i = 0; i < result.length; i++) {
		html += "<option data='" + result[i].value + "' id='" + id + "' lat='" + result[i].lat + "' lon='" + result[i].lon + "'>";
		html += result[i].name;
		html += "</option>";						
	}
	show_popup(html, id);			
}
/// Fetch geozones
function process_geozone(name, id) {
	if (!geozones_hash) {
		geozones_hash = [];
		var spec = {itemsType: "avl_resource", propName: "sys_name", propValueMask: "*", sortType: "sys_name" };
		var flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.zones;
		wialon.core.Session.getInstance().loadLibrary("resourceZones");
		wialon.core.Session.getInstance().searchItems(spec, true, flags, 0, 0, qx.lang.Function.bind(function(name, id, code, data) {
			if (code || !data)
				return;
			geozones_hash = data.items;
			process_geozone(name, id);
		}, this, name, id));
		return;
	}
	// match zone
	var result = [];
	for (var i = 0; i < geozones_hash.length; i++) {
		var zones = geozones_hash[i].getZones();
		if (!zones)
			continue;
		for (var j in zones) {
			if (wialon.util.Helper.wildcardCompare(zones[j].n, name, true))
				result.push({name: zones[j].n, value: geozones_hash[i].getId() + "_" + j, lat: zones[j].b.cen_y, lon: zones[j].b.cen_x})
		}
	}
	// order zones by name
	wialon.util.Helper.sortItems(result, function(a) {return a.name});
	// output
	var html = "";
	for (var i = 0; i < result.length; i++) {
		html += "<option data='" + result[i].value + "' id='" + id + "' lat='" + result[i].lat + "' lon='" + result[i].lon + "'>";
		html += result[i].name;
		html += "</option>";						
	}
	show_popup(html, id);			
}
/// Show popup menu
function show_popup(html, id) {
	var top = $("#edit_" + id).position().top + 20;
	var left = $("#edit_" + id).position().left;
	$("#popup").html(html);
	var size = $("#popup option").size();
	if (size > 20)
		size = 20;
	else if (size < 2)
		size = 2;
	$("#popup").attr("size", size).parent().css("top", top + "px").css("left", left + "px").show();
}		
/// Login result
function login(code) {
	if (code) {
		alert("Ошибка подключения к серверу.");
		return;
	}		

	load_script("https://www.google.com/jsapi?language="+LANG, function() {
		if (typeof google != "undefined") {
			google.load("maps", "3", {callback: init_google, other_params: "sensor=true&language="+LANG});
		}
	});
}
/// Init SDK
function init_sdk() {
	var url = get_html_var("baseUrl");
	if (!url)
		url = get_html_var("hostUrl");
	if (!url)
		return;
	wialon.core.Session.getInstance().initSession(url, undefined, 0x800);
	wialon.core.Session.getInstance().duplicate(get_html_var("sid"), "", true, login);
}
/// Init google maps api
function init_google() {
	// init Gurtam map layer
	var mapOptions = {zoom: 5, center: new google.maps.LatLng(50, 32), 
					  mapTypeId: google.maps.MapTypeId.ROADMAP,
					  mapTypeControlOptions: {
						  mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.TERRAIN, "gurtam_maps"],
						  style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
					  },
					  navigationControl: true,
					  scaleControl: true,
					  navigationControlOptions: {style: google.maps.NavigationControlStyle.DEFAULT},
					  disableDoubleClickZoom: true
					 };
	map = new google.maps.Map(document.getElementById("map_div"), mapOptions);
	create_gurtam_map();

	var google_img = null;
	google.maps.event.addListener(map, "maptypeid_changed", function (e) {
		var type = map.getMapTypeId();
		if (google_img === null) {
			google_img = $("img[src='https://maps.gstatic.com/mapfiles/google_white.png']");
		}
		if (type === "gurtam_maps") {
			$(google_img).hide();
		} else {
			$(google_img).show();
		}
	});

	google.maps.event.addListener(map, "dblclick", function(e) {
		if ($("#main-table-wrapper").is(":visible")) {
			var id = last_focused;
			if (!id)
				return;
			var arr = id.split("_")
			if (arr.length != 2 || arr[0] != "edit" || $("#row_" + arr[1]).attr("mode") != "map")
				return;
			rgeocoding(e.latLng, arr[1]);
		}
	});

    google.maps.event.trigger(map, 'resize');
	
	load_script("http://api-maps.yandex.ru/2.0-stable/?load=package.full&lang=ru-RU", function () {
		if (typeof ymaps === "undefined") {
			alert($.localise.tr("Error when working with Yandex Maps."));
		}
	});
}
/// Get time selector options
function get_time_options() {
	var html = "";
	for (var i = 0; i < 24; i++)
		for (var j = 0; j < 60; j += 15)
			html += "<option value='" + (i * 60 + j) + "'>" + (i > 9 ? i : ("0" + i)) + ":" + (j > 9 ? j : ("0" + j)) + "</option>";
	return html;
}
///
function update_marker () {
	// update markers
	var id = $(this).attr("id").split("_")[1];
	var marker = markers[$(this).attr("marker")];
	if (!marker)
		return;
	marker.setTitle($("#edit_" + id).val() + "\n" + $("#from_" + id + " option:selected").attr("marker", markers.length).html() + " " + $("#fromday_" + id + " option:selected").attr("marker", markers.length).html() + " " + $("#to_" + id + " option:selected").attr("marker", markers.length).html() + " " + $("#today_" + id + " option:selected").attr("marker", markers.length).html());
}
/// Add a new point
function add_new_point() {
	var id = (new Date()).getTime();
	var rows_count = $("#points [id^=row_number_]").size();
	var template = _.template($("#new-poin-template").html());
	var html = template({id: id, rows_count: (++rows_count)})
	$("#points").append(html);
	$("#to_" + id).val("1425");
	
	var temp = $("#row_"+id);
	$(temp).find("#delivery-address-title").html($.localise.tr("Delivery address:"));
	$(temp).find("#deliver-from-title").html($.localise.tr("Deliver from:&nbsp;"));
	$(temp).find("#delivery-to-title").html($.localise.tr("&nbsp;to:&nbsp;"));
	$(temp).find(".mo-day").html($.localise.tr("Mo"));
	$(temp).find(".tu-day").html($.localise.tr("Tu"));
	$(temp).find(".we-day").html($.localise.tr("We"));
	$(temp).find(".th-day").html($.localise.tr("Th"));
	$(temp).find(".fr-day").html($.localise.tr("Fr"));
	$(temp).find(".sa-day").html($.localise.tr("Sa"));
	$(temp).find(".su-day").html($.localise.tr("Su"));
	$(temp).find("#stay-duration-title").html($.localise.tr("Stay duration, min:&nbsp;"));
	
	$(temp).find(".map_div").attr("title", $.localise.tr("Add from map"));
	$(temp).find(".zone_div").attr("title", $.localise.tr("Add from geofences"));
	$(temp).find(".poi_div").attr("title", $.localise.tr("Add from POIs"));
	$(temp).find(".remove_div").attr("title", $.localise.tr("Delete address"));
	
	$("#remove_" + id).click(function() {
		var id = $(this).attr("id").substr(7);
		$("#row_" + id).remove();
		var rows_count = 0;
		$("#points [id^=row_number_]").each(function() {
			$(this).html((++rows_count) + ".");
		});
		$("#popup").empty().parent().hide();
		update_map();
	});

	$("#from_" + id).change(update_marker);
	$("#fromday_" + id).change(update_marker);
	$("#to_" + id).change(update_marker);
	$("#taday_" + id).change(update_marker);

	$("#edit_" + id).keyup(function(e) {
		if (input_timer) {
			clearTimeout(input_timer);
			input_timer = null;
		}
		if (e.keyCode == 13 || e.keyCode == 27)
			return;
		input_timer = setTimeout("check_input(" + id + ")", 100);
	}).focus(function() {
		last_focused = $(this).attr("id");
	}).focus();
	$("#edit_" + id).keydown(function(e) {
		if (e.keyCode == 13) {
			if (input_timer) {
				clearTimeout(input_timer);
				input_timer = null;
			}
			var options = $("#popup option");
			if (!options.size())
				return;
			var option = $(options.get(0));
			var id = option.attr("id");
			$("#edit_" + id).val(option.html()).attr("lat", option.attr("lat")).attr("lon", option.attr("lon")).attr("data", option.attr("data"));
			$("#popup").parent().hide();
			update_map();
		}
	});
	$("#row_" + id + " div[usage]").click(function() {
		var id = $(this).attr("id");
		var row_mode = $("#row_" + id).attr("mode");
		var mode = $(this).attr("usage");
		// focus
		$("#edit_" + id).focus();
		// nothing changed
		if (row_mode == mode) {
			check_input(id);
			return;
		}
		$("#popup").empty().parent().hide();
		// remove old class
		$("#row_" + id + " div[usage=" + row_mode+ "]").removeClass(row_mode + "_div_selected");
		// assign a new class
		$(this).addClass(mode + "_div_selected");
		// set row mode
		$("#row_" + id).attr("mode", mode);	
		// reset input field
		$("#edit_" + id).val("");
		// check
		if (mode == "poi" || mode == "zone")
			check_input(id);
	});
}
/// Check input
function check_input(id) {
	var value = $("#edit_" + id).val();
	var mode = $("#row_" + id).attr("mode");
	if (mode == "map")
		geocoding(value, id);
	else if (mode == "poi")
		process_poi(value, id);
	else if (mode == "zone")
		process_geozone(value, id);
	input_timer = null;
}
/// Update map path
function update_map() {
	var coords = [];
	if (path) {
		path.setMap(null);
		delete path;
		path = null;
	}
	for (var i = 0; i < markers.length; i++)
		markers[i].setMap(null);
	markers = [];
	var coords = [];
	var bounds = new google.maps.LatLngBounds();
	$("[id^=edit_]").each(function() {
		var lat = $(this).attr("lat");
		var lon = $(this).attr("lon");
		if (isNaN(lat) || isNaN(lon))
			return;
		var id = $(this).attr("id").split("_")[1];
		var pt = new google.maps.LatLng(lat, lon);
		coords.push(pt);
		bounds.extend(pt);
		var marker = new google.maps.Marker({
			position: pt,
			map: map,
			title: $(this).val() + "\n" + $("#from_" + id + " option:selected").html() + " " + $("#fromday_" + id + " option:selected").html() + " " + $("#to_" + id + " option:selected").html() + " " + $("#today_" + id + " option:selected").html()
		});
		$("#from_" + id).attr("marker", markers.length);
		$("#to_" + id).attr("marker", markers.length);
		$("#fromday_" + id).attr("marker", markers.length);
		$("#today_" + id).attr("marker", markers.length);
		markers.push(marker);
	});
	path = new google.maps.Polyline({path: coords, strokeColor: "#FFF", strokeOpacity: 1.0, strokeWeight: 2});
	path.setMap(map);
	if (!coords.length)
		return;
	else if (coords.length == 1) {
		map.setCenter(coords[0]);
		return;
	}			
	map.fitBounds(bounds);
	map.panToBounds(bounds);
}
/// Optimize route
function optimize_route() {
	var coords = [];
	$("#result").empty();
	$("[id^=edit_]").each(function() {
		var lat = $(this).attr("lat");
		var lon = $(this).attr("lon");
		var pt = new google.maps.LatLng(lat, lon);
		coords.push(pt);
	});
	if (coords.length < 2)
		return;
	block_screen(true);
	calc_distances(coords, qx.lang.Function.bind(function (matrix) {
		var schedules = [];
		$("[id^=edit_]").each(function() {
			var lat = $(this).attr("lat");
			var lon = $(this).attr("lon");
			if (isNaN(lat) || isNaN(lon))
				return;
			var id = $(this).attr("id").split("_")[1];
			var from = parseInt($("#fromday_" + id).val()) * 1440 + parseInt($("#from_" + id).val());
			var to = parseInt($("#today_" + id).val()) * 1440 + parseInt($("#to_" + id).val());
			var twait = parseInt($("#wait_" + id).val());
			schedules.push({from: from, to: to, waitInterval: twait});
		});
		var flags = 2;
		$("input[usage=flag]").each(function() {
			if ($(this).prop("checked")) {
				flags |= $(this).val();
			}
		});
		wialon.util.Routing.remoteOptimizeCourierRoute(matrix, schedules, flags, qx.lang.Function.bind(function (code, data) {
			if (code === 0 && data) {
				ordered_data = data;
				show_optimized_path(data);
			} else {
				block_screen(false);
				alert($.localise.tr("Unable to calculate the route: check input data."));
			}
		}));
	}));
}

function humanize_distance (dist) {			
	var km = Math.floor(dist / 1000);
	var m = Math.floor((dist % 1000));
	if (km > 0) {
		return wialon.util.String.sprintf("%s км %s м", km, m);
	} else {
		return wialon.util.String.sprintf("%s м", m);
	}
}
/// Optimize route
function show_optimized_path(data) {
	block_screen(false);
	if (ordered_path) {
		ordered_path.setMap(null);
		delete ordered_path;
		ordered_path = null;
	}
	var coords = [];
	if (!data.success) {
		$("#result").html($.localise.tr("Unable to optimize the route: not enough time to visit all points. Required:") + " " + stime(data.duration) + ".");
		return;
	}

	var inputs = $("[id^=edit_]");
	var result_template = _.template($("#table-result-template").html());
	var html = result_template({});
	$("#result").html(html);
	
	var row_template = _.template($("#row-result-template").html());
	var prev_point = 0, platlon = null; var dtotal = 0; ycoords = [];
	for (var i = 0; i < data.order.length; i++) {
		var id = $(inputs.get(data.order[i].id)).attr("id").split("_")[1];
		var lat = $(inputs.get(data.order[i].id)).attr("lat");
		var lon = $(inputs.get(data.order[i].id)).attr("lon");
		var pt = new google.maps.LatLng(lat, lon);
		coords.push(pt);
		
		var distance = null;
		if (provider === "google" && i && directions_data.directions[prev_point][data.order[i].id]) {
			directions_data.renderers.push(new google.maps.DirectionsRenderer({
				markerOptions: {visible: false}, 
				polylineOptions: {
					strokeColor: "#0000FF", 
					strokeWeight: 6, 
					strokeOpacity: 0.7}, 
				directions: directions_data.directions[prev_point][data.order[i].id]
			}));
			var ttemp = directions_data.directions[prev_point][data.order[i].id].routes[0].legs[0].distance.value;
			dtotal += ttemp;
			distance = humanize_distance(ttemp);
		} else if (provider === "yandex" && i && directions_data.directions[prev_point][data.order[i].id]) {
			var ltemp = 0;
			var tdata = directions_data.directions[prev_point][data.order[i].id];
			if (platlon !== null) {
				for (var j=0, len=tdata.length; j<len; j++) {
					ycoords.push(new google.maps.LatLng(tdata[j][0], tdata[j][1]));
					if (j > 0) {
						ltemp += wialon.util.Geometry.getDistance(tdata[j][0], tdata[j][1], 
																  tdata[j-1][0], tdata[j-1][1]);
						
					}					
				}
				dtotal += ltemp;
				distance = humanize_distance(ltemp);
			} else {
				distance = " --- ";
			}
		} else {
			if (platlon !== null) {
				var temp = wialon.util.Geometry.getDistance(parseFloat(platlon[0]), parseFloat(platlon[1]),
															parseFloat(lat), parseFloat(lon));
				dtotal += temp;
				distance = humanize_distance(temp);
			} else {
				distance = " --- ";
			}
		} 
		
		$("#result-tbody").append(row_template({
			index: (i+1),
			lat: lat, lon: lon,
			address: $(inputs.get(data.order[i].id)).val(),
			time: time_format(data.order[i].tm),
			ifrom: $("#fromday_" + id + " option:selected").html() + " "+ $("#from_" + id + " option:selected").html(),
			ito: $("#today_" + id + " option:selected").html() + " " + $("#to_" + id + " option:selected").html(),
			distance: distance
		}));

		var temp = $("#result");
		$(temp).find("#address-col-name").html($.localise.tr("Address"));
		$(temp).find("#time-col-name").html($.localise.tr("Time"));
		$(temp).find("#interval-col-name").html($.localise.tr("Interval"));
		$(temp).find("#distance-col-name").html($.localise.tr("Distance"));
		$(temp).find("#total-col-name").html($.localise.tr("Total:"));
		
		platlon = [lat, lon];
		prev_point = data.order[i].id;
	}
	$("#total-distance").text(humanize_distance(dtotal));
	ordered_path = new google.maps.Polyline({path: ((provider === "yandex" && ycoords.length > 0) ? ycoords : coords), 
											 strokeColor: "#0000FF", 
											 strokeWeight: 6, strokeOpacity: 0.7});

	if ($("#show_result").prop("checked")) {
		if ($("#road_lock").prop("checked") && provider === "google") {
			var renderer, direction;
			var bounds = null;
			if (directions_data.renderers.length > 0) {
				renderer = directions_data.renderers[0];
				renderer.setMap(map);
				direction = renderer.getDirections().routes[0];				
				bounds = direction.bounds;
			}			
			for (var i = 1; i < directions_data.renderers.length; i++) {
				renderer = directions_data.renderers[i];
				renderer.setMap(map);
				direction = renderer.getDirections().routes[0];				
				bounds.union(direction.bounds);
			}
			map.panToBounds(bounds);
		} else {
			ordered_path.setMap(map);
		}
	} 
}
/// Async distance calculator
function calc_distances(coords, callback) {
	var speed = $("#speed").val();
	var matrix = [];
	for (var i = 0; i < directions_data.renderers.length; i++)
		directions_data.renderers[i].setMap(null);
		
	directions_data.renderers = [];
	directions_data.directions = [];
	var lock = $("#road_lock").prop("checked") ? true : false;
	points_pending = coords.length * coords.length - coords.length;
	points_pending_total = points_pending;
	
	for (var i = 0; i < coords.length; i++) {
		matrix.push([]);
		directions_data.directions.push([]);
		for (var j = 0; j < coords.length; j++) {
			matrix[i].push(0);
			directions_data.directions[i].push(null);
			if (i == j)
				continue;			
			if (lock) {
				if (provider === "google") {
					var options = new Object;
					options.travelMode = google.maps.TravelMode.DRIVING;
					options.avoidHighways = false;
					var directions = new google.maps.DirectionsService();
					options.origin = coords[i];
					options.destination = coords[j];
					setTimeout(qx.lang.Function.bind(gdirections, this, directions, options, i, j, matrix, speed, callback), i * 500);
				} else if (provider === "yandex") {
					var points = [];
					var options = new Object;
					options.avoidTrafficJams = false;
					options.mapStateAutoApply = true
					points.push([coords[i].lat(), coords[i].lng()]);
					points.push([coords[j].lat(), coords[j].lng()]);
					qx.lang.Function.bind(ydirections, this, points, options, i, j, matrix, speed, callback)();
				}
			} else {
				matrix[i][j] = parseInt(wialon.util.Geometry.getDistance(coords[i].lat(), coords[i].lng(), coords[j].lat(), coords[j].lng()) / 1000 / speed * 60);
			}
		}
	}
	if (!lock)
		callback(matrix);
}
/// Calculate directions in google way
function gdirections(directions, options, x, y, matrix, speed, callback) {
	directions.route(options, qx.lang.Function.bind(function(directions, options, x, y, matrix, speed, callback, dresult) {
		if (!dresult) {
			setTimeout(qx.lang.Function.bind(gdirections, this, directions, options, x, y, matrix, speed, callback), Math.random() * 8000);
			return;
		}
		
		if (dresult.status != google.maps.GeocoderStatus.OK) {
			block_screen(false);
			$("#result").html($.localise.tr("Unable to calculate the route: no roads available."));
			return;							
		}	

		matrix[x][y] = parseInt(dresult.routes[0].legs[0].distance.value / 1000 / speed * 60);
		set_progress(parseInt(((points_pending_total - points_pending) * 100 / points_pending_total)));
		directions_data.directions[x][y] = dresult;
		if (!--points_pending) {			
			callback(matrix);
		}
	}, this, directions, options, x, y, matrix, speed, callback));
}
/// Calculate directions in yandex way
function ydirections(points, options, x, y, matrix, speed, callback) {
	ymaps.route(points, options).then(
		qx.lang.Function.bind(function (x, y, matrix, speed, callback, el, i) {
			matrix[x][y] = parseInt(el.getLength() / 1000 / speed * 60);
			set_progress(parseInt(((points_pending_total - points_pending) * 100 / points_pending_total)));
			el.getPaths().each(qx.lang.Function.bind(function (data, x, y, path, i) {
				data.directions[x][y] = path.geometry.getCoordinates();
			}, this, directions_data, x, y), this);
			if (!--points_pending) {
				callback(matrix);
			}
		}, this, x, y, matrix, speed, callback),
		qx.lang.Function.bind(function (error) {
			block_screen(false);
			$("#result").html($.localise.tr("Unable to calculate the route: no roads available."));
			return;
		}, this)
	);
}
///
function set_progress (progress) {
	$("#block2").html("<table style='width: 100%; height: 100%; color: white; font-size: 20px;'><tr><td align=center valign=middle>" + $.localise.tr("Progress:") + " " + progress  + "%</td></tr></table>");
}
/// Show/hide instruments
var show_hide_instruments = (function () {
	ishide = false;
	return function () {
		if (!ishide) {
			ishide = true;
			$("#show_instruments").show();
			$("#main-table-wrapper").hide();
			if ($('#result').is(':empty'))
				$("#result_control").hide();
			$("#map_div").css("margin-left", "40px");
			
			google.maps.event.trigger(map, "resize");
			map.setZoom(map.getZoom());
		} else {
			ishide = false;
			$("#show_instruments").hide();
			$("#main-table-wrapper").show();
			$("#result_control").show();
			$("#map_div").css("margin-left", "0px");
			
			google.maps.event.trigger(map, "resize");
			map.setZoom(map.getZoom());
		}
	}
})();
/// Block/Unblock screep
function block_screen(block) {
	if (block)
		$("#block,#block2").show();
	else
		$("#block,#block2").hide();
}

function ltranlate () {
	$("#main-title").html($.localise.tr("Add addresses of delivery and indicate time range to visit them."));
	$("#add-address-title").html($.localise.tr("Add address"));
	$("#speed-input-title").html($.localise.tr("Speed, kph:"));
	$("#lock-first-title").html($.localise.tr("Lock first address"));
	$("#lock-last-title").html($.localise.tr("Lock last address"));
	$("#stick-schedule-title").html($.localise.tr("Stick to schedule"));
	$("#snap-roads-title").html($.localise.tr("Snap to roads"));
	$("#routing-provider-title").html($.localise.tr("Routing provider:"));
	$("#calc-btn").val($.localise.tr("Calculate"));
	$("#showin-map-title").html($.localise.tr("Show on map"));
	$("#print").val($.localise.tr("Print"));
	$("#save").val($.localise.tr("Save"));

	$("#logo-title").html($.localise.tr("Delivery service"));

	DAYS = [
		$.localise.tr("Mo"),
		$.localise.tr("Tu"),
		$.localise.tr("We"),
		$.localise.tr("Th"),
		$.localise.tr("Fr"),
		$.localise.tr("Sa"),
		$.localise.tr("Su")
	];
}

/// We are ready now
$(document).ready(function () {
	var url = get_html_var("baseUrl");
	if (!url)
		url = get_html_var("hostUrl")
	if (!url)
		return;	
	url += "/wsdk/script/wialon.js";

	LANG = get_html_var("lang");
	if ((!LANG) || ($.inArray(LANG, ["en", "ru"]) == -1))
		LANG = "en"
	$.localise('lang/', {language: LANG});
	ltranlate();

	load_script(url, init_sdk);

	$("#points").sortable({
		stop: function (event, ui) {
			$("[id^=row_number_]").each(function (index) {
				$(this).text(index+1 + ".");
			});
			update_map();
		},
		placeholder: "ui-state-highlight"
	});
	
	// bind common event listeners
	$("#popup").click(function() {
		var option = $("#popup option:selected");
		if (!option.size())
			return;
		var id = option.attr("id");
		$("#edit_" + id).val(option.html()).attr("lat", option.attr("lat")).attr("lon", option.attr("lon")).attr("data", option.attr("data"));
		$(this).parent().hide();
		update_map();
	});
	// show/hide optimized path
	$("#show_result").click(function() {
		if (!ordered_path)
			return;
		if ($("#show_result").prop("checked")) {
			if ($("#road_lock").prop("checked") && provider === "google") {
				for (var i = 0; i < directions_data.renderers.length; i++) {
					directions_data.renderers[i].setMap(map);
				} 
			} else {
				ordered_path.setMap(map);
			}
		} else {
			if ($("#road_lock").prop("checked") && provider === "google") {
				for (var i = 0; i < directions_data.renderers.length; i++) {
					directions_data.renderers[i].setMap(null);
				} 
			} else {
				ordered_path.setMap(null);
			}
		}
	});
	// print content
	$("#print").click(function() {
		if (ordered_data)
			$("#result").printThis();
	});
	// save result to wialon
	$("#save").click(function() {
		var user = wialon.core.Session.getInstance().getCurrUser();
		if ((!wialon) || (!user) || (!ordered_data))
			return;		
		wialon.core.Session.getInstance().createRoute(user, $.localise.tr("Route") + " " + wialon.util.DateTime.formatTime(wialon.core.Session.getInstance().getServerTime(), 0), 
													  1, function(code, obj) {
			if (code || !ordered_data) {
				alert($.localise.tr("Unable to save the route to Wialon."));
				return;
			}
			// update checkpoints
			var points = [];
			var inputs = $("[id^=edit_]");
			var data = ordered_data;
			for (var i = 0; i < data.order.length; i++) {
				var mode = $("#row_" + $(inputs.get(data.order[i].id)).attr("id").split("_")[1]).attr("mode");
				var value = $(inputs.get(data.order[i].id)).attr("data");
				var lat = $(inputs.get(data.order[i].id)).attr("lat");
				var lon = $(inputs.get(data.order[i].id)).attr("lon");
				var name = $(inputs.get(data.order[i].id)).val();
				var point = {};
				if (mode == "poi") {
					point.f = 0x1;
					point.n = name;
					point.y = lat;
					point.x = lon;
					point.r = value;
				} else if (mode == "map") {
					point.f = 0x1;
					point.n = name;
					point.y = lat;
					point.x = lon;
					point.r = 50;
				} else if (mode == "zone") {
					value = value.split("_");
					point.f = 0x2;
					point.n = name;
					point.resource = value[0];
					point.zone = value[1];
				}
				points.push(point);
			}
			obj.updateCheckPoints(points, qx.lang.Function.bind(function(obj) {
				wialon.core.Session.getInstance().loadLibrary("routeSchedules");
				var schedule = {};
				schedule.n = $.localise.tr("Optimized schedule");
				schedule.f = 2;
				schedule.tz = wialon.core.Session.getInstance().getCurrUser().getCustomProperty("tz", 0);
				schedule.cfg = {};
				schedule.tm = [];
				for (var i = 0; i < ordered_data.order.length; i++)
					schedule.tm.push({at: ordered_data.order[i].tm, ad: 0, dt: 0, dd: 0});
				schedule.sch = {f1: 0, f2: 0, t1: 0, t2: 0, m: 0, y: 0, w: 0};
				obj.createSchedule(schedule);
				alert($.localise.tr("Route saved to Wialon."));
			}, this, obj));
		});				
	});
	$("body").keydown(function(e) {
		if (e.keyCode == 27) {
			if (input_timer) {
				clearTimeout(input_timer);
				input_timer = null;
			}
			$("#popup").parent().hide();
		}
	});

	provider = "google";
	$("[name='provider']").change(function(event) { 
		provider = $(this).val();
	}); 
});