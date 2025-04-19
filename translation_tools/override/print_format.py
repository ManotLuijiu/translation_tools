import frappe
from frappe.printing.doctype.print_format.print_format import PrintFormat
import json
import os
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
from frappe.utils import scrub_urls
import base64
from frappe import _

class CustomPrintFormat(PrintFormat):
    def __init__(self, *args, **kwargs):
        super(CustomPrintFormat, self).__init__(*args, **kwargs)
        self.page_size = 'A4'  # Default page size
        self.orientation = 'Portrait'  # Default orientation
    
    @staticmethod
    def prepare_pdfmake_content(html, options=None):
        """Prepare content for pdfmake by adding custom wrapper"""
        if options is None:
            options = {}
        
        wrapped_html = f"""
        <div class="pdf-content" data-pdfmake="1" data-options='{json.dumps(options)}'>
            {html}
        </div>
        <script>
            // Include pdfmake setup code if needed
            document.addEventListener('DOMContentLoaded', function() {{
                // Your client-side pdfmake code here
            }});
        </script>
        """
        return wrapped_html
    
    def get_web_page(self, docname, letterhead=None):
        """Override to use pdfmake for web page printing"""
        rendered_html = self.get_html(docname, letterhead=letterhead)
        
        # Add pdfmake wrapper for client-side rendering
        options = {
            'format': self.page_size or 'A4',
            'orientation': 'portrait' if self.orientation != 'Landscape' else 'landscape',
            'margin': {
                'top': '15mm',
                'right': '15mm',
                'bottom': '15mm',
                'left': '15mm'
            }
        }
        
        return self.prepare_pdfmake_content(rendered_html, options)
    
    def generate_pdf_using_weasyprint(self, content, options=None):
        """Generate PDF using WeasyPrint instead of wkhtmltopdf"""
        if options is None:
            options = {}

        # Create font configuration
        font_config = FontConfiguration()
        
        # Get default print style
        bootstrap_path = os.path.join(frappe.get_app_path("frappe"), "www", "css", "bootstrap.css")
        with open(bootstrap_path, "r") as f:
            bootstrap_css = f.read()
        
        # Get the base URL for assets
        site_name = frappe.local.site
        font_url_base = f"/assets/translation_tools/fonts"

        # Generate custom CSS based on options
        custom_css = f"""
        @font-face {{
        font-family: 'Sarabun';
        src: url('{font_url_base}/Sarabun/Sarabun-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
        }}
    
        @font-face {{
            font-family: 'Sarabun';
            src: url('{font_url_base}/Sarabun/Sarabun-Bold.ttf') format('truetype');
            font-weight: bold;
            font-style: normal;
        }}

        @page {{
            size: {options.get('format', 'A4')} {options.get('orientation', 'portrait')};
            margin: {options.get('margin_top', '15mm')} {options.get('margin_right', '15mm')} 
                    {options.get('margin_bottom', '15mm')} {options.get('margin_left', '15mm')};
        }}
        body {{
            font-family: 'Sarabun', sans-serif;
        }}
        .print-format {{
            padding: 0;
        }}
        .tw-prefixed-class {{
            /* Support for Tailwind prefixed classes */
            font-weight: bold;
        }}
        """

        # Create a base URL for resolving relative URLs
        base_url = f"http://{site_name}"
        
        # Create PDF using WeasyPrint
        html = HTML(string=content)
        # Create PDF using WeasyPrint with font configuration
        html = HTML(string=content, base_url=base_url)
        css_bootstrap = CSS(string=bootstrap_css, font_config=font_config, base_url=base_url)
        css_custom = CSS(string=custom_css, font_config=font_config, base_url=base_url)
        
        # Return PDF as bytes
        return html.write_pdf(stylesheets=[css_bootstrap, css_custom], font_config=font_config)
    
    def generate_pdf_using_pdfmake(self, content, options=None):
        """Generate PDF using pdfmake (returning placeholder for now)"""
        # This would typically be handled client-side
        frappe.msgprint(_("PDFMake is a client-side library. This server-side function is a placeholder."))
        return b"PDFMake is client-side only"
    
    # Override download_pdf method
    def download_pdf(self, doctype, name, format=None, doc=None, no_letterhead=0):
        html = frappe.get_print(doctype, name, format, doc=doc, no_letterhead=no_letterhead)
        
        # Clean up the HTML
        html = scrub_urls(str(html))
        
        # Define options
        options = {
            'format': self.page_size or 'A4',
            'orientation': 'portrait' if self.orientation != 'Landscape' else 'landscape',
            'margin_top': '15mm',
            'margin_right': '15mm',
            'margin_bottom': '15mm',
            'margin_left': '15mm'
        }
        
        # Generate PDF using WeasyPrint
        # pdf_content = self.generate_pdf_using_weasyprint(html, options)
        # Check selected PDF generator
        pdf_generator = self.pdf_generator or "WeasyPrint"  # Default to WeasyPrint
        
        if pdf_generator == "WeasyPrint":
            pdf_content = self.generate_pdf_using_weasyprint(html, options)
        elif pdf_generator == "pdfmake":
            pdf_content = self.generate_pdf_using_pdfmake(html, options)
        else:
            # Use default wkhtmltopdf method
            from frappe.utils.pdf import get_pdf
            pdf_content = get_pdf(html, options=options)
        
        frappe.local.response.filename = f"{name}.pdf"
        frappe.local.response.filecontent = pdf_content
        frappe.local.response.type = "download"