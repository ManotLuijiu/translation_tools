#!/bin/bash
# Setup script for Translation Tools
# Place this file at: apps/translation_tools/setup.sh

set -e  # Exit on any error

# Banner
echo "==============================================="
echo "ERPNext Translation Tools Setup"
echo "==============================================="

# Configuration variables
ERPNEXT_ENV="$PWD/env"  # Use existing ERPNext environment
CONFIG_FILE="$PWD/.erpnext_translate_config"

# Check if ERPNext environment exists
echo "Checking virtual environment..."
if [ ! -d "$ERPNEXT_ENV" ]; then
    echo "ERPNext environment not found at $ERPNEXT_ENV."
    echo "Please run this script from your ERPNext bench directory."
    exit 1
fi

# Activate ERPNext environment
echo "Activating ERPNext environment..."
source "$ERPNEXT_ENV/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install openai>=1.3.0 polib>=1.2.0 tqdm>=4.64.0 anthropic>=0.5.0

# Create a wrapper script in the bench bin directory
WRAPPER_SCRIPT="$PWD/bin/translate-po"
mkdir -p "$PWD/bin"

cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
# Wrapper script for translate_po_files.py

# Activate the ERPNext environment
source "$ERPNEXT_ENV/bin/activate"

# Load configuration if it exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Run the translator with the provided arguments
python "$PWD/apps/translation_tools/utils/translate_po_files.py" \${OPENAI_API_KEY:+--api-key=\$OPENAI_API_KEY} \${MODEL_PROVIDER:+--model-provider=\$MODEL_PROVIDER} "\$@"
EOF

chmod +x "$WRAPPER_SCRIPT"

# Ask the user for OpenAI API key
echo
echo "Would you like to save your OpenAI API key for future use? [Y]/n"
read -r save_key

if [[ -z "$save_key" || "$save_key" =~ ^[Yy]$ ]]; then
    echo "Enter your OpenAI API key:"
    read -r api_key
    
    # Ask the user for which model provider to use as default
    echo "Which AI model provider would you like to use by default? [openai]/claude"
    read -r model_provider
    
    if [[ -z "$model_provider" || "$model_provider" =~ ^[Oo]$ ]]; then
        model_provider="openai"
    else
        model_provider="claude"
    fi
    
    # Save the API key and model provider to the config file
    echo "OPENAI_API_KEY=\"$api_key\"" > "$CONFIG_FILE"
    echo "MODEL_PROVIDER=\"$model_provider\"" >> "$CONFIG_FILE"
    chmod 600 "$CONFIG_FILE"  # Restrict access to the config file
    
    echo "API key and model provider preferences saved to $CONFIG_FILE"
else
    echo "You can set your API key later by creating a file at $CONFIG_FILE with OPENAI_API_KEY=\"your_key_here\""
fi

# Ask about generating PO files
echo
echo "Would you like to generate PO files for your apps now? [Y]/n"
read -r gen_po

if [[ -z "$gen_po" || "$gen_po" =~ ^[Yy]$ ]]; then
    # Get list of installed apps
    echo "Installed apps:"
    bench list-apps

    # Ask which app to generate PO files for
    echo "Enter the app name to generate PO files for (e.g., erpnext):"
    read -r app_name
    
    # Ask which language locale to use
    echo "Enter the language locale (e.g., th for Thai):"
    read -r locale
    
    if [[ -n "$app_name" && -n "$locale" ]]; then
        echo "Generating POT file for $app_name..."
        bench generate-pot-file --app "$app_name"
        
        echo "Converting CSV to PO for $locale locale..."
        bench migrate-csv-to-po --app "$app_name" --locale "$locale"
        
        echo "PO files generated successfully!"
    else
        echo "App name or locale not provided. Skipping PO file generation."
    fi
else
    echo "Skipping PO file generation. You can generate them later using:"
    echo "  bench generate-pot-file --app [app-name]"
    echo "  bench migrate-csv-to-po --app [app-name] --locale [locale]"
fi

# Update usage instructions
echo
echo "Installation complete!"
echo
echo "Usage:"
echo "  ./bin/translate-po [options] <po_file_path>"
echo
echo "Examples:"
echo "  ./bin/translate-po --target-lang=th apps/frappe/frappe/locale/th.po"
echo "  ./bin/translate-po --model-provider=claude apps/erpnext/erpnext/locale/th.po"
echo "  ./bin/translate-po --model=gpt-4-1106-preview --batch-size=20 apps/frappe/frappe/locale/th.po"
echo
echo "For more options:"
echo "  ./bin/translate-po --help"