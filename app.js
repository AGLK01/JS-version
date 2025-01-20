/**********************************************
 * app.js
 **********************************************/
const express = require('express');

const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "public"));

app.use(cors());
app.use(express.json());

// --------------------------------------------------
// DB Connection
// --------------------------------------------------
const DB_HOST = "aws-0-eu-central-1.pooler.supabase.com";
const DB_NAME = "postgres";
const DB_USER = "postgres.agwvpuvzmhsberiqxsim";
const DB_PASS = "kjkger2346wgae#$Q^";
const DB_PORT = "6543";

const pool = new Pool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  port: DB_PORT,
});

/**
 * Returns a client with the timezone set.
 * Make sure to release the client when finished.
 */
async function getDbConnection() {
  const client = await pool.connect();
  // Set timezone explicitly (equivalent to cursor.execute("SET TIME ZONE 'UTC+3';") in Python).
  await client.query("SET TIME ZONE 'UTC+3';");
  return client;
}

// --------------------------------------------------
// Helper: Password Hashing (mimicking "pbkdf2:sha256")
// --------------------------------------------------
/**
 * Generates a PBKDF2 (sha256) hash similar to Werkzeug's `pbkdf2:sha256`.
   The format will be: pbkdf2:sha256:260000$salt$hash
 */
function generatePasswordHash(password) {
  const iterations = 260000;
  const saltBytes = crypto.randomBytes(16); // 16 bytes salt
  const salt = saltBytes.toString('hex');
  const hashBytes = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const hashHex = hashBytes.toString('hex');

  // Format: "pbkdf2:sha256:260000$salt$hash"
  return `pbkdf2:sha256:${iterations}$${salt}$${hashHex}`;
}

/**
 * Checks a plaintext password against a stored PBKDF2 (sha256) hash.
 * Expects format: "pbkdf2:sha256:260000$salt$hash"
 */
function checkPasswordHash(password, storedHash) {
  // storedHash = "pbkdf2:sha256:260000$salt$hashHex"
  const parts = storedHash.split('$');
  // parts[0] = "pbkdf2:sha256:260000"
  // parts[1] = "salt"
  // parts[2] = "hashHex"
  
  const methodMeta = parts[0];   // "pbkdf2:sha256:260000"
  const salt       = parts[1];   // "salt"
  const hashHex    = parts[2];   // "hashHex"
  
  // Now split the methodMeta:
  // e.g. methodMeta.split(':') => ["pbkdf2", "sha256", "260000"]
  const [ , , iterationsStr ] = methodMeta.split(':');
  const iterations = parseInt(iterationsStr, 10);
  
  // Re-hash incoming password with same salt + iterations
  const hashBytes = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const computedHex = hashBytes.toString('hex');
  
  return computedHex === hashHex;
}



// --------------------------------------------------
// Routes
// --------------------------------------------------

// In Flask, you had `@app.route('/')` returning `render_template('index.html')`. 
// For now, we’ll just return a simple string or serve a static file.
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/home', (req, res) => {
  res.render('home');
});

app.get('/appointments', (req, res) => {
  res.render('appointments');
});

app.get('/patients', (req, res) => {
  res.render('patients');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/employees', (req, res) => {
  res.render('employees');
});

app.get('/pharmacy', (req, res) => {
  res.render('pharmacy');
});
module.exports = app;
// ------------------------
// Employees Endpoints
// ------------------------
app.get('/api/employees', async (req, res) => {
  try {
    const client = await getDbConnection();
    const result = await client.query("SELECT * FROM Employee;");
    const employees = result.rows; // rows is an array of objects
    client.release();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/add_employee', async (req, res) => {
  const { EID, name, access_level, IsManager, IsMP } = req.body;
  try {
    const client = await getDbConnection();
    await client.query(
      `INSERT INTO Employee (EID, name, access_level, IsManager, IsMP)
       VALUES ($1, $2, $3, $4, $5);`,
      [EID, name, access_level, IsManager, IsMP]
    );
    client.release();
    res.json({ message: "Employee added successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete_employee', async (req, res) => {
  const { eid } = req.query; // same as request.args.get('eid')
  try {
    const client = await getDbConnection();
    await client.query(
      "DELETE FROM Employee WHERE EID = $1;",
      [eid]
    );
    client.release();
    res.json({ message: "Employee deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/employees/search', async (req, res) => {
  const { name, eid } = req.query;
  try {
    const client = await getDbConnection();
    let query = "SELECT * FROM Employee WHERE TRUE";
    const params = [];

    if (name) {
      query += " AND name ILIKE $1";
      params.push(`%${name}%`);
    }
    if (eid) {
      query += name ? " AND EID = $" + (params.length + 1) : " AND EID = $1";
      params.push(eid);
    }

    const result = await client.query(query, params);
    const employees = result.rows;
    client.release();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Patients Endpoints
// ------------------------
app.post('/api/add_patient', async (req, res) => {
  const { NID, name, dob, medical_records } = req.body;
  try {
    const client = await getDbConnection();
    await client.query(
      `INSERT INTO Patient (NID, name, dob, medical_records)
       VALUES ($1, $2, $3, $4);`,
      [NID, name, dob, medical_records]
    );
    client.release();
    res.json({ message: "Patient registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete_patient', async (req, res) => {
  const { nid } = req.query;
  try {
    const client = await getDbConnection();
    await client.query(
      "DELETE FROM Patient WHERE NID = $1;",
      [nid]
    );
    client.release();
    res.json({ message: "Patient deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patients', async (req, res) => {
  try {
    const client = await getDbConnection();
    const result = await client.query(
      "SELECT NID, name, dob, medical_records FROM Patient;"
    );
    const patients = result.rows.map(row => ({
      nid: row.nid,
      name: row.name,
      dob: row.dob,
      medical_records: row.medical_records
    }));
    client.release();
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search_patients', async (req, res) => {
  const { name, nid } = req.query;
  try {
    const client = await getDbConnection();
    let query = "SELECT NID, name, dob, medical_records FROM Patient WHERE TRUE";
    const params = [];

    if (name) {
      query += " AND name ILIKE $1";
      params.push(`%${name}%`);
    }
    if (nid) {
      query += (params.length > 0) ? " AND NID = $" + (params.length + 1) : " AND NID = $1";
      params.push(nid);
    }

    const result = await client.query(query, params);
    const patients = result.rows.map(row => ({
      nid: row.nid,
      name: row.name,
      dob: row.dob,
      medical_records: row.medical_records
    }));
    client.release();
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Appointments Endpoints
// ------------------------
app.get('/api/appointments', async (req, res) => {
  try {
    const client = await getDbConnection();
    const result = await client.query(
      `SELECT appointment_id, Patient_NID, Department_Specialty, AppointmentDate, Reason
       FROM Books;`
    );
    const appointments = result.rows.map(row => ({
      appointment_id: row.appointment_id,
      patient_nid: row.patient_nid,
      department_specialty: row.department_specialty,
      // converting timestamp to string as in Python .strftime('%Y-%m-%d %H:%M:%S')
      appointmentdate: row.appointmentdate.toISOString().replace('T', ' ').split('.')[0],
      reason: row.reason
    }));
    client.release();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/book_appointment', async (req, res) => {
  const { Patient_NID, Department_Specialty, AppointmentDate, Reason } = req.body;
  try {
    const client = await getDbConnection();
    await client.query(
      `INSERT INTO Books (Patient_NID, Department_Specialty, AppointmentDate, Reason)
       VALUES ($1, $2, $3, $4);`,
      [Patient_NID, Department_Specialty, AppointmentDate, Reason]
    );
    client.release();
    res.json({ message: "Appointment booked successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete_appointment', async (req, res) => {
  const { appointment_id } = req.query;
  try {
    const client = await getDbConnection();
    await client.query(
      `DELETE FROM Books WHERE appointment_id = $1;`,
      [appointment_id]
    );
    client.release();
    res.json({ message: "Appointment deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search_appointments', async (req, res) => {
  const { date, patient_id, department_specialty, appointment_id } = req.query;
  try {
    const client = await getDbConnection();

    let query = `
      SELECT appointment_id, Patient_NID, Department_Specialty, AppointmentDate, Reason
      FROM Books
      WHERE TRUE
    `;
    const params = [];

    if (date) {
      query += " AND AppointmentDate::date = $" + (params.length + 1);
      params.push(date);
    }
    if (patient_id) {
      query += " AND Patient_NID = $" + (params.length + 1);
      params.push(patient_id);
    }
    if (department_specialty) {
      query += " AND Department_Specialty ILIKE $" + (params.length + 1);
      params.push(`%${department_specialty}%`);
    }
    if (appointment_id) {
      query += " AND appointment_id = $" + (params.length + 1);
      params.push(appointment_id);
    }

    const result = await client.query(query, params);
    const appointments = result.rows.map(row => ({
      appointment_id: row.appointment_id,
      patient_nid: row.patient_nid,
      department_specialty: row.department_specialty,
      appointmentdate: row.appointmentdate,
      reason: row.reason
    }));

    client.release();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Pharmacy Endpoints
// ------------------------
app.get('/api/pharmacy', async (req, res) => {
  try {
    const client = await getDbConnection();
    const result = await client.query(
      "SELECT prescription_id, drug_name, cost, quantity FROM Pharmacy;"
    );
    client.release();
    res.json(result.rows.map(row => ({
      prescription_id: row.prescription_id,
      drug_name: row.drug_name,
      cost: row.cost,
      quantity: row.quantity
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/add_drug', async (req, res) => {
  const { prescription_id, drug_name, cost, quantity } = req.body;
  try {
    const client = await getDbConnection();
    await client.query(
      `INSERT INTO Pharmacy (prescription_id, drug_name, cost, quantity)
       VALUES ($1, $2, $3, $4);`,
      [prescription_id, drug_name, cost, quantity]
    );
    client.release();
    res.json({ message: "Drug added successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete_drug', async (req, res) => {
  const { prescription_id } = req.query;
  try {
    const client = await getDbConnection();
    await client.query(
      "DELETE FROM Pharmacy WHERE prescription_id = $1;",
      [prescription_id]
    );
    client.release();
    res.json({ message: "Drug deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issue_drug', async (req, res) => {
  const { MPID, Patient_NID, Prescription_ID } = req.body;
  try {
    const client = await getDbConnection();
    // Insert into Issues_Drugs
    await client.query(
      `INSERT INTO Issues_Drugs (MPID, Patient_NID, Prescription_ID)
       VALUES ($1, $2, $3);`,
      [MPID, Patient_NID, Prescription_ID]
    );
    // Decrement quantity by 1
    await client.query(
      `UPDATE Pharmacy
       SET quantity = quantity - 1
       WHERE prescription_id = $1;`,
      [Prescription_ID]
    );
    client.release();
    res.json({ message: "Drugs issued successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/issued_drugs', async (req, res) => {
  try {
    const client = await getDbConnection();
    const result = await client.query(
      `SELECT id.MPID, p.name AS patient_name, id.Prescription_ID
       FROM Issues_Drugs id
       JOIN Patient p ON id.Patient_NID = p.NID;`
    );
    const issuedDrugs = result.rows.map(row => ({
      mpid: row.mpid,
      patient_name: row.patient_name,
      prescription_id: row.prescription_id
    }));
    client.release();
    res.json(issuedDrugs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// User Registration & Login
// ------------------------

// Register user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Hash the password with PBKDF2:sha256
    const hashedPassword = generatePasswordHash(password);

    const client = await getDbConnection();
    await client.query(
      `INSERT INTO users (username, password)
       VALUES ($1, $2);`,
      [username, hashedPassword]
    );
    client.release();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    // Check for duplicate username
    const lowerError = error.message.toLowerCase();
    if (lowerError.includes("duplicate key value") || lowerError.includes("unique constraint")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const client = await getDbConnection();
    const result = await client.query(
      `SELECT username, password
       FROM users
       WHERE LOWER(username) = LOWER($1);`,
      [username]
    );
    client.release();

    const user = result.rows[0]; // user => { username, password }

    if (user) {
      // Compare password using checkPasswordHash
      const isMatch = checkPasswordHash(password, user.password);
      if (isMatch) {
        return res.status(200).json({ message: "Login successful!" });
      }
    }

    res.status(401).json({ error: "Invalid username or password" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------
// Start the server
// --------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
