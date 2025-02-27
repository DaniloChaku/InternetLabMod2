const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const xml2js = require('xml2js');

const app = express();
const port = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(DATA_DIR, 'records.json');
const XML_FILE = path.join(DATA_DIR, 'records.xml');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// File system utilities
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR);
  }
}

async function initializeFiles() {
  await ensureDataDir();

  try {
    await fs.access(JSON_FILE);
  } catch {
    await fs.writeFile(JSON_FILE, JSON.stringify([]));
  }

  try {
    await fs.access(XML_FILE);
  } catch {
    const builder = new xml2js.Builder();
    const xml = builder.buildObject({
      records: { record: [] },
    });
    await fs.writeFile(XML_FILE, xml);
  }
}

// Data management functions
async function getRecords() {
  const data = await fs.readFile(JSON_FILE, 'utf8');
  return JSON.parse(data);
}

async function saveRecords(records) {
  // Save to JSON
  await fs.writeFile(
    JSON_FILE,
    JSON.stringify(records, null, 2)
  );

  // Save to XML
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({
    records: { record: records },
  });
  await fs.writeFile(XML_FILE, xml);
}

// API Routes
// Get all records
app.get('/records', async (req, res) => {
  try {
    const records = await getRecords();
    res.json(records);
  } catch (error) {
    console.error('Error reading records:', error);
    res
      .status(500)
      .json({ error: 'Error reading records' });
  }
});

// Create new record
app.post('/records', async (req, res) => {
  try {
    const records = await getRecords();

    const newRecord = {
      id: uuidv4(),
      ...req.body,
    };

    records.push(newRecord);
    await saveRecords(records);

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating record:', error);
    res
      .status(500)
      .json({ error: 'Error creating record' });
  }
});

// Update record
app.put('/records/:id', async (req, res) => {
  try {
    const records = await getRecords();

    const index = records.findIndex(
      (r) => r.id === req.params.id
    );
    if (index === -1) {
      return res
        .status(404)
        .json({ error: 'Record not found' });
    }

    records[index] = {
      ...records[index],
      ...req.body,
      id: req.params.id, // Ensure ID doesn't change
    };

    await saveRecords(records);
    res.json(records[index]);
  } catch (error) {
    console.error('Error updating record:', error);
    res
      .status(500)
      .json({ error: 'Error updating record' });
  }
});

// Delete record
app.delete('/records/:id', async (req, res) => {
  try {
    let records = await getRecords();
    records = records.filter((r) => r.id !== req.params.id);

    await saveRecords(records);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting record:', error);
    res
      .status(500)
      .json({ error: 'Error deleting record' });
  }
});

// Initialize files and start server
initializeFiles().then(() => {
  app.listen(port, () => {
    console.log(
      `Server running at http://localhost:${port}`
    );
  });
});
