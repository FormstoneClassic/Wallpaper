;(function ($, window) {
	"use strict";

	var $window = $(window),
		$body,
		nativeSupport = ("backgroundSize" in document.documentElement.style),
		guid = 0,
		embedReady = false,
		embedQueue = [],
		isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test( (window.navigator.userAgent||window.navigator.vendor||window.opera) ),
		transitionEvent,
		transitionSupported;

	/**
	 * @options
	 * @param autoPlay [boolean] <true> "Autoplay video"
	 * @param hoverPlay [boolean] <false> "Play video on hover"
	 * @param loop [boolean] <true> "Loop video"
	 * @param mute [boolean] <true> "Mute video"
	 * @param onLoad [function] <$.noop> "On load callback"
	 * @param onReady [function] <$.noop> "On ready callback"
	 * @param source [string | object] <null> "Source image (string) or video (object)"
	 */
	var options = {
		autoPlay: true,
		embedRatio: 0.5625,
		hoverPlay: false,
		loop: true,
		mute: true,
		onLoad: $.noop,
		onReady: $.noop,
		source: null
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

				if (data) {
					data.$container.remove();
					data.$target.removeClass("wallpaper")
								.off(".boxer")
								.data("wallpaper", null);
				}
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
		 * @name pause
		 * @description Pauses target video
		 * @example $(".target").wallpaper("stop");
		 */
		pause: function() {
			return $(this).each(function() {
				var data = $(this).data("wallpaper");

				if (data) {
					if (data.isEmbed && data.player) {
						data.player.pauseVideo();
					} else {
						var $video = data.$container.find("video");

						if ($video.length) {
							$video[0].pause();
						}
					}
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
					if (data.isEmbed && data.player) {
						data.player.playVideo();
					} else {
						var $video = data.$container.find("video");

						if ($video.length) {
							$video[0].play();
						}
					}
				}
			});
		},

		/**
		 * @method private
		 * @name stop
		 * @description Deprecated; Aliased to "pause"
		 * @example $(".target").wallpaper("stop");
		 */
		stop: function() {
			pub.pause.apply(this);
		},

		/**
		 * @method
		 * @name unload
		 * @description Unloads current media
		 * @example $(".target").wallpaper("unload");
		 */
		unload: function() {
			return $(this).each(function() {
				var data = $(this).data("wallpaper");

				if (data) {
					_unloadMedia(data);
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

		$body = $("body");
		transitionEvent = _getTransitionEvent();
		transitionSupported = (transitionEvent !== false);

		// no transitions :(
		if (!transitionSupported) {
			transitionEvent = "transitionend.wallpaper";
		}

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

			data.guid = guid++;
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
				data.source = source;
				data.isAnimating = true;

				data.isEmbed = (typeof source === "string" && source.indexOf("youtube.com/embed") > -1);
				/* isVimeo   = (typeof source === "string" && source.indexOf("player.vimeo.com/video") > -1); */

				$("body").append('<script src="//www.youtube.com/player_api"></script>');

				if (data.isEmbed) {
					_loadEmbed(source, data);
				} else if (typeof source === "object") {
					_loadVideo(source, data);
				} else {
					_loadImage(source, data);
				}
			} else {
				// data.$target.trigger("wallpaper.loaded");
			}
		}
	}

	/**
	 * @method private
	 * @name _loadImage
	 * @description Loads source image
	 * @param source [string] "Source image"
	 * @param data [object] "Instance data",
	 * @param poster [boolean] "Flag for video poster"
	 */
	function _loadImage(source, data, poster) {
		var $imgContainer = $('<div class="wallpaper-media wallpaper-image"><img /></div>'),
			$img = $imgContainer.find("img");

		$img.one("load.wallpaper", function() {
			if (nativeSupport) {
				$imgContainer.addClass("native")
							 .css({ backgroundImage: "url(" + source + ")" });
			}

			// Append
			$imgContainer.on(transitionEvent, function(e) {
				_killEvent(e);

				if ($(e.target).is($imgContainer)) {
					$imgContainer.off(transitionEvent);

					data.isAnimating = false;

					if (!poster) {
						_cleanMedia(data);
					}
				}
			});

			setTimeout( function() { $imgContainer.css({ opacity: 1 }); }, 50);

			//data.$target.trigger("wallpaper.loaded");

			// Resize
			_onResize({ data: data });
			if (!poster) {
				data.onLoad.call();
			}
		}).attr("src", source);

		$imgContainer.appendTo(data.$container);

		// Check if image is cached
		if ($img[0].complete || $img[0].readyState === 4) {
			$img.trigger("load.wallpaper");
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
		if (data.source.poster) {
			_loadImage(data.source.poster, data, true);
		}

		if (!isMobile) {
			var $videoContainer = $('<div class="wallpaper-media wallpaper-video"></div>'),
				html = '';

			html += '<video';
			if (data.loop) {
				html += ' loop';
			}
			if (data.mute) {
				html += ' muted';
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

			var $video = $videoContainer.append(html).find("video");

			$video.one("loadedmetadata.wallpaper", function(e) {
				$videoContainer.on(transitionEvent, function(e) {
					_killEvent(e);

					if ($(e.target).is($videoContainer)) {
						data.isAnimating = false;

						$videoContainer.off(transitionEvent);

						_cleanMedia(data);
					}
				});

				setTimeout( function() { $videoContainer.css({ opacity: 1 }); }, 50);

				//data.$target.trigger("wallpaper.loaded");

				// Resize
				_onResize({ data: data });
				data.onLoad.call();

				// Events
				if (data.hoverPlay) {
					data.$target.on("mouseover.boxer", pub.play)
								.on("mouseout.boxer", pub.pause);
				} else if (data.autoPlay) {
					this.play();
				}
			});

			$videoContainer.appendTo(data.$container);
		}
	}

	/**
	 * @method private
	 * @name _loadEmbed
	 * @description Loads YouTube video
	 * @param source [string] "YouTube URL"
	 * @param data [object] "Instance data"
	 */
	function _loadEmbed(source, data) {
		/*
		youtube poster?
		if (data.source.poster) {
			_loadImage(data.source.poster, data, true);
		}
		*/

		if (!isMobile) {
			if (!$("script[src*='www.youtube.com/iframe_api']").length) {
				$("head").append('<script src="//www.youtube.com/iframe_api"></script>');
			}

			if (!embedReady) {
				embedQueue.push({
					source: source,
					data: data
				});
			} else {
				var $embedContainer = $('<div class="wallpaper-media wallpaper-embed"></div>'),
					html = '';

				html += '<iframe id="wallpaper' + data.guid + '" type="text/html" src="';
				html += source + '?controls=0&rel=0&showinfo=0&enablejsapi=1&version=3&&playerapiid=wallpaper' + data.guid;
				if (data.loop) {
					html += '&loop=1';
				}
				// youtube draws play button if not set to autoplay...
				html += '&autoplay=1';
				html += '" frameborder="0" allowfullscreen></iframe>';

				$embedContainer.append(html)
							   .appendTo(data.$container);

				data.playing = false;
				data.player = new window.YT.Player("wallpaper" + data.guid, {
					events: {
						"onReady": function (e) {
							if (data.mute) {
								data.player.mute();
							}

							if (data.hoverPlay) {
								data.$target.on("mouseover.boxer", pub.play)
											.on("mouseout.boxer", pub.pause);
							}
						},
						"onStateChange": function (e) {
							if (!data.playing && e.data === window.YT.PlayerState.PLAYING) {
								data.playing = true;

								if (data.hoverPlay || !data.autoPlay) {
									data.player.pauseVideo();
								}

								//data.$target.trigger("wallpaper.loaded");
								data.onLoad.call();

								data.$target.find(".wallpaper-media").css({ opacity: 1 });
							}
						}
					}
		        });

				// Resize
				_onResize({ data: data });
			}
		}
	}

	/**
	 * @method private
	 * @name _cleanMedia
	 * @description Cleans up old media
	 * @param data [object] "Instance data"
	 */
	function _cleanMedia(data) {
		var $mediaContainer = data.$container.find(".wallpaper-media");

		if ($mediaContainer.length >= 1) {
			$mediaContainer.not(":last").remove();
		}
	}

	/**
	 * @method private
	 * @name _uploadMedia
	 * @description Unloads current media
	 * @param data [object] "Instance data"
	 */
	function _unloadMedia(data) {
		var $mediaContainer = data.$container.find(".wallpaper-media");

		if ($mediaContainer.length >= 1) {
			$mediaContainer.on(transitionEvent, function(e) {
				_killEvent(e);

				if ($(e.target).is($mediaContainer)) {
					$(this).remove();

					delete data.source;
				}
			}).css({ opacity: 0 });
		}
	}

	/**
	 * @method private
	 * @name _onResize
	 * @description Resize target instance
	 * @param e [object] "Event data"
	 */
	function _onResize(e) {
		_killEvent(e);

		var data = e.data;

		// Target all media
		var $mediaContainers = data.$container.find(".wallpaper-media");

		for (var i = 0, count = $mediaContainers.length; i < count; i++) {
			var $mediaContainer = $mediaContainers.eq(i),
				type = (data.isEmbed) ? "iframe" : ($mediaContainer.find("video").length ? "video" : "img"),
				$media = $mediaContainer.find(type);

			// If media found and scaling is not natively support
			if ($media.length && !(type === "img" && data.nativeSupport)) {
				var frameWidth = data.$target.outerWidth(),
					frameHeight = data.$target.outerHeight(),
					frameRatio = frameWidth / frameHeight,
					naturalSize = _naturalSize(data, $media);

				data.width = naturalSize.naturalWidth;
				data.height = naturalSize.naturalHeight;
				data.left = 0;
				data.top = 0;

				var mediaRatio = (data.IsEmbed) ? data.embedRation : (data.width / data.height);

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
	 * @param data [object] "Instance data"
	 * @param $media [jQuery object] "Source media object"
	 * @return [object | boolean] "Object containing natural height and width values or false"
	 */
	function _naturalSize(data, $media) {
		if (data.isEmbed) {
			return {
				naturalHeight: 500,
				naturalWidth:  500 / data.embedRatio
			};
		} else if ($media.is("img")) {
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

	/**
	 * @method private
	 * @name _killEvent
	 * @description Prevents default and stops propagation on event
	 * @param e [object] "Event data"
	 */
	function _killEvent(e) {
		if (e.preventDefault) {
			e.stopPropagation();
			e.preventDefault();
		}
	}

	/**
	 * @method private
	 * @name _getTransitionEvent
	 * @description Retuns a properly prefixed transitionend event
	 * @return [string] "Properly prefixed event"
	 */
	function _getTransitionEvent() {
		var transitions = {
				'WebkitTransition': 'webkitTransitionEnd',
				'MozTransition':    'transitionend',
				'OTransition':      'oTransitionEnd',
				'transition':       'transitionend'
			},
			test = document.createElement('div');

		for (var type in transitions) {
			if (transitions.hasOwnProperty(type) && type in test.style) {
				return transitions[type] + ".wallpaper";
			}
		}

		return false;
	}

	/**
	 * @method global
	 * @name window.onYouTubeIframeAPIReady
	 * @description Attaches YouTube players to active instances
	 */
	window.onYouTubeIframeAPIReady = function() {
		embedReady = true;

		for (var i in embedQueue) {
			if (embedQueue.hasOwnProperty(i)) {
				_loadEmbed(embedQueue[i].source, embedQueue[i].data);
			}
		}
	};

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