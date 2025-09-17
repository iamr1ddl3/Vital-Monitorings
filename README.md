# Health Monitor Dashboard

A comprehensive web-based health monitoring system to track vital signs during recovery from severe diseases.

## Features

### Patient Dashboard
- **Daily Vital Tracking**: Record blood pressure, oxygen levels, blood sugar, and urine output 3 times daily
- **Visual Insights**: Interactive charts showing trends over time
- **Health Alerts**: Automatic detection of concerning vital signs with instant notifications
- **Smart Recommendations**: AI-powered health insights and personalized recommendations
- **Quick Stats**: At-a-glance view of today's entries and latest readings
- **Data History**: View recent entries with alert indicators
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Doctor Sharing & Collaboration
- **Real-time Sharing**: Create secure sharing links for your healthcare provider
- **QR Code Generation**: Easy sharing via QR codes
- **Live Updates**: Doctors receive real-time notifications when you log new vitals
- **Professional Dashboard**: Dedicated doctor interface with clinical insights
- **Compliance Tracking**: Monitor patient adherence to measurement schedules
- **Export Capabilities**: Generate reports for medical consultations

### Advanced Health Monitoring
- **Intelligent Alerts**: Automatic detection of:
  - High/Low blood pressure (>140/90 or <90/60 mmHg)
  - Low oxygen levels (<95%)
  - Abnormal blood sugar (>180 or <70 mg/dL)
- **Trend Analysis**: Track improvements or deterioration over time
- **Clinical Insights**: Professional-grade analytics for healthcare providers
- **Risk Assessment**: Early warning system for potential health issues

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and go to `http://localhost:3000`

## Usage

### For Patients

#### Recording Vitals
1. Select the date and time slot (morning, afternoon, evening)
2. Enter your vital signs:
   - Blood Pressure (systolic/diastolic)
   - Oxygen Level (%)
   - Blood Sugar (mg/dL)
   - Urine Output (mL)
3. Add any notes about your condition
4. Click "Record Vitals"
5. Review any health alerts or recommendations

#### Sharing with Your Doctor
1. Enter your full name and doctor's email
2. Click "Create Sharing Link"
3. Share the generated link or QR code with your healthcare provider
4. Your doctor will receive real-time updates when you log new vitals

#### Viewing Your Health Insights
- **Current Status**: See your latest vital signs with health status indicators
- **Recommendations**: Get personalized suggestions based on your data
- **Recent Alerts**: Review any concerning readings from the past week
- **Trends**: Track your progress with interactive charts

### For Healthcare Providers

#### Accessing Patient Data
1. Use the sharing link provided by your patient
2. View real-time dashboard with patient's vital signs
3. Receive instant notifications for new readings and alerts

#### Clinical Features
- **Live Monitoring**: Real-time updates when patients log vitals
- **Health Alerts**: Immediate notifications for concerning readings
- **Trend Analysis**: Professional charts showing patient progress
- **Compliance Tracking**: Monitor how consistently patients are logging data
- **Clinical Insights**: AI-powered recommendations and risk assessments
- **Export Options**: Generate reports for medical records

## Data Storage

- All data is stored locally in an SQLite database (`health_data.db`)
- Data persists between sessions
- Export functionality can be added for sharing with healthcare providers

## Development

For development with auto-restart:
```bash
npm run dev
```

## Health Monitoring Guidelines

### Normal Ranges (consult your doctor for personalized targets):
- **Blood Pressure**: 120/80 mmHg or lower
- **Oxygen Level**: 95-100%
- **Blood Sugar**: 80-130 mg/dL (fasting)
- **Urine Output**: 800-2000 mL per day

### Important Notes:
- Always consult with your healthcare provider about your readings
- Record measurements at consistent times each day
- Take notes about factors that might affect readings (medication, activity, stress)
- Seek immediate medical attention for concerning values

## Real-time Collaboration Features

### Instant Notifications
- Doctors receive live updates when you log new vitals
- Automatic alerts for readings outside normal ranges
- Real-time dashboard synchronization

### Secure Sharing
- Unique, secure sharing links for each doctor-patient relationship
- QR codes for easy mobile sharing
- Session-based access control

### Professional Analytics
- Compliance tracking (target: 3 readings per day)
- Trend analysis with clinical insights
- Risk assessment and early warning systems
- Export capabilities for medical records

## Health Alert System

The system automatically monitors for:
- **Critical**: Oxygen levels <90%, severe blood pressure abnormalities
- **High Priority**: Blood pressure >140/90 or <90/60, blood sugar >180 or <70 mg/dL
- **Moderate**: Oxygen levels 90-95%, trending concerns

## Technical Features

- **Real-time Updates**: WebSocket-based live synchronization
- **Intelligent Analysis**: Automated health insights and recommendations
- **Data Persistence**: SQLite database with full history
- **Mobile Responsive**: Works seamlessly on all devices
- **Secure Architecture**: Session-based sharing with access controls

## Support

This tool is designed to complement, not replace, professional medical care. Always follow your doctor's instructions and seek medical attention when needed.

### Emergency Situations
If you experience:
- Chest pain or difficulty breathing
- Oxygen levels below 90%
- Severe dizziness or confusion
- Blood pressure above 180/120

**Seek immediate medical attention - do not rely solely on this monitoring system.**

## Troubleshooting

### Common Issues

#### Data Not Updating in Dashboard
1. **Check Browser Console**: Open Developer Tools (F12) and check for JavaScript errors
2. **Verify Server**: Make sure the server is running on port 3000
3. **Test Connection**: Visit `http://localhost:3000/api/vitals` to see if data loads
4. **Clear Cache**: Refresh the page with Ctrl+F5 (or Cmd+Shift+R on Mac)

#### Date/Time Selection Issues
1. **Browser Compatibility**: Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
2. **JavaScript Enabled**: Make sure JavaScript is enabled in your browser
3. **Form Validation**: Check that both date and time slot are selected before submitting

#### Form Submission Problems
1. **Required Fields**: Ensure date and time slot are filled
2. **At Least One Vital**: Enter at least one measurement (BP, oxygen, sugar, or urine)
3. **Network Connection**: Check your internet connection
4. **Server Status**: Verify the server is running with `npm start`

### Quick Fixes

```bash
# Restart the application
npm start

# Test if server is working
curl http://localhost:3000/api/vitals

# Check for JavaScript errors
# Open browser Developer Tools (F12) → Console tab
```

### Test Page
Visit `http://localhost:3000/test.html` for a simplified form to test basic functionality.