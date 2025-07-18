const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dataStorage.db');

db.run(`CREATE TABLE IF NOT EXISTS dataStorage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  phoneNumber TEXT,
  linkedId INTEGER,
  linkPrecedence TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  deletedAt TEXT
)`);
