const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 3000;

// Store active sharing sessions
const sharingSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('health_data.db');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    systolic INTEGER,
    diastolic INTEGER,
    oxygen_level INTEGER,
    blood_sugar INTEGER,
    urine_output INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sharing_sessions (
    id TEXT PRIMARY KEY,
    patient_name TEXT,
    doctor_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS health_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vital_id INTEGER,
    alert_type TEXT,
    message TEXT,
    severity TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vital_id) REFERENCES vitals (id)
  )`);
});

// Health analysis functions
function analyzeVitals(vitals) {
  const alerts = [];
  
  // Blood pressure analysis
  if (vitals.systolic && vitals.diastolic) {
    if (vitals.systolic > 140 || vitals.diastolic > 90) {
      alerts.push({
        type: 'blood_pressure',
        severity: 'high',
        message: `High blood pressure detected: ${vitals.systolic}/${vitals.diastolic} mmHg`
      });
    } else if (vitals.systolic < 90 || vitals.diastolic < 60) {
      alerts.push({
        type: 'blood_pressure',
        severity: 'low',
        message: `Low blood pressure detected: ${vitals.systolic}/${vitals.diastolic} mmHg`
      });
    }
  }
  
  // Oxygen level analysis
  if (vitals.oxygen_level) {
    if (vitals.oxygen_level < 95) {
      alerts.push({
        type: 'oxygen',
        severity: vitals.oxygen_level < 90 ? 'critical' : 'moderate',
        message: `Low oxygen level: ${vitals.oxygen_level}%`
      });
    }
  }
  
  // Blood sugar analysis
  if (vitals.blood_sugar) {
    if (vitals.blood_sugar > 180) {
      alerts.push({
        type: 'blood_sugar',
        severity: 'high',
        message: `High blood sugar: ${vitals.blood_sugar} mg/dL`
      });
    } else if (vitals.blood_sugar < 70) {
      alerts.push({
        type: 'blood_sugar',
        severity: 'low',
        message: `Low blood sugar: ${vitals.blood_sugar} mg/dL`
      });
    }
  }
  
  return alerts;
}

// API Routes
app.post('/api/vitals', (req, res) => {
  const { date, time_slot, systolic, diastolic, oxygen_level, blood_sugar, urine_output, notes } = req.body;
  
  const stmt = db.prepare(`INSERT INTO vitals 
    (date, time_slot, systolic, diastolic, oxygen_level, blood_sugar, urine_output, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  
  stmt.run([date, time_slot, systolic, diastolic, oxygen_level, blood_sugar, urine_output, notes], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const vitalId = this.lastID;
    const vitals = { systolic, diastolic, oxygen_level, blood_sugar, urine_output };
    
    // Analyze vitals for health alerts
    const alerts = analyzeVitals(vitals);
    
    // Store alerts in database
    alerts.forEach(alert => {
      const alertStmt = db.prepare(`INSERT INTO health_alerts 
        (vital_id, alert_type, message, severity) VALUES (?, ?, ?, ?)`);
      alertStmt.run([vitalId, alert.type, alert.message, alert.severity]);
      alertStmt.finalize();
    });
    
    // Emit real-time update to connected doctors
    io.emit('vitals_update', {
      id: vitalId,
      date,
      time_slot,
      vitals,
      alerts,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      id: vitalId, 
      message: 'Vitals recorded successfully',
      alerts: alerts
    });
  });
  
  stmt.finalize();
});

app.get('/api/vitals', (req, res) => {
  const { days = 30 } = req.query;
  
  db.all(`SELECT * FROM vitals 
          WHERE date >= date('now', '-${days} days') 
          ORDER BY date DESC, time_slot`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/vitals/trends', (req, res) => {
  db.all(`SELECT date, 
                 AVG(systolic) as avg_systolic,
                 AVG(diastolic) as avg_diastolic,
                 AVG(oxygen_level) as avg_oxygen,
                 AVG(blood_sugar) as avg_sugar,
                 AVG(urine_output) as avg_urine
          FROM vitals 
          WHERE date >= date('now', '-30 days')
          GROUP BY date 
          ORDER BY date`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Sharing and doctor dashboard routes
app.post('/api/sharing/create', (req, res) => {
  const { patientName, doctorEmail } = req.body;
  const sessionId = uuidv4();
  
  const stmt = db.prepare(`INSERT INTO sharing_sessions 
    (id, patient_name, doctor_email) VALUES (?, ?, ?)`);
  
  stmt.run([sessionId, patientName, doctorEmail], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    sharingSessions.set(sessionId, {
      patientName,
      doctorEmail,
      createdAt: new Date()
    });
    
    const shareUrl = `${req.protocol}://${req.get('host')}/doctor/${sessionId}`;
    
    // Generate QR code for easy sharing
    QRCode.toDataURL(shareUrl, (err, qrCode) => {
      if (err) {
        res.json({ sessionId, shareUrl });
      } else {
        res.json({ sessionId, shareUrl, qrCode });
      }
    });
  });
  
  stmt.finalize();
});

app.get('/api/sharing/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  db.get(`SELECT * FROM sharing_sessions WHERE id = ? AND is_active = 1`, 
    [sessionId], (err, session) => {
    if (err || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    // Update last accessed time
    db.run(`UPDATE sharing_sessions SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?`, 
      [sessionId]);
    
    res.json(session);
  });
});

app.get('/doctor/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doctor.html'));
});

app.get('/api/vitals/shared/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { days = 30 } = req.query;
  
  // Verify session exists and is active
  db.get(`SELECT * FROM sharing_sessions WHERE id = ? AND is_active = 1`, 
    [sessionId], (err, session) => {
    if (err || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    // Get vitals data
    db.all(`SELECT v.*, GROUP_CONCAT(ha.message) as alerts 
            FROM vitals v 
            LEFT JOIN health_alerts ha ON v.id = ha.vital_id
            WHERE v.date >= date('now', '-${days} days') 
            GROUP BY v.id
            ORDER BY v.date DESC, v.time_slot`, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        patient: session.patient_name,
        vitals: rows
      });
    });
  });
});

app.get('/api/insights/:sessionId?', (req, res) => {
  const { sessionId } = req.params;
  
  // If sessionId provided, verify it exists
  if (sessionId) {
    db.get(`SELECT * FROM sharing_sessions WHERE id = ? AND is_active = 1`, 
      [sessionId], (err, session) => {
      if (err || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      generateInsights(res);
    });
  } else {
    generateInsights(res);
  }
});

function generateInsights(res) {
  // Get recent vitals for analysis
  db.all(`SELECT * FROM vitals 
          WHERE date >= date('now', '-30 days') 
          ORDER BY date DESC`, (err, vitals) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const insights = {
      summary: {
        totalReadings: vitals.length,
        daysTracked: new Set(vitals.map(v => v.date)).size,
        averageReadingsPerDay: vitals.length / Math.max(1, new Set(vitals.map(v => v.date)).size)
      },
      trends: {},
      recommendations: [],
      alerts: []
    };
    
    // Blood pressure trends
    const bpReadings = vitals.filter(v => v.systolic && v.diastolic);
    if (bpReadings.length > 0) {
      const avgSystolic = bpReadings.reduce((sum, v) => sum + v.systolic, 0) / bpReadings.length;
      const avgDiastolic = bpReadings.reduce((sum, v) => sum + v.diastolic, 0) / bpReadings.length;
      
      insights.trends.bloodPressure = {
        average: `${Math.round(avgSystolic)}/${Math.round(avgDiastolic)}`,
        trend: calculateTrend(bpReadings.map(v => v.systolic)),
        status: avgSystolic > 140 || avgDiastolic > 90 ? 'high' : 
                avgSystolic < 90 || avgDiastolic < 60 ? 'low' : 'normal'
      };
      
      if (avgSystolic > 140 || avgDiastolic > 90) {
        insights.recommendations.push('Consider lifestyle changes to reduce blood pressure: reduce sodium, increase exercise, manage stress');
      }
    }
    
    // Oxygen level trends
    const oxygenReadings = vitals.filter(v => v.oxygen_level);
    if (oxygenReadings.length > 0) {
      const avgOxygen = oxygenReadings.reduce((sum, v) => sum + v.oxygen_level, 0) / oxygenReadings.length;
      
      insights.trends.oxygenLevel = {
        average: `${Math.round(avgOxygen)}%`,
        trend: calculateTrend(oxygenReadings.map(v => v.oxygen_level)),
        status: avgOxygen < 95 ? 'low' : 'normal'
      };
      
      if (avgOxygen < 95) {
        insights.recommendations.push('Low oxygen levels detected. Consult your doctor about breathing exercises or oxygen therapy');
      }
    }
    
    // Blood sugar trends
    const sugarReadings = vitals.filter(v => v.blood_sugar);
    if (sugarReadings.length > 0) {
      const avgSugar = sugarReadings.reduce((sum, v) => sum + v.blood_sugar, 0) / sugarReadings.length;
      
      insights.trends.bloodSugar = {
        average: `${Math.round(avgSugar)} mg/dL`,
        trend: calculateTrend(sugarReadings.map(v => v.blood_sugar)),
        status: avgSugar > 180 ? 'high' : avgSugar < 70 ? 'low' : 'normal'
      };
      
      if (avgSugar > 180) {
        insights.recommendations.push('High blood sugar levels. Monitor carbohydrate intake and consult about medication adjustments');
      }
    }
    
    // Get recent alerts
    db.all(`SELECT ha.*, v.date, v.time_slot 
            FROM health_alerts ha 
            JOIN vitals v ON ha.vital_id = v.id 
            WHERE ha.created_at >= datetime('now', '-7 days') 
            ORDER BY ha.created_at DESC 
            LIMIT 10`, (err, alerts) => {
      if (!err) {
        insights.alerts = alerts;
      }
      
      res.json(insights);
    });
  });
}

function calculateTrend(values) {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(0, Math.min(7, values.length));
  const older = values.slice(Math.min(7, values.length));
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
  const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Doctor connected:', socket.id);
  
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Doctor joined session: ${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Doctor disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Health Monitor Dashboard running on http://localhost:${PORT}`);
});