document.addEventListener('DOMContentLoaded', async () => {
    // ── Initialize map centered on USA ──
    const map = L.map('map').setView([39.5, -98.35], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let territoriesData = [];
    let practitionersData = [];
    let practitionerMarkers = {};   // id -> L.circleMarker
    let activePractitionerId = null;
    let geojson;

    // ── UI Elements ──
    const infoPanel        = document.getElementById('info-panel');
    const territoryName    = document.getElementById('territory-name');
    const territoryColor   = document.getElementById('territory-color-label');
    const zipCodesList     = document.getElementById('zip-codes');
    const select           = document.getElementById('practitioner-select');
    const card             = document.getElementById('practitioner-card');
    const totalCount       = document.getElementById('total-count');

    // ── Marker styles ──
    const INACTIVE_STYLE = {
        radius: 7,
        fillColor: '#95a5a6',
        color: '#7f8c8d',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.85
    };
    const ACTIVE_STYLE = {
        radius: 10,
        fillColor: '#2ecc71',
        color: '#27ae60',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    };

    // ── Helpers ──
    function getInitials(name) {
        return name.replace(/^Dr\.\s*/, '')
                   .split(' ')
                   .map(w => w[0])
                   .join('')
                   .toUpperCase();
    }

    function getTerritoryById(id) {
        return territoriesData.find(t => t.id === id);
    }

    function getTerritoryForState(stateName) {
        if (!stateName) return null;
        const n = stateName.trim().toLowerCase();
        return territoriesData.find(t =>
            t.states.some(s => s.trim().toLowerCase() === n)
        );
    }

    // ── Show practitioner detail card ──
    function showPractitionerCard(p) {
        const territory = getTerritoryById(p.territory);
        document.getElementById('card-avatar').textContent    = getInitials(p.name);
        document.getElementById('card-name').textContent      = p.name;
        document.getElementById('card-status').textContent    = 'Active';
        document.getElementById('card-specialty').textContent = p.specialty;
        document.getElementById('card-phone').textContent     = p.phone;
        document.getElementById('card-email').textContent     = p.email;
        document.getElementById('card-address').textContent   = p.address;
        document.getElementById('card-territory').textContent = territory ? territory.name : '—';
        card.style.display = 'block';
    }

    function hidePractitionerCard() {
        card.style.display = 'none';
    }

    // ── Set active practitioner ──
    function setActivePractitioner(id) {
        // Reset previous
        if (activePractitionerId && practitionerMarkers[activePractitionerId]) {
            practitionerMarkers[activePractitionerId].setStyle(INACTIVE_STYLE);
            practitionerMarkers[activePractitionerId].setRadius(INACTIVE_STYLE.radius);
        }

        activePractitionerId = id;

        if (!id) {
            hidePractitionerCard();
            return;
        }

        const marker = practitionerMarkers[id];
        if (marker) {
            marker.setStyle(ACTIVE_STYLE);
            marker.setRadius(ACTIVE_STYLE.radius);
            marker.bringToFront();

            // Pan map to practitioner
            const p = practitionersData.find(pr => pr.id === id);
            if (p) {
                map.flyTo([p.lat, p.lng], 7, { duration: 0.8 });
                showPractitionerCard(p);
            }
        }
    }

    // ── Dropdown change handler ──
    select.addEventListener('change', () => {
        setActivePractitioner(select.value || null);
    });

    try {
        // 1. Fetch Territory Configuration
        const [configRes, practRes] = await Promise.all([
            fetch('territories.json'),
            fetch('practitioners.json')
        ]);
        if (!configRes.ok) throw new Error('Failed to load territories.json');
        if (!practRes.ok) throw new Error('Failed to load practitioners.json');

        const config    = await configRes.json();
        const practData = await practRes.json();
        territoriesData   = config.territories;
        practitionersData = practData.practitioners;

        totalCount.textContent = practitionersData.length;

        // 2. Populate dropdown
        practitionersData.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });

        // 3. Fetch US States GeoJSON & render territories
        const geoUrl = 'https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json';
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) throw new Error('Failed to load US States GeoJSON');
        const statesData = await geoRes.json();

        function style(feature) {
            const stateName = feature.properties.name || feature.properties.NAME;
            const territory = getTerritoryForState(stateName);
            return {
                fillColor: territory ? territory.color : '#bdc3c7',
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: territory ? 0.5 : 0.2
            };
        }

        function highlightFeature(e) {
            e.target.setStyle({ weight: 2, color: 'white', dashArray: '', fillOpacity: 0.75 });
            // Don't bringToFront — it breaks mouseout on adjacent states
        }

        function resetHighlight(e) {
            geojson.resetStyle(e.target);
        }

        function onEachFeature(feature, layer) {
            const stateName = feature.properties.name || feature.properties.NAME;
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: () => {
                    const territory = getTerritoryForState(stateName);
                    displayTerritoryInfo(territory, stateName);
                }
            });
        }

        function displayTerritoryInfo(territory, stateName) {
            infoPanel.style.display = 'block';
            if (!territory) {
                territoryName.textContent = stateName;
                territoryColor.textContent = 'No Territory Assigned';
                territoryColor.style.color = '#95a5a6';
                zipCodesList.innerHTML = '<li>N/A</li>';
                return;
            }
            territoryName.textContent = `${stateName}`;
            document.getElementById('territory-region-label').textContent = territory.name;
            document.getElementById('territory-region-label').style.color = territory.color;
            territoryColor.textContent = territory.color;
            territoryColor.style.color = territory.color;

            const stateZips = territory.zipcodes[stateName] || [];
            zipCodesList.innerHTML = '';
            const zipCount = document.getElementById('zip-count');
            if (zipCount) zipCount.textContent = stateZips.length;
            if (stateZips.length === 0) {
                zipCodesList.innerHTML = '<li>No zip codes listed.</li>';
            } else {
                stateZips.forEach(z => {
                    const li = document.createElement('li');
                    li.textContent = z;
                    zipCodesList.appendChild(li);
                });
            }
        }

        geojson = L.geoJson(statesData, { style, onEachFeature }).addTo(map);

        // 4. Add practitioner markers (gray dots)
        practitionersData.forEach(p => {
            const marker = L.circleMarker([p.lat, p.lng], INACTIVE_STYLE).addTo(map);

            // Tooltip on hover
            marker.bindTooltip(p.name, {
                direction: 'top',
                offset: [0, -8],
                className: 'practitioner-tooltip'
            });

            // Click marker to select practitioner
            marker.on('click', () => {
                select.value = p.id;
                setActivePractitioner(p.id);
            });

            practitionerMarkers[p.id] = marker;
        });

        // 5. Legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'legend');
            let html = '<strong>Territories</strong><br>';
            territoriesData.forEach(t => {
                html += `<i style="background:${t.color}"></i> ${t.name}<br>`;
            });
            html += '<br><strong>Practitioners</strong><br>';
            html += '<i style="background:#95a5a6"></i> Inactive<br>';
            html += '<i style="background:#2ecc71"></i> Active (selected)<br>';
            div.innerHTML = html;
            return div;
        };
        legend.addTo(map);

    } catch (error) {
        console.error('Map Error:', error);
        alert(`Error: ${error.message}\n\nCheck the console (F12) for details.`);
    }
});
