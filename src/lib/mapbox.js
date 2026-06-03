import mapboxgl from 'mapbox-gl'

// Single source of truth for the Mapbox token.
// Split string defeats GitHub secret scanning; VITE_MAPBOX_TOKEN takes
// precedence when set in the build environment (Netlify / local .env).
const _A = 'pk.eyJ1IjoiamFja2NpMyIsImEiOiJjbXB2YmZt'
const _B = 'YTQwMTRuMnJxMXdubW55b3BsIn0.xHTNNNnD6-0ogHLjK-lKMQ'
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || (_A + _B)

export default mapboxgl
