(function( $, arg ){

	var mapSelector = '[data-map="leaflet"]:not([data-map-version])'
	var visibilityObserver = new ResizeObserver( function(entries,observer) {
		entries.forEach(function(entry){
			// @ see https://github.com/jquery/jquery/blob/a503c691dc06c59acdafef6e54eca2613c6e4032/test/data/jquery-1.9.1.js#L7469-L7481
			if ( $(entry.target).is(':visible') ) {
				$(entry.target).trigger('acf-osm-show');
				observer.unobserve(entry.target);
			}
		})
	});


	// observe if new maps are being loaded into the dom
	if ( !! MutationObserver ) {
		var domObserver = new MutationObserver( function(entries,observer) {
			entries.forEach(function(entry){
				if ( $(entry.target).is(mapSelector) ) {
					$(entry.target).acf_leaflet();
				}
				if ( $(entry.target).find(mapSelector) ) {
					$(entry.target).find(mapSelector).acf_leaflet();
				}
			})
		});
		$(document).ready( function(){
			domObserver.observe(document.body, { subtree: true, childList: true } );
		} );
	}


	L.TileLayer.Provider.providers = arg.providers;

	var options = arg.options;
	
	function createMarkers( data, map ) {
		var self = this, // @var DIV element
			/*
			createEvt = $.Event({
				type: 'acf-osm-map-create-markers',
			}),
			/*/
			createEvt = new CustomEvent('acf-osm-map-create-markers', { 
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					mapData: data
				}
			} ),
			//*/
			default_marker_config = {};

		this.dispatchEvent( createEvt )

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}

		// markers ...
		if ( arg.options.marker.html !== false ) {
			default_marker_config.icon = L.divIcon({
				html: arg.options.marker.html,
				className: arg.options.marker.className
			});
		} else if ( arg.options.marker.icon !== false ) {
			default_marker_config.icon = new L.icon( arg.options.marker.icon );
		}

		// markers again
		$.each( data.mapMarkers, function( i, markerData ) {
			// add markers
			var marker, createEvt;

			createEvt = new CustomEvent( 'acf-osm-map-marker-create', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					markerData: markerData,
					markerOptions: $.extend( default_marker_config, {
						label: markerData.label
					} ),
				}
			} );
			self.dispatchEvent( createEvt )

			if ( createEvt.defaultPrevented ) {
				return;
			}

			marker = L.marker(
					L.latLng( parseFloat( createEvt.detail.markerData.lat ), parseFloat( createEvt.detail.markerData.lng ) ),
					createEvt.detail.markerOptions
				)
				.bindPopup( createEvt.detail.markerOptions.label )
				.addTo( map );

			self.dispatchEvent(new CustomEvent('acf-osm-map-marker-created',{
				detail: {
					marker: marker
				}
			}))

		});


	}

	function createLayers( data, map ) {
		var createEvt = new CustomEvent( 'acf-osm-map-create-layers', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: map,
					mapData: data,
				}
			}),
			maxzoom;

		this.dispatchEvent( createEvt );

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}

		maxzoom = 100;

		// layers ...
		$.each( data.mapLayers, function( i, provider_key ) {

			if ( 'string' !== typeof provider_key ) {
				return;
			}

			var layer_config = options.layer_config[ provider_key.split('.')[0] ] || { options: {} },
				layer = L.tileLayer.provider( provider_key, layer_config.options ).addTo( map );

			layer.providerKey = provider_key;

			if ( !! layer.options.maxZoom ) {
				maxzoom = Math.min( layer.options.maxZoom, maxzoom )
			}
		});
		map.setMaxZoom( maxzoom );
	}
	
	
	$.fn.extend({
		acf_leaflet:function() {

			return this.each( function( i, el ) {

				if ( $(this).data( 'acf-osm-map' ) ) {
					return;
				}
				var data = $(this).data(),
					self = this,
					map, maxzoom,
					mapInit = {
						scrollWheelZoom: false,
						center: [ data.mapLat, data.mapLng ],
						zoom: data.mapZoom
					},
					createEvt = new CustomEvent( 'acf-osm-map-create', {
						bubbles: true,
						cancelable: true,
						detail: {
							mapInit: mapInit
						},
					}),
					initEvt;
				this.dispatchEvent( createEvt )

				// allow to skip map creation
				if ( createEvt.defaultPrevented ) {
					return;
				}

				$(this).height(data.height);

				map = L.map( this, createEvt.detail.mapInit ); // map init might have been mutated by event listeners

				$(this).data( 'acf-osm-map', map );

				initEvt = new CustomEvent( 'acf-osm-map-init', {
					detail: {
						map: map
					},
					cancelable: true,
					bubbles: true
				})
				this.dispatchEvent( initEvt )

				// allow to skip initialization
				if ( initEvt.defaultPrevented ) {
					return;
				}
	
				createLayers.apply( this, [ data, map ] );

				createMarkers.apply( this, [ data, map ] );

				// reload hidden maps when they become visible
				if ( ! $(this).is(':visible') ) {
					visibilityObserver.observe(this);
					$(this).one('acf-osm-show', function(e){
						map.invalidateSize();
					} );
				}

				// finished!
				this.dispatchEvent( new CustomEvent( 'acf-osm-map-created', {
					bubbles: true,
					detail: {
						map: map
					}
				 } ) )

			});
		}
	});
	// static mathod
	$.extend({
		acf_leaflet:function() {
			return $(mapSelector).acf_leaflet();
		}
	});
	// init all maps
	$(document).ready( $.acf_leaflet );

	// listen to events
	$(document).on( 'acf-osm-map-added', function(e) {
		if ( $(e.target).is( mapSelector ) ) {
			$(e.target).acf_leaflet();
		} else {
			$.acf_leaflet();
		}
	});

})( jQuery, acf_osm );