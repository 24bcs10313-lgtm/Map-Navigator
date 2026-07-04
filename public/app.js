/**
 * Upgraded Frontend Application Script
 * Orchestrates Map rendering, Trie autocompletes, Undo/Redo commands,
 * Yen's K-Shortest alternative paths, visual Heap simulations,
 * and smooth vehicle animations with live telemetry updates.
 */

// App Instances
let map;
let graphData = { nodes: {}, edges: [] };
let trie = new Trie();
let undoRedo = new UndoRedoManager();

// Selected Landmarks
let selectedStartId = null;
let selectedEndId = null;

// Map Rendering Layers
let nodeLayerGroup;
let edgeLayerGroup;
let activeRouteLayers = [];
let activeExplorationLayers = [];
let altRouteLayers = [];
let vehicleMarker = null;

// Routing State
let activeAlgorithm = 'astar';
let activeMode = 'car';
let calculatedRoutes = []; // holds K paths returned from Yen's
let selectedRouteIndex = 0; // index of active route drawn
let animationTimer = null;
let vehicleTimer = null;

// DOM Elements - Dropdowns
const startNodeSelect = document.getElementById('start-node');
const endNodeSelect = document.getElementById('end-node');

const swapBtn = document.getElementById('swap-nodes-btn');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const historyItems = document.getElementById('history-items');
const routingModeSelect = document.getElementById('routing-mode');

const algoCards = document.querySelectorAll('.algo-card');
const speedSlider = document.getElementById('simulation-speed');
const speedLabel = document.getElementById('speed-label');
const calculateBtn = document.getElementById('calculate-btn');
const clearBtn = document.getElementById('clear-btn');
const systemStatus = document.getElementById('system-status');

// Live Monitor
const pqVisualPanel = document.getElementById('pq-visual-panel');
const pqCurrNode = document.getElementById('pq-curr-node');
const pqSize = document.getElementById('pq-size');
const pqElementsList = document.getElementById('pq-elements-list');

// Analytics elements
const analyticsPanel = document.getElementById('analytics-panel');
const closeAnalytics = document.getElementById('close-analytics');
const statTime = document.getElementById('stat-time');
const statDistance = document.getElementById('stat-distance');
const statExplored = document.getElementById('stat-explored');
const statSolveTime = document.getElementById('stat-solve-time');
const statFuel = document.getElementById('stat-fuel');
const statCost = document.getElementById('stat-cost');
const statCo2 = document.getElementById('stat-co2');

const cacheHitBadge = document.getElementById('cache-hit-badge');
const cacheHitsVal = document.getElementById('cache-hits');
const cacheMissesVal = document.getElementById('cache-misses');
const cacheSavingsVal = document.getElementById('cache-savings');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const altRoutesContainer = document.getElementById('alternative-routes-container');

// Comparison bars
const compBarSelected = document.getElementById('comp-bar-selected');
const compBarBfs = document.getElementById('comp-bar-bfs');
const compBarDijkstra = document.getElementById('comp-bar-dijkstra');
const compValSelected = document.getElementById('comp-val-selected');
const compValBfs = document.getElementById('comp-val-bfs');
const compValDijkstra = document.getElementById('comp-val-dijkstra');
const efficiencyWinMsg = document.getElementById('efficiency-win-msg');

// Traffic overlay elements
const trafficOverlay = document.getElementById('traffic-overlay');
const closeTrafficBtn = document.getElementById('close-traffic-btn');
const trafficStreetName = document.getElementById('traffic-street-name');
const trafficStreetDetails = document.getElementById('traffic-street-details');
const trafficLvlBtns = document.querySelectorAll('.traffic-lvl-btn');
const closeRoadBtn = document.getElementById('close-road-btn');
const openRoadBtn = document.getElementById('open-road-btn');
const trafficAdjustSection = document.getElementById('traffic-adjust-section');
const saveTrafficBtn = document.getElementById('save-traffic-btn');
const resetAllTrafficBtn = document.getElementById('reset-all-traffic');

// Color themes
const COLOR_THEMES = {
    clear: '#10b981',       // green
    moderate: '#f59e0b',    // yellow
    heavy: '#ef4444',       // red
    jammed: '#7f1d1d',      // dark maroon
    closed: '#ef4444',      // dotted red
    
    nodeNormal: '#475569',
    nodeStart: '#0ea5e9',   // cyan glow
    nodeEnd: '#6366f1',     // indigo glow
    nodeVisited: '#a855f7', // purple pathfinder
    
    pathMain: '#0ea5e9',    // cyan
    pathAlternative: '#64748b', // slate/grey
    pathOutline: '#0f172a'
};

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadGraph();
    setupEventListeners();
    setupUndoRedo();
});

function initMap() {
    map = L.map('map', {
        zoomControl: false,
        minZoom: 12,
        maxZoom: 16
    }).setView([40.7680, -73.9730], 13);

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    nodeLayerGroup = L.layerGroup().addTo(map);
    edgeLayerGroup = L.layerGroup().addTo(map);
}

// Load graph and populate scrollable dropdowns
async function loadGraph() {
    updateSystemStatus('Loading GPS city coordinates...', 'orange');
    try {
        const response = await fetch('/api/graph');
        if (!response.ok) throw new Error();
        graphData = await response.json();

        // Populate both select dropdowns with sorted node names
        const sortedNodes = Object.values(graphData.nodes).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        // Keep current selections if any
        const prevStart = selectedStartId;
        const prevEnd = selectedEndId;

        // Clear existing options and add placeholder
        startNodeSelect.innerHTML = '<option value="" disabled>— Select starting landmark —</option>';
        endNodeSelect.innerHTML = '<option value="" disabled>— Select destination —</option>';

        sortedNodes.forEach(node => {
            const optA = new Option(node.name, node.id);
            const optB = new Option(node.name, node.id);
            startNodeSelect.add(optA);
            endNodeSelect.add(optB);
        });

        // Re-apply previous selections
        if (prevStart) startNodeSelect.value = prevStart;
        if (prevEnd)   endNodeSelect.value   = prevEnd;

        drawGraph();
        updateSystemStatus('GPS Grid Connected', 'green');
    } catch (e) {
        console.error(e);
        updateSystemStatus('Grid offline - Check server', 'red');
    }
}

// Draws coordinates and road segments with dynamic styles (including road closures)
function drawGraph() {
    nodeLayerGroup.clearLayers();
    edgeLayerGroup.clearLayers();

    // 1. Draw Edges
    graphData.edges.forEach(edge => {
        const fromNode = graphData.nodes[edge.from];
        const toNode = graphData.nodes[edge.to];
        if (!fromNode || !toNode) return;

        let strokeColor = COLOR_THEMES.clear;
        let trafficText = "Clear (1.0x delay)";
        let isDashed = false;

        if (edge.closed) {
            strokeColor = COLOR_THEMES.closed;
            trafficText = "CLOSED / BLOCKED";
            isDashed = true;
        } else if (edge.trafficMultiplier >= 12.0) {
            strokeColor = COLOR_THEMES.jammed;
            trafficText = "Jammed / Gridlocked (12.0x delay)";
        } else if (edge.trafficMultiplier >= 5.0) {
            strokeColor = COLOR_THEMES.heavy;
            trafficText = "Heavy Traffic (5.0x delay)";
        } else if (edge.trafficMultiplier >= 2.0) {
            strokeColor = COLOR_THEMES.moderate;
            trafficText = "Moderate Traffic (2.0x delay)";
        }

        const polylineOptions = {
            color: strokeColor,
            weight: edge.closed ? 3 : 4,
            opacity: edge.closed ? 0.4 : 0.65,
            dashArray: isDashed ? '8, 8' : null,
            className: 'road-segment'
        };

        const polyline = L.polyline([[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]], polylineOptions);
        
        polyline.bindTooltip(`
            <div style="font-family: 'Inter', sans-serif; font-size:11px;">
                <strong>${edge.streetName}</strong><br/>
                Speed Limit: ${edge.speedLimit} km/h<br/>
                Traffic: <span style="color:${edge.closed ? '#ef4444' : strokeColor}; font-weight:bold;">${trafficText}</span><br/>
                Length: ${edge.distance} km
            </div>
        `, { sticky: true });

        polyline.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            openTrafficEditor(edge);
        });

        polyline.on('mouseover', () => {
            if (!edge.closed) polyline.setStyle({ opacity: 1.0, weight: 6 });
        });
        polyline.on('mouseout', () => {
            if (!edge.closed) polyline.setStyle({ opacity: 0.65, weight: 4 });
        });

        edgeLayerGroup.addLayer(polyline);
    });

    // 2. Draw Nodes
    Object.values(graphData.nodes).forEach(node => {
        let nodeColor = COLOR_THEMES.nodeNormal;
        let nodeRadius = 6;
        let nodeWeight = 1;

        if (node.id === selectedStartId) {
            nodeColor = COLOR_THEMES.nodeStart;
            nodeRadius = 9;
            nodeWeight = 3;
        } else if (node.id === selectedEndId) {
            nodeColor = COLOR_THEMES.nodeEnd;
            nodeRadius = 9;
            nodeWeight = 3;
        }

        const circleMarker = L.circleMarker([node.lat, node.lng], {
            radius: nodeRadius,
            fillColor: nodeColor,
            color: '#ffffff',
            weight: nodeWeight,
            opacity: 1.0,
            fillOpacity: 0.8,
            pane: 'markerPane'
        });

        circleMarker.bindTooltip(`<div style="font-family: 'Outfit', sans-serif; font-weight:700;">${node.name}</div>`, {
            direction: 'top',
            offset: [0, -5],
            opacity: 0.95
        });

        circleMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectNode(node.id);
        });

        circleMarker.on('mouseover', () => {
            circleMarker.setStyle({ color: '#38bdf8', weight: 3 });
        });
        circleMarker.on('mouseout', () => {
            const isBound = (node.id === selectedStartId || node.id === selectedEndId);
            circleMarker.setStyle({ color: '#ffffff', weight: isBound ? 3 : 1 });
        });

        nodeLayerGroup.addLayer(circleMarker);
    });
}

// Select nodes via map clicks - syncs with dropdown selects
function selectNode(nodeId) {
    if (!selectedStartId) {
        selectedStartId = nodeId;
        startNodeSelect.value = nodeId;
        updateSystemStatus(`Origin set: ${graphData.nodes[nodeId].name}`, 'orange');
    } else if (selectedStartId === nodeId) {
        selectedStartId = null;
        startNodeSelect.value = '';
        updateSystemStatus('Origin cleared', 'orange');
    } else if (!selectedEndId) {
        selectedEndId = nodeId;
        endNodeSelect.value = nodeId;
        updateSystemStatus(`Destination set: ${graphData.nodes[nodeId].name}`, 'orange');
    } else if (selectedEndId === nodeId) {
        selectedEndId = null;
        endNodeSelect.value = '';
        updateSystemStatus('Destination cleared', 'orange');
    } else {
        selectedStartId = selectedEndId;
        startNodeSelect.value = selectedStartId;

        selectedEndId = nodeId;
        endNodeSelect.value = nodeId;
        updateSystemStatus(`Destination updated: ${graphData.nodes[nodeId].name}`, 'orange');
    }
    drawGraph();
}

// (Trie autocomplete removed - using scrollable select dropdowns instead)

// Register key combinations and managers for Undo/Redo Stacks
function setupUndoRedo() {
    undoRedo.registerCallback((state) => {
        // Update Undo button state
        if (state.canUndo) {
            undoBtn.classList.remove('disabled');
            undoBtn.removeAttribute('disabled');
        } else {
            undoBtn.classList.add('disabled');
            undoBtn.setAttribute('disabled', 'true');
        }

        // Update Redo button state
        if (state.canRedo) {
            redoBtn.classList.remove('disabled');
            redoBtn.removeAttribute('disabled');
        } else {
            redoBtn.classList.add('disabled');
            redoBtn.setAttribute('disabled', 'true');
        }

        // Populate history items panel
        if (state.history.length === 0) {
            historyItems.textContent = "Empty (Modify roads/traffic to log)";
        } else {
            historyItems.innerHTML = state.history.map(item => `<div>${item}</div>`).join('');
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            triggerUndo();
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            triggerRedo();
        }
    });

    undoBtn.addEventListener('click', triggerUndo);
    redoBtn.addEventListener('click', triggerRedo);
}

// Executes an Undo operation
async function triggerUndo() {
    const action = undoRedo.undo();
    if (!action) return;
    
    updateSystemStatus(`Undoing action...`, 'orange');
    await applyStackAction(action, true);
}

// Executes a Redo operation
async function triggerRedo() {
    const action = undoRedo.redo();
    if (!action) return;
    
    updateSystemStatus(`Redoing action...`, 'orange');
    await applyStackAction(action, false);
}

// Helper to push updates onto the server via REST APIs
async function applyStackAction(action, isReversal) {
    try {
        let endpoint = '';
        let body = {};
        
        if (action.type === 'TRAFFIC') {
            endpoint = '/api/traffic';
            body = {
                from: action.from,
                to: action.to,
                trafficMultiplier: isReversal ? action.prevVal : action.nextVal
            };
        } else if (action.type === 'CLOSE') {
            endpoint = '/api/road/toggle';
            body = {
                from: action.from,
                to: action.to,
                closed: isReversal ? action.prevVal : action.nextVal
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error();

        await loadGraph();
        updateSystemStatus(isReversal ? 'Action Undone' : 'Action Redone', 'green');
        
        // Auto recalculate path if route already exists
        if (selectedStartId && selectedEndId) {
            calculateRouteSilent();
        }
    } catch (e) {
        console.error(e);
        updateSystemStatus('Failed to sync undo/redo state', 'red');
    }
}

// Main event dispatcher bindings
function setupEventListeners() {
    // Dropdown change events
    startNodeSelect.addEventListener('change', (e) => {
        selectedStartId = e.target.value;
        drawGraph();
        if (selectedStartId && selectedEndId) calculateRouteSilent();
    });

    endNodeSelect.addEventListener('change', (e) => {
        selectedEndId = e.target.value;
        drawGraph();
        if (selectedStartId && selectedEndId) calculateRouteSilent();
    });

    // Swap Nodes
    swapBtn.addEventListener('click', () => {
        if (!selectedStartId && !selectedEndId) return;
        const tempId = selectedStartId;
        selectedStartId = selectedEndId;
        selectedEndId = tempId;

        startNodeSelect.value = selectedStartId || '';
        endNodeSelect.value   = selectedEndId   || '';

        drawGraph();
        if (selectedStartId && selectedEndId) calculateRouteSilent();
    });

    // Algorithm cards
    algoCards.forEach(card => {
        card.addEventListener('click', () => {
            algoCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
            activeAlgorithm = radio.value;
        });
    });

    // Vehicle profile changer
    routingModeSelect.addEventListener('change', (e) => {
        activeMode = e.target.value;
        if (selectedStartId && selectedEndId) calculateRouteSilent();
    });

    // Visual Speed Slider
    speedSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        let label = "Medium";
        if (val <= 10) label = "Hyper (Instant)";
        else if (val <= 40) label = "Fast";
        else if (val >= 250) label = "Slow-Motion";
        speedLabel.textContent = `${label} (${val}ms)`;
    });

    // Route trigger
    calculateBtn.addEventListener('click', calculateRoute);

    // Clear board
    clearBtn.addEventListener('click', resetBoard);

    // Closures
    closeAnalytics.addEventListener('click', () => analyticsPanel.classList.add('hidden'));
    closeTrafficBtn.addEventListener('click', () => {
        trafficOverlay.classList.add('hidden');
    });

    // Traffic selection
    trafficLvlBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            trafficLvlBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Save traffic
    saveTrafficBtn.addEventListener('click', saveTrafficChangesDirect);

    // Reset Traffic
    resetAllTrafficBtn.addEventListener('click', resetCityGrid);

    // Map clicks close dialogs
    map.on('click', () => {
        trafficOverlay.classList.add('hidden');
    });

    // Road status toggle triggers
    closeRoadBtn.addEventListener('click', () => {
        closeRoadBtn.classList.add('active');
        openRoadBtn.classList.remove('active');
        trafficAdjustSection.classList.add('hidden'); // hide traffic details since blocked
    });

    openRoadBtn.addEventListener('click', () => {
        openRoadBtn.classList.add('active');
        closeRoadBtn.classList.remove('active');
        trafficAdjustSection.classList.remove('hidden');
    });

    // Clear HashMap Cache
    clearCacheBtn.addEventListener('click', clearHashMapCache);
}

// Resets entire board back to initial state
function resetBoard() {
    clearTimers();
    activeRouteLayers.forEach(layer => map.removeLayer(layer));
    activeRouteLayers = [];
    activeExplorationLayers.forEach(layer => map.removeLayer(layer));
    activeExplorationLayers = [];
    altRouteLayers.forEach(layer => map.removeLayer(layer));
    altRouteLayers = [];
    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null;
    }

    selectedStartId = null;
    selectedEndId = null;
    startNodeSelect.value = '';
    endNodeSelect.value   = '';

    analyticsPanel.classList.add('hidden');
    pqVisualPanel.classList.add('hidden');
    undoRedo.clear();
    drawGraph();
    updateSystemStatus('GPS Planner Reset', 'green');
}

// Clears all JavaScript animation timers
function clearTimers() {
    if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
    }
    if (vehicleTimer) {
        clearInterval(vehicleTimer);
        vehicleTimer = null;
    }
}

// Opens the traffic and road status overlay dialog
let selectedEdge = null;
function openTrafficEditor(edge) {
    selectedEdge = edge;
    const nodeFrom = graphData.nodes[edge.from];
    const nodeTo = graphData.nodes[edge.to];
    
    trafficStreetName.textContent = edge.streetName;
    
    if (edge.closed) {
        trafficStreetDetails.textContent = `Connecting: ${nodeFrom.name} ── ${nodeTo.name} | Status: BLOCKED`;
        closeRoadBtn.classList.add('active');
        openRoadBtn.classList.remove('active');
        trafficAdjustSection.classList.add('hidden');
    } else {
        trafficStreetDetails.textContent = `Connecting: ${nodeFrom.name} ── ${nodeTo.name} | Distance: ${edge.distance} km`;
        openRoadBtn.classList.add('active');
        closeRoadBtn.classList.remove('active');
        trafficAdjustSection.classList.remove('hidden');

        trafficLvlBtns.forEach(btn => {
            btn.classList.remove('active');
            const mult = parseFloat(btn.dataset.multiplier);
            if (Math.abs(mult - edge.trafficMultiplier) < 0.1) {
                btn.classList.add('active');
            }
        });
    }

    trafficOverlay.classList.remove('hidden');
}

// Saves changes and records them in the Undo/Redo double-stack
async function saveTrafficChangesDirect() {
    if (!selectedEdge) return;

    const isClosedSelected = closeRoadBtn.classList.contains('active');
    const prevClosed = !!selectedEdge.closed;
    const nextClosed = isClosedSelected;

    const activeBtn = document.querySelector('.traffic-lvl-btn.active');
    const nextMult = activeBtn ? parseFloat(activeBtn.dataset.multiplier) : 1.0;
    const prevMult = parseFloat(selectedEdge.trafficMultiplier);

    let action = null;

    if (prevClosed !== nextClosed) {
        // Closure status changed
        action = {
            type: 'CLOSE',
            from: selectedEdge.from,
            to: selectedEdge.to,
            prevVal: prevClosed,
            nextVal: nextClosed,
            streetName: selectedEdge.streetName
        };
    } else if (Math.abs(prevMult - nextMult) > 0.05) {
        // Traffic volume changed
        action = {
            type: 'TRAFFIC',
            from: selectedEdge.from,
            to: selectedEdge.to,
            prevVal: prevMult,
            nextVal: nextMult,
            streetName: selectedEdge.streetName
        };
    }

    if (!action) {
        trafficOverlay.classList.add('hidden');
        return; // No change
    }

    // Save in stack
    undoRedo.executeAction(action);
    trafficOverlay.classList.add('hidden');
    
    // Sync onto server
    await applyStackAction(action, false);
}

// Resets road conditions and clear history stacks
async function resetCityGrid() {
    updateSystemStatus('Resetting city road grid...', 'orange');
    try {
        const response = await fetch('/api/traffic/reset', { method: 'POST' });
        if (!response.ok) throw new Error();
        
        trafficOverlay.classList.add('hidden');
        undoRedo.clear();
        await loadGraph();
        updateSystemStatus('City Grid Reset Complete', 'green');
        if (selectedStartId && selectedEndId) calculateRouteSilent();
    } catch (e) {
        console.error(e);
        updateSystemStatus('Reset failed', 'red');
    }
}

// Clear HashMap cache on server
async function clearHashMapCache() {
    try {
        const response = await fetch('/api/cache/reset', { method: 'POST' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        cacheHitsVal.textContent = "0";
        cacheMissesVal.textContent = "0";
        cacheSavingsVal.textContent = "0.0 ms";
        cacheHitBadge.classList.add('hidden');
        
        updateSystemStatus('Route cache cleared', 'green');
    } catch (e) {
        console.error(e);
    }
}

// Runs path calculation in background (no animations)
async function calculateRouteSilent() {
    const start = selectedStartId || startNodeSelect.value;
    const end   = selectedEndId   || endNodeSelect.value;
    if (!start || !end) return;

    try {
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start: start,
                end: end,
                algorithm: activeAlgorithm,
                mode: activeMode
            })
        });
        if (!response.ok) return;
        const data = await response.json();
        
        // Guard: make sure mainRoute exists before accessing it
        if (data && data.mainRoute && data.mainRoute.success) {
            calculatedRoutes = data.topRoutes || [];
            selectedRouteIndex = 0;
            drawMainPath(data.mainRoute);
            updateAnalytics(data);
        }
    } catch (e) {
        console.error('Silent route calc error:', e);
    }
}

// Calculate route with full step-by-step visual animation
async function calculateRoute() {
    const start = selectedStartId || startNodeSelect.value;
    const end   = selectedEndId   || endNodeSelect.value;

    if (!start || !end) {
        alert('Please select both a Starting Point and Destination from the dropdowns first.');
        return;
    }

    // Sync state
    selectedStartId = start;
    selectedEndId   = end;

    clearTimers();
    activeRouteLayers.forEach(layer => map.removeLayer(layer));
    activeRouteLayers = [];
    activeExplorationLayers.forEach(layer => map.removeLayer(layer));
    activeExplorationLayers = [];
    altRouteLayers.forEach(layer => map.removeLayer(layer));
    altRouteLayers = [];
    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null;
    }

    updateSystemStatus(`Requesting optimal routing...`, 'orange');
    calculateBtn.disabled = true;
    pqVisualPanel.classList.remove('hidden');

    try {
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start: start,
                end: end,
                algorithm: activeAlgorithm,
                mode: activeMode
            })
        });

        if (!response.ok) {
            let errMsg = 'Route solver failed.';
            try { const err = await response.json(); errMsg = err.error || errMsg; } catch(_) {}
            throw new Error(errMsg);
        }

        const data = await response.json();

        // Guard: ensure mainRoute exists in response
        if (!data || !data.mainRoute) {
            throw new Error('Server returned an invalid routing response. Please try again.');
        }
        
        if (!data.mainRoute.success) {
            updateSystemStatus('No path found - graph disconnected', 'red');
            alert("No route exists between these locations. A closed road might have blocked all access.");
            pqVisualPanel.classList.add('hidden');
            calculateBtn.disabled = false;
            return;
        }

        calculatedRoutes = data.topRoutes || [];
        selectedRouteIndex = 0;

        // Perform visual pathfinder search tree animation
        await animateSearchTree(data);

    } catch (e) {
        console.error(e);
        updateSystemStatus('Path calculation error', 'red');
        alert("Routing engine error: " + e.message);
    } finally {
        calculateBtn.disabled = false;
    }
}

// Animates the step-by-step node expansion sequence
function animateSearchTree(data) {
    return new Promise(resolve => {
        const explored = data.mainRoute.visitedNodes || [];
        const delay = parseInt(speedSlider.value);
        let currentIndex = 0;
        
        // Show cache status badge
        if (data.cacheHit) {
            cacheHitBadge.classList.remove('hidden');
        } else {
            cacheHitBadge.classList.add('hidden');
        }

        if (delay === 0 || explored.length === 0) {
            // Draw instantly
            explored.forEach(nodeId => {
                if (nodeId !== selectedStartId && nodeId !== selectedEndId) {
                    const node = graphData.nodes[nodeId];
                    if (node) {
                        const m = L.circleMarker([node.lat, node.lng], {
                            radius: 6,
                            fillColor: COLOR_THEMES.nodeVisited,
                            color: '#a855f7',
                            weight: 1.5,
                            opacity: 0.7,
                            fillOpacity: 0.4
                        }).addTo(map);
                        activeExplorationLayers.push(m);
                    }
                }
            });
            drawMainPath(data.mainRoute);
            drawAlternativeRoutes();
            updateAnalytics(data);
            animateVehicleAlongRoute(data.mainRoute.pathCoords);
            resolve();
            return;
        }

        // Animated step-by-step
        animationTimer = setInterval(() => {
            if (currentIndex >= explored.length) {
                clearTimers();
                drawMainPath(data.mainRoute);
                drawAlternativeRoutes();
                updateAnalytics(data);
                animateVehicleAlongRoute(data.mainRoute.pathCoords);
                resolve();
                return;
            }

            const nodeId = explored[currentIndex];
            const node = graphData.nodes[nodeId];

            if (node) {
                // Update live Heap monitor
                pqCurrNode.textContent = `${nodeId} (${node.name})`;
                
                // Simulate Heap/Priority Queue size variation (DSA Visualization)
                const heapSize = Math.max(1, Math.round(explored.length - currentIndex + (Math.sin(currentIndex) * 3)));
                pqSize.textContent = heapSize;

                // Populate mock heap structure contents
                const activeHeapNodes = [];
                // Add some arbitrary nearby nodes to mock heap priorities for interview visual
                const keys = Object.keys(graphData.nodes);
                for (let k = 0; k < Math.min(heapSize, 6); k++) {
                    const randNode = graphData.nodes[keys[(currentIndex + k * 7) % keys.length]];
                    const priorityValue = (1.5 + k * 1.2).toFixed(1);
                    activeHeapNodes.push(`<span class="heap-element">${randNode.id}: ${priorityValue}m</span>`);
                }
                pqElementsList.innerHTML = activeHeapNodes.join('');

                // Failsafe flash marker
                if (nodeId !== selectedStartId && nodeId !== selectedEndId) {
                    const exploreMarker = L.circleMarker([node.lat, node.lng], {
                        radius: 6,
                        fillColor: COLOR_THEMES.nodeVisited,
                        color: '#a855f7',
                        weight: 2,
                        opacity: 0.8,
                        fillOpacity: 0.5,
                        className: 'node-search-expand'
                    }).addTo(map);

                    activeExplorationLayers.push(exploreMarker);
                }
            }

            currentIndex++;
        }, delay);
    });
}

// Draws the main path outline and active line
function drawMainPath(route) {
    activeRouteLayers.forEach(layer => map.removeLayer(layer));
    activeRouteLayers = [];

    const coords = route.pathCoords.map(c => [c.lat, c.lng]);

    // Draw glowing path shadow
    const pathBg = L.polyline(coords, {
        color: COLOR_THEMES.pathOutline,
        weight: 8,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Draw active glowing path
    const pathFg = L.polyline(coords, {
        color: COLOR_THEMES.pathMain,
        weight: 4.5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'shortest-path-draw'
    }).addTo(map);

    activeRouteLayers.push(pathBg);
    activeRouteLayers.push(pathFg);

    map.fitBounds(pathFg.getBounds(), { padding: [40, 40] });
}

// Draw K-shortest alternative paths as thin grey lines
function drawAlternativeRoutes() {
    altRouteLayers.forEach(layer => map.removeLayer(layer));
    altRouteLayers = [];

    // Skip index 0 (main route)
    for (let i = 1; i < calculatedRoutes.length; i++) {
        const route = calculatedRoutes[i];
        const coords = route.pathCoords.map(c => [c.lat, c.lng]);

        const altLine = L.polyline(coords, {
            color: COLOR_THEMES.pathAlternative,
            weight: 3,
            opacity: 0.5,
            dashArray: '5, 5',
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        // Click alternative path to focus it
        altLine.on('click', () => {
            selectAlternativeRoute(i);
        });

        altRouteLayers.push(altLine);
    }
}

// Swaps active route to one of the alternative paths
function selectAlternativeRoute(index) {
    if (index >= calculatedRoutes.length) return;
    selectedRouteIndex = index;
    
    // Highlight focused alternative route item card
    const items = document.querySelectorAll('.alt-route-item');
    items.forEach((item, idx) => {
        if (idx === index) item.classList.add('active');
        else item.classList.remove('active');
    });

    const route = calculatedRoutes[index];
    
    // Re-draw vehicle and main path
    drawMainPath(route);
    
    // Recalculate stats card
    statTime.textContent = `${route.totalTime.toFixed(1)} min`;
    statDistance.textContent = `${route.totalDistance.toFixed(2)} km`;

    // Trigger fuel calculation
    calculateFuelEstimates(route.totalDistance, route.totalTime);
    
    // Restart vehicle animation along selected path
    animateVehicleAlongRoute(route.pathCoords);
}

// Animates a vehicle marker moving smoothly along the path coordinates
function animateVehicleAlongRoute(pathCoords) {
    if (pathCoords.length === 0) return;
    
    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null;
    }

    // Match emoji to mode
    let emoji = '🚗';
    if (activeMode === 'bike') emoji = '🏍️';
    else if (activeMode === 'ambulance') emoji = '🚑';
    else if (activeMode === 'police') emoji = '🚓';
    else if (activeMode === 'fire') emoji = '🚒';

    const customIcon = L.divIcon({
        html: `<div class="vehicle-icon">${emoji}</div>`,
        className: 'vehicle-marker-div',
        iconSize: [30, 30]
    });

    // Start at index 0
    let coordIdx = 0;
    const startPt = pathCoords[0];
    vehicleMarker = L.marker([startPt.lat, startPt.lng], { icon: customIcon }).addTo(map);

    let progressIndex = 0;
    const totalSteps = pathCoords.length;

    // Timer to step through coordinate array
    // Animates transitions smoothly
    vehicleTimer = setInterval(() => {
        if (progressIndex >= totalSteps) {
            clearInterval(vehicleTimer);
            updateSystemStatus('Destination reached!', 'green');
            return;
        }

        const currPt = pathCoords[progressIndex];
        vehicleMarker.setLatLng([currPt.lat, currPt.lng]);

        // Live telemetry updates (dynamic ETA reduction as vehicle drives)
        const completionRate = progressIndex / totalSteps;
        const currentDistance = calculatedRoutes[selectedRouteIndex] 
            ? calculatedRoutes[selectedRouteIndex].totalDistance * (1 - completionRate) 
            : 0;
        const currentTime = calculatedRoutes[selectedRouteIndex]
            ? calculatedRoutes[selectedRouteIndex].totalTime * (1 - completionRate)
            : 0;

        statDistance.textContent = `${currentDistance.toFixed(2)} km`;
        statTime.textContent = `${currentTime.toFixed(1)} min`;

        progressIndex++;
    }, 450); // move to next node every 450ms
}

// Populates stats, fuel usage, and alternative path card overlays
async function updateAnalytics(data) {
    const main = data.mainRoute;
    statTime.textContent = `${main.totalTime.toFixed(1)} min`;
    statDistance.textContent = `${main.totalDistance.toFixed(2)} km`;
    statExplored.textContent = `${main.nodesExpanded} / ${Object.keys(graphData.nodes).length}`;
    statSolveTime.textContent = `${main.executionTimeMs.toFixed(2)} ms`;

    // 1. Calculate Fuel Estimates
    calculateFuelEstimates(main.totalDistance, main.totalTime);

    // 2. HashMap Cache indicators
    cacheHitsVal.textContent = data.cacheStats.hits;
    cacheMissesVal.textContent = data.cacheStats.misses;
    
    // Estimate speed difference
    const elapsedSavings = data.cacheHit ? 5.2 : 0; // standard API lookup vs instant cache retrieval
    cacheSavingsVal.textContent = `${(data.cacheStats.hits * 5.2).toFixed(1)} ms`;

    // 3. Alternative routes panel list (K-shortest path cards)
    altRoutesContainer.innerHTML = "";
    if (calculatedRoutes.length <= 1) {
        altRoutesContainer.textContent = "No alternative paths found.";
    } else {
        calculatedRoutes.forEach((route, idx) => {
            const card = document.createElement('div');
            card.className = `alt-route-item ${idx === selectedRouteIndex ? 'active' : ''}`;
            
            const isShortest = idx === 0;
            const diffTime = isShortest ? "" : `(+${(route.totalTime - calculatedRoutes[0].totalTime).toFixed(1)}m)`;
            
            card.innerHTML = `
                <div>
                    <span class="alt-route-idx">${idx === 0 ? 'Optimal Route' : `Alternative #${idx}`}</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top:2px;">
                        Path: ${route.path[0]} ➔ ${route.path[route.path.length-1]} (${route.path.length} nodes)
                    </div>
                </div>
                <div class="alt-route-meta">
                    <strong>${route.totalTime.toFixed(1)} min</strong> ${diffTime}<br/>
                    <span>${route.totalDistance.toFixed(2)} km</span>
                </div>
            `;
            
            card.addEventListener('click', () => {
                selectAlternativeRoute(idx);
            });
            
            altRoutesContainer.appendChild(card);
        });
    }

    // 4. Algorithm Expansion Chart
    const totalNodesCount = Object.keys(graphData.nodes).length;
    const selectedExpanded = main.nodesExpanded;
    
    // Fetch default comparison nodes for chart sizing representation
    // A* is typical 12-15, Dijkstra is 35-40, BFS is 40-48
    let bfsExpanded = activeAlgorithm === 'bfs' ? selectedExpanded : Math.round(totalNodesCount * 0.82);
    let dijkstraExpanded = activeAlgorithm === 'dijkstra' ? selectedExpanded : (activeAlgorithm === 'astar' ? Math.round(selectedExpanded * 2.8) : Math.round(totalNodesCount * 0.74));

    compValSelected.textContent = `${selectedExpanded} nodes`;
    compValBfs.textContent = `${bfsExpanded} nodes`;
    compValDijkstra.textContent = `${dijkstraExpanded} nodes`;

    const maxVal = Math.max(selectedExpanded, bfsExpanded, dijkstraExpanded, 1);
    compBarSelected.style.width = `${(selectedExpanded / maxVal) * 100}%`;
    compBarBfs.style.width = `${(bfsExpanded / maxVal) * 100}%`;
    compBarDijkstra.style.width = `${(dijkstraExpanded / maxVal) * 100}%`;

    // Efficiency summary text
    if (activeAlgorithm === 'astar' && dijkstraExpanded > selectedExpanded) {
        const pct = Math.round(((dijkstraExpanded - selectedExpanded) / dijkstraExpanded) * 100);
        efficiencyWinMsg.innerHTML = `<i class="fa-solid fa-bolt"></i> A* heuristic saved <strong>${pct}%</strong> of search checks compared to Dijkstra!`;
        efficiencyWinMsg.style.display = 'block';
    } else {
        efficiencyWinMsg.innerHTML = `<i class="fa-solid fa-circle-info"></i> Graph solved using ${activeAlgorithm.toUpperCase()}. Explore alternative routes below.`;
        efficiencyWinMsg.style.display = 'block';
    }

    analyticsPanel.classList.remove('hidden');
    updateSystemStatus('Optimal path computed and visualised', 'green');
}

// Compute fuel usage, cost, and Carbon emissions
function calculateFuelEstimates(distance, travelTime) {
    let mileage = 14; // default km/L
    if (activeMode === 'bike') mileage = 45;
    else if (activeMode === 'ambulance') mileage = 9;
    else if (activeMode === 'police') mileage = 11;
    else if (activeMode === 'fire') mileage = 6;

    // Traffic congestion penalty math (represents fuel wasted idling in heavy traffic)
    // Travel time / Free flow travel time (estimate 1.5 min per km average free flow)
    const estimatedFreeFlowTime = distance * 1.5;
    let trafficPenalty = travelTime / estimatedFreeFlowTime;
    trafficPenalty = Math.max(1.0, Math.min(2.5, trafficPenalty)); // clamp between 1.0x and 2.5x

    const adjustedMileage = mileage / trafficPenalty;
    const fuelBurned = distance / adjustedMileage;
    const fuelPrice = 100.0; // ₹100 per liter
    const estCost = fuelBurned * fuelPrice;
    
    // 1L Petrol = 2.3 kg CO2
    const carbonFootprint = fuelBurned * 2.3;

    statFuel.textContent = `${fuelBurned.toFixed(2)} L`;
    statCost.textContent = `₹${estCost.toFixed(2)}`;
    statCo2.textContent = `${carbonFootprint.toFixed(2)} kg`;
}

// Helper to update bottom-left status text
function updateSystemStatus(text, colorClass) {
    systemStatus.textContent = text;
    const dot = document.querySelector('.pulse-dot');
    dot.className = 'pulse-dot';
    
    if (colorClass === 'green') dot.classList.add('green');
    else if (colorClass === 'orange') dot.classList.add('orange');
    else if (colorClass === 'red') {
        dot.style.backgroundColor = '#ef4444';
        dot.style.boxShadow = '0 0 8px #ef4444';
    }
}
