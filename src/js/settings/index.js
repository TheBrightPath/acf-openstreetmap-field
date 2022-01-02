//import { init as mapsInit, L } from 'maps';

import { options, providers } from 'pluginOptions'
import { options as adminOptions, i18n } from 'pluginAdminOptions'


let currentLayer = false, currentOverlay = false;

document.addEventListener('acf-osm-map-init', e => {
	const map = e.detail.map
	
	function isOverlay( provider_key ) {
		var parts = provider_key.split('.'),
			config = providers[parts.shift()];
		if ( config.isOverlay ) {
			return true;
		}
		if ( parts.length ) {
			config = config.variants[parts.shift()];
		}

		return !! config.isOverlay;
	}
	function addLayer( provider_key ) {

		var layer, layerConfig;
		
		layerConfig = options.layer_config[ provider_key.split('.')[0] ] || { options: {} };

		layer = L.tileLayer.provider( provider_key, layerConfig.options );
		layer.provider_key = provider_key;

		if ( isOverlay( provider_key ) ) {

			if ( currentOverlay ) {
				currentOverlay.remove();
				
				if ( currentOverlay.provider_key === provider_key ) {
					currentOverlay = false;
					return;
				}
			}
			currentOverlay = layer;
			currentOverlay.addTo( map );
		} else {
			if ( currentLayer ) {
				map.eachLayer(function(layer) { layer.remove() } );
				currentOverlay = false;
				//currentLayer.remove();				
			}
			currentLayer = layer;

			currentLayer.addTo( map );

			if ( currentOverlay ) {
				currentOverlay.remove();
				currentOverlay.addTo( map );
				// if zoom && bounds: move into bounds
			}
		}

	};


	map.on('layeradd', function (e) {
		var layer = e.layer, 
			currentZoom, newZoom;

		if (!map.hasLayer(layer)) {
			return;
		}

		if (!!layer.options.bounds) {
			var bounds = L.latLngBounds(layer.options.bounds);
			map.fitBounds(bounds, {
				paddingTopLeft: [0, 0],
				paddingBottomRight: [0, 0]
			});
		}

		// set zoom to current restrictions
		currentZoom = map.getZoom();
		newZoom = Math.max(
			layer.options.minZoom,
			Math.min( currentZoom, layer.options.maxZoom )
		);

		( currentZoom !== newZoom ) && map.setZoom( newZoom );
	});

	
	document.addEventListener('click', e => {
		if ( ! e.target.matches('.action-test[data-layer]')) {
			return;
		}
		e.preventDefault();
		const provider = e.target.getAttribute( 'data-layer' )
		addLayer(provider)
	})

})

// 
// self.map.eachLayer(function(layer) {
// 	if ( ! layer.providerKey ) {
// 		return;
// 	}
// 
// 	if ( self.layer_is_overlay( layer.providerKey, layer ) ) {
// 		layers.push( layer.providerKey )
// 	} else {
// 		layers.unshift( layer.providerKey )
// 	}
// });
