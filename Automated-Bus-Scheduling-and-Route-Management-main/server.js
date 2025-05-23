const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); 
app.use(express.static('frontend'));

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 } 
}));

const db = new sqlite3.Database('./DB.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

app.get('/buses/active', (req, res) => {
    const sql = `SELECT COUNT(*) as activeCount FROM [BUS LINE] WHERE status = 'running'`;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error fetching active buses:', err);
            res.status(500).json({ error: 'Error fetching active buses' });
        } else {
            res.json({ activeCount: row.activeCount });
        }
    });
});

app.get('/routes/ongoing', (req, res) => {
    const sql = `SELECT COUNT(DISTINCT busRegNo) as ongoingCount FROM [BUS LINE] WHERE status = 'running'`;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error fetching ongoing routes:', err);
            res.status(500).json({ error: 'Error fetching ongoing routes' });
        } else {
            res.json({ ongoingCount: row.ongoingCount });
        }
    });
});

app.get('/operators/onduty', (req, res) => {
    const sql = `SELECT COUNT(*) as onDutyCount FROM OPERATOR WHERE onDuty = 'Working'`;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error fetching operators on duty:', err);
            res.status(500).json({ error: 'Error fetching operators on duty' });
        } else {
            res.json({ onDutyCount: row.onDutyCount });
        }
    });
});

app.get('/drivers/leave', (req, res) => {
    const sql = `SELECT COUNT(*) as driversOnLeave FROM OPERATOR WHERE role = 'Driver' AND onDuty = 'Leave'`;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error fetching drivers on leave:', err);
            res.status(500).json({ error: 'Error fetching drivers on leave' });
        } else {
            res.json({ driversOnLeave: row.driversOnLeave });
        }
    });
});

app.post('/add-schedule', (req, res) => {
    const { busRegNo, startTime, endTime, route, operatorId } = req.body;

    const busSql = `SELECT * FROM BUS WHERE busRegNo = ?`;
    const operatorSql = `SELECT * FROM OPERATOR WHERE operatorId = ?`;
    const busLineSql = `SELECT * FROM [BUS LINE] WHERE busRegNo = ?`;
    const checkBusStatusSql = `SELECT status FROM [BUS LINE] WHERE busRegNo = ?`;
    const checkOperatorDutySql = `SELECT onDuty FROM OPERATOR WHERE operatorId = ?`;

    db.get(busSql, [busRegNo], (err, busRow) => {
        if (err) {
            console.error('Error checking bus:', err);
            return res.status(500).json({ error: 'Error checking bus' });
        }

        if (!busRow) {
            return res.status(400).json({ error: 'Bus does not exist' });
        }

        db.get(busLineSql, [busRegNo], (err, busLineRow) => {
            if (err) {
                console.error('Error fetching bus line:', err);
                return res.status(500).json({ error: 'Error fetching bus line' });
            }

            if (!busLineRow) {
                return res.status(400).json({ error: 'Bus line does not exist' });
            }

            if (busLineRow.status === 'running') {
                return res.status(400).json({ error: 'Bus is already running on another schedule' });
            }

            db.get(operatorSql, [operatorId], (err, operatorRow) => {
                if (err) {
                    console.error('Error checking operator:', err);
                    return res.status(500).json({ error: 'Error checking operator' });
                }

                if (!operatorRow) {
                    return res.status(400).json({ error: 'Operator does not exist' });
                }

                if (operatorRow.onDuty === 'Working') {
                    return res.status(400).json({ error: 'Operator is already assigned to another bus' });
                }

                
                const scheduleSql = `
                    INSERT INTO BUS_SCHEDULE (busRegNo, route, startTime, endTime, operatorId)
                    VALUES (?, ?, ?, ?, ?)
                `;
                db.run(scheduleSql, [busRegNo, route, startTime, endTime, operatorId], function (err) {
                    if (err) {
                        console.error('Error inserting schedule:', err);
                        return res.status(500).json({ error: 'Error inserting schedule' });
                    }

                    
                    const updateBusLineSql = `UPDATE [BUS LINE] SET status = 'running' WHERE busRegNo = ?`;
                    db.run(updateBusLineSql, [busRegNo], function (err) {
                        if (err) {
                            console.error('Error updating bus line status:', err);
                            return res.status(500).json({ error: 'Error updating bus line status' });
                        }

                        
                        const updateOperatorSql = `
                            UPDATE OPERATOR
                            SET currBusAssigned = ?, onDuty = 'Working', startTime = ?, endTime = ?
                            WHERE operatorId = ?
                        `;
                        db.run(updateOperatorSql, [busRegNo, startTime, endTime, operatorId], function (err) {
                            if (err) {
                                console.error('Error updating operator:', err);
                                return res.status(500).json({ error: 'Error updating operator' });
                            }

                            res.json({ message: 'Bus scheduled successfully' });
                        });
                    });
                });
            });
        });
    });
});


app.post('/login', (req, res) => {
    const { role, username, password } = req.body;
    if (role === 'driver') {
        db.get('SELECT * FROM operator_personal WHERE Name = ? AND op_password = ?', [username, password], (err, row) => {
            if (err) {
                return res.status(500).send('Database error');
            }
            if (row) {
                req.session.user = { id: row.operatorId, role: 'driver' };
                return res.redirect('/main.html'); 
            } else {
                return res.status(401).send('Invalid credentials');
            }
        });
    } else if (role === 'admin') {
        db.get('SELECT * FROM Admin WHERE Admin_name = ? AND Ad_password = ?', [username, password], (err, row) => {
            if (err) {
                return res.status(500).send('Database error');
            }
            if (row) {
                req.session.user = { id: row.AdminId, role: 'admin' };
                return res.redirect('/admin_dashboard.html'); 
            } else {
                return res.status(401).send('Invalid credentials');
            }
        });
    } else {
        return res.status(400).send('Invalid role specified');
    }
});


app.post('/signup', (req, res) => {
    const { role, username, password, mobile } = req.body;
    if (role === 'driver') {
        db.run('INSERT INTO operator_personal (Name, Mobile, op_password) VALUES (?, ?, ?)', [username, mobile, password], function (err) {
            if (err) {
                console.error('Error signing up driver:', err);
                return res.status(500).send('Database error');
            }
            return res.redirect('/login.html');
        });
    } else if (role === 'admin') {
        db.run('INSERT INTO Admin (Admin_name, Ad_password) VALUES (?, ?)', [username, password], function (err) {
            if (err) {
                console.error('Error signing up admin:', err);
                return res.status(500).send('Database error');
            }
            return res.redirect('/login.html');
        });
    } else {
        return res.status(400).send('Invalid role specified');
    }
});


app.get('/main.html', (req, res) => {
    if (req.session.user && req.session.user.role === 'driver') {
        res.sendFile(__dirname + '/frontend/main.html');
    } else {
        res.redirect('/login.html');
    }
});


app.get('/admin_dashboard.html', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.sendFile(__dirname + '/frontend/admin_dashboard.html');
    } else {
        res.redirect('/login.html');
    }
});

app.get('/feedback', (req, res) => {
    const sql = 'SELECT * FROM Feedback'; 
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching feedback data:', err.message);
            return res.status(500).json({ error: 'Error fetching feedback data' });
        }
        res.json({ feedback: rows });
    });
});

app.get('/swap-request', (req, res) => {
    const sql = 'SELECT * FROM swap'; 
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching swap requests:', err.message);
            return res.status(500).json({ error: 'Error fetching swap requests' });
        }
        console.log('Fetched swap requests:', rows);
        res.json({ swapRequests: rows });
    });
});

app.get('/leave', (req, res) => {
    const sql = 'SELECT * FROM leave';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching leave requests:', err.message);
            return res.status(500).json({ error: 'Error fetching leave requests' });
        }
        res.json({ leaveRequests: rows });
    });
});


app.get('/bus-data', (req, res) => {
    const sql = 'SELECT busRegNo, busRouteNo, busType FROM bus'; 
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching bus data:', err.message);
            return res.status(500).json({ error: 'Error fetching bus data' });
        }
        res.json({ buses: rows });
    });
});

app.get('/base-data', (req, res) => {
    const sql = 'SELECT operatorId, assigned_route, Address FROM BLP'; 
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching bus data:', err.message);
            return res.status(500).json({ error: 'Error fetching bus data' });
        }
        res.json({ bases: rows });
    });
});

app.get('/operators', (req, res) => {
    const sql = 'SELECT * FROM OPERATOR'; 
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching operator data:', err.message);
            return res.status(500).json({ error: 'Error fetching operator data' });
        }
        res.json({ operators: rows });
    });
});

app.get('/fingerprint', (req, res) => {
    const sql = 'SELECT * FROM fingerprint'; 
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching fingerprint data:', err.message);
            return res.status(500).json({ error: 'Error fetching fingerprint data' });
        }
        res.json({ fingerprints: rows });
    });
});

app.post('/authentication', function(req, res, next) {
    const { BusRegno, FP } = req.body; 
    console.log(`BusRegno: ${BusRegno}`);
    console.log(`Fingerprint Template: ${FP}`);
    res.json({
      message: 'Fingerprint template received successfully',
      BusRegno: BusRegno,
      FingerprintTemplate: FP
    });
  });
  

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
