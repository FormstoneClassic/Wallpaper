;(function ($, window) {
	"use strict";

	var $window = $(window),
		$body = $("body"),
		nativeSupport = ("backgroundSize" in document.documentElement.style);

	/**
	 * @options
	 * @param autoPlay [boolean] <true> "Autoplay video"
	 * @param hoverPlay [boolean] <false> "Play video on hover"
	 * @param loop [boolean] <true> "Loop video"
	 * @param onLoad [function] <$.noop> "On load callback"
	 * @param onReady [function] <$.noop> "On ready callback"
	 * @param source [string | object] <null> "Source image (string) or video (object)"
	 */
	var options = {
		autoPlay: true,
		hoverPlay: false,
		loop: true,
		onLoad: $.noop,
		onReady: $.noop,
		source: null,
		speed: 500
	};

	/**
	 * @events
	 * @event wallpaper.loaded "Source media loaded"
	 */

	var pub = {

		/**
		 * @method
		 * @name defaults
		 * @description Sets default plugin options
		 * @param opts [object] <{}> "Options object"
		 * @example $.wallpaper("defaults", opts);
		 */
		defaults: function(opts) {
			options = $.extend(options, opts || {});
			return $(this);
		},

		/**
		 * @method
		 * @name destroy
		 * @description Removes instance of plugin
		 * @example $(".target").wallpaper("destroy");
		 */
		destroy: function() {
			var $targets = $(this).each(function() {
				var data = $(this).data("wallpaper");

				data.$target.removeClass("wallpaper")
							.off(".boxer");
				data.$container.remove();
			});

			if ($(".wallpaper").length < 1) {
				$body.removeClass("wallpaper-inititalized");
				$window.off(".wallpaper");
			}

			return $targets;
		},

		/**
		 * @method
		 * @name load
		 * @description Loads source media
		 * @param source [string | object] "Source image (string) or video (object)"
		 * @example $(".target").wallpaper("load", "path/to/image.jpg");
		 */
		load: function(source) {
			return $(this).each(function() {
				var data = $(this).data("wallpaper");

				if (data) {
					_loadMedia(source, data);
				}
			});
		},

		/**
		 * @method
		 * @name play
		 * @description Plays target video
		 * @example $(".target").wallpaper("play");
		 */
		play: function() {
			return $(this).each(function() {
				var data = $(this).data("wallpaper");

				if (data) {
					var $video = data.$container.find("video");

					if ($video.length) {
						$video[0].play();
					}
				}
			});
		},

		/**
		 * @method
		 * @name stop
		 * @description Stops target video
		 * @example $(".target").wallpaper("stop");
		 */
		stop: function() {
			return $(this).each(function() {
				var data = $(this).data("wallpaper");

				if (data) {
					var $video = data.$container.find("video");

					if ($video.length) {
						$video[0].pause();
					}
				}
			});
		}
	};

	/**
	 * @method private
	 * @name _init
	 * @description Initializes plugin instances
	 * @param opts [object] "Initialization options"
	 */
	function _init(opts) {
		var data = $.extend({}, options, opts);

		// Apply to each
		var $targets = $(this);
		for (var i = 0, count = $targets.length; i < count; i++) {
			_build.apply($targets.eq(i), [ $.extend({}, data) ]);
		}

		// Global events
		if (!$body.hasClass("wallpaper-inititalized")) {
			$body.addClass("wallpaper-inititalized");
			$window.on("resize.wallpaper", data, _onResizeAll);
		}

		// Maintain chainability
		return $targets;
	}

	/**
	 * @method private
	 * @name _build
	 * @description Builds each instance
	 * @param data [object] "Instance data"
	 */
	function _build(data) {
		var $target = $(this);
		if (!$target.hasClass("wallpaper")) {
			$.extend(data, $target.data("wallpaper-options"));

			$target.addClass("wallpaper loading")
				   .append('<div class="wallpaper-container"></div>');

			data.isAnimating = false;
			data.$target = $target;
			data.$container = data.$target.find(".wallpaper-container");

			// Bind data & events
			data.$target.data("wallpaper", data)
						.on("resize.wallpaper", data, _onResize);

			var source = data.source;
			data.source = null;

			_loadMedia(source, data);

			data.onReady.call();
		}
	}

	/**
	 * @method private
	 * @name _loadMedia
	 * @description Determines how to handle source media
	 * @param source [string | object] "Source image (string) or video (object)"
	 * @param data [object] "Instance data"
	 */
	function _loadMedia(source, data) {
		// Check if we're animating
		if (!data.isAnimating) {
			// Check if the source is new
			if (data.source !== source) {
				data.$target.addClass("loading");

				data.source = source;
				data.isAnimating = true;

				if (typeof source === "object") {
					_loadVideo(source, data);
				} else {
					_loadImage(source, data);
				}
			} else {
				data.$target.trigger("wallpaper.loaded");
			}
		}
	}

	/**
	 * @method private
	 * @name _loadImage
	 * @description Loads source image
	 * @param source [string] "Source image"
	 * @param data [object] "Instance data"
	 */
	function _loadImage(source, data) {
		var $imgContainer = $('<div class="wallpaper-media wallpaper-image"><img /></div>'),
			$img = $imgContainer.find("img");

		$img.one("load.wallpaper", function() {

			if (nativeSupport) {
				$imgContainer.addClass("native")
							 .css({ backgroundImage: "url(" + data.source + ")" });
			}

			if (data.$container.find(".wallpaper-media").length < 1) {
				// If it's the first image just append it
				$imgContainer.appendTo(data.$container)
							 .animate({ opacity: 1 }, data.speed);
				data.isAnimating = false;
				data.$target.trigger("wallpaper.loaded");
			} else {
				// Otherwise we need to animate it in
				$imgContainer.appendTo(data.$container)
						     .animate({ opacity: 1 }, data.speed, function() {
								 // Remove the old image
								 data.$container.find(".wallpaper-image").not(":last").remove();
								 data.isAnimating = false;
								 data.$target.trigger("wallpaper.loaded");
							 });
			}

			data.$target.removeClass("loading");

			_onResize({ data: data });
			data.onLoad.call();
		}).attr("src", data.source);

		// Check if image is cached
		if ($img[0].complete || $img[0].readyState === 4) {
			$img.trigger("load");
		}
	}

	/**
	 * @method private
	 * @name _loadVideo
	 * @description Loads source video
	 * @param source [object] "Source video"
	 * @param data [object] "Instance data"
	 */
	function _loadVideo(source, data) {
		var $videoContainer = $('<div class="wallpaper-media wallpaper-video"></div>'),
			html = '<video';

		if (data.loop) {
			html += ' loop';
		}
		html += '>';
		if (data.source.webm) {
			html += '<source src="' + data.source.webm + '" type="video/webm" />';
		}
		if (data.source.mp4) {
			html += '<source src="' + data.source.mp4 + '" type="video/mp4" />';
		}
		if (data.source.ogg) {
			html += '<source src="' + data.source.ogg + '" type="video/ogg" />';
		}
		html += '</video>';

		$videoContainer.append(html).find("video").one("loadedmetadata", function(e) {
			if (data.$container.find(".wallpaper-media").length < 1) {
				// If it's the first video just append it
				$videoContainer.appendTo(data.$container)
							   .animate({ opacity: 1 }, data.speed);
				data.isAnimating = false;
				data.$target.trigger("wallpaper.loaded");

				if (data.hoverPlay) {
					data.$target.on("mouseover.boxer", pub.play)
								.on("mouseout.boxer", pub.stop);
				} else if (data.autoPlay) {
					this.play();
				}
			} else {
				// Otherwise we need to animate it in
				$videoContainer.appendTo(data.$container)
						       .animate({ opacity: 1 }, data.speed, function() {
								   // Remove the old image
								   data.$container.find(".wallpaper-image").not(":last").remove();
								   data.isAnimating = false;
								   data.$target.trigger("wallpaper.loaded");
							   });
			}

			data.$target.removeClass("loading")
						.trigger("wallpaper.loaded");

			_onResize({ data: data });
			data.onLoad.call();
		});
	}

	/**
	 * @method private
	 * @name _onResize
	 * @description Resize target instance
	 * @param e [object] "Event data"
	 */
	function _onResize(e) {
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		}

		var data = e.data;

		// Target all media
		var $mediaContainers = data.$container.find(".wallpaper-media");

		for (var i = 0, count = $mediaContainers.length; i < count; i++) {
			var $mediaContainer = $mediaContainers.eq(i),
				type = $mediaContainer.find("video").length ? "video" : "image",
				$media = $mediaContainer.find(type);

			// If media found and scaling is not natively support
			if ($media.length && !(type === "image" && data.nativeSupport)) {
				var frameWidth = data.$target.outerWidth(),
					frameHeight = data.$target.outerHeight(),
					frameRatio = frameWidth / frameHeight,
					naturalSize = _naturalSize($media);

				data.width = naturalSize.naturalWidth;
				data.height = naturalSize.naturalHeight;
				data.left = 0;
				data.top = 0;

				var mediaRatio = data.width / data.height;

				// First check the height
				data.height = frameHeight;
				data.width = data.height * mediaRatio;

				// Next check the width
				if (data.width < frameWidth) {
					data.width = frameWidth;
					data.height = data.width / mediaRatio;
				}

				// Position the media
				data.left = -(data.width - frameWidth) / 2;
				data.top = -(data.height - frameHeight) / 2;

				$mediaContainer.css({
					height: data.height,
					width: data.width,
					left: data.left,
					top: data.top
				});
			}
		}
	}

	/**
	 * @method private
	 * @name _onResizeAll
	 * @description Resizes all target instances
	 */
	function _onResizeAll() {
		$(".wallpaper").each(function() {
			var data = $(this).data("wallpaper");
			_onResize({ data: data });
		});
	}

	/**
	 * @method private
	 * @name _naturalSize
	 * @description Determines natural size of target media
	 * @param $media [jQuery object] "Source media object"
	 * @return [object | boolean] "Object containing natural height and width values or false"
	 */
	function _naturalSize($media) {
		if ($media.is("img")) {
			var node = $media[0];

			if (typeof node.naturalHeight !== "undefined") {
				return {
					naturalHeight: node.naturalHeight,
					naturalWidth:  node.naturalWidth
				};
			} else {
				var img = new Image();
				img.src = node.src;
				return {
					naturalHeight: img.height,
					naturalWidth:  img.width
				};
			}
		} else {
			return {
				naturalHeight: $media[0].videoHeight,
				naturalWidth:  $media[0].videoWidth
			};
		}
		return false;
	}

	$.fn.wallpaper = function(method) {
		if (pub[method]) {
			return pub[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return _init.apply(this, arguments);
		}
		return this;
	};

	$.wallpaper = function(method) {
		if (method === "defaults") {
			pub.defaults.apply(this, Array.prototype.slice.call(arguments, 1));
		}
	};
})(jQuery, window);