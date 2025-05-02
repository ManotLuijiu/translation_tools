# Translation Tools for ERPNext

An AI-powered translation utility for ERPNext that helps translate PO files using advanced language models like OpenAI GPT and Anthropic Claude.

[🇬🇧 English](#english-version) | [🇹🇭 ภาษาไทย](#thai-version--ภาษาไทย)

---

## English Version

## Overview

Translation Tools is a standalone app for ERPNext that provides powerful machine translation capabilities for localizing ERPNext to other languages. It features:

- OpenAI GPT integration for high-quality translations
- Anthropic Claude integration as an alternative AI service
- Specialized handling of software localization
- Preservation of formatting tags and placeholders
- Thai language glossary for consistent terminology
- Batch processing for efficiency and rate limit management

The app now includes a user-friendly dashboard for managing translations with GitHub synchronization capabilities.

## Installation

### Prerequisites

- ERPNext installation with bench
- Python 3.10 or newer
- An OpenAI API key or Anthropic API key

### Installing the App

```bash
# Navigate to your bench directory
cd frappe-bench

# Get the app from GitHub
bench get-app https://github.com/ManotLuijiu/translation_tools.git

# Install the app on your site
bench --site your-site.local install-app translation_tools
```

The setup script will:

1. Install required Python dependencies
2. Set up the translation utility
3. Create a convenient bench command (`translate-po`)
4. Prompt you to save your API key for future use
5. Help you generate PO files for translation

## Using the Dashboard

After installation, you can access the Translation Dashboard from the ERPNext desktop:

1. Navigate to the "Translation Dashboard" icon in your ERPNext home screen
2. The dashboard has four main tabs:
   - **File Explorer**: Browse and select PO files for translation
   - **Translation Editor**: Edit translations manually or using AI
   - **Glossary Manager**: Manage terminology for consistent translations
   - **Settings**: Configure API keys and preferences

### GitHub Synchronization

The dashboard includes GitHub synchronization features:

1. Click "Sync from GitHub" to open the GitHub sync dialog
2. Enter your GitHub repository URL and branch
3. Click "Find Translation Files" to discover PO files
4. Select files to sync and click "Preview Changes"
5. Review the changes and click "Apply Changes" to update your local translations

### Manual vs AI Translation

You can toggle between manual and AI translation modes:

- **Manual Mode**: Translate entries yourself
- **AI Mode**: Let AI suggest translations based on your selected service (OpenAI or Anthropic)

## Command Line Usage

### Basic Usage

To translate a PO file to Thai:

```bash
./bin/translate-po apps/frappe/frappe/locale/th.po
```

### Advanced Options

```bash
# Specify a different target language
./bin/translate-po --target-lang=ja apps/erpnext/erpnext/locale/ja.po

# Use Anthropic Claude instead of OpenAI
./bin/translate-po --model-provider=claude apps/frappe/frappe/locale/th.po

# Use a specific OpenAI model
./bin/translate-po --model=gpt-4-1106-preview apps/erpnext/erpnext/locale/th.po

# Adjust batch size for processing
./bin/translate-po --batch-size=20 apps/frappe/frappe/locale/th.po

# Save output to a specific file
./bin/translate-po --output=my-translations.po apps/frappe/frappe/locale/th.po

# Do a dry run without making API calls
./bin/translate-po --dry-run apps/frappe/frappe/locale/th.po
```

## Customizing the Thai Glossary

The app includes a Thai glossary with common business and ERPNext terms. To customize it:

1. Edit the file at `translation_tools/translation_tools/utils/thai_glossary.py`
2. Add your own terminology to the `GLOSSARY` dictionary
3. Re-run the translator to use your updated terms

Example glossary entry:

```python
GLOSSARY = {
    "Invoice": "ใบแจ้งหนี้",
    "Customer": "ลูกค้า",
    # Add your terms here
}
```

## Support the Project

If you find this tool useful for your ERPNext localization efforts, you can support further development:

- **Buy me a coffee**: [https://ko-fi.com/manotluijiu](https://ko-fi.com/manotluijiu)
- **GitHub Sponsor**: [https://github.com/sponsors/ManotLuijiu](https://github.com/sponsors/ManotLuijiu)

Your support helps maintain and improve this open-source project. Thank you!

## Troubleshooting

### API Rate Limits

If you encounter rate limit errors, try:

- Reducing the batch size (`--batch-size=5`)
- Adding more sleep time between batches (edit the `SLEEP_TIME` constant)
- Using a different model or provider

### Response Format Issues

Different models return responses in different formats. If you encounter parsing issues:

- Use a newer model that supports JSON responses (gpt-4-1106-preview)
- Try the Claude model provider which may handle certain types of responses better

### GitHub Sync Issues

If you encounter issues with GitHub synchronization:

1. Ensure your GitHub token is valid and has appropriate permissions
2. Verify the repository URL is correct and includes the organization/username
3. Check that the PO files in the repository follow the standard format

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Thai Version / ภาษาไทย

## ภาพรวม

Translation Tools เป็นแอปสแตนด์อโลนสำหรับ ERPNext ที่มอบความสามารถในการแปลภาษาด้วยเครื่องที่ทรงพลังสำหรับการแปล ERPNext เป็นภาษาอื่นๆ โดยมีคุณสมบัติดังนี้:

- การผสานรวม OpenAI GPT สำหรับการแปลคุณภาพสูง
- การผสานรวม Anthropic Claude เป็นบริการ AI ทางเลือก
- การจัดการเฉพาะทางสำหรับการแปลซอฟต์แวร์
- การรักษาแท็กการจัดรูปแบบและตัวยึดตำแหน่ง
- อภิธานศัพท์ภาษาไทยสำหรับคำศัพท์ที่สอดคล้องกัน
- การประมวลผลเป็นชุดเพื่อประสิทธิภาพและการจัดการขีดจำกัดอัตรา

แอปนี้ยังรวมถึงแดชบอร์ดที่ใช้งานง่ายสำหรับการจัดการการแปลพร้อมความสามารถในการซิงค์กับ GitHub

## การติดตั้ง

### ข้อกำหนดเบื้องต้น

- การติดตั้ง ERPNext ด้วย bench
- Python 3.10 หรือใหม่กว่า
- OpenAI API key หรือ Anthropic API key

### การติดตั้งแอป

```bash
# นำทางไปยังไดเรกทอรี bench ของคุณ
cd frappe-bench

# รับแอปจาก GitHub
bench get-app https://github.com/ManotLuijiu/translation_tools.git

# ติดตั้งแอปบนไซต์ของคุณ
bench --site your-site.local install-app translation_tools
```

สคริปต์ติดตั้งจะ:

1. ติดตั้งไลบรารี Python ที่จำเป็น
2. ตั้งค่ายูทิลิตี้การแปล
3. สร้างคำสั่ง bench ที่สะดวก (`translate-po`)
4. แจ้งเตือนให้คุณบันทึก API key ของคุณสำหรับการใช้งานในอนาคต

## การใช้แดชบอร์ด

หลังจากการติดตั้ง คุณสามารถเข้าถึงแดชบอร์ดการแปลจากเดสก์ท็อป ERPNext:

1. นำทางไปยังไอคอน "Translation Dashboard" ในหน้าจอหลัก ERPNext
2. แดชบอร์ดมีแท็บหลักสี่แท็บ:
   - **File Explorer**: เรียกดูและเลือกไฟล์ PO สำหรับการแปล
   - **Translation Editor**: แก้ไขการแปลด้วยตนเองหรือใช้ AI
   - **Glossary Manager**: จัดการคำศัพท์สำหรับการแปลที่สอดคล้องกัน
   - **Settings**: กำหนดค่า API keys และการตั้งค่า

### การซิงค์กับ GitHub

แดชบอร์ดรวมคุณสมบัติการซิงค์กับ GitHub:

1. คลิก "Sync from GitHub" เพื่อเปิดกล่องโต้ตอบการซิงค์ GitHub
2. ป้อน URL ของที่เก็บ GitHub และสาขา
3. คลิก "Find Translation Files" เพื่อค้นหาไฟล์ PO
4. เลือกไฟล์ที่จะซิงค์และคลิก "Preview Changes"
5. ตรวจสอบการเปลี่ยนแปลงและคลิก "Apply Changes" เพื่ออัปเดตการแปลในเครื่องของคุณ

### การแปลแบบธรรมดาและแบบ AI

คุณสามารถสลับระหว่างโหมดการแปลแบบธรรมดาและแบบ AI:

- **Manual Mode**: แปลรายการด้วยตัวเอง
- **AI Mode**: ให้ AI แนะนำการแปลตามบริการที่คุณเลือก (OpenAI หรือ Anthropic)

## การใช้งานบรรทัดคำสั่ง

### การใช้งานพื้นฐาน

ในการแปลไฟล์ PO เป็นภาษาไทย:

```bash
./bin/translate-po apps/frappe/frappe/locale/th.po
```

### ตัวเลือกขั้นสูง

```bash
# ระบุภาษาเป้าหมายที่แตกต่าง
./bin/translate-po --target-lang=ja apps/erpnext/erpnext/locale/ja.po

# ใช้ Anthropic Claude แทน OpenAI
./bin/translate-po --model-provider=claude apps/frappe/frappe/locale/th.po

# ใช้โมเดล OpenAI เฉพาะ
./bin/translate-po --model=gpt-4-1106-preview apps/erpnext/erpnext/locale/th.po

# ปรับขนาดชุดสำหรับการประมวลผล
./bin/translate-po --batch-size=20 apps/frappe/frappe/locale/th.po

# บันทึกผลลัพธ์ไปยังไฟล์เฉพาะ
./bin/translate-po --output=my-translations.po apps/frappe/frappe/locale/th.po

# ทำการทดสอบโดยไม่ต้องเรียกใช้ API
./bin/translate-po --dry-run apps/frappe/frappe/locale/th.po
```

## สนับสนุนโครงการ

หากคุณพบว่าเครื่องมือนี้มีประโยชน์สำหรับการแปลภาษา ERPNext ของคุณ คุณสามารถสนับสนุนการพัฒนาต่อไปได้:

- **เลี้ยงกาแฟ**: [https://ko-fi.com/manotluijiu](https://ko-fi.com/manotluijiu)
- **สนับสนุนผ่าน GitHub**: [https://github.com/sponsors/ManotLuijiu](https://github.com/sponsors/ManotLuijiu)

การสนับสนุนของคุณช่วยในการบำรุงรักษาและปรับปรุงโครงการโอเพนซอร์สนี้ ขอบคุณครับ!

## การปรับแต่งอภิธานศัพท์ภาษาไทย

แอปนี้รวมอภิธานศัพท์ภาษาไทยที่มีคำธุรกิจและคำศัพท์ ERPNext ทั่วไป ในการปรับแต่ง:

1. แก้ไขไฟล์ที่ `translation_tools/translation_tools/utils/thai_glossary.py`
2. เพิ่มคำศัพท์ของคุณเองลงในพจนานุกรม `GLOSSARY`
3. รันเครื่องมือแปลอีกครั้งเพื่อใช้คำศัพท์ที่อัปเดตของคุณ

ตัวอย่างรายการอภิธานศัพท์:

```python
GLOSSARY = {
    "Invoice": "ใบแจ้งหนี้",
    "Customer": "ลูกค้า",
    # เพิ่มคำศัพท์ของคุณที่นี่
}
```

## การแก้ไขปัญหา

### ขีดจำกัดอัตรา API

หากคุณพบข้อผิดพลาดเกี่ยวกับขีดจำกัดอัตรา ให้ลอง:

- ลดขนาดชุด (`--batch-size=5`)
- เพิ่มเวลาหยุดระหว่างชุด (แก้ไขค่าคงที่ `SLEEP_TIME`)
- ใช้โมเดลหรือผู้ให้บริการที่แตกต่าง

### ปัญหาการซิงค์ GitHub

หากคุณพบปัญหาเกี่ยวกับการซิงค์ GitHub:

1. ตรวจสอบว่าโทเค็น GitHub ของคุณถูกต้องและมีสิทธิ์ที่เหมาะสม
2. ตรวจสอบว่า URL ของที่เก็บถูกต้องและรวมถึงองค์กร/ชื่อผู้ใช้
3. ตรวจสอบว่าไฟล์ PO ในที่เก็บเป็นไปตามรูปแบบมาตรฐาน

### ปัญหารูปแบบการตอบสนอง

โมเดลที่แตกต่างกันจะส่งคืนการตอบสนองในรูปแบบที่แตกต่างกัน หากคุณพบปัญหาการแยกวิเคราะห์:

- ใช้โมเดลที่ใหม่กว่าที่รองรับการตอบสนอง JSON (gpt-4-1106-preview)
- ลองผู้ให้บริการโมเดล Claude ซึ่งอาจจัดการกับการตอบสนองบางประเภทได้ดีกว่า

## ใบอนุญาต

โครงการนี้ได้รับอนุญาตภายใต้ MIT License - ดูไฟล์ LICENSE สำหรับรายละเอียด

## การมีส่วนร่วม

ยินดีต้อนรับการมีส่วนร่วม! โปรดส่ง Pull Request
