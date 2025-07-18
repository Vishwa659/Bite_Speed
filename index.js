const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dataStorage.db');

db.run(`INSERT INTO dataStorage (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt)
VALUES (?, ?, ?, ?, ?, ?, ?)`,
[
  '1234567890',
  'test@gmail.com',
  null,
  'secondary',
  '2023-04-01 00:00:00.374+00:00',
  '2023-04-01 00:00:00.374+00:00',
  null
]);

module.exports = db;

