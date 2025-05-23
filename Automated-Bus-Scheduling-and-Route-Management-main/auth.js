const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database'); 


const app = express();
const port = 3001;




app.use(express.static(path.join(__dirname, 'frontend')));


app.use(bodyParser.urlencoded({ extended: false }));


app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    next();
});


app.post('/signinadmin', (req, res) => {
    const { username, password } = req.body;

    console.log('Admin Sign-In Attempt:', { username, password });

    db.get('SELECT * FROM Admin WHERE admin_name = ? AND ad_password = ?', [username, password], (err, admin) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }

        if (admin) {
            console.log('Admin authenticated successfully');
            return res.redirect('/dash_home.html');
        }

        console.log('Invalid Admin credentials');
        return res.status(401).send('Invalid Admin credentials');
    });
});


app.post('/signindriver', (req, res) => {
    const { username, password } = req.body;

    console.log('Driver Sign-In Attempt:', { username, password });

    db.get('SELECT * FROM operator_personal WHERE Name = ? AND op_password = ?', [username, password], (err, driver) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }

        if (driver) {
            console.log('Driver authenticated successfully');
            return res.redirect('/main.html');
        }

        console.log('Invalid Driver credentials');
        return res.status(401).send('Invalid Driver credentials');
    });
});


app.post('/signupadmin', (req, res) => {
    const { AdminId, Admin_name, Ad_password } = req.body;

    console.log('Admin Sign-Up Attempt:', { AdminId, Admin_name });

    
    db.get('SELECT * FROM Admin WHERE AdminId = ?', [AdminId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }

        if (row) {
            console.log('Admin ID already exists');
            return res.status(400).send('Admin ID already exists');
        }

        
        db.run(
            `INSERT INTO Admin (AdminId, Admin_name, Ad_password) VALUES (?, ?, ?)`,
            [AdminId, Admin_name, Ad_password],
            function (err) {
                if (err) {
                    console.error('Failed to add admin:', err);
                    return res.status(500).send('Failed to add admin');
                }

                console.log('Admin added successfully');
                return res.send('Admin has been added successfully');
            }
        );
    });
});


app.post('/signupdriver', (req, res) => {
    const { operatorId, name, mobile, password } = req.body;

    console.log('Driver Sign-Up Attempt:', { operatorId, name, mobile });

    
    db.get('SELECT * FROM operator_personal WHERE Mobile = ?', [mobile], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }

        if (row) {
            console.log('Mobile number already exists');
            return res.status(400).send('Mobile number already exists');
        }

        
        db.run(
            `INSERT INTO operator_personal (operatorId, Name, Mobile, op_password) VALUES (?, ?, ?, ?)`,
            [operatorId, name, mobile, password],
            function (err) {
                if (err) {
                    console.error('Failed to add driver:', err);
                    return res.status(500).send('Failed to add driver');
                }

                console.log('Driver added successfully');
                return res.send('Driver has been added successfully');
            }
        );
    });
});


app.post('/submit-feedback', (req, res) => {
    const { name, driverId, feedback } = req.body;

    console.log('Feedback Submission:', { name, driverId, feedback });

    db.run(
        `INSERT INTO Feedback (Name, operatorId, feedback) VALUES (?, ?, ?)`, 
        [name, driverId, feedback],
        function (err) {
            if (err) {
                console.error('Failed to submit feedback:', err.message);
                return res.status(500).send('Failed to submit feedback');
            }

            console.log('Feedback submitted successfully');
            return res.send('Thank you for your feedback!');
        }
    );
});



app.post('/submit-leave-request', (req, res) => {
    const { driverid, name, leaveType, reason, startDate, endDate } = req.body;

    console.log('Leave Request Submission:', { driverid, name, leaveType, reason, startDate, endDate });

    const query = 'INSERT INTO leave (operatorId, Name, type, reason, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [driverid, name, leaveType, reason || null, startDate, endDate];

    db.run(query, params, function (err) {
        if (err) {
            console.error('Failed to submit leave request:', err.message);
            return res.status(500).send('Failed to submit leave request');
        }

        console.log('Leave request submitted successfully');
        return res.send('Your leave request has been submitted successfully!');
    });
});

app.post('/submit-swap-request', (req, res) => {
    const { driverId, name, currentShift, desiredShift, reason } = req.body;

    console.log('Swap Request Submission:', { driverId, name, currentShift, desiredShift, reason });

    const query = 'INSERT INTO swap (operatorId, Name, currShift, desShift, swap_reason) VALUES (?, ?, ?, ?, ?)';
    const params = [driverId, name, currentShift, desiredShift, reason];

    db.run(query, params, function (err) {
        if (err) {
            console.error('Failed to submit swap request:', err.message);
            return res.status(500).send('Failed to submit swap request');
        }

        console.log('Swap request submitted successfully');
        return res.send('Your swap request has been submitted successfully!');
    });
});



app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
