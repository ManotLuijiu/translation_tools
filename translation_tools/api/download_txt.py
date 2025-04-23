import requests
from bs4 import BeautifulSoup

# URL of the webpage
url = "https://www.rd.go.th/3479.html"

# Fetch the webpage
response = requests.get(url)
response.encoding = "utf-8"  # Ensure correct encoding

# Parse HTML
soup = BeautifulSoup(response.text, "html.parser")

# Extract visible text
text = soup.get_text()

# Save to a file
with open("thai_tax_law.txt", "w", encoding="utf-8") as file:
    file.write(text)

print("Text extracted and saved as 'thai_tax_law.txt'")
