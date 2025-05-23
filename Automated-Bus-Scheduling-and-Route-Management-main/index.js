const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

// Arrays to hold the data
let drivers = [];
let routes = [];
let addresses = {};

// Function to calculate distance between two coordinates (Haversine formula)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Connect to the SQLite database (Corrected file path syntax)
const db = new sqlite3.Database('C:/Users/Aditi Mishra/Desktop/Projects/BTMS-master/DB.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the database.');
    }
});

// Read Address_DB.csv
fs.createReadStream('Address_DB.csv')
    .pipe(csv())
    .on('data', (data) => {
        if (data.operator_id && data.Address) {
            // Map operator_id to their address
            addresses[data.operator_id.trim()] = data.Address.trim();
        }
    })
    .on('end', () => {
        console.log('Address data loaded.');

        // Read Drivers.csv after addresses are loaded
        fs.createReadStream('Drivers.csv')
            .pipe(csv())
            .on('data', (data) => {
                if (data.operator_id && data.latitude && data.longitude) {
                    // Store driver information
                    drivers.push({
                        operator_id: data.operator_id.trim(),
                        lat: parseFloat(data.latitude),
                        long: parseFloat(data.longitude)
                    });
                }
            })
            .on('end', () => {
                console.log('Drivers data loaded.');

                // Read Routes_DB.csv after drivers.csv is loaded
                fs.createReadStream('Routes_DB.csv')
                    .pipe(csv())
                    .on('data', (data) => {
                        if (data.route_no && data.min_bus_required && data.lat_of_midpoint && data.long_of_midpoint) {
                            // Store route information
                            routes.push({
                                route_number: data.route_no.trim(),
                                min_buses_required: parseFloat(data.min_bus_required),
                                lat: parseFloat(data.lat_of_midpoint),
                                long: parseFloat(data.long_of_midpoint)
                            });
                        }
                    })
                    .on('end', () => {
                        console.log('Routes data loaded.');
                        const results = [];

                        // Assign routes to drivers based on the closest distance
                        drivers.forEach(driver => {
                            let closestRoute = null;
                            let minDistance = Infinity;

                            routes.forEach(route => {
                                const distance = haversine(driver.lat, driver.long, route.lat, route.long);
                                if (distance < minDistance && route.min_buses_required > 0) {
                                    minDistance = distance;
                                    closestRoute = route.route_number;
                                }
                            });

                            const driverAddress = addresses[driver.operator_id] || "Address not found"; // Get the driver's address

                            if (closestRoute !== null) {
                                results.push({
                                    operator_id: driver.operator_id,
                                    assigned_route: closestRoute,
                                    address: driverAddress
                                });

                                // Reduce the number of buses required for the assigned route
                                const routeIndex = routes.findIndex(route => route.route_number === closestRoute);
                                if (routeIndex > -1) {
                                    routes[routeIndex].min_buses_required--;
                                }
                            } else {
                                // Handle case where no route is assigned
                                results.push({
                                    operator_id: driver.operator_id,
                                    assigned_route: null,
                                    address: driverAddress
                                });
                            }
                        });

                        // Write results to results.csv
                        const csvOutput = results.map(row => `${row.operator_id},${row.assigned_route || 'No route assigned'},${row.address}`).join('\n'); // Fixed template literal usage
                        fs.writeFileSync('results.csv', `operator_id,assigned_route,address\n${csvOutput}`); // Fixed template literal usage
                        console.log('Result written to results.csv');

                        // Insert results into the SQLite database table BLP
                        results.forEach(row => {
                            db.run(`INSERT INTO BLP (operatorId, assigned_route, address) VALUES (?, ?, ?)`, 
                                [parseInt(row.operator_id), row.assigned_route || 'No route assigned', row.address], function(err) {
                                if (err) {
                                    console.error(err.message);
                                } else {
                                    console.log(`Inserted operatorId: ${row.operator_id}, assigned_route: ${row.assigned_route || 'No route assigned'}, address: ${row.address}`);
                                }
                            });
                        });

                        // Close the database connection
                        db.close((err) => {
                            if (err) {
                                console.error(err.message);
                            } else {
                                console.log('Database connection closed.');
                            }
                        });
                    });
            });
    });
