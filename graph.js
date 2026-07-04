/**
 * Graph Generator for NYC Mini-GPS Simulation
 * Contains geographic coordinates for 50 NYC landmarks and street intersections.
 * Defines the street network connecting these locations with distances,
 * speed limits, and traffic conditions.
 */

// Helper to calculate Haversine distance in km between two lat/lng pairs
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// 50 Coordinates representing NYC Landmarks and Key Intersections
const nodes = {
    "N1": { id: "N1", name: "Times Square", lat: 40.7580, lng: -73.9855 },
    "N2": { id: "N2", name: "Grand Central Terminal", lat: 40.7527, lng: -73.9772 },
    "N3": { id: "N3", name: "Rockefeller Center", lat: 40.7587, lng: -73.9787 },
    "N4": { id: "N4", name: "Columbus Circle", lat: 40.7681, lng: -73.9819 },
    "N5": { id: "N5", name: "Central Park South & 5th Ave", lat: 40.7644, lng: -73.9730 },
    "N6": { id: "N6", name: "Lincoln Center", lat: 40.7725, lng: -73.9835 },
    "N7": { id: "N7", name: "Empire State Building", lat: 40.7484, lng: -73.9857 },
    "N8": { id: "N8", name: "Penn Station", lat: 40.7506, lng: -73.9935 },
    "N9": { id: "N9", name: "Chrysler Building", lat: 40.7516, lng: -73.9753 },
    "N10": { id: "N10", name: "Bryant Park", lat: 40.7536, lng: -73.9832 },
    "N11": { id: "N11", name: "Metropolitan Museum of Art", lat: 40.7794, lng: -73.9632 },
    "N12": { id: "N12", name: "Guggenheim Museum", lat: 40.7829, lng: -73.9590 },
    "N13": { id: "N13", name: "Museum of Natural History", lat: 40.7813, lng: -73.9740 },
    "N14": { id: "N14", name: "Central Park Great Lawn", lat: 40.7812, lng: -73.9665 },
    "N15": { id: "N15", name: "Central Park Reservoir North", lat: 40.7870, lng: -73.9626 },
    "N16": { id: "N16", name: "Cathedral of St. John the Divine", lat: 40.8038, lng: -73.9619 },
    "N17": { id: "N17", name: "Columbia University", lat: 40.8075, lng: -73.9626 },
    "N18": { id: "N18", name: "Harlem (125th St)", lat: 40.8105, lng: -73.9498 },
    "N19": { id: "N19", name: "Randall's Island Connector", lat: 40.7990, lng: -73.9298 },
    "N20": { id: "N20", name: "Astoria Park (Queens)", lat: 40.7797, lng: -73.9234 },
    "N21": { id: "N21", name: "Roosevelt Island Tramway (Manhattan)", lat: 40.7611, lng: -73.9641 },
    "N22": { id: "N22", name: "Roosevelt Island Tramway (Island)", lat: 40.7573, lng: -73.9542 },
    "N23": { id: "N23", name: "Queensboro Bridge East (Queens)", lat: 40.7538, lng: -73.9412 },
    "N24": { id: "N24", name: "United Nations Headquarters", lat: 40.7489, lng: -73.9680 },
    "N25": { id: "N25", name: "Madison Square Park", lat: 40.7420, lng: -73.9880 },
    "N26": { id: "N26", name: "Union Square", lat: 40.7359, lng: -73.9911 },
    "N27": { id: "N27", name: "Washington Square Park", lat: 40.7308, lng: -73.9973 },
    "N28": { id: "N28", name: "Chelsea Market", lat: 40.7420, lng: -74.0060 },
    "N29": { id: "N29", name: "High Line Park Entrance", lat: 40.7480, lng: -74.0048 },
    "N30": { id: "N30", name: "Hudson Yards & The Vessel", lat: 40.7538, lng: -74.0018 },
    "N31": { id: "N31", name: "Intrepid Museum", lat: 40.7645, lng: -73.9996 },
    "N32": { id: "N32", name: "Hell's Kitchen (9th Ave & 46th)", lat: 40.7610, lng: -73.9916 },
    "N33": { id: "N33", name: "Lincoln Tunnel Entrance", lat: 40.7570, lng: -73.9980 },
    "N34": { id: "N34", name: "Port Authority Bus Terminal", lat: 40.7571, lng: -73.9902 },
    "N35": { id: "N35", name: "Jacob Javits Center", lat: 40.7575, lng: -74.0026 },
    "N36": { id: "N36", name: "Flatiron Building", lat: 40.7411, lng: -73.9897 },
    "N37": { id: "N37", name: "St. Patrick's Cathedral", lat: 40.7585, lng: -73.9760 },
    "N38": { id: "N38", name: "Carnegie Hall", lat: 40.7651, lng: -73.9799 },
    "N39": { id: "N39", name: "Radio City Music Hall", lat: 40.7599, lng: -73.9798 },
    "N40": { id: "N40", name: "Herald Square", lat: 40.7494, lng: -73.9878 },
    "N41": { id: "N41", name: "Belvedere Castle (Central Park)", lat: 40.7794, lng: -73.9690 },
    "N42": { id: "N42", name: "Strawberry Fields (Central Park)", lat: 40.7719, lng: -73.9747 },
    "N43": { id: "N43", name: "Conservatory Garden (Central Park)", lat: 40.7937, lng: -73.9519 },
    "N44": { id: "N44", name: "Upper West Side (86th & Bway)", lat: 40.7891, lng: -73.9780 },
    "N45": { id: "N45", name: "Upper East Side (86th & 2nd Ave)", lat: 40.7779, lng: -73.9518 },
    "N46": { id: "N46", name: "Kips Bay (30th St & 2nd Ave)", lat: 40.7423, lng: -73.9765 },
    "N47": { id: "N47", name: "East Village (Avenue A & 10th)", lat: 40.7272, lng: -73.9818 },
    "N48": { id: "N48", name: "SoHo (Broadway & Prince)", lat: 40.7250, lng: -73.9980 },
    "N49": { id: "N49", name: "Greenwich Village (Christopher St)", lat: 40.7335, lng: -74.0030 },
    "N50": { id: "N50", name: "Tribeca (Canal & Hudson)", lat: 40.7230, lng: -74.0090 }
};

// Raw edge specifications. (Distance will be calculated automatically)
// Structure: [from, to, streetName, speedLimit (km/h), isOneWay (boolean), trafficMultiplier (1.0 = clear)]
const rawEdges = [
    // --- BROADWAY (Diagonal Main Vein) ---
    ["N48", "N27", "Broadway", 40, false, 1.2], // SoHo to Washington Sq
    ["N27", "N26", "Broadway", 40, false, 1.5], // Washington Sq to Union Sq
    ["N26", "N36", "Broadway", 40, false, 1.4], // Union Sq to Flatiron
    ["N36", "N40", "Broadway", 30, true, 1.8],  // Flatiron to Herald Sq (one-way northbound)
    ["N40", "N1", "Broadway", 30, true, 2.0],   // Herald Sq to Times Sq (one-way northbound)
    ["N1", "N4", "Broadway", 45, false, 1.6],   // Times Sq to Columbus Circle
    ["N4", "N6", "Broadway", 45, false, 1.3],   // Columbus Circle to Lincoln Center
    ["N6", "N44", "Broadway", 50, false, 1.2],  // Lincoln Center to UWS 86th
    ["N44", "N17", "Broadway", 50, false, 1.1], // UWS 86th to Columbia Uni

    // --- 5TH AVENUE (Primary N/S Aveneu - Mostly One-way Southbound in real life, let's reflect that) ---
    ["N43", "N12", "5th Avenue", 45, true, 1.1],  // Conservatory Garden to Guggenheim (One-way Southbound)
    ["N12", "N11", "5th Avenue", 45, true, 1.2],  // Guggenheim to Met Museum
    ["N11", "N5", "5th Avenue", 45, true, 1.4],   // Met Museum to CP South
    ["N5", "N37", "5th Avenue", 40, true, 1.8],   // CP South to St. Patrick's Cathedral
    ["N37", "N3", "5th Avenue", 40, true, 1.9],   // St Patrick's to Rockefeller Center
    ["N3", "N10", "5th Avenue", 40, true, 2.0],   // Rockefeller Center to Bryant Park
    ["N10", "N7", "5th Avenue", 40, true, 2.2],   // Bryant Park to Empire State
    ["N7", "N25", "5th Avenue", 40, true, 1.7],   // Empire State to Madison Sq Park
    ["N25", "N36", "5th Avenue", 35, false, 1.4], // Madison Sq to Flatiron (Bidirectional link)
    ["N36", "N26", "5th Avenue", 40, true, 1.5],  // Flatiron to Union Sq (One-way Southbound)
    ["N26", "N27", "5th Avenue", 35, true, 1.3],  // Union Sq to Washington Sq

    // --- 8TH AVENUE / CENTRAL PARK WEST (N/S Avenues) ---
    ["N28", "N34", "8th Avenue", 45, true, 1.3],  // Chelsea to Port Authority (One-way Northbound)
    ["N34", "N1", "8th Avenue", 40, false, 1.9],  // Port Authority to Times Sq
    ["N34", "N4", "8th Avenue", 45, true, 1.7],  // Port Authority to Columbus Circle (One-way Northbound)
    ["N4", "N42", "Central Park West", 45, false, 1.1], // Columbus Circle to Strawberry Fields
    ["N42", "N13", "Central Park West", 45, false, 1.2], // Strawberry Fields to Natural History Museum
    ["N13", "N16", "Central Park West", 45, false, 1.2], // Nat History Museum to St John Divine
    ["N16", "N17", "Central Park West", 40, false, 1.1], // St John Divine to Columbia Uni

    // --- 2ND AVENUE (Eastern N/S Corridor - One Way Northbound) ---
    ["N47", "N46", "2nd Avenue", 50, true, 1.1],  // East Village to Kips Bay
    ["N46", "N24", "2nd Avenue", 50, true, 1.3],  // Kips Bay to United Nations
    ["N24", "N2", "42nd St Conn", 35, false, 1.5], // UN to Grand Central
    ["N24", "N21", "2nd Avenue", 50, true, 1.4],  // UN to Roosevelt Island Tramway (Manhattan)
    ["N21", "N45", "2nd Avenue", 50, true, 1.3],  // Tramway to UES 86th
    ["N45", "N18", "2nd Avenue", 50, true, 1.1],  // UES 86th to Harlem

    // --- HUDSON ST / 9TH / 10TH / 11TH AVE (Western N/S Corridor) ---
    ["N50", "N49", "Hudson St", 40, false, 1.2],  // Tribeca to Greenwich Village
    ["N49", "N28", "9th Avenue", 45, true, 1.3],  // Greenwich Village to Chelsea Market (One-way Northbound)
    ["N28", "N29", "10th Avenue", 40, false, 1.2], // Chelsea Market to High Line
    ["N29", "N30", "10th Avenue", 45, false, 1.3], // High Line to Hudson Yards
    ["N30", "N35", "11th Avenue", 50, false, 1.1], // Hudson Yards to Javits Center
    ["N35", "N31", "12th Avenue", 60, false, 1.0], // Javits Center to Intrepid Museum
    ["N31", "N32", "West Side Hwy", 60, false, 1.1], // Intrepid to Hell's Kitchen
    ["N32", "N33", "9th Avenue", 40, false, 1.6],  // Hell's Kitchen to Lincoln Tunnel
    ["N33", "N34", "Galvin Ave", 30, true, 1.9],  // Lincoln Tunnel to Port Authority (One-way)
    ["N32", "N6", "9th Avenue", 45, false, 1.3],  // Hell's Kitchen to Lincoln Center

    // --- CROSSTOWN STREETS (East-West Links) ---
    // Canal St
    ["N50", "N48", "Canal St", 45, false, 1.8],   // Tribeca to SoHo
    // 14th St
    ["N28", "N49", "Chelsea Rd", 35, false, 1.1], // Chelsea to Greenwich Village
    ["N49", "N27", "Christopher", 30, false, 1.3], // Greenwich Village to Washington Sq
    ["N27", "N26", "8th St", 35, false, 1.4],      // Washington Sq to Union Sq
    ["N26", "N47", "14th St", 40, false, 1.5],     // Union Sq to East Village
    // 23rd St
    ["N28", "N36", "23rd St", 40, false, 1.4],     // Chelsea to Flatiron
    ["N36", "N25", "23rd St", 35, false, 1.5],     // Flatiron to Madison Sq
    ["N25", "N46", "23rd St East", 40, false, 1.3], // Madison Sq to Kips Bay
    // 34th St
    ["N30", "N8", "34th St West", 45, false, 1.5],  // Hudson Yards to Penn Station
    ["N8", "N40", "34th St Midtown", 40, false, 1.9], // Penn Station to Herald Sq
    ["N40", "N7", "34th St East", 40, false, 1.9],   // Herald Sq to Empire State
    ["N7", "N46", "34th St Connector", 40, false, 1.6], // Empire State to Kips Bay
    // 42nd St
    ["N34", "N1", "42nd St West", 35, false, 2.1],   // Port Authority to Times Sq
    ["N1", "N10", "42nd St Midtown", 35, false, 2.3], // Times Sq to Bryant Park
    ["N10", "N2", "42nd St Plaza", 35, false, 2.2],   // Bryant Park to Grand Central
    ["N2", "N9", "42nd St East", 35, false, 1.8],     // Grand Central to Chrysler Building
    ["N9", "N24", "42nd St UN Link", 35, false, 1.6],  // Chrysler to UN
    // 59th St (Central Park South)
    ["N4", "N38", "59th St Central", 40, false, 1.5], // Columbus Circle to Carnegie Hall
    ["N38", "N39", "58th St Plaza", 35, false, 1.4],  // Carnegie to Radio City
    ["N39", "N3", "50th St Link", 35, false, 1.6],    // Radio City to Rockefeller Center
    ["N39", "N5", "59th St South", 40, false, 1.7],   // Radio City to CP South 5th Ave
    ["N5", "N21", "59th St East", 45, false, 1.6],    // CP South to Roosevelt Island Tramway (Manhattan)
    // 72nd St
    ["N6", "N42", "72nd St West", 40, false, 1.2],    // Lincoln Center to Strawberry Fields (CP Entrance)
    ["N42", "N41", "72nd St CP Path", 25, false, 1.0], // Strawberry Fields to Belvedere Castle (CP Path)
    ["N41", "N11", "72nd St East CP", 25, false, 1.0], // Belvedere Castle to Met Museum
    ["N21", "N11", "Park Ave North", 40, false, 1.3],  // Tramway Manhattan to Met Museum
    // 86th St
    ["N44", "N13", "86th St West", 40, false, 1.3],   // UWS 86th to Natural History Museum
    ["N13", "N14", "86th St Transverse", 35, false, 1.1], // Nat History Museum to CP Great Lawn
    ["N14", "N11", "86th St East CP", 35, false, 1.1],   // CP Great Lawn to Met Museum
    ["N11", "N12", "5th Ave Loop", 40, false, 1.2],    // Met Museum to Guggenheim
    ["N12", "N45", "86th St East", 40, false, 1.4],     // Guggenheim to UES 86th
    // 110th St (CP North)
    ["N17", "N16", "110th St West", 40, false, 1.2],   // Columbia Uni to St John Divine
    ["N16", "N15", "110th St CP Transverse", 35, false, 1.1], // St John Divine to Reservoir North
    ["N15", "N43", "110th St East CP", 35, false, 1.1], // Reservoir North to Conservatory Garden
    ["N43", "N18", "110th St East", 40, false, 1.2],    // Conservatory Garden to Harlem
    ["N18", "N19", "125th St East", 50, false, 1.3],    // Harlem to Randall's Island Connector

    // --- BRIDGES & WATER CROSSINGS ---
    // Roosevelt Island Tramway
    ["N21", "N22", "Roosevelt Island Tramway", 30, false, 1.0], // Manhattan to Island Tram
    ["N22", "N23", "Roosevelt Island Bridge", 45, false, 1.2],  // Island to Queensboro Bridge East (Queens)
    // Queensboro Bridge
    ["N21", "N23", "Ed Koch Queensboro Bridge", 60, false, 1.8], // Manhattan to Queens (Direct)
    // Triborough Bridge
    ["N19", "N20", "RFK Triborough Bridge", 65, false, 1.4],    // Randall's Island to Astoria Park (Queens)
    ["N18", "N19", "RFK Bridge Manhattan", 65, false, 1.5],     // Harlem to Randall's Island (Duplicate raw connector)

    // --- CENTRAL PARK INTERIOR PATHS (Very scenic, low speed limit, zero traffic congestion) ---
    ["N5", "N42", "CP South Path", 20, false, 1.0],      // CP South to Strawberry Fields
    ["N42", "N14", "CP Mall Path", 20, false, 1.0],       // Strawberry Fields to Great Lawn
    ["N14", "N15", "CP Reservoir Path", 20, false, 1.0],  // Great Lawn to Reservoir North
    ["N15", "N43", "CP North Path", 20, false, 1.0]       // Reservoir North to Conservatory Garden
];

// Initialize edges list with calculated distances and initial weights
const edges = [];

// Build graph structure
rawEdges.forEach(([from, to, streetName, speedLimit, isOneWay, trafficMultiplier]) => {
    const fromNode = nodes[from];
    const toNode = nodes[to];
    
    if (fromNode && toNode) {
        // Calculate dynamic distance using Haversine formula
        const distance = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
        
        // Add edge
        edges.push({
            from,
            to,
            streetName,
            distance: Number(distance.toFixed(3)), // store distance in km
            speedLimit,
            trafficMultiplier: trafficMultiplier || 1.0,
            isOneWay,
            closed: false
        });
    }
});

// Construct adjacency list dynamically
function getAdjacencyList(currentEdges) {
    const adjList = {};
    
    // Initialize empty lists for each node
    Object.keys(nodes).forEach(nodeId => {
        adjList[nodeId] = [];
    });
    
    // Add edges to adjacency list
    currentEdges.forEach(edge => {
        // Skip closed roads
        if (edge.closed) return;

        // Travel time (weight) in minutes = (distance in km / speed limit in km/h) * 60 minutes/hour * trafficMultiplier
        const baseTime = (edge.distance / edge.speedLimit) * 60;
        const weight = baseTime * edge.trafficMultiplier;
        
        adjList[edge.from].push({
            to: edge.to,
            streetName: edge.streetName,
            distance: edge.distance,
            speedLimit: edge.speedLimit,
            trafficMultiplier: edge.trafficMultiplier,
            weight: Number(weight.toFixed(4)), // weight is travel time in minutes
            isOneWay: edge.isOneWay,
            closed: false
        });
        
        // If not one way, add the reverse link too
        if (!edge.isOneWay) {
            adjList[edge.to].push({
                to: edge.from,
                streetName: edge.streetName,
                distance: edge.distance,
                speedLimit: edge.speedLimit,
                trafficMultiplier: edge.trafficMultiplier,
                weight: Number(weight.toFixed(4)),
                isOneWay: edge.isOneWay,
                closed: false
            });
        }
    });
    
    return adjList;
}

module.exports = {
    nodes,
    edges,
    getAdjacencyList,
    haversineDistance
};
