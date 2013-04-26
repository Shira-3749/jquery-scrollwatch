# jQuery ScrollWatch 1.2

jQuery plugin to implement navigation or any other functionality based on current scrolling position of the page or inside a custom element.

## Browser support

Tested in Firefox, Google Chrome, Safari, Opera and MSIE 7+

## Usage

The plugin provides two jQuery methods you can use.

### `$(sectionSelector).scrollWatch(options);`

This is the "main" method. It attaches scrollwatch to the given scroller (`window` by default) and matches sections according to current scrolling position.

It is up to you to implement what is going to happen.

<pre>$(window).load(function () {

        var scrollWatch = $('div.section').scrollWatch({
            callback: function (focus) {
                // do something based on current focus
            }
            // more options here
        });

    });
    </pre>

### `$(menuSelector).scrollWatchMenu(sectionSelector, options);`

This method makes it easy to show active section in a navigation menu.

<pre>$(window).load(function () {

        var scrollWatch = $('ul#menu').scrollWatchMenu('div.section', {
            // options here
        });

    });
    </pre>

## Required CSS

The following CSS rule is required for scroll calculations to work properly:

    html, body {height: 100%;}

## Return value

Both `$(selector).scrollWatch(options);` and `$(menuSelector).scrollWatchMenu(sectionSelector, options);` return `false` on failure or an object with following properties:

*   **update** - function to recalculate section boundaries and update current focus
*   **unbind** - function to unbind and disable the scrollwatch instance
*   **pause** - function to suspend focus update
*   **resume** - function to resume focus update

### Notes

*   .update() function should be called on the scrollwatch instance if size of contents in the scroller element (usually entire page) change dynamically (ajax-loaded contents, open/close features etc.)
*   if applied to specific element (instead of window), that element should have *position: relative* or *absolute*

## Options

<table>
  <thead>
    <tr>
      <th>
        Name
      </th>
      
      <th>
        Default
      </th>
      
      <th>
        Description
      </th>
    </tr>
  </thead>
  
  <tbody>
    <tr>
      <th>
        scroller
      </th>
      
      <td>
        window
      </td>
      
      <td>
        element to watch for scrolling events
      </td>
    </tr>
    
    <tr>
      <th>
        resolutionMode
      </th>
      <td>
        0
      </td>
      
      <td>
        Determines how the active section is chosen <ul>
          <li>
            <strong>0</strong> - section that is occupying the largest portion of the view is chosen
          </li>
          <li>
            <strong>1</strong> - section that is directly in intersection or nearest to the focus line is chosen
          </li>
        </ul>
      </td>
    </tr>
    
    <tr>
      <th>
        callback
      </th>
      
      <td>
        required
      </td>
      
      <td>
        Callback invoked when the focus is updated. It is passed three arguments: <ol>
          <li>
            object with following properties (or array of those objects if multiMode = true): <ul>
              <li>
                <strong>index</strong> - section number (0 based)
              </li>
              <li>
                <strong>focusHeight</strong> - null or height of the section's visible area
              </li>
              <li>
                <strong>focusIntersection</strong> - null or an array with top coordinate as element 0 and bottom coordinate as element 1
              </li>
              <li>
                <strong>elem</strong> - DOM element of the section
              </li>
              <li>
                <strong>isFull</strong> - indicates that the section is entirely in the view area
              </li>
              <li>
                <strong>asClosest</strong> - indicates that the section was chosen as closest (because no section was directly in the view)
              </li>
            </ul>
          </li>
          
          <li>
            top coordinate of the view
          </li>
          <li>
            bottom coordinate of the view
          </li>
        </ol>
      </td>
    </tr>
    
    <tr>
      <th>
        focusRatio
      </th>
      
      <td>
        0.3819..
      </td>
      
      <td>
        Percentage of the view height that determines position of the focus line.
      </td>
    </tr>

    <tr>
      <th>
        focusOffset
      </th>
      
      <td>
        0
      </td>
      
      <td>
        Offset added to the focus line position after <strong>focusRatio</strong> is applied. (Set <strong>focusRatio</strong> to zero if you wish to use the  <strong>focusOffset</strong> only).
      </td>
    </tr>

    <tr>
      <th>
        debugFocusLine
      </th>
      
      <td>
        false
      </td>
      
      <td>
        Display position of the focus line (for debugging purposes).
      </td>
    </tr>
    
    <tr>
      <th>
        topDownWeight
      </th>
      
      <td>
	   0
      </td>
      
      <td>
        Extra focus height added to the section if it preceedes the other (used in resolutionMode 0 only).
      </td>
    </tr>
    
    <tr>
      <th>
        viewMarginTop
      </th>
      
      <td>
       0
      </td>
      
      <td>
        Height of an area at the top of the view to be excluded (e.g. navigation menu with position: fixed).
      </td>
    </tr>
    
    <tr>
      <th>
        viewMarginBottom
      </th>
      
      <td>
       0
      </td>
      
      <td>
        Height of an area at the bottom of the view to be excluded (e.g. navigation menu with position: fixed).
      </td>
    </tr>
    
    <tr>
      <th>
        multiMode
      </th>
      
      <td>
        false
      </td>
      
      <td>
        Enabling this turns 'focus' argument of callback into an array and no resolution is performed.
      </td>
    </tr>
  </tbody>
</table>

### Menu options

These options are active only when `$(menuSelector).scrollWatchMenu(sectionSelector, options);` is used.

<table>
  <thead>
    <tr>
      <th>
        Name
      </th>
      
      <th>
        Default
      </th>
      
      <th>
        Description
      </th>
    </tr>
  </thead>
  
  <tbody>
    <tr>
      <th>
        menuActiveClass
      </th>
      
      <td>
        active
      </td>
      
      <td>
        Class of the active menu item.
      </td>
    </tr>
    
    <tr>
      <th>
        menuItemSelector
      </th>
      
      <td>
        *
      </td>
      
      <td>
        Selector to match menu items, <code>*</code> matches all direct children of the menu element.
      </td>
    </tr>
    
    <tr>
      <th>
        menuScrollOffset
      </th>
      
      <td>
        0
      </td>
      
      <td>
        Scroll offset applied when a menu link containing a hash is clicked.
      </td>
    </tr>
    
    <tr>
      <th>
        menuScrollSpeed
      </th>
      
      <td>
        500
      </td>
      
      <td>
        Scroll animation speed, <code></code> to disable.
      </td>
    </tr>
    
    <tr>
      <th>
        menuInitialHashOffsetTolerance
      </th>
      
      <td>
        40
      </td>
      
      <td>
        Maximum scroll position difference to apply the <code>menuScrollOffset</code> after page load.
      </td>
    </tr>
  </tbody>
</table>