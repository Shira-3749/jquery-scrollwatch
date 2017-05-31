ScrollWatch
###########

jQuery plugin for determining active sections on the page based on scrolling.

`Online demo <http://htmlpreview.github.io/?http://github.com/ShiraNai7/jquery-scrollwatch/blob/master/demo.html>`_

.. contents::
   :depth: 2


Features
********

- determining active section(s)
- mapping a class to a list of elements (e.g. menu items)
- many options, including multiple modes of resolution
- works with zoom


Browser support
***************

Tested in Mozilla Firefox, Google Chrome, Safari, Opera and MSIE 7+.


Usage
*****

The plugin provides two jQuery methods:

.. NOTE::

   If the sections are inside a custom scrollable element, that element **must** have
   ``position: relative``, ``absolute`` or ``fixed``.


``$(sections).scrollWatch(callback[, options])``
================================================

Attaches a watcher to the given sections. The callback is then invoked when the focus changes, according to options.

- ``sections`` - selector or an array of elements that represent all the possible sections
- ``callback`` - function to invoke when the focus changes
- ``options`` - object with various settings (see list far below)


Callback arguments
------------------

.. code:: javascript

   $('div.section').scrollWatch(function (focus, view, watcher) {
       // do something with the current focus
   });


1. | ``Object|Object[] focus`` - the current focus, an object with the following properties:
   | (if ``resolutionMode`` is ``none``, it will be an array of those objects

   - ``index`` - section number (0-based)
   - ``intersection`` - ``null`` or ``[y1, y2]``
   - ``section`` - DOM element of the section

2. ``Object view`` - the current view, an object with the following properties:

   - ``top`` - top coordinate of the view
   - ``bottom`` - bottom coordinate of the view

3. ``Shira.ScrollWatch.Watcher watcher`` - instance of the current watcher


``$(sections).scrollWatchMapTo(items[, activeClass, options])``
===============================================================

Attaches a watcher to the given sections and maps the current focus to the respective
item using the specified *active class*.

- ``sections`` - selector or an array of elements that represent all the possible sections
- ``items`` - selector or an array of elements to map the "active class" to
- ``activeClass`` - class name to add to the active item (defaults to ``"active"``)
- ``options`` - object with various settings (see list far below)


Example
-------

.. code:: javascript

   $('div.section').scrollWatchMapTo('#menu > li');


List of supported options
=========================

====================== ================== ========================================================
Option                 Default            Description
====================== ================== ========================================================
``scroller``           ``null``           DOM element to watch for scrolling events.

                                          It must be an ``HTMLElement`` or ``Window``.

                                          If no element is given the first found scrollable
                                          offset parent or ``Window`` will be used instead.
---------------------- ------------------ --------------------------------------------------------
``resolutionMode``     ``"height"``       Determines how the active section is chosen,
                                          one of:

                                          - ``height`` - section that is occupying the largest
                                            portion of the view is chosen
                                          - ``focus-line`` - section that is directly intersecting
                                            or is closest to the focus line is chosen
                                          - ``custom`` - use a custom resolver
                                          - ``none`` - no resolution is performed (all candidates
                                            will be passed to the callback)
---------------------- ------------------ --------------------------------------------------------
``viewMarginTop``      ``0``              Height of an area at the top of the view to be excluded.
---------------------- ------------------ --------------------------------------------------------
``viewMarginBottom``   ``0``              Height of an area at the bottom of the view to be
                                          excluded.
---------------------- ------------------ --------------------------------------------------------
``stickyOffsetTop``    ``5``              Height of an area at the top of the scroller that, if
                                          intersected by the top of the view, forces the first
                                          section to be active regardless of other conditions.
---------------------- ------------------ --------------------------------------------------------
``stickyOffsetBottom`` ``5``              Height of an area at the bottom of the scroller that, if
                                          intersected by the bottom of the view, forces the last
                                          section to be active regardless of other conditions.
---------------------- ------------------ --------------------------------------------------------
``throttle``           ``true``           When enabled, the callback is invoked only when the
                                          active section changes

                                          When disabled, the callback is invoked on every pulse
                                          (e.g. on scroll and resize).

                                          This option has no effect when ``resolutionMode`` is
                                          ``none``.
====================== ================== ========================================================


Options specific to ``resolutionMode`` = ``height``
---------------------------------------------------

====================== ================== ========================================================
Option                 Default            Description
====================== ================== ========================================================
``topDownWeight``      ``0``              Extra focus height added to the section if it precedes
                                          the other. This can be used to prefer earlier sections
                                          to later ones.
---------------------- ------------------ --------------------------------------------------------
====================== ================== ========================================================


Options for ``resolutionMode`` = ``focus-line``
-----------------------------------------------

====================== ================== ========================================================
Option                 Default            Description
====================== ================== ========================================================
``focusRatio``         ``0.3819..``       Percentage of the view height that determines position
                                          of the focus line.
---------------------- ------------------ --------------------------------------------------------
``focusOffset``        ``0``              Offset added to position of the focus line position
                                          after ``focusRatio`` is applied.

                                          Set ``focusRatio`` to ``0`` if you wish to use the
                                          ``focusOffset`` as an absolute value.
---------------------- ------------------ --------------------------------------------------------
``debugFocusLine``     ``false``          When enabled, position of the focus line will be
                                          displayed when scrolling

                                          Intended for debugging purposes.
====================== ================== ========================================================


Options for ``resolutionMode`` = ``custom``
-------------------------------------------

====================== ================== ========================================================
Option                 Default            Description
====================== ================== ========================================================
``resolver``           none (required)    Function to invoke when a focus candidate resolution is
                                          needed. It must choose and return a single focus object.

                                          The following arguments are passed to the function:

                                          1. ``Object[] candidates`` - an array of focus objects,
                                             each object has the following properties:

                                             - ``index`` - section number (0-based)
                                             - ``intersection`` - ``null`` or ``[y1, y2]``
                                             - ``section`` - DOM element of the section
====================== ================== ========================================================
