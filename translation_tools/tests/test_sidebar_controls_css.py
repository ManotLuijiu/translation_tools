"""Regression checks for Bunchee controls in Frappe v16's collapsed sidebar."""

from pathlib import Path


SCSS = Path(__file__).parents[1] / "public" / "scss" / "app.scss"


def test_collapsed_sidebar_controls_are_icon_only_with_full_width_menus():
	styles = SCSS.read_text()

	assert ".body-sidebar-container:not(.expanded)" in styles
	assert ".bunchee-lang-label" in styles
	assert ".bunchee-theme-label" in styles
	assert "display: none !important;" in styles
	assert "&::after { display: none; }" in styles
	assert "min-width: 10rem;" in styles
