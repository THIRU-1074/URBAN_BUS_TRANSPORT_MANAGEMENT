const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const { Parser } = require('json2csv');

const apiKey = 'e17620c802fc40e68c4d3267d20c0fec'; // Your OpenCage API key
const inputFilePath = 'Address_DB.csv'; // Input CSV file
const outputFilePath = 'Drivers.csv'; // Output CSV file

const getCoordinates = async (address) => {
    try {
        const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', { // Corrected quotes
            params: {
                q: address,
                key: apiKey,
                language: 'en',
                pretty: 1
            }
        });

        const results = response.data.results;

        if (results.length > 0) {
            return {
                latitude: results[0].geometry.lat,
                longitude: results[0].geometry.lng
            };
        }
        return { latitude: null, longitude: null }; // No results found
    } catch (error) {
        console.error(`Error fetching coordinates for ${address}:`, error.response ? error.response.data : error.message); // Corrected syntax
        return { latitude: null, longitude: null }; // Handle error
    }
};

const processAddresses = async () => {
    const addresses = [];

    // Read addresses from CSV
    fs.createReadStream(inputFilePath)
        .pipe(csv())
        .on('data', (row) => {
            addresses.push(row);
        })
        .on('end', async () => {
            const results = [];
            for (const addressData of addresses) {
                const address = addressData.Address;

                // Fetch coordinates from API
                const { latitude, longitude } = await getCoordinates(address);
                results.push({
                    operator_id: addressData.operator_id,
                    latitude,
                    longitude
                });
            }

            // Convert results to CSV format
            const json2csvParser = new Parser();
            const csvData = json2csvParser.parse(results);
            
            // Write to Drivers.csv
            fs.writeFileSync(outputFilePath, csvData);
            console.log('Coordinates have been written to Drivers.csv');
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error.message); // Error handling for CSV reading
        });
};

// Start processing
processAddresses();
