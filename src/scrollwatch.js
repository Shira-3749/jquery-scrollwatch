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
                // determine from sections
                var offsetParent = sections[0].offsetParent;

                if (null === offsetParent) {
                    throw new Error('Could not determine scroller of the given sections, please provide the "scroller" option');
                }
                if (document.body === offsetParent) {
                    this.scroller = window;
                } else {
                    this.scroller = offsetParent;
                }
            }

            this.lastFocus = null;
            this.debugFocusLine = null;
            this.debugFocusLineTimeout = null;
        };

        ScrollWatch.Watcher.defaults = {
            scroller: null,
            throttle: true,
            multiMode: false,
            resolutionMode: 'height',
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
            bound: false,

            /**
             * Get Y position of the given element, relative to given offset parent
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

                // return
                return y;
            },

            /**
             * Get absolute Y position of the given element
             *
             * @param {HTMLElement} elem
             * @returns {Number}
             */
            getElementYAbs: function (elem) {
                var y = 0;
                do y += elem.offsetTop;
                while((elem = elem.offsetParent));

                return y;
            },

            /**
             * Get intersection of two inervals
             * Requirements: aLeft < aRight, bLeft < bRight
             *
             * @param {Number} aLeft
             * @param {Number} aRight
             * @param {Number} bLeft
             * @param {Number} bRight
             * @returns {Array|null}[left, right] or null
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

                var sectionEnd;
                for (var i = 0; i < this.sections.length; ++i) {
                    var elementY = this.getElementY(this.sections[i], this.scroller);
                    sectionEnd = elementY + this.sections[i].offsetHeight;
                    this.sectionBoundaries.push([elementY, sectionEnd, sectionEnd - elementY]);
                }
                this.sectionBoundaries.sort(this.sortSectionBoundaries);
            },

            /**
             * Sort calculated section boundaries
             *              *
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
                var focusCandidates = [], focusIntersection, focusHeight;

                if (this.scrollerFullHeight - view.bottom < this.options.stickyOffsetBottom) {
                    // always choose last section if the view is near the end
                    var lastSection = this.sectionBoundaries.length - 1;
                    focusIntersection = this.getIntersection(view.top, view.bottom, this.sectionBoundaries[lastSection][0], this.sectionBoundaries[lastSection][1]);
                    focusCandidates.push({
                        index: lastSection,
                        focusIntersection: focusIntersection,
                        focusHeight: (null === focusIntersection) ? null : (focusIntersection[1] - focusIntersection[0]),
                        section: this.sections[lastSection],
                        isFull: focusHeight >= this.sectionBoundaries[lastSection][2],
                        asClosest: false
                    });
                } else if (view.top - this.options.viewMarginTop < this.options.stickyOffsetTop) {
                    // always choose first section if the view is near the beginning
                    focusIntersection = this.getIntersection(view.top, view.bottom, this.sectionBoundaries[0][0], this.sectionBoundaries[0][1]);
                    focusCandidates.push({
                        index: 0,
                        focusIntersection: focusIntersection,
                        focusHeight: (null === focusIntersection) ? null : (focusIntersection[1] - focusIntersection[0]),
                        section: this.sections[0],
                        isFull: focusHeight >= this.sectionBoundaries[0][2],
                        asClosest: false
                    });
                } else {
                    // determine using intersections
                    for (var i = 0; i < this.sectionBoundaries.length; ++i) {
                        focusIntersection = this.getIntersection(view.top, view.bottom, this.sectionBoundaries[i][0], this.sectionBoundaries[i][1]);
                        if (null !== focusIntersection) {
                            focusCandidates.push({
                                index: i,
                                focusIntersection: focusIntersection,
                                focusHeight: focusIntersection[1] - focusIntersection[0],
                                section: this.sections[i],
                                isFull: focusHeight >= this.sectionBoundaries[i][2],
                                asClosest: false
                            });
                        }
                    }

                    // use section closest to the top of the view if no intersection was found
                    if (0 === focusCandidates.length) {
                        var sectionClosest = null, sectionOffsetTop;
                        for (i = 0; i < this.sectionBoundaries.length; ++i) {
                            sectionOffsetTop = Math.abs(this.sectionBoundaries[i][0] - view.top);
                            if (null === sectionClosest || sectionClosest[1] > sectionOffsetTop) {
                                sectionClosest = [i, sectionOffsetTop];
                            }
                        }

                        focusCandidates.push({
                            index: sectionClosest[0],
                            focusIntersection: null,
                            focusHeight: null,
                            section: this.sections[sectionClosest[0]],
                            isFull: false,
                            asClosest: true
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
            chooseFocus: function (focusCandidates, view) {
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
                                    return b.focusHeight - a.focusHeight - that.options.topDownWeight;
                                }
                                return b.focusHeight - a.focusHeight;
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
                            for (var i = 0; i < focusCandidates.length; ++i) {
                                if (focusCandidates[i].focusIntersection[0] <= viewFocusLineOffset && focusCandidates[i].focusIntersection[1] >= viewFocusLineOffset) {
                                    chosenCandidate = focusCandidates[i];
                                    break;
                                }
                            }

                            // find nearest candidate if no direct intersection exists
                            if (null === chosenCandidate) {
                                for (var i = 0; i < focusCandidates.length; ++i) {
                                    focusCandidates[i].focusRatioOffsetDistance = Math.min(
                                        Math.abs(focusCandidates[i].focusIntersection[0] - viewFocusLineOffset),
                                        Math.abs(focusCandidates[i].focusIntersection[1] - viewFocusLineOffset)
                                    );
                                }
                                focusCandidates.sort(this.sortFocusCandidatesByDistanceToFocusRatioOffset);
                                chosenCandidate = focusCandidates[0];
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
                    this.debugFocusLine = $('<div class="scrollwatch-debug-focus-line" style="position:absolute;left:0;top:0;width:100%;border-top:1px solid red;border-bottom:1px solid yellow;z-index:10000;box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);"></div>')
                        .appendTo(window === this.scroller ? document.body : this.scroller)
                    ;
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
                if (this.bound) {
                    throw new Error('Already bound');
                }

                var that = this;

                this.updateEventHandler = function () {
                    that.pulse();
                };

                $(this.scroller).scroll(this.updateEventHandler);

                if (window === this.scroller) {
                    $(this.scroller).resize(this.updateEventHandler);
                }

                this.pulse();
            },

            /**
             * Detach the watcher
             */
            detach: function () {
                if (!this.bound) {
                    throw new Error('Not bound');
                }

                $(this.scroller).unbind('scroll', this.updateEventHandler);

                if (window === this.scroller) {
                    $(this.scroller).unbind('resize');
                }
            },

            /**
             * Pulse the watcher
             */
            pulse: function () {
                if (this.paused) {
                    return;
                }

                // update state
                this.updateSectionBoundaries();
                this.updateScrollerHeight();

                // get view and focus candidates
                var view = this.getView();
                var focusCandidates = this.determineFocusCandidates(view);

                // resolve candidates and invoke the callback
                if (this.options.multiMode) {
                    // multi mode, pass all candidates
                    this.callback(focusCandidates, view, this);
                } else {
                    // choose single focus
                    var focus = this.chooseFocus(focusCandidates, view);

                    if (
                        !this.options.throttle
                        || !this.lastFocus
                        || focus.index !== this.lastFocus.index
                    ) {
                        this.callback(focus, view, this);
                        this.lastFocus = focus;
                    }
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
            this.currentActiveItem = null;
        };

        ScrollWatch.ActiveClassMapper.prototype = {
            /**
             * Handle focus change
             *
             * @param {Number} newIndex
             */
            handleFocusChange: function (newIndex) {
                // remove class from the current active item
                if (null !== this.currentActiveItem) {
                    $(this.items[this.currentActiveItem]).removeClass(this.activeClass);
                }

                // add class to the new active item
                if (newIndex < this.items.length) {
                    $(this.items[newIndex]).addClass(this.activeClass);
                }
                this.currentActiveItem = newIndex;
            },

            /**
             * Create watcher callback
             *
             * @returns {Function}
             */
            getWatcherCallback: function() {
                var that = this;

                return function (focus) {
                    that.handleFocusChange(focus.index);
                };
            }
        };

        // jQuery methods

        /**
         * Apply watcher to the matched elements as sections
         * 
         * @param {Function} callback function to call when the focus changes
         * @param {Object}   options  watcher option map
         * @returns {ScrollWatch.Watcher|Boolean} false if no sections were matched
         */
        $.fn.scrollWatch = function (callback, options) {
            if (this.length > 1) {
                var watcher = new ScrollWatch.Watcher(this, callback, options);
                watcher.attach();

                return watcher;
            } else {
                return false;
            }
        };

        /**
         * Apply watcher to the matched elements as sections and map
         * the active focus as an "active class" to the respective item.
         *
         * @param {Array|jQuery|String} items       array of DOM elements, jQuery object or a selector
         * @param {String}              activeClass name to add to the active item
         * @param {Object}              options     watcher option map
         */
        $.fn.scrollWatchMapTo = function(items, activeClass, options) {
            if (this.length > 1) {
                if ('string' === typeof items) {
                    items = $(items);
                }

                var watcher = new ScrollWatch.Watcher(
                    this,
                    new ScrollWatch.ActiveClassMapper(items, activeClass).getWatcherCallback(),
                    options
                );
                watcher.attach();

                return watcher;
            } else {
                return false;
            }
        };
    })(Shira.ScrollWatch || (Shira.ScrollWatch = {}));
})(Shira || (Shira = {}), jQuery);
