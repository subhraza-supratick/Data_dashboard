let currentData = null;

// File upload handling
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        uploadFile(file);
    }
});

// Drag and drop functionality
const uploadBox = document.getElementById('uploadBox');

uploadBox.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = '#667eea';
    uploadBox.style.backgroundColor = '#f8f9ff';
});

uploadBox.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = '#ddd';
    uploadBox.style.backgroundColor = 'white';
});

uploadBox.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = '#ddd';
    uploadBox.style.backgroundColor = 'white';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
});

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading();
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            currentData = data.info;
            showDashboard();
            displayFileInfo(data.info);
            populateColumnSelectors(data.info);
            loadStatistics();
            loadDataPreview();
        } else {
            showError(data.error);
        }
    })
    .catch(error => {
        hideLoading();
        showError('An error occurred while uploading the file.');
        console.error('Error:', error);
    });
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showDashboard() {
    document.getElementById('dashboard').style.display = 'grid';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const container = document.querySelector('.container');
    container.insertBefore(successDiv, container.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function displayFileInfo(info) {
    const fileInfoDiv = document.getElementById('fileInfo');
    
    const infoHTML = `
        <div class="info-grid">
            <div class="info-item">
                <h4><i class="fas fa-file"></i> Filename</h4>
                <p>${info.filename}</p>
            </div>
            <div class="info-item">
                <h4><i class="fas fa-table"></i> Shape</h4>
                <p>${info.shape[0]} rows × ${info.shape[1]} columns</p>
            </div>
            <div class="info-item">
                <h4><i class="fas fa-hashtag"></i> Numeric Columns</h4>
                <p>${info.numeric_columns.length}</p>
            </div>
            <div class="info-item">
                <h4><i class="fas fa-font"></i> Categorical Columns</h4>
                <p>${info.categorical_columns.length}</p>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h4><i class="fas fa-columns"></i> All Columns</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                ${info.columns.map(col => `<span style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 0.9rem;">${col}</span>`).join('')}
            </div>
        </div>
    `;
    
    fileInfoDiv.innerHTML = infoHTML;
}

function populateColumnSelectors(info) {
    const xColumnSelect = document.getElementById('xColumn');
    const yColumnSelect = document.getElementById('yColumn');
    
    // Clear existing options
    xColumnSelect.innerHTML = '<option value="">Select column...</option>';
    yColumnSelect.innerHTML = '<option value="">Select column...</option>';
    
    // Add all columns to selectors
    info.columns.forEach(column => {
        xColumnSelect.innerHTML += `<option value="${column}">${column}</option>`;
        yColumnSelect.innerHTML += `<option value="${column}">${column}</option>`;
    });
    
    // Set default selections if available
    if (info.numeric_columns.length > 0) {
        xColumnSelect.value = info.numeric_columns[0];
        if (info.numeric_columns.length > 1) {
            yColumnSelect.value = info.numeric_columns[1];
        }
    }
}

function loadStatistics() {
    fetch('/stats')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
            return;
        }
        displayStatistics(data);
    })
    .catch(error => {
        console.error('Error loading statistics:', error);
    });
}

function displayStatistics(stats) {
    const statsDiv = document.getElementById('statistics');
    
    let statsHTML = '<div class="stats-grid">';
    
    // Basic statistics
    if (stats.basic_stats) {
        const firstNumericCol = Object.keys(stats.basic_stats)[0];
        if (firstNumericCol) {
            const colStats = stats.basic_stats[firstNumericCol];
            statsHTML += `
                <div class="stat-card">
                    <h4>Sample Statistics (${firstNumericCol})</h4>
                    <div>Mean: <span class="stat-value">${colStats.mean ? colStats.mean.toFixed(2) : 'N/A'}</span></div>
                    <div>Std: <span class="stat-value">${colStats.std ? colStats.std.toFixed(2) : 'N/A'}</span></div>
                </div>
            `;
        }
    }
    
    // Missing values
    if (stats.missing_values) {
        const totalMissing = Object.values(stats.missing_values).reduce((a, b) => a + b, 0);
        statsHTML += `
            <div class="stat-card">
                <h4>Data Quality</h4>
                <div>Missing Values: <span class="stat-value">${totalMissing}</span></div>
            </div>
        `;
    }
    
    // Data types
    if (stats.data_types) {
        const numericCols = Object.values(stats.data_types).filter(type => 
            type.includes('int') || type.includes('float')
        ).length;
        statsHTML += `
            <div class="stat-card">
                <h4>Column Types</h4>
                <div>Numeric: <span class="stat-value">${numericCols}</span></div>
                <div>Total: <span class="stat-value">${Object.keys(stats.data_types).length}</span></div>
            </div>
        `;
    }
    
    statsHTML += '</div>';
    statsDiv.innerHTML = statsHTML;
}

function loadDataPreview() {
    fetch('/data')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
            return;
        }
        displayDataPreview(data);
    })
    .catch(error => {
        console.error('Error loading data preview:', error);
    });
}

function displayDataPreview(data) {
    const previewDiv = document.getElementById('dataPreview');
    
    if (!data.data || data.data.length === 0) {
        previewDiv.innerHTML = '<p class="placeholder">No data to display</p>';
        return;
    }
    
    const columns = Object.keys(data.data[0]);
    
    let tableHTML = `
        <div style="margin-bottom: 10px; color: #666;">
            Showing first 100 rows of ${data.total_rows} total rows
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    data.data.forEach(row => {
        tableHTML += '<tr>';
        columns.forEach(col => {
            const cellValue = row[col] !== null && row[col] !== undefined ? row[col] : '';
            tableHTML += `<td>${cellValue}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    previewDiv.innerHTML = tableHTML;
}

function generatePlot() {
    const plotType = document.getElementById('plotType').value;
    const xColumn = document.getElementById('xColumn').value;
    const yColumn = document.getElementById('yColumn').value;
    
    const plotContainer = document.getElementById('plotContainer');
    plotContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Generating plot...</p></div>';
    
    let url = `/plot?type=${plotType}`;
    if (xColumn) url += `&x_col=${encodeURIComponent(xColumn)}`;
    if (yColumn) url += `&y_col=${encodeURIComponent(yColumn)}`;
    
    fetch(url)
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            plotContainer.innerHTML = `<p class="error">${data.error}</p>`;
            return;
        }
        
        if (data.plot) {
            plotContainer.innerHTML = `<img src="data:image/png;base64,${data.plot}" alt="Generated Plot">`;
        } else {
            plotContainer.innerHTML = '<p class="placeholder">Failed to generate plot</p>';
        }
    })
    .catch(error => {
        console.error('Error generating plot:', error);
        plotContainer.innerHTML = '<p class="error">Error generating plot</p>';
    });
}

// Plot type change handler
document.getElementById('plotType').addEventListener('change', function() {
    const plotType = this.value;
    const yColumnGroup = document.getElementById('yColumn').parentElement;
    
    // Show/hide Y column selector based on plot type
    if (plotType === 'scatter') {
        yColumnGroup.style.display = 'flex';
    } else if (plotType === 'correlation') {
        yColumnGroup.style.display = 'none';
        document.getElementById('xColumn').parentElement.style.display = 'none';
    } else {
        yColumnGroup.style.display = 'none';
        document.getElementById('xColumn').parentElement.style.display = 'flex';
    }
});