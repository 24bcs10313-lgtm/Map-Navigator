/**
 * Routing Engine for Map Navigator
 * Implements:
 * 1. Breadth-First Search (BFS) - Shortest path in terms of hop count
 * 2. Depth-First Search (DFS) - Deep recursive exploration (backtracking)
 * 3. Dijkstra's Algorithm - Priority Queue guided uniform cost search
 * 4. A* Search - Heuristic guided pathfinding (optimistic Haversine time)
 * 5. Bellman-Ford - Edges relaxation-based DP pathfinder
 * 6. Yen's K-Shortest Paths - Finds top K paths by edge-pruning
 */

const MinPriorityQueue = require('./priority-queue');
const { nodes, haversineDistance } = require('./graph');

// Max speed limit in our network (RFK Bridge is 65 km/h)
// Used to keep A* heuristic admissible (underestimates travel time)
const MAX_SPEED_LIMIT = 65;

// Estimate space complexity memory usage in bytes (for interview metrics)
function estimateMemory(numNodes, numEdges) {
    const nodeObjSize = 24; // size in bytes for simple JS objects
    const edgeObjSize = 48;
    return numNodes * nodeObjSize + numEdges * edgeObjSize;
}

/**
 * 1. Breadth-First Search (BFS)
 * Unweighted shortest path finder (finds path with minimum number of links)
 */
function bfs(startId, endId, adjacencyList) {
    const startTime = process.hrtime ? process.hrtime() : null;
    const startMs = Date.now();
    
    const queue = [[startId]];
    const visited = new Set();
    const visitedOrder = [];
    
    let foundPath = [];
    
    while (queue.length > 0) {
        const path = queue.shift();
        const currNodeId = path[path.length - 1];
        
        if (visited.has(currNodeId)) continue;
        visited.add(currNodeId);
        visitedOrder.push(currNodeId);
        
        if (currNodeId === endId) {
            foundPath = path;
            break;
        }
        
        const neighbors = adjacencyList[currNodeId] || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                queue.push([...path, edge.to]);
            }
        }
    }
    
    // Calculate path stats: sum up distances and travel times
    let totalDistance = 0;
    let totalTime = 0;
    for (let i = 0; i < foundPath.length - 1; i++) {
        const u = foundPath[i];
        const v = foundPath[i+1];
        const edge = adjacencyList[u].find(e => e.to === v);
        if (edge) {
            totalDistance += edge.distance;
            totalTime += edge.weight;
        }
    }
    
    const pathFound = foundPath.length > 0;
    const elapsedMs = startTime 
        ? (process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000) 
        : (Date.now() - startMs);

    return {
        success: pathFound,
        path: foundPath,
        pathCoords: pathFound ? foundPath.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })) : [],
        totalDistance: Number(totalDistance.toFixed(3)),
        totalTime: Number(totalTime.toFixed(3)),
        visitedNodes: visitedOrder,
        nodesExpanded: visitedOrder.length,
        executionTimeMs: Number(elapsedMs.toFixed(3)),
        memoryEstimateBytes: estimateMemory(visited.size, visitedOrder.length)
    };
}

/**
 * 2. Depth-First Search (DFS)
 * Explores recursively. Usually returns highly suboptimal paths.
 */
function dfs(startId, endId, adjacencyList) {
    const startTime = process.hrtime ? process.hrtime() : null;
    const startMs = Date.now();
    
    const visitedOrder = [];
    const visited = new Set();
    let foundPath = null;

    function explore(nodeId, path) {
        if (foundPath) return; // Stop if destination already reached

        visited.add(nodeId);
        visitedOrder.push(nodeId);

        if (nodeId === endId) {
            foundPath = [...path];
            return;
        }

        const neighbors = adjacencyList[nodeId] || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                explore(edge.to, [...path, edge.to]);
            }
        }
    }

    explore(startId, [startId]);

    let totalDistance = 0;
    let totalTime = 0;
    const pathFound = foundPath !== null;

    if (pathFound) {
        for (let i = 0; i < foundPath.length - 1; i++) {
            const u = foundPath[i];
            const v = foundPath[i+1];
            const edge = adjacencyList[u].find(e => e.to === v);
            if (edge) {
                totalDistance += edge.distance;
                totalTime += edge.weight;
            }
        }
    }

    const elapsedMs = startTime 
        ? (process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000) 
        : (Date.now() - startMs);

    return {
        success: pathFound,
        path: pathFound ? foundPath : [],
        pathCoords: pathFound ? foundPath.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })) : [],
        totalDistance: Number(totalDistance.toFixed(3)),
        totalTime: Number(totalTime.toFixed(3)),
        visitedNodes: visitedOrder,
        nodesExpanded: visitedOrder.length,
        executionTimeMs: Number(elapsedMs.toFixed(3)),
        memoryEstimateBytes: estimateMemory(visited.size, visitedOrder.length)
    };
}

/**
 * 3. Dijkstra's Algorithm
 * Shortest path search on weighted graphs using a Min-Heap.
 */
function dijkstra(startId, endId, adjacencyList) {
    const startTime = process.hrtime ? process.hrtime() : null;
    const startMs = Date.now();
    
    const distances = {}; // travel times (minutes)
    const distancesKm = {}; // cumulative distance in km
    const previous = {};
    const pq = new MinPriorityQueue();
    const visitedOrder = [];
    const visitedSet = new Set();

    Object.keys(adjacencyList).forEach(nodeId => {
        distances[nodeId] = Infinity;
        distancesKm[nodeId] = Infinity;
        previous[nodeId] = null;
    });

    distances[startId] = 0;
    distancesKm[startId] = 0;
    pq.insert(startId, 0);

    while (!pq.isEmpty()) {
        const { element: currNodeId, priority: currTime } = pq.extractMin();
        visitedOrder.push(currNodeId);
        visitedSet.add(currNodeId);

        if (currNodeId === endId) {
            break;
        }

        if (currTime === Infinity) {
            break;
        }

        const neighbors = adjacencyList[currNodeId] || [];
        for (const edge of neighbors) {
            const altTime = currTime + edge.weight;
            if (altTime < distances[edge.to]) {
                distances[edge.to] = altTime;
                distancesKm[edge.to] = distancesKm[currNodeId] + edge.distance;
                previous[edge.to] = currNodeId;
                pq.insert(edge.to, altTime);
            }
        }
    }

    const path = [];
    let curr = endId;
    while (curr) {
        path.push(curr);
        curr = previous[curr];
    }
    path.reverse();

    const pathFound = path.length > 0 && path[0] === startId;
    const elapsedMs = startTime 
        ? (process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000) 
        : (Date.now() - startMs);

    return {
        success: pathFound,
        path: pathFound ? path : [],
        pathCoords: pathFound ? path.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })) : [],
        totalDistance: pathFound ? Number(distancesKm[endId].toFixed(3)) : 0,
        totalTime: pathFound ? Number(distances[endId].toFixed(3)) : 0,
        visitedNodes: visitedOrder,
        nodesExpanded: visitedOrder.length,
        executionTimeMs: Number(elapsedMs.toFixed(3)),
        memoryEstimateBytes: estimateMemory(visitedSet.size + pq.size(), visitedOrder.length)
    };
}

/**
 * 4. A* Search Algorithm
 * Uses heuristic f(n) = g(n) + h(n) to focus path expansion.
 */
function aStar(startId, endId, adjacencyList) {
    const startTime = process.hrtime ? process.hrtime() : null;
    const startMs = Date.now();
    
    const gScore = {}; // travel times (minutes)
    const distancesKm = {}; // cumulative distance in km
    const fScore = {}; // gScore + heuristic
    const previous = {};
    const pq = new MinPriorityQueue();
    const visitedOrder = [];
    const visitedSet = new Set();
    
    function heuristic(nodeId) {
        const fromNode = nodes[nodeId];
        const toNode = nodes[endId];
        const distance = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
        // Distance (km) / Speed (km/h) * 60 (mins/hour)
        return (distance / MAX_SPEED_LIMIT) * 60;
    }

    Object.keys(adjacencyList).forEach(nodeId => {
        gScore[nodeId] = Infinity;
        distancesKm[nodeId] = Infinity;
        fScore[nodeId] = Infinity;
        previous[nodeId] = null;
    });

    gScore[startId] = 0;
    distancesKm[startId] = 0;
    const hStart = heuristic(startId);
    fScore[startId] = hStart;
    pq.insert(startId, hStart);

    while (!pq.isEmpty()) {
        const { element: currNodeId } = pq.extractMin();
        visitedOrder.push(currNodeId);
        visitedSet.add(currNodeId);

        if (currNodeId === endId) {
            break;
        }

        const currG = gScore[currNodeId];
        if (currG === Infinity) {
            break;
        }

        const neighbors = adjacencyList[currNodeId] || [];
        for (const edge of neighbors) {
            const tentativeG = currG + edge.weight;
            if (tentativeG < gScore[edge.to]) {
                previous[edge.to] = currNodeId;
                gScore[edge.to] = tentativeG;
                distancesKm[edge.to] = distancesKm[currNodeId] + edge.distance;
                
                const fValue = tentativeG + heuristic(edge.to);
                fScore[edge.to] = fValue;
                pq.insert(edge.to, fValue);
            }
        }
    }

    const path = [];
    let curr = endId;
    while (curr) {
        path.push(curr);
        curr = previous[curr];
    }
    path.reverse();

    const pathFound = path.length > 0 && path[0] === startId;
    const elapsedMs = startTime 
        ? (process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000) 
        : (Date.now() - startMs);

    return {
        success: pathFound,
        path: pathFound ? path : [],
        pathCoords: pathFound ? path.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })) : [],
        totalDistance: pathFound ? Number(distancesKm[endId].toFixed(3)) : 0,
        totalTime: pathFound ? Number(gScore[endId].toFixed(3)) : 0,
        visitedNodes: visitedOrder,
        nodesExpanded: visitedOrder.length,
        executionTimeMs: Number(elapsedMs.toFixed(3)),
        memoryEstimateBytes: estimateMemory(visitedSet.size + pq.size(), visitedOrder.length)
    };
}

/**
 * 5. Bellman-Ford Algorithm
 * Dynamically relaxes edges. Returns error if negative cycles detected.
 */
function bellmanFord(startId, endId, adjacencyList) {
    const startTime = process.hrtime ? process.hrtime() : null;
    const startMs = Date.now();
    
    const nodeIds = Object.keys(adjacencyList);
    const numNodes = nodeIds.length;
    
    const distances = {};
    const distancesKm = {};
    const previous = {};
    
    nodeIds.forEach(id => {
        distances[id] = Infinity;
        distancesKm[id] = Infinity;
        previous[id] = null;
    });
    
    distances[startId] = 0;
    distancesKm[startId] = 0;
    
    const visitedOrder = [];
    const visitedSet = new Set();
    
    // Flatten edges for relaxation passes
    const flatEdges = [];
    nodeIds.forEach(u => {
        (adjacencyList[u] || []).forEach(edge => {
            flatEdges.push({ from: u, to: edge.to, weight: edge.weight, distance: edge.distance });
        });
    });
    
    // Relax edges V-1 times
    for (let i = 0; i < numNodes - 1; i++) {
        let updatedAny = false;
        for (const edge of flatEdges) {
            if (distances[edge.from] !== Infinity && distances[edge.from] + edge.weight < distances[edge.to]) {
                distances[edge.to] = distances[edge.from] + edge.weight;
                distancesKm[edge.to] = distancesKm[edge.from] + edge.distance;
                previous[edge.to] = edge.from;
                updatedAny = true;
                
                if (!visitedSet.has(edge.to)) {
                    visitedSet.add(edge.to);
                    visitedOrder.push(edge.to);
                }
            }
        }
        if (!updatedAny) break;
    }
    
    // Check for negative-weight cycles
    let hasNegativeCycle = false;
    for (const edge of flatEdges) {
        if (distances[edge.from] !== Infinity && distances[edge.from] + edge.weight < distances[edge.to]) {
            hasNegativeCycle = true;
            break;
        }
    }
    
    const path = [];
    let curr = endId;
    while (curr) {
        path.push(curr);
        curr = previous[curr];
    }
    path.reverse();
    
    const pathFound = path.length > 0 && path[0] === startId && !hasNegativeCycle;
    const elapsedMs = startTime 
        ? (process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000) 
        : (Date.now() - startMs);

    return {
        success: pathFound,
        path: pathFound ? path : [],
        pathCoords: pathFound ? path.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })) : [],
        totalDistance: pathFound ? Number(distancesKm[endId].toFixed(3)) : 0,
        totalTime: pathFound ? Number(distances[endId].toFixed(3)) : 0,
        visitedNodes: visitedOrder,
        nodesExpanded: visitedOrder.length,
        executionTimeMs: Number(elapsedMs.toFixed(3)),
        memoryEstimateBytes: estimateMemory(visitedSet.size, visitedOrder.length)
    };
}

/**
 * Helper A* solver supporting blocked nodes and edges.
 * Used internally by Yen's Algorithm.
 */
function aStarBlocked(startId, endId, adjacencyList, blockedNodes = new Set(), blockedEdges = new Set()) {
    const gScore = {}; 
    const distancesKm = {}; 
    const fScore = {}; 
    const previous = {};
    const pq = new MinPriorityQueue();
    
    function heuristic(nodeId) {
        const fromNode = nodes[nodeId];
        const toNode = nodes[endId];
        const distance = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
        return (distance / MAX_SPEED_LIMIT) * 60;
    }

    Object.keys(adjacencyList).forEach(nodeId => {
        gScore[nodeId] = Infinity;
        distancesKm[nodeId] = Infinity;
        fScore[nodeId] = Infinity;
        previous[nodeId] = null;
    });

    if (blockedNodes.has(startId) || blockedNodes.has(endId)) return null;

    gScore[startId] = 0;
    distancesKm[startId] = 0;
    const hStart = heuristic(startId);
    fScore[startId] = hStart;
    pq.insert(startId, hStart);

    while (!pq.isEmpty()) {
        const { element: currNodeId } = pq.extractMin();

        if (currNodeId === endId) break;

        const currG = gScore[currNodeId];
        if (currG === Infinity) break;

        const neighbors = adjacencyList[currNodeId] || [];
        for (const edge of neighbors) {
            if (blockedNodes.has(edge.to)) continue;
            
            // Check edge blocking in both directions
            const edgeKey = `${currNodeId}-${edge.to}`;
            const reverseEdgeKey = `${edge.to}-${currNodeId}`;
            if (blockedEdges.has(edgeKey) || blockedEdges.has(reverseEdgeKey)) continue;

            const tentativeG = currG + edge.weight;
            if (tentativeG < gScore[edge.to]) {
                previous[edge.to] = currNodeId;
                gScore[edge.to] = tentativeG;
                distancesKm[edge.to] = distancesKm[currNodeId] + edge.distance;
                
                const fValue = tentativeG + heuristic(edge.to);
                fScore[edge.to] = fValue;
                pq.insert(edge.to, fValue);
            }
        }
    }

    const path = [];
    let curr = endId;
    while (curr) {
        path.push(curr);
        curr = previous[curr];
    }
    path.reverse();

    const pathFound = path.length > 0 && path[0] === startId;
    if (!pathFound) return null;

    return {
        path,
        totalDistance: Number(distancesKm[endId].toFixed(3)),
        totalTime: Number(gScore[endId].toFixed(3))
    };
}

/**
 * 6. Yen's K-Shortest Paths Algorithm
 * Computes up to K (typically 3) distinct loopless paths in order of cost.
 */
function yenKShortestPaths(startId, endId, adjacencyList, K = 3) {
    // Primary shortest path
    const primary = aStarBlocked(startId, endId, adjacencyList);
    if (!primary) return [];

    const A = [{
        path: primary.path,
        pathCoords: primary.path.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })),
        totalDistance: primary.totalDistance,
        totalTime: primary.totalTime
    }];
    
    const B = []; // Heap or set of candidate paths

    for (let k = 1; k < K; k++) {
        const prevPath = A[k - 1].path;
        
        for (let i = 0; i < prevPath.length - 1; i++) {
            const spurNode = prevPath[i];
            const rootPath = prevPath.slice(0, i + 1);

            const blockedNodes = new Set();
            const blockedEdges = new Set();

            // Block previous nodes in root path to avoid loops
            for (let j = 0; j < rootPath.length - 1; j++) {
                blockedNodes.add(rootPath[j]);
            }

            // Block edges branching from spur node that were already selected
            for (const pathObj of A) {
                const p = pathObj.path;
                if (p.length > i && p.slice(0, i + 1).join(',') === rootPath.join(',')) {
                    blockedEdges.add(`${p[i]}-${p[i+1]}`);
                }
            }

            // Calculate shortest path suffix from spur to target
            const spurPathObj = aStarBlocked(spurNode, endId, adjacencyList, blockedNodes, blockedEdges);
            if (spurPathObj) {
                const candidatePath = [...rootPath.slice(0, -1), ...spurPathObj.path];
                
                // Calculate metrics
                let candidateDistance = 0;
                let candidateTime = 0;
                for (let j = 0; j < candidatePath.length - 1; j++) {
                    const u = candidatePath[j];
                    const v = candidatePath[j+1];
                    const edge = adjacencyList[u].find(e => e.to === v);
                    if (edge) {
                        candidateDistance += edge.distance;
                        candidateTime += edge.weight;
                    }
                }

                const candidateObj = {
                    path: candidatePath,
                    pathCoords: candidatePath.map(id => ({ lat: nodes[id].lat, lng: nodes[id].lng })),
                    totalDistance: Number(candidateDistance.toFixed(3)),
                    totalTime: Number(candidateTime.toFixed(3))
                };

                // Add to B if unique
                const pathStr = candidatePath.join(',');
                const inA = A.some(p => p.path.join(',') === pathStr);
                const inB = B.some(p => p.path.join(',') === pathStr);
                if (!inA && !inB) {
                    B.push(candidateObj);
                }
            }
        }

        if (B.length === 0) break;

        // Sort candidates ascending by travel time
        B.sort((a, b) => a.totalTime - b.totalTime);

        // Best candidate becomes the k-th shortest path
        A.push(B.shift());
    }

    return A;
}

module.exports = {
    bfs,
    dfs,
    dijkstra,
    aStar,
    bellmanFord,
    yenKShortestPaths
};
