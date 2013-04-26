/**
 * ScrollWatch 1.2 / jQuery plugin
 * Support: all modern browsers and MSIE 7+
 * @author ShiraNai7 <shira.cz>
 */
void function ($) {

    "use_strict";

    var isWebkit = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
            || /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);

    /**
     * Get Y position of DOM element, relative to given offset parent
     * @param elem DOM element
     * @param offsetParent DOM element or null
     * @return integer
     */
    function getElementY(elem, offsetParent)
    {
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
    }

    /**
     * Get absolute Y position of DOM element
     * @param elem DOM element
     * @return integer
     */
    function getElementYAbs(elem)
    {
        var y = 0;
        do y += elem.offsetTop;
        while((elem = elem.offsetParent));

        return y;
    }

    /**
     * Get intersection of two inervals
     * Requirements: aLeft < aRight, bLeft < bRight
     *
     * @param aLeft
     * @param aRight
     * @param bLeft
     * @param bRight
     * @return array|null [left, right] or null
     */
    function getIntersection(aLeft, aRight, bLeft, bRight)
    {
        if (bLeft > aRight || bRight < aLeft) {
            // no intersection
            return null;
        }
        return [
            aLeft > bLeft ? aLeft : bLeft,
            aRight > bRight ? bRight : aRight
        ];
    }

    /**
     * Apply ScrollWatch to given elements
     *
     * @param options
     * @return object|bool
     */
    $.fn.scrollWatch = function (options) {

        options = $.extend({}, $.fn.scrollWatch.defaults, options);

        if (typeof options.callback !== 'function') {
            throw new Error('The "callback" option is required and must be a function');
        }

        // prepare
        var
            elems = this,
            sections,
            scroller = $(options.scroller),
            scrollerIsWindow = (window === options.scroller),
            scrollerVisibleHeight,
            scrollerFullHeight,
            debugFocusLine,
            paused = false
        ;

        // abort if no elements
        if (0 === elems.length) {
            return false;
        }

        /**
         * Compute section boundaries
         */
        var sectionEnd;
        function computeSectionBoundaries()
        {
            sections = [];
            elems.each(function (){
                var elementY = getElementY(this, options.scroller)
                sectionEnd = elementY + this.offsetHeight;
                sections.push([elementY, sectionEnd, sectionEnd - elementY]);
            });
            sections.sort(function (a, b) { return a[0] - b[0]; });
        }

        /**
         * Compute scroller height
         */
        function computeScrollerHeight()
        {
            if (scrollerIsWindow) {
                //scrollerHeight = $(document.body).height();
                scrollerVisibleHeight = $(document.body).height();
                scrollerFullHeight = document.getElementsByTagName('html')[0].scrollHeight;
            } else {
                scrollerVisibleHeight = options.scroller.clientHeight;
                scrollerFullHeight = options.scroller.scrollHeight;
            }
        }

        /**
         * Update focus
         */
        function updateFocus()
        {
            if (paused) {
                return;
            }

            // determine current view
            var
                viewTop = scroller.scrollTop(),
                //viewBottom = viewTop + scroller.height()
                viewBottom = viewTop + scrollerVisibleHeight
            ;

            // apply view margins
            if (0 !== options.viewMarginTop) {
                viewTop += options.viewMarginTop;
            }
            if (0 !== options.viewMarginBottom) {
                viewBottom = Math.max(viewTop + 1, viewBottom - options.viewMarginBottom);
            }

            // collect focus candidates
            var focusCandidates = [], focusIntersection, focusHeight;
            if (scrollerFullHeight - viewBottom < 5) {

                // always choose last section if the view is near the end
                var lastSection = sections.length - 1;
                focusIntersection = getIntersection(viewTop, viewBottom, sections[lastSection][0], sections[lastSection][1]);
                focusCandidates.push({
                    index: lastSection,
                    focusIntersection: focusIntersection,
                    focusHeight: (null === focusIntersection) ? null : (focusIntersection[1] - focusIntersection[0]),
                    elem: elems[lastSection],
                    isFull: focusHeight >= sections[lastSection][2],
                    asClosest: false
                });

            } else if (viewTop - options.viewMarginTop < 5) {

                // always choose first section if the view is near the beginning
                focusIntersection = getIntersection(viewTop, viewBottom, sections[0][0], sections[0][1]);
                focusCandidates.push({
                    index: 0,
                    focusIntersection: focusIntersection,
                    focusHeight: (null === focusIntersection) ? null : (focusIntersection[1] - focusIntersection[0]),
                    elem: elems[0],
                    isFull: focusHeight >= sections[0][2],
                    asClosest: false
                });

            } else {

                // determine using intersections
                for (var i = 0; i < sections.length; ++i) {
                    focusIntersection = getIntersection(viewTop, viewBottom, sections[i][0], sections[i][1]);
                    if (null !== focusIntersection) {
                        focusCandidates.push({
                            index: i,
                            focusIntersection: focusIntersection,
                            focusHeight: focusIntersection[1] - focusIntersection[0],
                            elem: elems[i],
                            isFull: focusHeight >= sections[i][2],
                            asClosest: false
                        });
                    }
                }

                // use section closest to the top of the view if no intersection was found
                if (0 === focusCandidates.length) {

                    var sectionClosest = null, sectionOffsetTop;
                    for (i = 0; i < sections.length; ++i) {
                        sectionOffsetTop = Math.abs(sections[i][0] - viewTop);
                        if (null === sectionClosest || sectionClosest[1] > sectionOffsetTop) {
                            sectionClosest = [i, sectionOffsetTop];
                        }
                    }

                    focusCandidates.push({
                        index: sectionClosest[0],
                        focusIntersection: null,
                        focusHeight: null,
                        elem: elems[sectionClosest[0]],
                        isFull: false,
                        asClosest: true
                    });

                }

            }

            // process candidates
            if (!options.multiMode) {

                if (1 === focusCandidates.length) {

                    // single candidate available
                    options.callback(focusCandidates[0], viewTop, viewBottom);

                } else {

                    // multiple candidate resolution
                    var finalFocus = null;
                    switch (options.resolutionMode) {

                        // choose using focus height
                        case 0:
                            focusCandidates.sort(function (a, b) {
                                if (a.index < b.index) return b.focusHeight - a.focusHeight - options.topDownWeight;
                                return b.focusHeight - a.focusHeight;
                            });
                            finalFocus = focusCandidates[0];
                            break;

                        // choose using intersection or distance from the focus line
                        case 1:

                            var viewFocusLineOffset = viewTop + (viewBottom - viewTop) * options.focusRatio + options.focusOffset;
                            
                            if (options.debugFocusLine) {
                                debugFocusLine.style.top = Math.round(viewFocusLineOffset) + 'px';
                            }

                            // find direct intersection with the focus line
                            for (i = 0; i < focusCandidates.length; ++i) {
                                if (focusCandidates[i].focusIntersection[0] <= viewFocusLineOffset && focusCandidates[i].focusIntersection[1] >= viewFocusLineOffset) {
                                    finalFocus = focusCandidates[i];
                                    break;
                                }
                            }

                            // find nearest candidate if no direct intersection exists
                            if (null === finalFocus) {
                                for (i = 0; i < focusCandidates.length; ++i) {
                                    focusCandidates[i].focusRatioOffsetDistance = Math.min(
                                        Math.abs(focusCandidates[i].focusIntersection[0] - viewFocusLineOffset),
                                        Math.abs(focusCandidates[i].focusIntersection[1] - viewFocusLineOffset)
                                    );
                                }
                                focusCandidates.sort(function (a, b){
                                    return a.focusRatioOffsetDistance - b.focusRatioOffsetDistance;
                                });
                                finalFocus = focusCandidates[0];
                            }
                            break;

                        // invalid
                        default:
                            throw new Error('Invalid resolution mode');

                    }

                    // use the chosen focus
                    options.callback(finalFocus, viewTop, viewBottom);

                }

            } else {

                // all candidates (multi mode)
                options.callback(focusCandidates, viewTop, viewBottom);

            }
        }

        /**
         * Update all
         */
        function updateAll()
        {
            computeSectionBoundaries();
            computeScrollerHeight();
            updateFocus();
        }
        
        // create focus ratio debug line
        if (options.debugFocusLine && 1 === options.resolutionMode) {
            debugFocusLine = document.createElement('div');
            debugFocusLine.style.width = '100%';
            debugFocusLine.style.height = '0';
            debugFocusLine.style.position = 'absolute';
            debugFocusLine.style.left = '0';
            debugFocusLine.style.top = '0';
            debugFocusLine.style.borderTop = '1px solid yellow';
            debugFocusLine.style.borderBottom = '1px solid red';
            debugFocusLine.style.zIndex = '9999';
            debugFocusLine = $(debugFocusLine).appendTo(scrollerIsWindow ? document.body : scroller)[0];
        }

        // initial update
        updateAll();

        // update focus when scroller view changes
        scroller.scroll(updateFocus);

        // update all when scroller dimensions change (window only)
        if (scrollerIsWindow) {
            scroller.resize(updateAll);
        }

        // return controller object
        return {
            unbind: function () {
                scroller.unbind('scroll', updateFocus);
                if (scrollerIsWindow) {
                    scroller.unbind('resize', updateAll);
                }
            },
            update: function () {
                updateAll();
            },
            pause: function () {
                paused = true;
            },
            resume: function () {
                paused = false;
                updateFocus();
            }
        };

    };

    /**
     * Apply ScrollWatch to given elements and reflect it into simple menu
     *
     * @param sections section selector or jQuery object
     * @param options
     * @return object|bool
     */
    $.fn.scrollWatchMenu = function(sections, options) {
        var
            items,
            activeItem = null,
            scroller = $(isWebkit ? document.body : 'html'),
            scrollWatch
        ;

        // compose options
        options = $.extend({}, $.fn.scrollWatch.defaults, $.fn.scrollWatchMenu.defaults, options, {
            callback: function (focus) {
                if (focus.index < items.length && focus.index !== activeItem) {
                    if (null !== activeItem) {
                        $(items[activeItem]).removeClass(options.menuActiveClass);
                    }
                    $(items[focus.index]).addClass(options.menuActiveClass);
                    activeItem = focus.index;
                }
            }
        });

        // find items
        items = $(this)[('*' === options.menuItemSelector) ? 'children' : 'find'](options.menuItemSelector);

        // initial hash
        if (0 !== options.menuScrollOffset && window.location.hash) {
            $('a', items).each(function () {
                if (this.hash === window.location.hash) {
                    var
                        hash = this.hash.substr(1),
                        target = $('#' + hash + ', ' + '[name=' + hash + ']')
                    ;
                    if (target.length > 0) {
                        var targetY = getElementYAbs(target.get(0));
                        setTimeout(function () {
                            if (Math.abs(targetY - scroller.scrollTop()) < options.menuInitialHashOffsetTolerance) {
                                scroller.scrollTop(targetY + options.menuScrollOffset);
                            }
                        }, 100);
                        return false;
                    }
                }
                return true;
            });
        }

        // handle links
        if (0 !== options.menuScrollOffset || options.menuScrollSpeed > 0) {
            $('a[href^=#]', items).click(function () {
                var
                    hash = this.hash.substr(1),
                    target = $('#' + hash + ', ' + '[name=' + hash + ']'),
                    currentScrollTop = scroller.scrollTop(),
                    targetY
                ;

                // change hash and return to original position
                scrollWatch.pause();
                window.location.hash = hash;
                scroller.scrollTop(currentScrollTop);
                scrollWatch.resume();

                // get target and its position
                if (target.length > 0) {
                    target = target.get(0);
                    targetY = getElementYAbs(target) + options.menuScrollOffset;
                } else {
                    return true;
                }

                // animate if speed is defined
                if (options.menuScrollSpeed > 0) {

                    // stop current animation
                    if (scroller.is(':animated')) {
                        scroller.stop(true, true);
                    }

                    // animate
                    $(scroller).animate({scrollTop: targetY}, options.menuScrollSpeed);

                } else {

                    // instant
                    scroller.scrollTop(targetY);

                }

                return false;

            });
        }

        // apply scrollwatch
        return scrollWatch = $(sections).scrollWatch(options);
    };

    // defaults
    $.fn.scrollWatch.defaults = {
        callback: null,
        scroller: window,
        multiMode: false,
        resolutionMode: 0,
        topDownWeight: 0,
        viewMarginTop: 0,
        viewMarginBottom: 0,
        focusRatio: 0.38196601125010515,
        focusOffset: 0,
        debugFocusLine: false
    };
    $.fn.scrollWatchMenu.defaults = {
        menuActiveClass: 'active',
        menuItemSelector: '*',
        menuScrollOffset: 0,
        menuScrollSpeed: 500,
        menuInitialHashOffsetTolerance: 40
    };

}(jQuery);
