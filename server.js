/**
 * Node.js Server Entry Point - Advanced GPS & Routing Engine
 * Integrates:
 * 1. HashMap-based caching (route cache)
 * 2. Emergency routing modifiers
 * 3. Yen's K-Shortest Paths integration
 * 4. Road Closure toggle REST endpoints
 */

const express = require('express');
const path = require('path');
const { nodes, edges, getAdjacencyList } = require('./graph');
const { bfs, dfs, dijkstra, aStar, bellmanFord, yenKShortestPaths } = require('./router');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mutable in-memory store for edge statuses
let currentEdges = JSON.parse(JSON.stringify(edges));

// HashMap Route Cache
const routeCache = {};
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Helper to compute cache key based on query params and graph state
 */
function getCacheKey(start, end, algorithm, mode) {
    // Stringify only closed/modified traffic edges to optimize memory
    const modifiedState = currentEdges
        .filter(e => e.closed || e.trafficMultiplier !== 1.0)
        .map(e => `${e.from}_${e.to}_t${e.trafficMultiplier}_c${e.closed ? 1 : 0}`)
        .join('|');
    return `${start}-${end}-${algorithm}-${mode}-${modifiedState}`;
}

/**
 * Helper to build custom weights based on Vehicle Mode
 * - ambulance: ignores traffic (sirens), drives faster
 * - fire: ignores traffic, slightly slower than ambulance
 * - police: ignores speed limit, pays normal traffic
 * - bike: fixed low speed (15km/h), bypasses traffic
 * - car: normal
 */
function getCustomAdjacencyList(mode) {
    const list = getAdjacencyList(currentEdges);
    
    if (mode === 'car' || !mode) {
        return list; // default
    }

    const modifiedList = {};
    Object.keys(list).forEach(nodeId => {
        modifiedList[nodeId] = list[nodeId].map(edge => {
            let adjustedSpeed = edge.speedLimit;
            let adjustedTraffic = edge.trafficMultiplier;

            if (mode === 'ambulance') {
                adjustedSpeed = edge.speedLimit * 1.3; // ambulance speeds up
                adjustedTraffic = 0.5;                // sirens clear traffic
            } else if (mode === 'fire') {
                adjustedSpeed = edge.speedLimit * 1.25;
                adjustedTraffic = 0.7;
            } else if (mode === 'police') {
                adjustedSpeed = edge.speedLimit * 1.5; // chases speed
                adjustedTraffic = 1.0;                // bypasses standard congestion but pays minor blockages
            } else if (mode === 'bike') {
                adjustedSpeed = 15;                   // fixed speed
                adjustedTraffic = 1.0;                // bike ignores car traffic jam delay
            }

            // Recalculate weight in minutes
            const baseTime = (edge.distance / adjustedSpeed) * 60;
            const weight = baseTime * adjustedTraffic;

            return {
                ...edge,
                speedLimit: adjustedSpeed,
                trafficMultiplier: adjustedTraffic,
                weight: Number(weight.toFixed(4))
            };
        });
    });

    return modifiedList;
}

/**
 * GET /api/graph
 * Returns nodes and edges
 */
app.get('/api/graph', (req, res) => {
    res.json({
        nodes,
        edges: currentEdges
    });
});

/**
 * GET /api/cache-stats
 * Returns cache hit/miss statistics
 */
app.get('/api/cache-stats', (req, res) => {
    const total = cacheHits + cacheMisses;
    const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;
    res.json({
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: Number(hitRate.toFixed(1))
    });
});

/**
 * POST /api/cache/reset
 * Clears the route cache hashmap
 */
app.post('/api/cache/reset', (req, res) => {
    Object.keys(routeCache).forEach(k => delete routeCache[k]);
    cacheHits = 0;
    cacheMisses = 0;
    res.json({ success: true, message: "Route cache cleared." });
});

/**
 * POST /api/route
 * Computes shortest path and top 3 alternative paths
 */
app.post('/api/route', (req, res) => {
    const { start, end, algorithm, mode } = req.body;

    if (!start || !end) {
        return res.status(400).json({ error: "Start and End node IDs are required." });
    }
    if (!nodes[start] || !nodes[end]) {
        return res.status(400).json({ error: "Invalid start or end node ID." });
    }

    const cacheKey = getCacheKey(start, end, algorithm, mode);
    
    // Check HashMap Cache (Memoization)
    if (routeCache[cacheKey]) {
        cacheHits++;
        console.log(`[Cache Hit] Key: ${cacheKey}`);
        return res.json({
            cacheHit: true,
            cacheStats: { hits: cacheHits, misses: cacheMisses },
            ...routeCache[cacheKey]
        });
    }

    cacheMisses++;
    console.log(`[Cache Miss] Key: ${cacheKey}`);

    const adjacencyList = getCustomAdjacencyList(mode);
    let result;
    const startSolve = Date.now();

    // Select algorithm
    switch (algorithm) {
        case 'bfs':
            result = bfs(start, end, adjacencyList);
            break;
        case 'dfs':
            result = dfs(start, end, adjacencyList);
            break;
        case 'dijkstra':
            result = dijkstra(start, end, adjacencyList);
            break;
        case 'bellmanford':
            result = bellmanFord(start, end, adjacencyList);
            break;
        case 'astar':
        default:
            result = aStar(start, end, adjacencyList);
            break;
    }

    // Calculate Yen's K-Shortest Paths (Top 3) for comparison
    let topRoutes = [];
    if (result.success && ['astar', 'dijkstra', 'bellmanford'].includes(algorithm)) {
        topRoutes = yenKShortestPaths(start, end, adjacencyList, 3);
    } else if (result.success) {
        // For BFS/DFS, return the single path as the top option
        topRoutes = [{
            path: result.path,
            pathCoords: result.pathCoords,
            totalDistance: result.totalDistance,
            totalTime: result.totalTime
        }];
    }

    const responseData = {
        cacheHit: false,
        cacheStats: { hits: cacheHits, misses: cacheMisses },
        mainRoute: result,
        topRoutes
    };

    // Store in HashMap Cache
    routeCache[cacheKey] = responseData;

    res.json(responseData);
});

/**
 * POST /api/traffic
 * Updates traffic multiplier on a segment
 */
app.post('/api/traffic', (req, res) => {
    const { from, to, trafficMultiplier } = req.body;

    if (!from || !to || trafficMultiplier === undefined) {
        return res.status(400).json({ error: "Parameters 'from', 'to', and 'trafficMultiplier' are required." });
    }

    const multiplier = parseFloat(trafficMultiplier);
    let updated = false;

    currentEdges = currentEdges.map(edge => {
        const match = (edge.from === from && edge.to === to) || 
                      (!edge.isOneWay && edge.from === to && edge.to === from);
        if (match) {
            edge.trafficMultiplier = multiplier;
            updated = true;
        }
        return edge;
    });

    if (!updated) {
        return res.status(404).json({ error: "Road segment not found." });
    }

    res.json({ success: true, message: `Traffic updated between ${from} and ${to} to ${multiplier}x.` });
});

/**
 * POST /api/road/toggle
 * Opens or Closes a specific road segment
 */
app.post('/api/road/toggle', (req, res) => {
    const { from, to, closed } = req.body;

    if (!from || !to || closed === undefined) {
        return res.status(400).json({ error: "Parameters 'from', 'to', and 'closed' are required." });
    }

    let updated = false;
    currentEdges = currentEdges.map(edge => {
        const match = (edge.from === from && edge.to === to) || 
                      (!edge.isOneWay && edge.from === to && edge.to === from);
        if (match) {
            edge.closed = !!closed;
            updated = true;
        }
        return edge;
    });

    if (!updated) {
        return res.status(404).json({ error: "Road segment not found." });
    }

    res.json({ 
        success: true, 
        message: `Road between ${from} and ${to} is now ${closed ? 'CLOSED' : 'OPEN'}.` 
    });
});

/**
 * POST /api/traffic/reset
 * Resets traffic and road closures
 */
app.post('/api/traffic/reset', (req, res) => {
    currentEdges = JSON.parse(JSON.stringify(edges));
    res.json({ success: true, message: "Road conditions and closures reset to default." });
});

app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`  Map Navigator Server running on http://localhost:${PORT}`);
    console.log(`===================================================`);
});
