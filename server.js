import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const port = 3001;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.post('/api/test-connection', async (req, res) => {
  const { host, user, password, database } = req.body;
  
  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      connectTimeout: 10000
    });
    
    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/create-table', async (req, res) => {
  const { credentials, sql } = req.body;
  
  try {
    const connection = await mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      connectTimeout: 10000
    });
    
    await connection.execute(sql);
    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/insert-data', async (req, res) => {
  const { credentials, tableName, data, columns } = req.body;
  
  try {
    const connection = await mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      connectTimeout: 10000
    });
    
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    for (const row of data) {
      await connection.execute(sql, row);
    }
    
    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.error('Insert data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});