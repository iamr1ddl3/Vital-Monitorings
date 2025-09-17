class HealthMonitor {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeApp();
            });
        } else {
            this.initializeApp();
        }
    }
    
    initializeApp() {
        console.log('Initializing Health Monitor App...');
        
        // Update status
        const statusEl = document.getElementById('appStatus');
        if (statusEl) {
            statusEl.textContent = 'Initializing...';
            statusEl.style.color = '#f39c12';
        }
        
        this.setTodayDate();
        this.setupEventListeners();
        this.loadDashboardData();
        this.loadInsights();
        this.initializeCharts();
        
        // Mark as ready
        if (statusEl) {
            statusEl.textContent = '✅ Ready';
            statusEl.style.color = '#27ae60';
        }
        
        console.log('Health Monitor App initialized successfully');
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = today;
            console.log('Set date to:', today);
        }
    }

    setupEventListeners() {
        const form = document.getElementById('vitalsForm');
        const submitBtn = document.querySelector('.submit-btn');
        
        console.log('Setting up event listeners...');
        console.log('Form found:', !!form);
        console.log('Submit button found:', !!submitBtn);
        
        if (!form || !submitBtn) {
            console.error('Required form elements not found!');
            return;
        }
        
        // Prevent default form submission
        form.addEventListener('submit', (e) => {
            console.log('Form submit event triggered');
            e.preventDefault();
            e.stopPropagation();
            this.submitVitals();
        });
        
        // Add click handler for submit button
        submitBtn.addEventListener('click', (e) => {
            console.log('Submit button clicked');
            e.preventDefault();
            this.submitVitals();
        });
        
        console.log('Event listeners set up successfully');
    }

    async submitVitals() {
        console.log('submitVitals called at:', new Date().toISOString());
        
        // Validate required fields
        const date = document.getElementById('date').value;
        const timeSlot = document.getElementById('timeSlot').value;
        
        console.log('Form values:', { date, timeSlot });
        
        if (!date || !timeSlot) {
            this.showMessage('Please select both date and time slot before recording vitals.', 'error');
            return;
        }
        
        // Check if at least one vital sign is entered
        const systolic = document.getElementById('systolic').value;
        const diastolic = document.getElementById('diastolic').value;
        const oxygenLevel = document.getElementById('oxygenLevel').value;
        const bloodSugar = document.getElementById('bloodSugar').value;
        const urineOutput = document.getElementById('urineOutput').value;
        
        console.log('Vital signs:', { systolic, diastolic, oxygenLevel, bloodSugar, urineOutput });
        
        if (!systolic && !diastolic && !oxygenLevel && !bloodSugar && !urineOutput) {
            this.showMessage('Please enter at least one vital sign measurement.', 'error');
            return;
        }
        
        const formData = {
            date: date,
            time_slot: timeSlot,
            systolic: parseInt(systolic) || null,
            diastolic: parseInt(diastolic) || null,
            oxygen_level: parseInt(oxygenLevel) || null,
            blood_sugar: parseInt(bloodSugar) || null,
            urine_output: parseInt(urineOutput) || null,
            notes: document.getElementById('notes').value || null
        };
        
        console.log('Submitting data:', formData);

        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Recording...';
        submitBtn.disabled = true;
        
        try {
            console.log('Sending request to /api/vitals');
            const response = await fetch('/api/vitals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (response.ok) {
                this.showMessage('✅ Vitals recorded successfully!', 'success');
                
                // Show any health alerts
                if (result.alerts && result.alerts.length > 0) {
                    result.alerts.forEach(alert => {
                        this.showMessage(`⚠️ ${alert.message}`, alert.severity === 'critical' ? 'error' : 'warning');
                    });
                }
                
                this.clearForm();
                
                // Force refresh dashboard data
                console.log('Refreshing dashboard data...');
                await this.loadDashboardData();
                await this.loadInsights();
                console.log('Dashboard refresh complete');
            } else {
                console.error('Server error:', result);
                this.showMessage(`❌ Server error: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showMessage('❌ Network error. Please check if the server is running.', 'error');
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    clearForm() {
        document.getElementById('vitalsForm').reset();
        this.setTodayDate();
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message message`;
        messageDiv.textContent = message;
        
        const form = document.querySelector('.form-section');
        form.insertBefore(messageDiv, form.firstChild);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            const response = await fetch('/api/vitals?days=7');
            console.log('Dashboard response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const vitals = await response.json();
            console.log('Loaded vitals:', vitals.length, 'records');
            
            this.updateQuickStats(vitals);
            this.updateRecentTable(vitals);
            await this.updateCharts();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showMessage('Error loading dashboard data. Please refresh the page.', 'error');
        }
    }

    async loadInsights() {
        try {
            const response = await fetch('/api/insights');
            const insights = await response.json();
            this.updateInsights(insights);
        } catch (error) {
            console.error('Error loading insights:', error);
        }
    }

    updateInsights(insights) {
        // Update health status
        const statusDiv = document.getElementById('healthStatus');
        let statusHtml = '';
        
        if (insights.trends.bloodPressure) {
            const bp = insights.trends.bloodPressure;
            statusHtml += `<p><strong>Blood Pressure:</strong> ${bp.average} - ${bp.status} (${bp.trend})</p>`;
        }
        if (insights.trends.oxygenLevel) {
            const o2 = insights.trends.oxygenLevel;
            statusHtml += `<p><strong>Oxygen Level:</strong> ${o2.average} - ${o2.status} (${o2.trend})</p>`;
        }
        if (insights.trends.bloodSugar) {
            const sugar = insights.trends.bloodSugar;
            statusHtml += `<p><strong>Blood Sugar:</strong> ${sugar.average} - ${sugar.status} (${sugar.trend})</p>`;
        }
        
        statusDiv.innerHTML = statusHtml || '<p>Record more data for detailed insights</p>';
        
        // Update recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        if (insights.recommendations && insights.recommendations.length > 0) {
            recommendationsList.innerHTML = insights.recommendations
                .map(rec => `<li>${rec}</li>`)
                .join('');
        } else {
            recommendationsList.innerHTML = '<li>Keep up the good work! Continue monitoring regularly.</li>';
        }
        
        // Update recent alerts
        const alertsDiv = document.getElementById('recentAlerts');
        if (insights.alerts && insights.alerts.length > 0) {
            alertsDiv.innerHTML = insights.alerts
                .slice(0, 3)
                .map(alert => `
                    <div class="health-alert ${alert.severity}">
                        <strong>${alert.alert_type}:</strong> ${alert.message}
                        <small>(${alert.date} ${alert.time_slot})</small>
                    </div>
                `).join('');
        } else {
            alertsDiv.innerHTML = '<p style="color: #27ae60;">No recent alerts - Your vitals are stable! 👍</p>';
        }
    }

    updateQuickStats(vitals) {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = vitals.filter(v => v.date === today);
        
        document.getElementById('todayEntries').textContent = todayEntries.length;

        if (vitals.length > 0) {
            const latest = vitals[0];
            document.getElementById('latestBP').textContent = 
                latest.systolic && latest.diastolic ? `${latest.systolic}/${latest.diastolic}` : '--/--';
            document.getElementById('latestO2').textContent = 
                latest.oxygen_level ? `${latest.oxygen_level}%` : '--%';
            document.getElementById('latestSugar').textContent = 
                latest.blood_sugar ? `${latest.blood_sugar} mg/dL` : '-- mg/dL';
        }
    }

    updateRecentTable(vitals) {
        const tbody = document.getElementById('recentTableBody');
        tbody.innerHTML = '';

        vitals.slice(0, 10).forEach(vital => {
            const row = tbody.insertRow();
            
            // Check if there are any alerts for this reading
            const hasAlerts = this.checkForAlerts(vital);
            
            row.innerHTML = `
                <td>${vital.date}</td>
                <td>${vital.time_slot}</td>
                <td>${vital.systolic && vital.diastolic ? `${vital.systolic}/${vital.diastolic}` : '--'}</td>
                <td>${vital.oxygen_level ? `${vital.oxygen_level}%` : '--'}</td>
                <td>${vital.blood_sugar ? `${vital.blood_sugar}` : '--'}</td>
                <td>${vital.urine_output ? `${vital.urine_output}mL` : '--'}</td>
                <td>${hasAlerts.length > 0 ? `<span class="alert-badge">${hasAlerts.length}</span>` : '--'}</td>
                <td>${vital.notes || '--'}</td>
            `;
        });
    }

    checkForAlerts(vital) {
        const alerts = [];
        
        // Blood pressure alerts
        if (vital.systolic && vital.diastolic) {
            if (vital.systolic > 140 || vital.diastolic > 90) {
                alerts.push('High BP');
            } else if (vital.systolic < 90 || vital.diastolic < 60) {
                alerts.push('Low BP');
            }
        }
        
        // Oxygen level alerts
        if (vital.oxygen_level && vital.oxygen_level < 95) {
            alerts.push('Low O2');
        }
        
        // Blood sugar alerts
        if (vital.blood_sugar) {
            if (vital.blood_sugar > 180) {
                alerts.push('High Sugar');
            } else if (vital.blood_sugar < 70) {
                alerts.push('Low Sugar');
            }
        }
        
        return alerts;
    }

    async updateCharts() {
        try {
            const response = await fetch('/api/vitals/trends');
            const trends = await response.json();
            
            this.updateBPChart(trends);
            this.updateOxygenChart(trends);
            this.updateSugarChart(trends);
            this.updateUrineChart(trends);
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    initializeCharts() {
        // Initialize empty charts
        this.updateBPChart([]);
        this.updateOxygenChart([]);
        this.updateSugarChart([]);
        this.updateUrineChart([]);
    }

    updateBPChart(data) {
        const ctx = document.getElementById('bpChart').getContext('2d');
        
        if (this.charts.bp) {
            this.charts.bp.destroy();
        }

        this.charts.bp = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'Systolic',
                    data: data.map(d => d.avg_systolic),
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Diastolic',
                    data: data.map(d => d.avg_diastolic),
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
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
                        max: 180
                    }
                }
            }
        });
    }

    updateOxygenChart(data) {
        const ctx = document.getElementById('oxygenChart').getContext('2d');
        
        if (this.charts.oxygen) {
            this.charts.oxygen.destroy();
        }

        this.charts.oxygen = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'Oxygen Level (%)',
                    data: data.map(d => d.avg_oxygen),
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
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
                        min: 90,
                        max: 100
                    }
                }
            }
        });
    }

    updateSugarChart(data) {
        const ctx = document.getElementById('sugarChart').getContext('2d');
        
        if (this.charts.sugar) {
            this.charts.sugar.destroy();
        }

        this.charts.sugar = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'Blood Sugar (mg/dL)',
                    data: data.map(d => d.avg_sugar),
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
                        min: 70,
                        max: 200
                    }
                }
            }
        });
    }

    updateUrineChart(data) {
        const ctx = document.getElementById('urineChart').getContext('2d');
        
        if (this.charts.urine) {
            this.charts.urine.destroy();
        }

        this.charts.urine = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'Urine Output (mL)',
                    data: data.map(d => d.avg_urine),
                    backgroundColor: 'rgba(155, 89, 182, 0.6)',
                    borderColor: '#9b59b6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Urine Output Trends'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Sharing functionality
async function createSharingLink() {
    const patientName = document.getElementById('patientName').value;
    const doctorEmail = document.getElementById('doctorEmail').value;
    
    if (!patientName || !doctorEmail) {
        alert('Please enter both your name and doctor\'s email');
        return;
    }
    
    try {
        const response = await fetch('/api/sharing/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                patientName,
                doctorEmail
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('shareLink').value = result.shareUrl;
            if (result.qrCode) {
                document.getElementById('qrCode').src = result.qrCode;
            }
            document.getElementById('sharingResult').style.display = 'block';
        } else {
            alert('Error creating sharing link: ' + result.error);
        }
    } catch (error) {
        alert('Error creating sharing link. Please try again.');
    }
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    const copyBtn = document.querySelector('.copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#27ae60';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#3498db';
    }, 2000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HealthMonitor();
});