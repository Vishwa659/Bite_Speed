const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const dbPath = path.join(__dirname, 'dataStorage.db'); // updated db filename
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3001, () => {
      console.log('Server Running at http://localhost:3001/');
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

app.post('/identify', (req, res) => {
  const { email, phoneNumber } = req.body;

  db.all(`SELECT * FROM dataStorage WHERE email = ? OR phoneNumber = ?`, [email, phoneNumber], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Internal Server Error");
    }

    // If rows exist (some user with email or phone found)
    if (rows.length > 0) {
      const exactMatch = rows.find(row => row.email === email && row.phoneNumber === phoneNumber);

      if (exactMatch) {
        // ✅ Exact match found, return directly
        return res.status(200).json({
          contact: {
            primaryContactId: exactMatch.id,
            emails: [...new Set(rows.map(r => r.email).filter(e => e))],
            phoneNumbers: [...new Set(rows.map(r => r.phoneNumber).filter(p => p))],
            secondaryContactIds: rows.filter(r => r.linkPrecedence === 'secondary').map(r => r.id)
          }
        });
      }

      // If email matches but phone does not
      const emailMatch = rows.find(row => row.email === email && row.phoneNumber !== phoneNumber);
      if (emailMatch) {
        db.run(`INSERT INTO dataStorage (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
                VALUES (?, ?, ?, 'secondary', datetime('now'), datetime('now'))`,
          [email, phoneNumber, emailMatch.id], function(err) {
            if (err) {
              console.error(err.message);
              return res.status(500).send("Internal Server Error");
            }

            // ✅ Return after insertion as secondary
            return res.status(200).json({
              contact: {
                primaryContactId: emailMatch.id,
                emails: [...new Set(rows.map(r => r.email).concat(email).filter(e => e))],
                phoneNumbers: [...new Set(rows.map(r => r.phoneNumber).concat(phoneNumber).filter(p => p))],
                secondaryContactIds: rows.filter(r => r.linkPrecedence === 'secondary').map(r => r.id).concat(this.lastID)
              }
            });
          });
        return; // 🛑 Prevents further execution
      }

      // If phone matches but email does not
      const phoneMatch = rows.find(row => row.phoneNumber === phoneNumber && row.email !== email);
      if (phoneMatch) {
        db.run(`INSERT INTO dataStorage (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
                VALUES (?, ?, ?, 'secondary', datetime('now'), datetime('now'))`,
          [email, phoneNumber, phoneMatch.id], function(err) {
            if (err) {
              console.error(err.message);
              return res.status(500).send("Internal Server Error");
            }

            // ✅ Return after insertion as secondary
            return res.status(200).json({
              contact: {
                primaryContactId: phoneMatch.id,
                emails: [...new Set(rows.map(r => r.email).concat(email).filter(e => e))],
                phoneNumbers: [...new Set(rows.map(r => r.phoneNumber).filter(p => p))],
                secondaryContactIds: rows.filter(r => r.linkPrecedence === 'secondary').map(r => r.id).concat(this.lastID)
              }
            });
          });
        return; // 🛑 Prevents further execution
      }

      // 🔴 Fallback if no exact/email/phone match logic triggers
      return res.status(200).json({
        contact: {
          primaryContactId: null,
          emails: [email],
          phoneNumbers: [phoneNumber],
          secondaryContactIds: []
        }
      });
    }

    else {
      // ✅ No existing user – insert as primary
      db.run(`INSERT INTO dataStorage (email, phoneNumber, linkPrecedence, createdAt, updatedAt)
              VALUES (?, ?, 'primary', datetime('now'), datetime('now'))`,
        [email, phoneNumber], function(err) {
          if (err) {
            console.error(err.message);
            return res.status(500).send("Internal Server Error");
          }

          // ✅ Return after inserting new primary contact
          return res.status(200).json({
            contact: {
              primaryContactId: this.lastID,
              emails: [email],
              phoneNumbers: [phoneNumber],
              secondaryContactIds: []
            }
          });
        });
    }
  });
});
