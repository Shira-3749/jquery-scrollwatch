# ScrollWatch

jQuery plugin for determining active sections on the page based on viewport scrolling.


## Demo

See `demo.html` for an example.


## Features

- determining which section on the page (or inside a custom scrollable element) is currently active
- many options, including multiple modes of resolution (visible height, focus line, custom, none)
- mapping the active section to an "active class" on some list of elements (e.g. menu items)
- works with zoom (even in MSIE < 9)


## Browser support

Tested in Mozilla Firefox, Google Chrome, Safari, Opera and MSIE 7+.


## Usage

The plugin provides two jQuery methods you can use:


### $(sections).scrollWatch(callback[, options])

Attaches a watcher to the given sections. The callback is then invoked when the focus
changes, according to options.

**Warning:** if the sections are inside a scrollable element, that element **must** have `position: relative`, `absolute` or `fixed`.

- **sections** - selector or an array of elements that represent all the possible sections
- **callback** - function to invoke when the focus changes
- **options** - object with various settings (see list far below)

**Returns:** an instance of `Shira.ScrollWatch.Watcher` or `false` if no sections were given / matched.


#### Callback arguments

- **0** - the current focus, an object with the following keys (if **resolutionMode** is **none**, it will be an array of those objects):
    - **index** - section number (0 based)
    - **intersection** - null or an array with top coordinate as element 0 and bottom coordinate as element 1
    - **section** - DOM element of the section
- **1** - the current view, an object with the following keys:
    - **top** - top coordinate of the view
    - **bottom** - bottom coordinate of the view
- **2** - an instance of `Shira.ScrollWatch.Watcher`


#### Example:

    $(document).ready(function () {
        $('div.section').scrollWatch(function (focus) {
            console.log(focus);
        });
    });


### $(sections).scrollWatchMapTo(items[, activeClass, options])

Attaches a watcher to the given sections and maps the current focus as an "active class"
to the respective item.

**Warning:** if the sections are inside a scrollable element, that element **must** have `position: relative`, `absolute` or `fixed`.

- **sections** - selector or an array of elements that represent all the possible sections
- **items** - selector or an array of elements to map the "active class" to
- **activeClass** - class name to add to the active item (defaults to "active")
- **options** - object with various settings (see list far below)

**Returns:** an instance of `Shira.ScrollWatch.Watcher` or `false` if no sections were given / matched.


#### Example:

    $(document).ready(function () {
        $('div.section').scrollWatchMapTo('#menu > li');
    });


### Options

List of all available options.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>scroller</th>
            <td>null</td>
            <td>DOM element to watch for scrolling events. <strong>It must be the window or an element with <code>position: relative</code>, <code>absolute</code> or <code>fixed</code>.</strong> If no element is given, <code>window</code> or the first scrollable offset parent will be used instead.</td>
        </tr>
        <tr>
            <th>resolutionMode</th>
            <td>"height"</td>
            <td>Determines how the active section is chosen: 
                <ul>
                    <li><strong>height</strong> - section that is occupying the largest portion of the view is chosen</li>
                    <li><strong>focus-line</strong> - section that is directly intersecting or is closest to the focus line is chosen</li>
					<li><strong>custom</strong> - use custom resolver</li>
                    <li><strong>none</strong> - no resolution is performed (all candidates will be passed to the callback)</li>
                </ul>
            </td>
        </tr>
        <tr>
            <th>viewMarginTop</th>
            <td>0</td>
            <td>Height of an area at the top of the view to be excluded.</td>
        </tr>
        <tr>
            <th>viewMarginBottom</th>
            <td>0</td>
            <td>Height of an area at the bottom of the view to be excluded.</td>
        </tr>
        <tr>
            <th>stickyOffsetTop</th>
            <td>5</td>
            <td>Height of an area at the top of the scroller that, if intersected by the top of the view, forces the first section to be active regardless of other conditions.</td>
        </tr>
        <tr>
            <th>stickyOffsetBottom</th>
            <td>5</td>
            <td>Height of an area at the bottom of the scroller that, if intersected by the bottom of the view, forces the last section to be active regardless of other conditions.</td>
        </tr>
        <tr>
            <th>throttle</th>
            <td>true</td>
            <td>When enabled, the callback is invoked only when the active section changes. When disabled, the callback is invoked on every pulse (e.g. on scroll, resize). This has no effect when <strong>resolutionMode</strong> is <strong>none</strong>.</td>
        </tr>
        <tr>
    </tbody>
</table>


### Options specific to resolutionMode = "height"

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>topDownWeight</th>
            <td>0</td>
            <td>Extra focus height added to the section if it precedes the other. This can be used to prefer earlier sections to later ones.</td>
        </tr>
    </tbody>
</table>


### Options specific to resolutionMode = "focus-line"

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>focusRatio</th>
            <td>0.3819..</td>
            <td>Percentage of the view height that determines position of the focus line.</td>
        </tr>
        <tr>
            <th>focusOffset</th>
            <td>0</td>
            <td>Offset added to position of the focus line position after <strong>focusRatio</strong> is applied. (Set <strong>focusRatio</strong> to 0 if you wish to use the <strong>focusOffset</strong> as an absolute value).</td>
        </tr>
        <tr>
            <th>debugFocusLine</th>
            <td>false</td>
            <td>When enabled, position of the focus line will be displayed when scrolling (for debugging purposes).</td>
        </tr>
    </tbody>
</table>


### Options specific to resolutionMode = "custom"

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>resolver</th>
            <td>required</td>
            <td>Function to invoke when a resolution is needed. It must choose and return <strong>a single focus object</strong>. The following arguments are passed to it:
                <ul>
                    <li><strong>0</strong> - array of focus objects (please refer to argument #0 in the "Callback arguments" section)</li>
                    <li><strong>1</strong> - the current view (an object with the following keys: <code>top, bottom</code>)</li>
					<li><strong>2</strong> - an instance of <code>Shira.ScrollWatch.Watcher</code></li>
                </ul>
            <ul><u</td>
        </tr>
    </tbody>
</table>
