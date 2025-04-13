const express = require("express");
const app = express();
const MongoClient = require("mongodb").MongoClient;

app.use((req, res, next) => {
  const method = req.method;
  const url = req.url;
  const timestamp = new Date();

  console.log(`[${timestamp}] ${method} request to ${url}`);

  res.on("finish", () => {
    console.log(`[${timestamp}] Response status: ${res.statusCode}`);
  });

  next();
});

const path = require("path");
const imagePath = path.resolve(__dirname, "images");

app.use("/images", express.static(imagePath));

app.get("/images", (req, res, next) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("You done goofed(did not find static file)");
  next();
});

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  next();
});

let db;
MongoClient.connect("mongodb+srv://amay0028:amay@cluster0.6ig57pb.mongodb.net/", (err, client) => {
  if (err) throw err;
  db = client.db("therapy-site");
  console.log("Connected to MongoDB");
});

app.get("/", (req, res, next) => {
  res.send("Select a collection, e.g., /collection/messages");
});

app.param("collectionName", (req, res, next, collectionName) => {
  req.collection = db.collection(collectionName);
  return next();
});

app.get("/collection/:collectionName", (req, res, next) => {
  req.collection.find({}).toArray((e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

const ObjectID = require("mongodb").ObjectID;

app.post("/collection/:collectionName", (req, res, next) => {
  req.collection.insert(req.body, (e, results) => {
    if (e) return next(e);
    res.send(results.ops);
  });
});

app.get("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => {
    if (e) return next(e);
    res.send(result);
  });
});

app.put("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.update(
    { _id: new ObjectID(req.params.id) },
    { $set: req.body },
    { safe: true, multi: false },
    (e, result) => {
      if (e) return next(e);
      res.send(result.result.n === 1 ? { msg: "success" } : { msg: "error" });
    }
  );
});


app.get("/search/:collectionName", (req, res, next) => {
  const searchTerm = req.query.q || "";
  const searchRegex = new RegExp(searchTerm, "i");

  const query = { $or: [{ title: searchRegex }, { location: searchRegex }] };

  req.collection.find(query).toArray((err, results) => {
    if (err) return next(err);
    res.send(results);
  });
});







app.get('/login/:collectionName', (request, response, next) => {
  const usernameTerm = request.query.username || "";
  const passwordTerm = request.query.password || "";
  const roleTerm = request.query.role || "";

  const query = {
    $and: [
      { username: usernameTerm }, // Exact match for username
      { password: passwordTerm }, // Exact match for password
      { role: roleTerm }          // Exact match for role
    ]
  };

  request.collection.findOne(query, (err, result) => {
    if (err) return next(err); // Handle errors

    if (!result) {
      // If no matching document is found, return 404
      response.status(404).send({ error: "Invalid credentials" });
    } else {
      response.send(result); // Send matched user data
    }
  });
});




// Start server
const port = process.env.PORT || 3000;
app.listen(port)






//excel data upload
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const csv = require("csv-parser");
const { Readable } = require("stream");

function convertExcelDateToISO(excelDate) {
  if (!isNaN(excelDate)) {
    const baseDate = new Date(1899, 11, 30); // 1899-12-30
    const millis = excelDate * 24 * 60 * 60 * 1000;
    const converted = new Date(baseDate.getTime() + millis);
    return converted.toISOString().split("T")[0]; // "YYYY-MM-DD"
  }
  return excelDate; // fallback if already a string
}

app.post("/upload-session-notes", upload.single("file"), (req, res) => {
  const results = [];
  const fileBuffer = req.file.buffer;

  Readable.from(fileBuffer.toString())
    .pipe(csv())
    .on("data", (row) => {
      if (row["Date"]) {
        row["Date"] = convertExcelDateToISO(parseFloat(row["Date"]));
      }
      results.push(row);
    })
    .on("end", () => {
      db.collection("uploaded_data").insertMany(results, (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Error saving data" });
        }
        res.json({ message: "File processed and data saved successfully" });
      });
    });
});








//adding routes for code 2
app.get("/uploaded-data", (req, res) => {
  db.collection("uploaded_data")
    .find({})
    .toArray((err, docs) => {
      if (err) return res.status(500).send("Error retrieving uploaded data.");
      res.send(docs);
    });
});

app.delete("/uploaded-data", (req, res) => {
  db.collection("uploaded_data").deleteMany({}, (err, result) => {
    if (err) return res.status(500).send("Error deleting uploaded data.");
    res.json({ message: "Uploaded data deleted." });
  });
});



//new routes for appointment
app.post("/add-appointment", (req, res) => {
  const appointment = { ...req.body, counselor: "Ms Mitzi" }; // force counselor
  db.collection("appointments").insertOne(appointment, (err, result) => {
    if (err) return res.status(500).send("Error saving appointment.");
    res.json({ message: "Appointment added successfully!" });
  });
});

// Route to get all appointments
app.get("/get-appointments", (req, res) => {
  db.collection("appointments").find({}).toArray((err, docs) => {
    if (err) return res.status(500).send("Error retrieving appointments.");
    res.send(docs);
  });
});




//ver 3
app.post("/save-session-notes", (req, res) => {
  const sessionData = req.body;
  if (!Array.isArray(sessionData)) {
    return res.status(400).json({ message: "Invalid session data format" });
  }

  db.collection("manual_session_notes").deleteMany({}, err => {
    if (err) return res.status(500).json({ message: "Failed to clear old session notes." });

    db.collection("manual_session_notes").insertMany(sessionData, (err2, result) => {
      if (err2) return res.status(500).json({ message: "Failed to save session notes." });
      res.json({ message: "Session notes saved successfully!" });
    });
  });
});





//ver 5
app.put("/update-uploaded-data", (req, res) => {
  const updates = req.body;

  const bulkOps = updates.map(item => ({
    updateOne: {
      filter: { _id: new ObjectID(item.id) },
      update: { $set: item.updated }
    }
  }));

  db.collection("uploaded_data").bulkWrite(bulkOps, { ordered: false }, (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to update session notes." });
    res.json({ message: "Session notes updated successfully!" });
  });
});



//ver 6
app.post("/upload-session-notes", upload.single("file"), express.json(), (req, res) => {
  // 📦 If JSON data was sent
  if (Array.isArray(req.body)) {
    return db.collection("uploaded_data").insertMany(req.body, (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to insert session notes." });
      return res.json({ message: "New session notes added!" });
    });
  }

  // 📁 If file was uploaded instead
  const file = req.file;
  if (!file || !file.buffer) {
    return res.status(400).json({ message: "No valid file or JSON provided." });
  }

  const results = [];
  Readable.from(file.buffer.toString())
    .pipe(csv())
    .on("data", (row) => {
      if (row["Date"]) {
        row["Date"] = convertExcelDateToISO(parseFloat(row["Date"]));
      }
      results.push(row);
    })
    .on("end", () => {
      db.collection("uploaded_data").insertMany(results, (err, result) => {
        if (err) return res.status(500).json({ message: "Error saving CSV data" });
        res.json({ message: "CSV file processed and data saved successfully" });
      });
    });
});


//ver 7
app.post("/insert-uploaded-session-notes", (req, res) => {
  const sessionNotes = req.body;

  if (!Array.isArray(sessionNotes)) {
    return res.status(400).json({ message: "Invalid session notes format." });
  }

  db.collection("uploaded_data").insertMany(sessionNotes, (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to insert new session notes." });
    res.json({ message: "New session notes added successfully!" });
  });
});



//ver 8
app.get("/manual-session-notes", (req, res) => {
  db.collection("manual_session_notes")
    .find({})
    .toArray((err, docs) => {
      if (err) return res.status(500).send("Error retrieving manual session notes.");
      res.send(docs);
    });
});

app.delete("/manual-session-notes", (req, res) => {
  db.collection("manual_session_notes").deleteMany({}, (err, result) => {
    if (err) return res.status(500).send("Failed to delete old manual session notes.");
    res.json({ message: "Old session notes cleared before saving new ones." });
  });
});



//ver 10
app.get("/students", async (req, res) => {
  const students = await db.collection("users").find({ role: "Student" }).project({ fullName: 1, username: 1, _id: 0 }).toArray();
  res.json(students);
});

app.post("/upload-resource", async (req, res) => {
  const resource = req.body;
  await db.collection("resources").insertOne(resource);
  res.json({ message: "Resource uploaded!" });
});

app.get("/resources", async (req, res) => {
  const resources = await db.collection("resources").find().toArray();
  res.json(resources);
});


app.post("/send-to-student", async (req, res) => {
  const payload = req.body;
  await db.collection("student_resources").insertOne({ ...payload, sentAt: new Date() });
  res.json({ message: "Material sent to student!" });
});


//ver 11

const express = require('express');
// const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // ✅ This serves login.html, student.html, etc.

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

// your routes like /login, /appointments, /upload-session-notes etc go here...

// ✅ Final catch-all route for React-style routing (if needed)
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Example API route
app.get('/api/health', (req, res) => {
  res.send('API is working');
});

// Catch-all route to serve login.html by default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});