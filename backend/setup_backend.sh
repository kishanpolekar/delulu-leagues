# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pandas openpyxl playwright python-multipart pydantic

# Install playwright browser
playwright install webkit

# Copy your existing Python files here:
# - wwc_fantasy.py
# - dwl_scoring_pipeline.py
# - WWC_Config.xlsx

# Create api_server.py (copy the content above)

# Start backend server
python api_server.py