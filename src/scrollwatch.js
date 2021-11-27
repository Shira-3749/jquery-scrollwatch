"use_strict";

var Shira;
(function (Shira, $) {
    (function (ScrollWatch) {
        /**
         * Iterate an array (helper)
         *
         * @param {Object} thisArg
         * @param {Array} arr
         * @param {Function} callback
         */
        function foreach(thisArg, arr, callback) {
            for (var i = 0; i < arr.length; ++i) {
                if (callback.call(thisArg, i, arr[i]) === false) {
                    break;
                }
            }
        }

        /**
         * @constructor
         *
         * @param {Array}    sections array of DOM elements
         * @param {Function} callback function to call when the focus changes
         * @param {Object}   options  option map
         */
        ScrollWatch.Watcher = function (sections, callback, options) {
            if (sections.length < 1) {
                throw new Error('No sections given');
            }

            this.sections = sections;
            this.callback = callback;
            this.options = $.extend(
                {},
                ScrollWatch.Watcher.defaults,
                options
            );

            // set scroller
            if (this.options.scroller) {
                // provided
                this.scroller = this.options.scroller;
            } else {
                // guess
                this.scroller = this.guessScroller(sections[0]);

                if (!this.scroller) {
                    throw new Error('Could not determine scroller of the given sections, please provide the "scroller" option');
                }
            }

            this.lastFocus = null;
            this.debugFocusLine = null;
            this.debugFocusLineTimeout = null;

            $(this.scroller).data('shira.scrollwatch', this);
        };

        ScrollWatch.Watcher.defaults = {
            scroller: null,
            throttle: true,
            resolutionMode: 'height',
            resolver: null,
            topDownWeight: 0,
            viewMarginTop: 0,
            viewMarginBottom: 0,
            stickyOffsetTop: 5,
            stickyOffsetBottom: 5,
            clamp: false,
            focusRatio: 0.38196601125010515,
            focusOffset: 0,
            debugFocusLine: false
        };

        ScrollWatch.Watcher.prototype = {
            scroller: null,
            sections: null,
            callback: null,
            options: null,
            paused: false,
            attached: false,

            /**
             * Get Y position of the given element (relative to offsetParent)
             *
             * @param {HTMLElement} elem
             * @param {HTMLElement} offsetParent
             * @returns {Number}
             */
            getElementY: function (elem, offsetParent) {
                // do not check parent if window
                if (window === offsetParent || undefined === offsetParent) {
                    offsetParent = null;
                }

                // determine position
                var y = 0;
                do y += elem.offsetTop;
                while ((elem = elem.offsetParent) && elem !== offsetParent);

                return y;
            },

            /**
             * Try to guess scroller for the given element
             *
             * @param {HTMLElement} elem
             * @return {HTMLElement|Window|null}
             */
            guessScroller: function (elem) {
                var scrollable = false;

                while (!scrollable) {
                    elem = elem.offsetParent;

                    if (elem && elem.nodeType === 1 && 'BODY' !== elem.tagName && 'HTML' !== elem.tagName) {
                        var overflowY = $(elem).css('overflow-y');
                        scrollable = 'auto' === overflowY || 'scroll' === overflowY;
                    } else {
                        elem = window;
                        scrollable = true;
                    }
                }

                if (scrollable) {
                    return elem;
                }
            },

            /**
             * Get intersection of two inervals
             * Requirements: aLeft < aRight, bLeft < bRight
             *
             * @param {Number} aLeft
             * @param {Number} aRight
             * @param {Number} bLeft
             * @param {Number} bRight
             * @returns {Array|null} [left, right] or null
             */
            getIntersection: function (aLeft, aRight, bLeft, bRight) {
                if (bLeft > aRight || bRight < aLeft) {
                    // no intersection
                    return null;
                }
                return [
                    aLeft > bLeft ? aLeft : bLeft,
                    aRight > bRight ? bRight : aRight
                ];
            },

            /**
             * Recalculate section boundaries
             */
            updateSectionBoundaries: function () {
                this.sectionBoundaries = [];

                foreach(this, this.sections, function (i, section) {
                    var top = this.getElementY(section, this.scroller);
                    var bottom = top + section.offsetHeight;
                    this.sectionBoundaries.push({index: i, top: top, bottom: bottom});
                });

                this.sectionBoundaries.sort(this.sortSectionBoundaries);

                if (this.options.clamp) {
                    foreach (this, this.sectionBoundaries, function (i, boundary) {
                        if (i < this.sectionBoundaries.length - 1) {
                            boundary.bottom = this.sectionBoundaries[i + 1].top - 1;
                        }
                    });
                }
            },

            /**
             * Sort calculated section boundaries
             *
             * @param {Object} a
             * @param {Object} b
             * @returns {Number}
             */
            sortSectionBoundaries: function (a, b) {
                return a.top - b.top;
            },

            /**
             * Recalculate scroller height
             */
            updateScrollerHeight: function () {
                if (window === this.scroller) {
                    this.scrollerVisibleHeight = $(window).height();
                    this.scrollerFullHeight = document.body.scrollHeight;
                } else {
                    this.scrollerVisibleHeight = this.scroller.clientHeight;
                    this.scrollerFullHeight = this.scroller.scrollHeight;
                }
            },

            /**
             * Determine current view
             *
             * @returns {Object}
             */
            getView: function () {
                var top = $(this.scroller).scrollTop();
                var bottom = top + this.scrollerVisibleHeight;
                
                if (this.options.viewMarginTop !== 0) {
                    top += this.options.viewMarginTop;
                }
                if (this.options.viewMarginBottom !== 0) {
                    bottom = Math.max(top + 1, bottom - this.options.viewMarginBottom);
                }

                return {
                    top: top,
                    bottom: bottom
                };
            },

            /**
             * Determine focus candidates
             *
             * @param {Object} view
             * @returns {Array}
             */
            determineFocusCandidates: function (view) {
                var that = this, focusCandidates = [], forcedBoundary = null;

                // see if a certain boundary must be forced
                if (this.scrollerFullHeight - view.bottom < this.options.stickyOffsetBottom) {
                    // always choose last boundary if the view is near the end
                    forcedBoundary = this.sectionBoundaries[this.sectionBoundaries.length - 1];
                } else if (view.top - this.options.viewMarginTop < this.options.stickyOffsetTop) {
                    // always choose first boundary if the view is near the beginning
                    forcedBoundary = this.sectionBoundaries[0];
                }

                // determine candidates
                if (forcedBoundary !== null) {
                    // forced
                    focusCandidates.push({
                        index: forcedBoundary.index,
                        intersection: this.getIntersection(
                            view.top,
                            view.bottom,
                            forcedBoundary.top,
                            forcedBoundary.bottom
                        ),
                        section: this.sections[forcedBoundary.index]
                    });
                } else {
                    // find intersecting sections
                    foreach(this, this.sectionBoundaries, function (i, boundary) {
                        var intersection = that.getIntersection(view.top, view.bottom, boundary.top, boundary.bottom);

                        if (intersection !== null) {
                            focusCandidates.push({
                                index: boundary.index,
                                intersection: intersection,
                                section: that.sections[boundary.index]
                            });
                        }
                    });

                    // find the closest boundary above if there are no intersections
                    if (focusCandidates.length === 0) {
                        var closestBoundary = null;

                        foreach(this, this.sectionBoundaries, function (_, boundary) {
                            if (
                                boundary.bottom < view.top
                                && (
                                    closestBoundary === null
                                    || boundary.bottom > closestBoundary.bottom
                                )
                            ) {
                                closestBoundary = boundary;
                            }
                        });

                        if (closestBoundary === null) {
                            closestBoundary = this.sectionBoundaries[0];
                        }

                        focusCandidates.push({
                            index: closestBoundary.index,
                            intersection: null,
                            section: this.sections[closestBoundary.index]
                        });
                    }
                }

                return focusCandidates;
            },

            /**
             * Choose single focus from the given candidates
             *
             * @param {Array}  focusCandidates
             * @param {Object} view
             * @returns {Object}
             */
            resolveFocusCandidates: function (focusCandidates, view) {
                var that = this;
                var chosenCandidate = null;

                if (focusCandidates.length === 1) {
                    // single candidate available
                    chosenCandidate = focusCandidates[0];
                } else {
                    // multiple candidate resolution
                    // resolve according to the resolution mode
                    switch (this.options.resolutionMode) {
                        // choose using focus height
                        case 'height':
                            focusCandidates.sort(function (a, b) {
                                if (a.index < b.index) {
                                    return (b.intersection[1] - b.intersection[0]) - (a.intersection[1] - a.intersection[0]) - that.options.topDownWeight;
                                }
                                return (b.intersection[1] - b.intersection[0]) - (a.intersection[1] - a.intersection[0]);
                            });
                            chosenCandidate = focusCandidates[0];
                            break;

                        // choose using intersection or distance from the focus line
                        case 'focus-line':
                            var viewFocusLineOffset = view.top + (view.bottom - view.top) * this.options.focusRatio + this.options.focusOffset;

                            if (this.options.debugFocusLine) {
                                this.updateDebugFocusLine(Math.round(viewFocusLineOffset));
                            }

                            // find direct intersection with the focus line
                            foreach (this, focusCandidates, function (_, candidate) {
                                if (candidate.intersection[0] <= viewFocusLineOffset && candidate.intersection[1] >= viewFocusLineOffset) {
                                    chosenCandidate = candidate;
                                    return false;
                                }
                            });

                            // find nearest candidate if no direct intersection exists
                            if (chosenCandidate === null) {
                                foreach (this, focusCandidates, function (_, candidate) {
                                    candidate.focusRatioOffsetDistance = Math.min(
                                        Math.abs(candidate.intersection[0] - viewFocusLineOffset),
                                        Math.abs(candidate.intersection[1] - viewFocusLineOffset)
                                    );
                                });
                                focusCandidates.sort(this.sortFocusCandidatesByDistanceToFocusRatioOffset);
                                chosenCandidate = focusCandidates[0];
                            }
                            break;

                        // use custom resolver
                        case 'custom':
                            if (this.options.resolver === null) {
                                throw new Error('No resolver has been set');
                            }
                            chosenCandidate = this.options.resolver(focusCandidates, view, this);
                            if (chosenCandidate instanceof Array) {
                                throw new Error('The resolver must return a single focus object');
                            }
                            break;

                        // invalid
                        default:
                            throw new Error('Invalid resolution mode');
                    }
                }

                return chosenCandidate;
            },

            /**
             * Update debug focus line
             *
             * @param {Number} focusLineOffset
             */
            updateDebugFocusLine: function (focusLineOffset) {
                var that = this;

                if (this.debugFocusLine === null) {
                    this.debugFocusLine = $('<div class="scrollwatch-debug-focus-line" style="position:absolute;left:0;top:0;width:100%;border-bottom:1px solid white;outline:1px solid black;z-index:10000;box-shadow: 0 0 5px black;"></div>')
                        .appendTo(window === this.scroller ? document.body : this.scroller);
                }

                this.debugFocusLine.css('top', focusLineOffset + 'px');
                
                if (this.debugFocusLineTimeout !== null) {
                    clearTimeout(this.debugFocusLineTimeout);
                }

                this.debugFocusLineTimeout = setTimeout(function () {
                    that.debugFocusLine.remove();
                    that.debugFocusLine = null;
                }, 1000);
            },
            
            /**
             * Sort focus candidates by distance to the focus ratio offset
             *
             * @param {Object} a
             * @param {Object} b
             * @returns {Number}
             */
            sortFocusCandidatesByDistanceToFocusRatioOffset: function (a, b) {
                return a.focusRatioOffsetDistance - b.focusRatioOffsetDistance;
            },            

            /**
             * Attach the watcher
             */
            attach: function () {
                if (!this.attached) {
                    var that = this;

                    this.updateEventHandler = function () {
                        that.pulse();
                    };

                    $(this.scroller).scroll(this.updateEventHandler);

                    if (window === this.scroller) {
                        $(this.scroller).resize(this.updateEventHandler);
                    }

                    this.attached = true;
                    this.pulse();
                }
            },

            /**
             * Detach the watcher
             */
            detach: function () {
                if (this.attached) {
                    $(this.scroller).unbind('scroll', this.updateEventHandler);

                    if (window === this.scroller) {
                        $(this.scroller).unbind('resize');
                    }

                    this.attached = false;
                }
            },

            /**
             * Pulse the watcher
             */
            pulse: function () {
                if (this.paused || !this.attached) {
                    return;
                }

                // update state
                this.updateSectionBoundaries();
                this.updateScrollerHeight();

                // get view and focus candidates
                var view = this.getView();
                var focusCandidates = this.determineFocusCandidates(view);

                // resolve candidates and invoke the callback
                if ('none' !== this.options.resolutionMode) {
                    var focus = this.resolveFocusCandidates(focusCandidates, view);

                    if (
                        !this.options.throttle
                        || !this.lastFocus
                        || focus.index !== this.lastFocus.index
                    ) {
                        this.callback(focus, view, this);
                        this.lastFocus = focus;
                    }
                } else {
                    // no resolution
                    this.callback(focusCandidates, view, this);
                }
            }
        };

        /**
         * @constructor
         *
         * @param {Array}  items       array of DOM elements
         * @param {String} activeClass class name to add to the active item
         */
        ScrollWatch.ActiveClassMapper = function (items, activeClass)
        {
            activeClass = activeClass || 'active';

            this.items = items;
            this.activeClass = activeClass;
            this.currentActiveIndexes = [];
        };

        ScrollWatch.ActiveClassMapper.prototype = {
            /**
             * Handle focus change
             *
             * @param {Array} newActiveIndexes
             */
            handleFocusChange: function (newActiveIndexes) {
                var toDeactivate = $(this.currentActiveIndexes).not(newActiveIndexes).get();
                var toActivate = $(newActiveIndexes).not(this.currentActiveIndexes).get();

                foreach (this, toDeactivate, function (_, itemIndex) {
                    $(this.items[itemIndex]).removeClass(this.activeClass);
                });

                foreach (this, toActivate, function (_, itemIndex) {
                    $(this.items[itemIndex]).addClass(this.activeClass);
                });

                this.currentActiveIndexes = newActiveIndexes;
            },

            /**
             * Create watcher callback
             *
             * @returns {Function}
             */
            getWatcherCallback: function() {
                var that = this;

                return function (focus) {
                    var newActiveIndexes = [];

                    if (focus instanceof Array) {
                        foreach (this, focus, function (_, focus) {
                            newActiveIndexes.push(focus.index);
                        });
                    } else {
                        newActiveIndexes.push(focus.index);
                    }

                    that.handleFocusChange(newActiveIndexes);
                };
            }
        };

        // jQuery methods

        /**
         * Apply watcher to the matched elements as sections
         * 
         * @param {Function} callback function to call when the focus changes
         * @param {Object}   options  watcher option map
         * @returns {jQuery}
         */
        $.fn.scrollWatch = function (callback, options) {
            if (this.length > 0) {
                new ScrollWatch.Watcher(this.toArray(), callback, options).attach();
            }

            return this;
        };

        /**
         * Attach a watcher to the matched elements as sections and map
         * the active focus as an "active class" to the respective item.
         *
         * @param {Array|jQuery|String} items       array of DOM elements, jQuery object or a selector
         * @param {String}              activeClass name to add to the active item
         * @param {Object}              options     watcher option map
         * @returns {jQuery}
         */
        $.fn.scrollWatchMapTo = function(items, activeClass, options) {
            if (this.length > 0) {
                if ('string' === typeof items) {
                    items = $(items).toArray();
                } else if (items instanceof $) {
                    items = items.toArray();
                } else if (!(items instanceof Array)) {
                    throw new Error('Invalid items - expected a selector, array or a jQuery object');
                }

                var callback = new ScrollWatch.ActiveClassMapper(items, activeClass).getWatcherCallback();
                var watcher = new ScrollWatch.Watcher(this.toArray(), callback, options);
                
                watcher.attach();
            }

            return this;
        };
    })(Shira.ScrollWatch || (Shira.ScrollWatch = {}));
})(Shira || (Shira = {}), jQuery);
