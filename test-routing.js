/**
 * Upgraded Verification Script for Routing Engine
 * Validates BFS, DFS, Dijkstra, A*, Bellman-Ford, and Yen's K-Shortest Paths.
 * Runs assertions on shortest paths, hop counts, and heap operations.
 * Run using: npm run test
 */

const assert = require('assert');
const MinPriorityQueue = require('./priority-queue');
const { nodes, edges, getAdjacencyList } = require('./graph');
const { bfs, dfs, dijkstra, aStar, bellmanFord, yenKShortestPaths } = require('./router');

console.log("==========================================================");
console.log("         ROUTING ENGINE TESTING & VERIFICATION RUN        ");
console.log("==========================================================\n");

// 1. Min Heap Priority Queue Check
console.log("1. Testing Priority Queue...");
const pq = new MinPriorityQueue();
pq.insert("NodeA", 20);
pq.insert("NodeB", 5);
pq.insert("NodeC", 12);
pq.insert("NodeD", 8);

assert.strictEqual(pq.extractMin().element, "NodeB");
pq.decreasePriority("NodeC", 3);
assert.strictEqual(pq.extractMin().element, "NodeC");
assert.strictEqual(pq.extractMin().element, "NodeD");
assert.strictEqual(pq.extractMin().element, "NodeA");
assert.strictEqual(pq.isEmpty(), true);
console.log("✓ Custom Min-Heap working correctly.\n");

// 2. Generate Adjacency List
console.log("2. Generating City Adjacency List...");
const adjacencyList = getAdjacencyList(edges);
const nodeCount = Object.keys(nodes).length;
const adjCount = Object.keys(adjacencyList).length;
assert.strictEqual(adjCount, nodeCount);
console.log(`✓ Graph contains ${nodeCount} intersections and ${edges.length} road links.\n`);

// 3. Algorithm Validation
console.log("3. Verifying Pathfinding Solvers (Times Square N1 to Columbia University N17)...");
const startNode = "N1";
const endNode = "N17";

const resultBFS = bfs(startNode, endNode, adjacencyList);
const resultDFS = dfs(startNode, endNode, adjacencyList);
const resultDijkstra = dijkstra(startNode, endNode, adjacencyList);
const resultAStar = aStar(startNode, endNode, adjacencyList);
const resultBellman = bellmanFord(startNode, endNode, adjacencyList);

console.log("Paths Found:");
console.log(`- BFS (Least Hops):       ${resultBFS.path.join(" ➔ ")} (hops: ${resultBFS.path.length - 1}, time: ${resultBFS.totalTime}m)`);
console.log(`- DFS (Backtracking):     ${resultDFS.path.join(" ➔ ")} (hops: ${resultDFS.path.length - 1}, time: ${resultDFS.totalTime}m)`);
console.log(`- Dijkstra (Weighted):    ${resultDijkstra.path.join(" ➔ ")} (hops: ${resultDijkstra.path.length - 1}, time: ${resultDijkstra.totalTime}m)`);
console.log(`- A* (Heuristic Guided):  ${resultAStar.path.join(" ➔ ")} (hops: ${resultAStar.path.length - 1}, time: ${resultAStar.totalTime}m)`);
console.log(`- Bellman-Ford (DP):      ${resultBellman.path.join(" ➔ ")} (hops: ${resultBellman.path.length - 1}, time: ${resultBellman.totalTime}m)`);

// Assert correctness: Dijkstra, A*, and Bellman-Ford must calculate IDENTICAL optimal travel times.
assert.strictEqual(resultDijkstra.success, true);
assert.strictEqual(resultAStar.success, true);
assert.strictEqual(resultBellman.success, true);
assert.strictEqual(resultDijkstra.totalTime, resultAStar.totalTime, "A* and Dijkstra must calculate same travel time");
assert.strictEqual(resultDijkstra.totalTime, resultBellman.totalTime, "Bellman-Ford and Dijkstra must calculate same travel time");

// Assert BFS least hops: BFS path should have fewer or equal hops than DFS/others.
assert.ok(resultBFS.path.length <= resultDFS.path.length, "BFS path must have fewer or equal links than DFS");

console.log("\nExpansion Metrics:");
console.log(`- BFS:          ${resultBFS.nodesExpanded} nodes expanded`);
console.log(`- DFS:          ${resultDFS.nodesExpanded} nodes expanded`);
console.log(`- Dijkstra:     ${resultDijkstra.nodesExpanded} nodes expanded`);
console.log(`- A*:           ${resultAStar.nodesExpanded} nodes expanded`);
console.log(`- Bellman-Ford: ${resultBellman.nodesExpanded} nodes expanded`);

// Check search speedup
const nodesSaved = resultDijkstra.nodesExpanded - resultAStar.nodesExpanded;
const pctSaved = Math.round((nodesSaved / resultDijkstra.nodesExpanded) * 100);
console.log(`⚡ A* heuristic reduced node expansions by ${pctSaved}% compared to Dijkstra.`);
console.log("✓ Weighted path solver correctness verified.\n");

// 4. Yen's K-Shortest Paths Check
console.log("4. Verifying Yen's K-Shortest Paths (Finding Top 3 Routes)...");
const kPaths = yenKShortestPaths(startNode, endNode, adjacencyList, 3);
console.log(`Top 3 Paths returned: ${kPaths.length}`);
kPaths.forEach((r, idx) => {
    console.log(`- Path #${idx + 1}: ${r.path.join(" ➔ ")} (Time: ${r.totalTime} mins, Dist: ${r.totalDistance} km)`);
    if (idx > 0) {
        assert.ok(r.totalTime >= kPaths[idx - 1].totalTime, "Paths must be returned in sorted ascending order of travel time");
    }
});
assert.strictEqual(kPaths.length, 3, "Should return exactly 3 path objects");
console.log("✓ Yen's K-Shortest paths verified successfully.\n");

console.log("==========================================================");
console.log("          ALL ROUTING MATRIX UNIT TESTS PASSED            ");
console.log("==========================================================");
