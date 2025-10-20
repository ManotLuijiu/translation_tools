# Commands module for Translation Tools

# Install translation override when commands are loaded
# This ensures bench build-message-files uses our SPA-aware version
from translation_tools.overrides import setup_translation_override
setup_translation_override()

from .compile_mo_files import *
from .update_translations import *
from .cleanup_translations import cleanup_non_asean_translations
from .gen_po import *  # Generate PO files command