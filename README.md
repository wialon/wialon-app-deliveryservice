# Delivery Service, version 1.6: (July 5, 2013)
This is WEB application based on Apps from Gurtam (http://apps.wialon.com).

## Description
Delivery Service app can be used by courier and other similar services. The application enables to set any number of points (addresses), indicate the expected period of their visiting, and then to build the best route. As the points it is also possible to use the geofences and POI, available to the user.  
From the additional parameters while building the route it’s possible to use the approximate average driving speed and the time, spent in the point.  
The result of route plotting is displayed at Google map.

## License
LGPL: http://www.gnu.org/licenses/lgpl.html

## Requirements
 * Browser: Google Chome 20+, Firefox 15+, Safari 5+, IE 9+, Opera 10+
 * Language: русский, English
 * Components: SDK, Маршруты
 * URL params: Active SID, Base URL, Host URL

## Quick start
Apps activation through the management system: http://docs.gurtam.com/en/hosting/cms/apps/apps  
Working with applications in the GPS tracking system: http://docs.gurtam.com/en/hosting/user/apps/apps

## Release History
 * v1.1 (January 27, 2013)  
- initial release

 * v1.2 (February 01, 2013)  
- Добавлены тултипы к вершинам на карте (адрес, интервал времени).
- В таблице результатов добавлен столбец с интерваллм времени.
- При клике на строке в таблице результатов центрируется карта.
- Добавлен расчёт расстояний с учётом дорог(google).
- Увеличен шаг с 5 до 15 минут в выпадающем списке интервалов.
- Изменена толщина линий результата расчета.
- Добавлено отображение Guгtam maps.

 * v1.3 (March 10, 2013)  
- Добавлено закрепление начальной и конечных точек.
- В качестве системы прокладки маршрутов можно использовать Yandex.
- Объезд точек можно планировать в рамках недели.

 * v1.4 (April 24, 2013)
- English language supported.

 * v1.5 (June 14, 2013)
- Исправлена ошибка отображения в iframe в Opera.

 * v1.6 (July 5, 2013)
- Исправлена ошибка отображения в IE.
