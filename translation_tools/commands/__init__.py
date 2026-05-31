# Commands module for Translation Tools

# Install translation override when commands are loaded
# This ensures bench build-message-files uses our SPA-aware version
from translation_tools.overrides import setup_translation_override
setup_translation_override()

# Import sub-modules and collect their commands lists
from . import compile_mo_files
from . import update_translations
from . import gen_po
from . import migrate_csv_with_spa
from . import sync_desktop_icon
from .cleanup_translations import cleanup_non_asean_translations

# Aggregate ALL command lists from sub-modules
commands = (
    compile_mo_files.commands
    + update_translations.commands
    + gen_po.commands
    + migrate_csv_with_spa.commands
    + sync_desktop_icon.commands
)
