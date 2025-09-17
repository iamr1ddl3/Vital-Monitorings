class DoctorDashboard {
    constructor() {
        this.sessionId = this.getSessionId();
        this.socket = io();
        this.charts = {};
        this.patientData = null;
        this.init();
    }

    getSessionId() {
        const path = window.location.pathname;
        return path.split('/').pop();
    }

    init() {
        this.setupSocketListeners();
        this.loadPatientData();
        this.loadInsights();
        this.initializeCharts();
    }

    setupSocketListeners() {
        this.socket.emit('join_session', this.sessionId);
        
        this.socket.on('vitals_update', (data) => {
            this.handleRealTimeUpdate(data);
        });
    }

    handleRealTimeUpdate(data) {
        // Show real-time notification
        this.showNotification(`New vitals recorded: ${data.date} ${data.time_slot}`, 'info');
        
        // Display any new alerts
        if (data.alerts && data.alerts.length > 0) {
            data.alerts.forEach(alert => {
                this.showNotification(alert.message, alert.severity);
            });
        }
        
        // Refresh data
        setTimeout(() => {
            this.loadPatientData();
            this.loadInsights();
        }, 1000);
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <strong>Live Update:</strong> ${message}
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add notification styles if not exist
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 1000;
                    max-width: 400px;
                    animation: slideIn 0.3s ease;
                }
                .notification.info { background: #3498db; }
                .notification.critical { background: #e74c3c; }
                .notification.high { background: #f39c12; }
                .notification.moderate { background: #27ae60; }
                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    float: right;
                    cursor: pointer;
                    font-size: 18px;
                    margin-left: 10px;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async loadPatientData() {
        try {
            const response = await fetch(`/api/vitals/shared/${this.sessionId}`);
            if (!response.ok) {
                throw new Error('Failed to load patient data');
            }
            
            this.patientData = await response.json();
            this.updatePatientInfo();
            this.updateMetrics();
            this.updateRecentReadings();
            this.updateCharts();
            this.updateAlerts();
        } catch (error) {
            console.error('Error loading patient data:', error);
            document.getElementById('patientName').textContent = 'Error loading patient data';
        }
    }

    async loadInsights() {
        try {
            const response = await fetch(`/api/insights/${this.sessionId}`);
            const insights = await response.json();
            this.updateInsights(insights);
        } catch (error) {
            console.error('Error loading insights:', error);
        }
    }

    updatePatientInfo() {
        document.getElementById('patientName').textContent = 
            `Patient: ${this.patientData.patient}`;
    }

    updateMetrics() {
        const vitals = this.patientData.vitals;
        if (vitals.length === 0) return;

        const latest = vitals[0];
        
        // Blood Pressure
        if (latest.systolic && latest.diastolic) {
            document.getElementById('currentBP').textContent = 
                `${latest.systolic}/${latest.diastolic}`;
            
            const bpStatus = this.getBPStatus(latest.systolic, latest.diastolic);
            document.getElementById('bpStatus').textContent = bpStatus.text;
            document.getElementById('bpStatus').style.color = bpStatus.color;
        }
        
        // Oxygen Level
        if (latest.oxygen_level) {
            document.getElementById('currentO2').textContent = `${latest.oxygen_level}%`;
            
            const o2Status = this.getO2Status(latest.oxygen_level);
            document.getElementById('o2Status').textContent = o2Status.text;
            document.getElementById('o2Status').style.color = o2Status.color;
        }
        
        // Blood Sugar
        if (latest.blood_sugar) {
            document.getElementById('currentSugar').textContent = `${latest.blood_sugar} mg/dL`;
            
            const sugarStatus = this.getSugarStatus(latest.blood_sugar);
            document.getElementById('sugarStatus').textContent = sugarStatus.text;
            document.getElementById('sugarStatus').style.color = sugarStatus.color;
        }
        
        // Compliance
        const today = new Date().toISOString().split('T')[0];
        const todayReadings = vitals.filter(v => v.date === today);
        const compliance = Math.round((todayReadings.length / 3) * 100);
        document.getElementById('compliance').textContent = `${compliance}%`;
    }

    getBPStatus(systolic, diastolic) {
        if (systolic > 140 || diastolic > 90) {
            return { text: 'High', color: '#e74c3c' };
        } else if (systolic < 90 || diastolic < 60) {
            return { text: 'Low', color: '#f39c12' };
        }
        return { text: 'Normal', color: '#27ae60' };
    }

    getO2Status(oxygen) {
        if (oxygen < 90) {
            return { text: 'Critical', color: '#e74c3c' };
        } else if (oxygen < 95) {
            return { text: 'Low', color: '#f39c12' };
        }
        return { text: 'Normal', color: '#27ae60' };
    }

    getSugarStatus(sugar) {
        if (sugar > 180) {
            return { text: 'High', color: '#e74c3c' };
        } else if (sugar < 70) {
            return { text: 'Low', color: '#f39c12' };
        }
        return { text: 'Normal', color: '#27ae60' };
    }

    updateAlerts() {
        const alertsContainer = document.getElementById('alertsContainer');
        const recentAlerts = this.patientData.vitals
            .filter(v => v.alerts)
            .slice(0, 5);
        
        if (recentAlerts.length === 0) {
            alertsContainer.innerHTML = '<div class="no-alerts">No recent alerts - Patient vitals are stable</div>';
            return;
        }
        
        alertsContainer.innerHTML = recentAlerts.map(vital => {
            const alerts = vital.alerts.split(',').filter(a => a.trim());
            return alerts.map(alert => `
                <div class="alert-item ${this.getAlertSeverity(alert)}">
                    <span>${alert}</span>
                    <span class="alert-time">${vital.date} ${vital.time_slot}</span>
                </div>
            `).join('');
        }).join('');
    }

    getAlertSeverity(alert) {
        if (alert.toLowerCase().includes('critical') || alert.toLowerCase().includes('low oxygen')) {
            return 'critical';
        } else if (alert.toLowerCase().includes('high') || alert.toLowerCase().includes('low')) {
            return 'high';
        }
        return 'moderate';
    }

    updateInsights(insights) {
        // Update recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        if (insights.recommendations && insights.recommendations.length > 0) {
            recommendationsList.innerHTML = insights.recommendations
                .map(rec => `<li>${rec}</li>`)
                .join('');
        } else {
            recommendationsList.innerHTML = '<li>No specific recommendations at this time</li>';
        }
        
        // Update trends analysis
        const trendsAnalysis = document.getElementById('trendsAnalysis');
        let trendsHtml = '';
        
        if (insights.trends.bloodPressure) {
            trendsHtml += `<p><strong>Blood Pressure:</strong> ${insights.trends.bloodPressure.average} (${insights.trends.bloodPressure.trend})</p>`;
        }
        if (insights.trends.oxygenLevel) {
            trendsHtml += `<p><strong>Oxygen Level:</strong> ${insights.trends.oxygenLevel.average} (${insights.trends.oxygenLevel.trend})</p>`;
        }
        if (insights.trends.bloodSugar) {
            trendsHtml += `<p><strong>Blood Sugar:</strong> ${insights.trends.bloodSugar.average} (${insights.trends.bloodSugar.trend})</p>`;
        }
        
        trendsAnalysis.innerHTML = trendsHtml || '<p>Insufficient data for trend analysis</p>';
        
        // Update trend indicators in metrics
        if (insights.trends.bloodPressure) {
            document.getElementById('bpTrend').textContent = 
                `Trend: ${insights.trends.bloodPressure.trend}`;
        }
        if (insights.trends.oxygenLevel) {
            document.getElementById('o2Trend').textContent = 
                `Trend: ${insights.trends.oxygenLevel.trend}`;
        }
        if (insights.trends.bloodSugar) {
            document.getElementById('sugarTrend').textContent = 
                `Trend: ${insights.trends.bloodSugar.trend}`;
        }
    }

    updateRecentReadings() {
        const tbody = document.getElementById('readingsTableBody');
        tbody.innerHTML = '';

        this.patientData.vitals.slice(0, 20).forEach(vital => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${vital.date}<br><small>${vital.time_slot}</small></td>
                <td>${vital.systolic && vital.diastolic ? `${vital.systolic}/${vital.diastolic}` : '--'}</td>
                <td>${vital.oxygen_level ? `${vital.oxygen_level}%` : '--'}</td>
                <td>${vital.blood_sugar ? `${vital.blood_sugar}` : '--'}</td>
                <td>${vital.urine_output ? `${vital.urine_output}mL` : '--'}</td>
                <td>${vital.alerts ? `<span class="alert-badge">${vital.alerts.split(',').length}</span>` : '--'}</td>
                <td>${vital.notes || '--'}</td>
            `;
        });
    }

    initializeCharts() {
        this.updateCharts();
    }

    updateCharts() {
        if (!this.patientData || this.patientData.vitals.length === 0) return;
        
        const vitals = this.patientData.vitals.reverse(); // Chronological order
        
        this.updateBPChart(vitals);
        this.updateOxygenChart(vitals);
        this.updateSugarChart(vitals);
        this.updateComplianceChart(vitals);
    }

    updateBPChart(vitals) {
        const ctx = document.getElementById('bpChart').getContext('2d');
        
        if (this.charts.bp) {
            this.charts.bp.destroy();
        }

        const bpData = vitals.filter(v => v.systolic && v.diastolic);
        
        this.charts.bp = new Chart(ctx, {
            type: 'line',
            data: {
                labels: bpData.map(v => `${v.date} ${v.time_slot}`),
                datasets: [{
                    label: 'Systolic',
                    data: bpData.map(v => v.systolic),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Diastolic',
                    data: bpData.map(v => v.diastolic),
                    borderColor: '#c0392b',
                    backgroundColor: 'rgba(192, 57, 43, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Blood Pressure Trends'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 60,
                        max: 200
                    }
                }
            }
        });
    }

    updateOxygenChart(vitals) {
        const ctx = document.getElementById('oxygenChart').getContext('2d');
        
        if (this.charts.oxygen) {
            this.charts.oxygen.destroy();
        }

        const oxygenData = vitals.filter(v => v.oxygen_level);
        
        this.charts.oxygen = new Chart(ctx, {
            type: 'line',
            data: {
                labels: oxygenData.map(v => `${v.date} ${v.time_slot}`),
                datasets: [{
                    label: 'Oxygen Level (%)',
                    data: oxygenData.map(v => v.oxygen_level),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Oxygen Level Trends'
                    }
                },
                scales: {
                    y: {
                        min: 85,
                        max: 100
                    }
                }
            }
        });
    }

    updateSugarChart(vitals) {
        const ctx = document.getElementById('sugarChart').getContext('2d');
        
        if (this.charts.sugar) {
            this.charts.sugar.destroy();
        }

        const sugarData = vitals.filter(v => v.blood_sugar);
        
        this.charts.sugar = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sugarData.map(v => `${v.date} ${v.time_slot}`),
                datasets: [{
                    label: 'Blood Sugar (mg/dL)',
                    data: sugarData.map(v => v.blood_sugar),
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Blood Sugar Trends'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 50,
                        max: 250
                    }
                }
            }
        });
    }

    updateComplianceChart(vitals) {
        const ctx = document.getElementById('complianceChart').getContext('2d');
        
        if (this.charts.compliance) {
            this.charts.compliance.destroy();
        }

        // Calculate daily compliance (readings per day)
        const dailyReadings = {};
        vitals.forEach(v => {
            if (!dailyReadings[v.date]) {
                dailyReadings[v.date] = 0;
            }
            dailyReadings[v.date]++;
        });

        const dates = Object.keys(dailyReadings).sort();
        const compliance = dates.map(date => Math.min(100, (dailyReadings[date] / 3) * 100));
        
        this.charts.compliance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Compliance (%)',
                    data: compliance,
                    backgroundColor: compliance.map(c => 
                        c >= 100 ? '#27ae60' : 
                        c >= 66 ? '#f39c12' : '#e74c3c'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Compliance (Target: 3 readings/day)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Export functions
function exportToPDF() {
    alert('PDF export functionality would be implemented here');
}

function exportToCSV() {
    alert('CSV export functionality would be implemented here');
}

function generateSummary() {
    alert('Summary generation functionality would be implemented here');
}

// Initialize the doctor dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DoctorDashboard();
});