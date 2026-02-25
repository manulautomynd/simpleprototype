document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the map centered on the USA
    const map = L.map('map').setView([37.8, -96], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let territoriesData = [];
    let geojson;

    // UI Elements
    const infoPanel = document.getElementById('info-panel');
    const territoryName = document.getElementById('territory-name');
    const territoryColorLabel = document.getElementById('territory-color-label');
    const zipCodesList = document.getElementById('zip-codes');

    try {
        // 1. Fetch Territory Configuration
        console.log('Fetching territories.json...');
        const configResponse = await fetch('territories.json');
        if (!configResponse.ok) throw new Error(`Failed to load territories.json (${configResponse.status})`);
        const config = await configResponse.json();
        territoriesData = config.territories;
        console.log('Territories loaded:', territoriesData);

        // 2. Fetch US States GeoJSON
        console.log('Fetching US States GeoJSON...');
        // Using a more stable URL for US States GeoJSON
        const geoUrl = 'https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json';
        const geoResponse = await fetch(geoUrl);
        if (!geoResponse.ok) throw new Error(`Failed to load US States GeoJSON (${geoResponse.status})`);
        const statesData = await geoResponse.json();
        console.log('States GeoJSON loaded:', statesData);

        // Helper to find territory by state code
        const getTerritoryForState = (stateName) => {
            if (!stateName) return null;
            const normalizedName = stateName.trim().toLowerCase();
            return territoriesData.find(t => 
                t.states.some(s => s.trim().toLowerCase() === normalizedName)
            );
        };

        // Style function
        function style(feature) {
            // Check common property names for state name
            const props = feature.properties;
            const stateName = props.name || props.NAME || props.State || props.STATE_NAME;
            const territory = getTerritoryForState(stateName);
            
            return {
                fillColor: territory ? territory.color : '#bdc3c7',
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: territory ? 0.7 : 0.3
            };
        }

        // Hover listeners
        function highlightFeature(e) {
            var layer = e.target;
            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.9
            });
            layer.bringToFront();
        }

        function resetHighlight(e) {
            geojson.resetStyle(e.target);
        }

        // Click listener
        function onEachFeature(feature, layer) {
            const stateName = feature.properties.name || feature.properties.NAME || feature.properties.State;
            
            // Add pointer cursor on hover
            layer.on('mouseover', function() {
                this.getElement().style.cursor = 'pointer';
            });

            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: (e) => {
                    const territory = getTerritoryForState(stateName);
                    displayTerritoryInfo(territory, stateName);
                }
            });
        }

        function displayTerritoryInfo(territory, stateName) {
            if (!territory) {
                infoPanel.style.display = 'block';
                territoryName.textContent = stateName;
                territoryColorLabel.textContent = "No Territory Assigned";
                zipCodesList.innerHTML = '<li>N/A</li>';
                return;
            }

            infoPanel.style.display = 'block';
            territoryName.textContent = `${stateName} (${territory.name})`;
            territoryColorLabel.textContent = territory.color;
            territoryColorLabel.style.color = territory.color;

            zipCodesList.innerHTML = '';
            
            // Get zip codes specific to the clicked state
            const stateZips = territory.zipcodes[stateName] || [];
            
            if (stateZips.length === 0) {
                zipCodesList.innerHTML = '<li>No specific zip codes listed for this state yet.</li>';
            } else {
                stateZips.forEach(zip => {
                    const li = document.createElement('li');
                    li.textContent = zip;
                    zipCodesList.appendChild(li);
                });
            }
        }

        // Add GeoJSON to map
        geojson = L.geoJson(statesData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);

        // Add Legend
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            let labels = ['<strong>Territories</strong>'];
            
            territoriesData.forEach(t => {
                labels.push(
                    '<i style="background:' + t.color + '"></i> ' + t.name
                );
            });

            div.innerHTML = labels.join('<br>');
            return div;
        };
        legend.addTo(map);

    } catch (error) {
        console.error('Detailed Map Error:', error);
        alert(`Error: ${error.message}\n\nPlease check the browser console (F12) for details.`);
    }
});
