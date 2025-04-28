import frappe
from frappe.utils.pdf import get_pdf
import json
from frappe.www.printview import get_html_and_style as original_get_html_and_style


@frappe.whitelist()
def get_html_and_style_with_thai_support(
    doc,
    name=None,
    print_format=None,
    no_letterhead=None,
    letterhead=None,
    trigger_print=False,
    style=None,
    settings=None,
):
    """Override of get_html_and_style with better error handling for Thai content"""
    try:
        # Try the original function first
        return original_get_html_and_style(
            doc,
            name,
            print_format,
            no_letterhead,
            letterhead,
            trigger_print,
            style,
            settings,
        )
    except BrokenPipeError:
        frappe.log_error(
            "BrokenPipeError during PDF generation - falling back to alternative renderer"
        )

        # Get the document
        if isinstance(name, str):
            document = frappe.get_doc(doc, name)
        else:
            document = frappe.get_doc(json.loads(doc))

        document.check_permission()

        # Get the print format
        from frappe.www.printview import get_print_format_doc

        print_format_doc = get_print_format_doc(print_format, meta=document.meta)

        # Use a simplified rendering approach
        from frappe.www.printview import (
            get_rendered_template,
            get_print_style,
            set_link_titles,
        )

        set_link_titles(document)

        # Add explicit font support for Thai
        html = None
        try:
            html = get_rendered_template(
                doc=document,
                print_format=print_format_doc.name if print_format_doc else None,
                meta=document.meta,
                no_letterhead=no_letterhead,
                letterhead=letterhead,
                trigger_print=trigger_print,
                settings=frappe.parse_json(settings) if settings else None,
            )
        except Exception as e:
            frappe.log_error(f"Error in fallback renderer: {str(e)}")
            html = f"""
            <div style="font-family: 'Sarabun', sans-serif;">
                <h1>{document.get_title()}</h1>
                <div>Error rendering document with Thai content. Please try again or contact support.</div>
            </div>
            """

        # Make sure we're using Thai font in the styling
        custom_style = get_print_style(style=style, print_format=print_format_doc)  # type: ignore
        thai_font_style = """
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        body, table, td, div, p, h1, h2, h3, h4, h5, h6 {
            font-family: 'Sarabun', sans-serif !important;
        }
        """

        return {"html": html, "style": custom_style + thai_font_style}
    except Exception as e:
        frappe.log_error(f"Error in get_html_and_style_with_thai_support: {str(e)}")
        return {"html": f"<div>Error: {str(e)}</div>", "style": ""}
