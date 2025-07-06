#!/bin/bash
# Non-interactive setup script for Translation Tools
# Place this file at: apps/translation_tools/setup.sh

set -e  # Exit on any error

# Banner
echo "==============================================="
echo "ERPNext Translation Tools Setup"
echo "==============================================="

# Configuration variables
ERPNEXT_ENV="$PWD/env"
CONFIG_FILE="$PWD/.erpnext_translate_config"

# Check if ERPNext environment exists
echo "Checking virtual environment..."
if [ ! -d "$ERPNEXT_ENV" ]; then
    echo "ERPNext environment not found at $ERPNEXT_ENV."
    echo "Please run this script from your ERPNext bench directory."
    exit 1
fi

# Activate ERPNext environment with verification
echo "Activating ERPNext environment..."
source "$ERPNEXT_ENV/bin/activate"

# Verify activation worked
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Warning: Virtual environment may not be activated properly"
fi

# Install dependencies with better error handling
echo "Installing dependencies..."
pip install --no-cache-dir \
    "openai>=1.3.0" \
    "polib>=1.2.0" \
    "tqdm>=4.64.0" \
    "anthropic>=0.5.0" || {
    echo "Dependency installation failed"
    exit 1
}

# Create wrapper script
WRAPPER_SCRIPT="$PWD/bin/translate-po"
mkdir -p "$PWD/bin"

cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
# Wrapper script for translate_po_files.py

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCH_DIR="$(dirname "$SCRIPT_DIR")"
ERPNEXT_ENV="$BENCH_DIR/env"
CONFIG_FILE="$BENCH_DIR/.erpnext_translate_config"

# Activate the ERPNext environment
if [ -f "$ERPNEXT_ENV/bin/activate" ]; then
    source "$ERPNEXT_ENV/bin/activate"
else
    echo "ERPNext environment not found at $ERPNEXT_ENV"
    exit 1
fi

# Load configuration if it exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Check if translation script exists
TRANSLATION_SCRIPT="$BENCH_DIR/apps/translation_tools/translation_tools/utils/translate_po_files.py"
if [ ! -f "$TRANSLATION_SCRIPT" ]; then
    echo "Translation script not found at $TRANSLATION_SCRIPT"
    exit 1
fi

# Run the translator with the provided arguments
python "$TRANSLATION_SCRIPT" ${OPENAI_API_KEY:+--api-key=$OPENAI_API_KEY} ${MODEL_PROVIDER:+--model-provider=$MODEL_PROVIDER} "$@"
EOF

chmod +x "$WRAPPER_SCRIPT"

echo "Installation complete!"
echo
echo "To configure API keys and preferences, create a config file:"
echo "  echo 'OPENAI_API_KEY=\"your_key_here\"' > $CONFIG_FILE"
echo "  echo 'MODEL_PROVIDER=\"openai\"' >> $CONFIG_FILE"
echo "  chmod 600 $CONFIG_FILE"
echo
echo "To generate PO files:"
echo "  bench generate-pot-file --app [app-name]"
echo "  bench migrate-csv-to-po --app [app-name] --locale [locale]"
echo
echo "Usage:"
echo "  ./bin/translate-po [options] <po_file_path>"
echo
echo "Examples:"
echo "  ./bin/translate-po --target-lang=th apps/frappe/frappe/locale/th.po"
echo "  ./bin/translate-po --model-provider=claude apps/erpnext/erpnext/locale/th.po"