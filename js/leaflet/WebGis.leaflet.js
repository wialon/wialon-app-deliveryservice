// Gurtam Map layer for Leaflet

L.TileLayer.WebGis = L.TileLayer.extend({
	
	initialize: function (url, options) {
		options = L.setOptions(this, options);
		if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {
			options.tileSize = Math.floor(options.tileSize / 2);
			options.zoomOffset++;
			if (options.minZoom > 0) {
				options.minZoom--;
			}
			this.options.maxZoom--;
		}
		if (options.bounds) {
			options.bounds = L.latLngBounds(options.bounds);
		}
		this._url = url + "/gis_render/{x}_{y}_{z}/tile.png";
		var subdomains = this.options.subdomains;
		if (typeof subdomains === 'string') {
			this.options.subdomains = subdomains.split('');
		}
	},
	
	getTileUrl: function (tilePoint) {
		return L.Util.template(this._url, L.extend({
			s: this._getSubdomain(tilePoint),
			z: 17 - this._map._zoom,
			x: tilePoint.x,
			y: tilePoint.y
		}, this.options));
	}
});

L.tileLayer.webGis = function (url, options) {
	return new L.TileLayer.WebGis(url, options);
};