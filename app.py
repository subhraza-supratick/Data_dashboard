from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import json
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching for development
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global variable to store current dataframe
current_df = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'csv', 'xlsx', 'xls', 'json'}

def load_data(filepath):
    """Load data from various file formats"""
    file_ext = filepath.rsplit('.', 1)[1].lower()
    
    try:
        if file_ext == 'csv':
            df = pd.read_csv(filepath)
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(filepath)
        elif file_ext == 'json':
            df = pd.read_json(filepath)
        else:
            return None
        
        return df
    except Exception as e:
        print(f"Error loading file: {e}")
        return None

def generate_plot(plot_type, df, x_col=None, y_col=None):
    """Generate different types of plots"""
    plt.style.use('seaborn-v0_8')
    fig, ax = plt.subplots(figsize=(10, 6))
    
    try:
        if plot_type == 'histogram':
            if x_col and pd.api.types.is_numeric_dtype(df[x_col]):
                ax.hist(df[x_col].dropna(), bins=30, alpha=0.7, color='skyblue', edgecolor='black')
                ax.set_xlabel(x_col)
                ax.set_ylabel('Frequency')
                ax.set_title(f'Histogram of {x_col}')
        
        elif plot_type == 'scatter':
            if x_col and y_col and pd.api.types.is_numeric_dtype(df[x_col]) and pd.api.types.is_numeric_dtype(df[y_col]):
                ax.scatter(df[x_col], df[y_col], alpha=0.6, color='coral')
                ax.set_xlabel(x_col)
                ax.set_ylabel(y_col)
                ax.set_title(f'{x_col} vs {y_col}')
        
        elif plot_type == 'bar':
            if x_col:
                value_counts = df[x_col].value_counts().head(10)
                ax.bar(range(len(value_counts)), value_counts.values, color='lightgreen')
                ax.set_xticks(range(len(value_counts)))
                ax.set_xticklabels(value_counts.index, rotation=45, ha='right')
                ax.set_ylabel('Count')
                ax.set_title(f'Top 10 Values - {x_col}')
        
        elif plot_type == 'correlation':
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr()
                sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0, ax=ax)
                ax.set_title('Correlation Heatmap')
        
        plt.tight_layout()
        
        # Convert plot to base64 string
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        img_string = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        return img_string
    
    except Exception as e:
        plt.close()
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    global current_df
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file selected'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'})
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Load the data
        current_df = load_data(filepath)
        
        if current_df is not None:
            # Get basic info about the dataset
            info = {
                'filename': filename,
                'shape': current_df.shape,
                'columns': list(current_df.columns),
                'dtypes': {col: str(dtype) for col, dtype in current_df.dtypes.items()},
                'numeric_columns': list(current_df.select_dtypes(include=[np.number]).columns),
                'categorical_columns': list(current_df.select_dtypes(include=['object']).columns)
            }
            return jsonify({'success': True, 'info': info})
        else:
            return jsonify({'error': 'Failed to load file'})
    
    return jsonify({'error': 'Invalid file format'})

@app.route('/stats')
def get_stats():
    global current_df
    
    if current_df is None:
        return jsonify({'error': 'No data loaded'})
    
    stats = {
        'basic_stats': current_df.describe().to_dict(),
        'missing_values': current_df.isnull().sum().to_dict(),
        'data_types': current_df.dtypes.astype(str).to_dict()
    }
    
    return jsonify(stats)

@app.route('/plot')
def generate_plot_endpoint():
    global current_df
    
    if current_df is None:
        return jsonify({'error': 'No data loaded'})
    
    plot_type = request.args.get('type', 'histogram')
    x_col = request.args.get('x_col')
    y_col = request.args.get('y_col')
    
    plot_data = generate_plot(plot_type, current_df, x_col, y_col)
    
    if plot_data:
        return jsonify({'plot': plot_data})
    else:
        return jsonify({'error': 'Failed to generate plot'})

@app.route('/data')
def get_data():
    global current_df
    
    if current_df is None:
        return jsonify({'error': 'No data loaded'})
    
    # Return first 100 rows as JSON
    data = current_df.head(100).to_dict('records')
    return jsonify({'data': data, 'total_rows': len(current_df)})

if __name__ == '__main__':
    app.run(debug=True)