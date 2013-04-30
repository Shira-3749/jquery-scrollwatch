# jQuery ScrollWatch 1.3

jQuery plugin to implement navigation or any other functionality based on current scrolling position of the page or inside a custom element.

See [demo.html](demo.html) for an example.

## Functionality

- determining which section on the page (or inside custom element with scrolling) is active
- choosing single section if there are more candidates - based on visible height or "focus line"
- managing navigation consisting of hash links (links that point to specific part of the content by using a `#` in their href attribute)

## Browser support

Tested in Firefox, Google Chrome, Safari, Opera and MSIE 7+

## Known limitations

- hash links between different instances are not fully supported (yet)



----------



## Usage

The plugin provides two jQuery methods you can use.

### `$(sections).scrollWatch(options);`

This is the "main" method. It attaches scrollwatch to the given scroller (`window` by default) and matches sections according to current scrolling position.

- **sections** - selector of or array of elements that represent all the possible sections
- **options** - object with various settings

With this method it is up to you to implement what is going to happen.

Example:

    $(window).load(function () {

        var scrollWatch = $('div.section').scrollWatch({
            callback: function (focus) {
                // do something based on current focus
                // the focus parameter is explained below in the option table (callback)
            }
            // more options here
        });

    });

### `$(menu).scrollWatchMenu(sections, options);`

This method makes it easy to show active section in a navigation menu.

- **menu** - selector or element that contains the menu items
- **sections** - selector of or array of elements that represent all the possible sections
- **options** - object with various settings

Example:

    $(window).load(function () {

        var scrollWatch = $('ul#menu').scrollWatchMenu('div.section', {
            // options here
        });

    });

## Required CSS

The following CSS rule is required for scroll calculations to work properly.

    html, body {height: 100%;}

## Return value

Both `$().scrollWatch()` and `$().scrollWatchMenu()` return an object with following methods:

- **update()** - recalculate section boundaries and update current focus
  -  should be called on the when size of contents in the scroller element (usually entire page) change dynamically (ajax-loaded content, open/close features etc.)
- **updateFocus()** - update current focus only
- **unbind()** - unbind and disable the ScrollWatch instance
- **pause()** - suspend focus update
- **resume()** - resume focus update
- **setOption(name, value)** - change given option at runtime
  - it is your responsibility to call `update()` or `updateFocus()` if necessary

`$().scrollWatchMenu()` specific methods:

- **setMenuOption()** - change given menu option at runtime
- **instantScroll(pageY, [scrollerY])** - instantly scroll at given coordinate in page and optionally also the scroller
- **animatedScroll(pageY, [scrollerY])** - smoothly scroll at given coordinate in page and optionally also the scroller

## Options

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
      <td>window</td>
      <td>Element to watch for scrolling events (must have <code>position: relative or absolute</code> if not window)</td>
    </tr>
    
    <tr>
      <th>resolutionMode</th>
      <td>0</td>
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
      <th>callback</th>
      <td>required</td>
      
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
      <th>focusRatio</th>
      <td>0.3819..</td>
      <td>Percentage of the view height that determines position of the focus line.</td>
    </tr>

    <tr>
      <th>focusOffset</th>
      <td>0</td>
      <td>
        Offset added to the focus line position after <strong>focusRatio</strong> is applied. (Set <strong>focusRatio</strong> to zero if you wish to use the  <strong>focusOffset</strong> only).
      </td>
    </tr>

    <tr>
      <th>debugFocusLine</th>
      <td>false</td>
      <td>Display position of the focus line (for debugging purposes).</td>
    </tr>
    
    <tr>
      <th>topDownWeight</th>
      <td>0</td>
      <td>Extra focus height added to the section if it preceedes the other (used in resolutionMode 0 only).</td>
    </tr>
    
    <tr>
      <th>viewMarginTop</th>
      <td>0</td>
      <td>Height of an area at the top of the view to be excluded (e.g. navigation menu with position: fixed).</td>
    </tr>
    
    <tr>
      <th>viewMarginBottom</th>
      <td>0</td>
      <td>Height of an area at the bottom of the view to be excluded (e.g. navigation menu with position: fixed).</td>
    </tr>
    
    <tr>
      <th>multiMode</th>
      <td>false</td>
      <td>Enabling this turns 'focus' argument of callback into an array and no resolution is performed.</td>
    </tr>
  </tbody>
</table>

### Menu options

These options are active only when `$(menuSelector).scrollWatchMenu(sectionSelector, options);` is used.

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
      <th>menuActiveClass</th>
      <td>active</td>
      <td>Class of the active menu item.</td>
    </tr>
    
    <tr>
      <th>menuItemSelector</th>
      <td>*</td>
      <td>Selector to match menu items, <code>*</code> matches all direct children of the menu element.</td>
    </tr>
    
    <tr>
      <th>menuWindowScrollOffset</th>
      <td>0</td>
      <td>Scroll offset applied to the page when a menu link containing a hash is clicked.</td>
    </tr>

    <tr>
      <th>menuScrollerScrollOffset</th>
      <td>0</td>
      <td>Scroll offset applied to the scroller (not window) when a menu link containing a hash is clicked.</td>
    </tr>
 
    <tr>
      <th>menuScrollSpeed</th>
      <td>500</td>
      <td>Scroll animation speed, <code>0</code> to disable.</td>
    </tr>

    <tr>
      <th>menuScrollerScrollSpeed</th>
      <td>null</td>
      <td>Scroller scroll animation speed, <code>menuScrollSpeed</code> is used when not specified.</td>
    </tr>
    
    <tr>
      <th>menuInitialHashOffsetTolerance</th>
      <td>40</td>
      <td>Maximum scroll position difference to apply the <code>menuScrollOffset</code> after page load.</td>
    </tr>

    <tr>
      <th>menuHandleHashLinks</th>
      <td>true</td>
      <td>Handle clicking on hash links in the menu.</td>
    </tr>
  </tbody>
</table>