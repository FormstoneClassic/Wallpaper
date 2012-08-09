 /* 
 * Wallpaper - Adds a smooth-scaling, page-filling background
 * @author Ben Plum
 * @version 1.0.2
 *
 * Copyright © 2012 Ben Plum <mr@benplum.com>
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function($) {
	
	// Default options
	var options = {
		file: null,
		fitting: "window",
		speed: "500",
		minWidth: false,
		onReady: function() {},
		onLoad: function() {}
	};
	var isAnimating = false;
	
	// Methods
	var methods = {
		
		// Initialize
		init: function(opts) {
			options = $.extend(options, opts);
			
			var $body = $("body");
			if ($body.find("#wallpaper").length < 1) {
				// Modify DOM - Only if fitting = "document" (need a way to calculate the actual content height)
				if (options.fitting == "document") {
					$body.wrapInner('<div id="wallpaper_content" style="overflow: hidden; position: relative;"></div>');
					options.$content = $("wallpaper_content");
				}
				$body.append('<div id="wallpaper"></div>');
				options.$wallpaper = $("#wallpaper");
				
				// Set up wallpaper
				options.$wallpaper.css({ overflow: "hidden", minWidth: options.minWidth, top: 0, width: "100%", zIndex: -1 });
				if (options.fitting == "document") {
					options.$wallpaper.css({ position: "absolute" });
				} else {
					options.$wallpaper.css({ height: "100%", position: "fixed" });
				}
				
				// Bind events
				$(window).on("resize", methods._resize);
				
				// Load first image
				methods._loadImage(options.file);
				options.onReady.call();
			}
		},
		
		// Update the wallpaper image
		update: function(src) {
			methods._loadImage(src);
		},
		
		// Load image
		_loadImage: function(src) {
			// Make sure it's a new image and that we're not currently animating another image
			if (options.$wallpaper.find("img").attr("src") != src && isAnimating === false) {
				isAnimating = true;
				var $img = $("<img />");
				$img.load(function(){
					if (options.$wallpaper.find("img").length < 1) {
						// If it's the first image just append it
						$img.appendTo(options.$wallpaper);
						isAnimating = false;
					} else {
						// Otherwise we need to animate it in
						$img.css({ opacity: 0, "-webkit-transition": "none", "-moz-transition": "none", "-o-transition": "none", "-ms-transition": "none", transition: "none" }).appendTo(options.$wallpaper).animate({ opacity: 1 }, options.speed, function() {
							// Remove the old image
							options.$wallpaper.find("img").not(":last").remove();
							isAnimating = false;
						});
					}
					$img.css({left: "0", position: "absolute", top: "0"});
					
					methods._doResize($img);
					options.onLoad.call();
				}).attr("src", src);
				
				// Check if image is cached
				if ($img[0].complete) {
					$img.trigger("load");
				}
			}
		},
		
		// Handle window resize
		_resize: function() {
			// Target all wallpaper images (when resizing while load/transition)
			$("#wallpaper img").each(function() {
				methods._doResize($(this));
			});
		},
		
		// Handle image resize
		_doResize: function($img) {
			var size = methods._computeSize($img);
			
			// Make sure there's an image here
			if ($img.length > 0) {
				if (options.fitting == "window") {
					var height = $(window).height();
					
					//options.$content.css({ height: height });
					$img.css({ top: -size.top });
				} else {
					var docHeight = $(document).height();
					var windowHeight = $(window).height();
					var height = options.$content.outerHeight(true);
					
					if (height < docHeight) height = docHeight;
					if (windowHeight > height) height = windowHeight;
				}
				
				$img.css({ height: size.height, width: size.width, left: -size.left, top: -size.top });
				options.$wallpaper.css({ height: height });
			}
		},
		
		// Compute new dimensions for image
		_computeSize: function($img) {
			var windowWidth = $(window).width(); 
			var windowHeight = (options.fitting == "document") ? $(document).height() : $(window).height();
			var windowRatio = windowWidth / windowHeight;
			var width = $img[0].width;
			var height = $img[0].height;
			var ratio = width / height;
			var left = 0;
			var top = 0;
			
			// First check the height
			height = windowHeight;
			width = height * ratio;
			
			// Next check the width
			if(width < windowWidth) {
				width = windowWidth;
				height = width / ratio;
			}
			
			// Position the image
			left = (width - windowWidth) / 2;
			top = (height - windowHeight) / 2;
			
			// Fix scroll left
			if (options.fitting == "window" && $(document).scrollLeft() > 0) {
				left += $(document).scrollLeft();
			}
			
			// Return new dimentions
			return { 
				width: parseInt(width, 10), 
				height: parseInt(height, 10), 
				left: parseInt(left, 10), 
				top: parseInt(top, 10) 
			};
		}
	};
	
	// Define plugin
	$.wallpaper = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error("WALLPAPER: '" +  method + "' does not exist.");
		}  
	};
})(jQuery);