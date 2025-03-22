# Detailed Installation Guide for Translation Tools

This guide provides step-by-step instructions for installing and distributing the Translation Tools app for ERPNext.

## For App Developers (How to Share This App)

### 1. Push your app to a GitHub repository

First, create a GitHub repository and push your app code there:

```bash
cd /path/to/your/bench/apps/translation_tools
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/translation_tools.git
git push -u origin main
```

### 2. Make sure your app has the correct file structure

Ensure your app has this structure:
```
translation_tools/
├── __init__.py
├── hooks.py
├── modules.txt
├── patches.txt
├── setup.sh
├── LICENSE
├── README.md
├── MANIFEST.in
├── requirements.txt
├── install.py
├── utils/
│   ├── __init__.py
│   ├── thai_glossary.py
│   └── translate_po_files.py
└── translation_tools/
    └── __init__.py
```

### 3. Set up the after_install hook

Edit your `hooks.py` file to include:

```python
# hooks.py
app_name = "translation_tools"
app_title = "Translation Tools"
app_publisher = "Your Name"
app_description = "AI-powered translation tools for ERPNext"
app_email = "your.email@example.com"
app_license = "MIT"

# Add this line to register the after_install hook
after_install = "translation_tools.install.after_install"
```

### 4. Create a requirements.txt file

```
openai>=1.3.0
polib>=1.2.0
tqdm>=4.64.0
anthropic>=0.5.0
```

### 5. Share your repository URL

Users can now install your app using:
```bash
bench get-app https://github.com/your-username/translation_tools
```

## For End Users (How to Install)

### 1. Install the app using bench

```bash
# Navigate to your ERPNext bench directory
cd /path/to/your/bench

# Get the app from GitHub
bench get-app https://github.com/your-username/translation_tools

# Install the app
bench install-app translation_tools
```

### 2. Run the setup script

After installation, you'll see instructions to run the setup script:

```bash
# Navigate to your ERPNext bench directory
cd /path/to/your/bench

# Run the setup script
./apps/translation_tools/setup.sh
```

The setup script will interactively guide you through:
- Installing dependencies
- Setting up API keys
- Creating command-line tools
- Generating PO files for translation

### 3. Generating PO files

If you skipped PO file generation during setup, you can generate them manually:

```bash
# Generate POT file (run only the first time)
bench generate-pot-file --app [app-name]

# Convert CSV translations to PO format
bench migrate-csv-to-po --app [app-name] --locale th
```

### 4. Test the installation

After installation, you can test it by running:

```bash
./bin/translate-po --help
```

You should see the help message showing all available options.

## Troubleshooting

### ImportError when running the translate-po command

If you encounter an ImportError, ensure that:
1. You've installed all requirements
2. You're running the command from your bench directory
3. The Python virtual environment is activated

Solution:
```bash
cd /path/to/your/bench
source env/bin/activate
pip install -r apps/translation_tools/requirements.txt
```

### Permission denied when running the script

If you encounter permission errors:
```bash
chmod +x ./apps/translation_tools/setup.sh
chmod +x ./bin/translate-po
```

### API key issues

If you encounter API authentication errors:
1. Check that your API key is valid
2. Make sure the API key is correctly saved in the config file
3. You can manually edit the config file at: `/path/to/your/bench/.erpnext_translate_config`