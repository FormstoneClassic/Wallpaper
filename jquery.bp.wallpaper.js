 /* 
 * Wallpaper - Adds a smooth-scaling background to any element
 * @author Ben Plum
 * @version 2.0.3
 *
 * Copyright © 2013 Ben Plum <mr@benplum.com>
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

if (jQuery) (function($) {
	
	// Default options
	var options = {
		fixed: false,
		onReady: function() {},
		onLoad: function() {},
		source: "",
		speed: "500"
	};
	
	// Public Methods
	var pub = {
		
		// Set Defaults
		defaults: function(opts) {
			options = $.extend(options, opts || {});
			return $(this);
		},
		
		// Destroy Wallpaper
		destroy: function() {
			var $targets = $(this).each(function() {
				var data = $(this).data("wallpaper");
				
				data.$target.removeClass("wallpaper");
				data.$container.remove();
			});
			
			if ($(".wallpaper").length < 1) {
				$(window).off(".wallpaper");
			}
			
			return $targets;
		},
		
		// Load new image
		load: function(source) {
			return $(this).each(function() {
				var data = $(this).data("wallpaper");
				
				_loadImage(source, data);
			});
		}
	};
	
	// Initialize
	function _init(opts) {
		var data = $.extend({}, options, opts);
		
		// Apply to each
		var $targets = $(this);
		for (var i = 0, count = $targets.length; i < count; i++) {
			_build.apply($targets.eq(i), [ $.extend({}, data) ]);
		}
		
		// Global events
		if (!$("body").hasClass("wallpaper-inititalized")) {
			$("body").addClass("wallpaper-inititalized");
			$(window).on("resize.wallpaper", data, _resizeAll);
		}
		
		// Maintain chainability
		return $targets;
	}
	
	// Build each instance
	function _build(data) {
		var $target = $(this);
		if (!$target.hasClass("wallpaper")) {
			// EXTEND OPTIONS
			$.extend(data, $target.data("wallpaper-options"));
			
			$target.addClass("wallpaper")
				   .append('<div class="wallpaper-container"></div>');
			
			data.isAnimating = false;
			data.$target = $target;
			data.$container = data.$target.find(".wallpaper-container");
			
			if (data.fixed) {
				data.$container.addClass("wallpaper-fixed");
			}
			
			// Bind data & events
			data.$target.data("wallpaper", data)
						.on("resize.wallpaper", data, _resize);
			
			// Load first image
			_loadImage(data.source, data);
			data.onReady.call();
		}
	}
	
	// Load image
	function _loadImage(source, data) {
		// Make sure it's a new image and that we're not currently animating another image
		if (data.currentSource != source && data.isAnimating === false) {
			data.currentSource = source;
			data.isAnimating = true;
			var $imgContainer = $('<div class="wallpaper-image"><img /></div>');
				$img = $imgContainer.find("img");
			
			$img.one("load.wallpaper", function() {
				if (data.fixed) {
					$imgContainer.addClass("fixed")
								 .css({ backgroundImage: "url(" + data.source + ")" });
				}
				
				if (data.$container.find(".wallpaper-image").length < 1) {
					// If it's the first image just append it
					$imgContainer.appendTo(data.$container)
								 .animate({ opacity: 1 }, data.speed);
					data.isAnimating = false;
				} else {
					// Otherwise we need to animate it in
					$imgContainer.appendTo(data.$container)
							     .animate({ opacity: 1 }, data.speed, function() {
									// Remove the old image
									data.$container.find(".wallpaper-image").not(":last").remove();
									data.isAnimating = false;
								 });
				}
				
				_resize({ data: data });
				data.onLoad.call();
			}).attr("src", data.currentSource);
			
			// Check if image is cached
			if ($img[0].complete || $img[0].readyState === 4) {
				$img.trigger("load");
			}
		}
	}
	
	function _resize(e) {
		var data = e.data;
		
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		}
		
		// Target all wallpaper images (when resizing while load/transition)
		var $imgContainers = data.$container.find(".wallpaper-image");
		
		for (var i = 0, count = $imgContainers.length; i < count; i++) {
			var $imgContainer = $imgContainers.eq(i),
				$img = $imgContainer.find("img");
			
			// Make sure there's an image here
			if ($img.length > 0) {
				var frameWidth = data.$target.outerWidth(),
					frameHeight = data.$target.outerHeight(),
					frameRatio = frameWidth / frameHeight,
					naturalSize = _naturalSize($img);
				
				data.width = naturalSize.naturalWidth;
				data.height = naturalSize.naturalHeight;
				data.left = 0;
				data.top = 0;
				
				var imgRatio = data.width / data.height;
				
				// First check the height
				data.height = frameHeight;
				data.width = data.height * imgRatio;
				
				// Next check the width
				if (data.width < frameWidth) {
					data.width = frameWidth;
					data.height = data.width / imgRatio;
				}
				
				// Position the image
				data.left = -(data.width - frameWidth) / 2;
				data.top = -(data.height - frameHeight) / 2;
				
				
				if (data.fixed) {
					$imgContainer.css({
						backgroundPosition: data.left+"px "+data.top+"px",
						backgroundSize: data.width+"px "+data.height+"px"
					})
				} else {
					$imgContainer.css({ 
						height: data.height, 
						width: data.width, 
						left: data.left, 
						top: data.top 
					});
				}
			}
			
		}
	}
	
	function _resizeAll() {
		$(".wallpaper").each(function() {
			var data = $(this).data("wallpaper");
			_resize({ data: data });
		});
	}
	
	function _naturalSize($img) {
		var node = $img[0],
			img = new Image();
		
		if (typeof node.naturalHeight != "undefined") {
			return {
				naturalHeight: node.naturalHeight,
				naturalWidth:  node.naturalWidth
			};
		} else {
			if (node.tagName.toLowerCase() === 'img') {
				img.src = node.src;
				return {
					naturalHeight: img.height,
					naturalWidth:  img.width
				};
			}
		}
		return false;
	}
	
	// Define plugin
	$.fn.wallpaper = function(method) {
		if (pub[method]) {
			return pub[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return _init.apply(this, arguments);
		}
		return this; 
	};
})(jQuery);