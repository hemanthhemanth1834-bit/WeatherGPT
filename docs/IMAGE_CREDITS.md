# WeatherGPT image credits

The photographs below replace synthetic decorative backgrounds. The existing layout boxes, aspect ratios, and interactive map/chart behavior are retained. These images are **archival illustrative context**, not current observations for the selected location.

| Usage | Source image | Attribution / license |
|---|---|---|
| Home hero | [A Stormy Atlantic](https://earthobservatory.nasa.gov/images/9063/a-stormy-atlantic) | NASA image courtesy of the GOES Project Science Office; NASA Earth Observatory material is generally reusable unless a page notes an exception. |
| Climate / synoptic panels and station-card backgrounds | [Cloudy Earth](https://earthobservatory.nasa.gov/images/85843/cloudy-earth) | NASA Earth Observatory image by Jesse Allen and Kevin Ward, using data from the MODIS Atmosphere Science Team; public NASA Earth Observatory imagery. |
| Decorative storm / rainfall background | [Hurricane Jeanne](https://earthobservatory.nasa.gov/images/4866/hurricane-jeanne) | NASA Tropical Rainfall Measuring Mission imagery; image and caption courtesy of Owen Kelley, Steve Lang, and Jeff Halverson. Historical event image, not current radar. |
| Interactive 3D Earth texture | [Equirectangular Earth for “LARGEST”](https://svs.gsfc.nasa.gov/3615/) | NASA/Goddard Space Flight Center Scientific Visualization Studio; Blue Marble Next Generation data courtesy of Reto Stöckli (NASA/GSFC) and NASA Earth Observatory. |
| Solar module photo context | [Photovoltaic Panels Reap Solar Energy on Farms](https://commons.wikimedia.org/wiki/File:Photovoltaic_Panels_Reap_Solar_Energy_on_Farms_%2820240809-USDA-RD-DCK-0327%29.jpg) | USDAgov photo by David Kosling; public domain as a U.S. federal government work, distributed via Wikimedia Commons. |

## Data-integrity and display rules

- A decorative background image is never evidence that the current selected location has that weather.
- Live RainViewer radar and NASA GIBS satellite layers continue to use their own fetched imagery, timestamp/status, and source labels.
- When live imagery fails, show an unavailable state on a neutral background instead of silently substituting an unrelated archival storm image.
- CSS uses background-size: cover in the existing containers; the established layout dimensions and responsive breakpoints are preserved.
- Weather icons, chart plots, geographic maps, and the interactive rooftop-layout preview remain functional data/UI elements rather than being replaced by decorative photos.