require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const port = 3000;


// Middleware
app.use(express.json());

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

// Add Employee
app.post('/api/employees', async (req, res) => {
  const { name, department_id, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO employees (name, department_id, address) VALUES ($1, $2, $3) RETURNING *',
      [name, department_id, address]
    );
    res.json(result.rows[0]);
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
