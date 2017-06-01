"use_strict";

var Shira;
(function (Shira, $) {
    (function (ScrollWatch) {
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

                    if (elem && 1 === elem.nodeType && 'BODY' !== elem.tagName && 'HTML' !== elem.tagName) {
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

                for (var i = 0; i < this.sections.length; ++i) {
                    var top = this.getElementY(this.sections[i], this.scroller);
                    var bottom = top + this.sections[i].offsetHeight;
                    this.sectionBoundaries.push([top, bottom]);
                }
                this.sectionBoundaries.sort(this.sortSectionBoundaries);
            },

            /**
             * Sort calculated section boundaries
             *
             * @param {Array} a
             * @param {Array} b
             * @returns {Number}
             */
            sortSectionBoundaries: function (a, b) {
                return a[0] - b[0];
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
                
                if (0 !== this.options.viewMarginTop) {
                    top += this.options.viewMarginTop;
                }
                if (0 !== this.options.viewMarginBottom) {
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
                var focusCandidates = [], forcedIndex = null;

                // see if a certain section must be forced
                if (this.scrollerFullHeight - view.bottom < this.options.stickyOffsetBottom) {
                    // always choose last section if the view is near the end
                    forcedIndex = this.sectionBoundaries.length - 1;
                } else if (view.top - this.options.viewMarginTop < this.options.stickyOffsetTop) {
                    // always choose first section if the view is near the beginning
                    forcedIndex = 0;
                }

                // determine candidates
                if (null !== forcedIndex) {
                    // forced
                    focusCandidates.push({
                        index: forcedIndex,
                        intersection: this.getIntersection(
                            view.top,
                            view.bottom,
                            this.sectionBoundaries[forcedIndex][0],
                            this.sectionBoundaries[forcedIndex][1]
                        ),
                        section: this.sections[forcedIndex]
                    });
                } else {
                    // find intersecting sections
                    for (var i = 0; i < this.sectionBoundaries.length; ++i) {                        
                        var intersection = this.getIntersection(
                            view.top,
                            view.bottom,
                            this.sectionBoundaries[i][0],
                            this.sectionBoundaries[i][1]
                        );

                        if (null !== intersection) {
                            focusCandidates.push({
                                index: i,
                                intersection: intersection,
                                section: this.sections[i]
                            });
                        }
                    }

                    // use section closest to the top of the view if no intersection was found
                    if (0 === focusCandidates.length) {
                        var sectionClosest = null, sectionOffsetTop;
                        for (i = 0; i < this.sectionBoundaries.length; ++i) {
                            sectionOffsetTop = Math.abs(this.sectionBoundaries[i][0] - view.top);
                            if (null === sectionClosest || sectionClosest[1] > sectionOffsetTop) {
                                sectionClosest = i;
                            }
                        }

                        focusCandidates.push({
                            index: sectionClosest,
                            intersection: null,
                            section: this.sections[sectionClosest]
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

                if (1 === focusCandidates.length) {
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
                            var i;
                            var viewFocusLineOffset = view.top + (view.bottom - view.top) * this.options.focusRatio + this.options.focusOffset;

                            if (this.options.debugFocusLine) {
                                this.updateDebugFocusLine(Math.round(viewFocusLineOffset));
                            }

                            // find direct intersection with the focus line
                            for (i = 0; i < focusCandidates.length; ++i) {
                                if (focusCandidates[i].intersection[0] <= viewFocusLineOffset && focusCandidates[i].intersection[1] >= viewFocusLineOffset) {
                                    chosenCandidate = focusCandidates[i];
                                    break;
                                }
                            }

                            // find nearest candidate if no direct intersection exists
                            if (null === chosenCandidate) {
                                for (i = 0; i < focusCandidates.length; ++i) {
                                    focusCandidates[i].focusRatioOffsetDistance = Math.min(
                                        Math.abs(focusCandidates[i].intersection[0] - viewFocusLineOffset),
                                        Math.abs(focusCandidates[i].intersection[1] - viewFocusLineOffset)
                                    );
                                }
                                focusCandidates.sort(this.sortFocusCandidatesByDistanceToFocusRatioOffset);
                                chosenCandidate = focusCandidates[0];
                            }
                            break;

                        // use custom resolver
                        case 'custom':
                            if (null === this.options.resolver) {
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

                if (null === this.debugFocusLine) {
                    this.debugFocusLine = $('<div class="scrollwatch-debug-focus-line" style="position:absolute;left:0;top:0;width:100%;border-bottom:1px solid white;outline:1px solid black;z-index:10000;box-shadow: 0 0 5px black;"></div>')
                        .appendTo(window === this.scroller ? document.body : this.scroller);
                }

                this.debugFocusLine.css('top', focusLineOffset + 'px');
                
                if (null !== this.debugFocusLineTimeout) {
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
                var i;
                var toDeactivate = $(this.currentActiveIndexes).not(newActiveIndexes).get();
                var toActivate = $(newActiveIndexes).not(this.currentActiveIndexes).get();

                for (i = 0; i < toDeactivate.length; ++i) {
                    $(this.items[toDeactivate[i]]).removeClass(this.activeClass);
                }

                for (i = 0; i < toActivate.length; ++i) {
                    $(this.items[toActivate[i]]).addClass(this.activeClass);
                }

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
                        for (var i = 0; i < focus.length; ++i) {
                            newActiveIndexes.push(focus[i].index);
                        }
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
