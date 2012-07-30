 /* 
 * Wallpaper - Adds a smooth-scaling, page-filling background
 * @author Ben Plum <benjaminplum@gmail.com>
 * @version 1.0
 *
 * Copyright (c) 2012 Ben Plum <ben@benjaminplum.com>
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function($) {
	var options = {
		file: null,
		fitting: "window",
		speed: "500",
		easing: "linear",
		minWidth: false,
		onReady: function() {},
		onLoad: function() {}
	};
	
	var methods = {
		init: function(opts) {
			options = $.extend(options, opts);
			
			var $body = $("body");
			if ($body.find("#wallpaper").length < 1) {
				$body.wrapInner('<div id="wallpaper_content" style="overflow: hidden; position: relative;"></div>')
					 .append('<div id="wallpaper"></div>');
				
				var $wallpaper = $("#wallpaper");
				$wallpaper.css({ overflow: "hidden", minWidth: options.minWidth, top: 0, width: "100%", zIndex: -1 });
				if (options.fitting == "document") {
					$wallpaper.css({ position: "absolute" });
				} else {
					$wallpaper.css({ height: "100%", position: "fixed" });
				}
				
				$(window).on("resize", methods._resize);
				
				methods._loadImage(options.file);
				options.onReady.call();
			}
		},
		update: function(src) {
			methods._loadImage(src);
		},
		_loadImage: function(src) {
			var $wallpaper = $("#wallpaper");
			if ($wallpaper.find("img").attr("src") != src) {
				var $img = $("<img />");
				$img.load(function(){
					if ($wallpaper.find("img").length < 1) {
						$img.appendTo($wallpaper);
					} else {
						$img.css({ opacity: 0, "-webkit-transition": "none", "-moz-transition": "none", "-o-transition": "none", "-ms-transition": "none", transition: "none" }).appendTo($wallpaper).animate({ opacity: 1 }, options.speed, options.easing, function() {
							$wallpaper.find("img").not(":last").remove();
						});
					}
					$img.css({left: "0", position: "absolute", top: "0"});
					
					methods._doResize($img);
					options.onLoad.call();
				}).attr("src", src);
			}
		},
		_resize: function() {
			$("#wallpaper img").each(function() {
				methods._doResize($(this));
			});
		},
		_doResize: function($img) {
			var size = methods._computeSize($img);
			var $wallpaper = $("#wallpaper");
			var $content = $("#wallpaper_content");
			
			if ($img.length > 0) {
				if (options.fitting == "window") {
					var height = $(window).height();
					
					$content.css({ height: height });
					$img.css({ top: -size.top });
				} else {
					var docHeight = $(document).height();
					var windowHeight = $(window).height();
					var height = $content.outerHeight(true);
					
					if (height < docHeight) height = docHeight;
					if (windowHeight > height) height = windowHeight;
				}
				
				$img.css({ height: size.height, width: size.width, left: -size.left, top: -size.top });
				$wallpaper.css({ height: height });
			}
		},
		_computeSize: function($img) {
			var windowWidth = $(window).width(); 
			var windowHeight = (options.fitting == "document") ? $(document).height() : $(window).height();
			var windowRatio = windowWidth / windowHeight;
			var width = $img[0].width;
			var height = $img[0].height;
			var ratio = width / height;
			var left = 0;
			var top = 0;
			
			height = windowHeight;
			width = height * ratio;
			
			if(width < windowWidth) {
				width = windowWidth;
				height = width / ratio;
			}
			
			left = (width - windowWidth) / 2;
			top = (height - windowHeight) / 2;
			
			if (options.fitting == "window" && $(document).scrollLeft() > 0) {
				left += $(document).scrollLeft();
			}
			
			return { 
				width: parseInt(width, 10), 
				height: parseInt(height, 10), 
				left: parseInt(left, 10), 
				top: parseInt(top, 10) 
			};
		}
	};
	
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
