require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const app = express();
const fs = require('fs');
const port = 3000;



// Middleware
app.use(express.json());

app.use(express.static('uploads'));

// Set up PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

// Enable CORS
app.use(cors({
    origin: 'http://localhost:5173' // Allow requests from your frontend development server
  }));

  app.use(express.json());


// Routes
// Add Department
app.post('/api/departments', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to get departments
app.get('/api/departments', (req, res) => {
    const query = 'SELECT * FROM departments';
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Server error');
        return;
      }
      res.json(results);
    });
  });


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp'); //temporary folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // timestamp for uniqueness
  }
});

const upload = multer({ storage: storage });


// Add Employee with Image Upload (saving image in temp folder first)
app.post('/api/employees', upload.single('pancard_image'), async (req, res) => {
  const { name, department_id, address } = req.body;
  const pancard_image = req.file ? req.file.path : null;

  try {
    if (!pancard_image) {
      return res.status(400).json({ error: "Pancard image is required" });
    }

    const tempImagePath = pancard_image;
    const permanentImagePath = `uploads/${req.file.filename}`;

    // Move the file from temp to permanent location
    fs.rename(tempImagePath, permanentImagePath, async (err) => {
      if (err) {
        return res.status(500).json({ error: "Error moving the file" });
      }

      // Insert employee data with image path
      try {
        const result = await pool.query(
          'INSERT INTO employees (name, department_id, address, pancard_image) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, department_id, address, permanentImagePath]
        );


          // remove the temp image
          fs.unlink(tempImagePath, (err) => {
            if (err) {
              console.error('Error removing temp file:', err);
            } else {
              console.log('Temp file removed:', tempImagePath);
            }
          });


        res.json(result.rows[0]);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get Employees with Filter
// Get Filtered Employees with Department Details
app.get('/api/employees-filter', async (req, res) => {
    const { name, department } = req.query;
    try {
      // Base query with JOIN to include department details
      let query = `
        SELECT employees.id AS employee_id, 
               employees.name AS employee_name, 
               employees.address, 
               departments.id AS department_id, 
               departments.name AS department_name, 
               departments.description AS department_description 
        FROM employees 
        JOIN departments ON employees.department_id = departments.id 
        WHERE 1=1
      `;
      const values = [];
      
      // Add filtering conditions dynamically
      if (name) {
        query += ' AND employees.name ILIKE $1';
        values.push(`%${name}%`);
      }
      if (department) {
        query += ' AND departments.name = $' + (values.length + 1);
        values.push(department);
      }
  
      const result = await pool.query(query, values);
  
      // Format the data to include department details within each employee
      const employees = result.rows.map(employee => ({
        id: employee.employee_id,
        name: employee.employee_name,
        address: employee.address,
        department: {
          id: employee.department_id,
          name: employee.department_name,
          description: employee.department_description,
        }
      }));
  
      res.json(employees);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

// Get All Employees with Department Details
app.get('/api/employees', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT employees.id AS employee_id, 
                employees.name AS employee_name, 
                employees.address, 
                departments.id AS department_id, 
                departments.name AS department_name, 
                departments.description AS department_description 
         FROM employees 
         JOIN departments ON employees.department_id = departments.id`
      );
  
      // Format the data to include department details within each employee
      const employees = result.rows.map(employee => ({
        id: employee.employee_id,
        name: employee.employee_name,
        address: employee.address,
        department: {
          id: employee.department_id,
          name: employee.department_name,
          description: employee.department_description,
        }
      }));
  
      res.json(employees);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  
// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
