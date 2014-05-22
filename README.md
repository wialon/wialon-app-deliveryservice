# Delivery Service, version 1.9: (May 22, 2014)
This is WEB application based on Apps from Gurtam (http://apps.wialon.com).

## Description
Delivery Service app can be used by courier and other similar services. The application enables to set any number of points (addresses), indicate the expected period of their visiting, and then to build the best route. As the points it is also possible to use the geofences and POI, available to the user.  
From the additional parameters while building the route it’s possible to use the approximate average driving speed and the time, spent in the point.

## License
[The MIT License](../master/LICENSE-MIT)

## Requirements
 * Browser: Google Chome 20+, Firefox 15+, Safari 5+, IE 9+, Opera 10+
 * Language: русский, English, Deutsch
 * Components: SDK, Routes
 * URL params: Active SID, Base URL, Host URL, Language, Current user

## Quick start
Apps activation through the management system: http://docs.gurtam.com/en/hosting/cms/apps/apps  
Working with applications in the GPS tracking system: http://docs.gurtam.com/en/hosting/user/apps/apps

## Release History
 * v1.1 (January 27, 2013)  
- initial release

 * v1.2 (February 01, 2013)  
- add tooltips for map header (address, time interval)
- add results table time interval column
- add results table row click map centered
- add distance calculation via roads (by Google)
- dropdown interval list: increased interval from 5 to 15 minutes
- result calculation thickness changed
- add Guгtam maps.

 * v1.3 (March 10, 2013)  
- add pin stard & end points
- add route system via Yandex
- add week interval detour locations

 * v1.4 (April 24, 2013)
- English language supported.

 * v1.5 (June 14, 2013)
- Opera ifram fix

 * v1.6 (July 5, 2013)
- IE fix

 * v1.7 (Dec 13, 2013)
- leaflet used instead of Google Maps API
- Google Maps layers removed

 * v1.8 (May 12, 2014)
- add US metrics
- add time mask
- German language support

 * v1.9 (May 22, 2014)
- format address by user settings
- fix meters on Russian language
- redesign address dropdown, add support of Up/Down keyboard keys
- fix error on empty address route calculation
- change app logo