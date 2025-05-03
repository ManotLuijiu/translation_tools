#!/bin/bash
# File: update_app.sh
# Save this in your bench directory and make it executable with: chmod +x update_app.sh

# Define site name (change this to your site name)
SITE_NAME="moo.localhost"

# Define app name (change this to your app name)
APP_NAME="translation_tools"

echo "Starting update process for $APP_NAME on $SITE_NAME..."

# Clear all caches first
echo "Clearing cache..."
bench --site $SITE_NAME clear-cache

# Run the migration
echo "Running migration..."
bench --site $SITE_NAME migrate

# Clear cache again after migration
echo "Clearing cache after migration..."
bench --site $SITE_NAME clear-cache

# Build assets if needed
echo "Building assets..."
bench build

echo "Update complete! Cache has been cleared."
echo "If bench is already running, you may need to stop it with Ctrl+C and start it again with 'bench start'"
