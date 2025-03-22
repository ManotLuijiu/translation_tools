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

This tool is particularly useful for translating ERPNext to Thai, but it can be adapted for any language.

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
bench get-app https://github.com/yourusername/translation_tools

# Install the app on your site
bench --site your-site.local install-app translation_tools

# Run the setup script
./apps/translation_tools/setup.sh
```

The setup script will:

1. Install required Python dependencies
2. Set up the translation utility
3. Create a convenient bench command (`translate-po`)
4. Prompt you to save your API key for future use

## Usage

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

### Complete Command Reference

```bash
Usage: translate-po [options] <po_file_path>

Options:
  --target-lang=<language>     Target language (default: th for Thai)
  --api-key=<key>              API key (required unless saved during setup)
  --model-provider=<provider>  AI service to use (openai or claude)
  --model=<model>              Model to use (default: gpt-4-1106-preview)
  --batch-size=<size>          Entries per API call (default: 10)
  --temperature=<temp>         Model temperature (default: 0.3)
  --max-tokens=<tokens>        Max tokens per API call (default: 512)
  --output=<path>              Output file path
  --dry-run                    Show entries without translating
```

## Translation Workflow

1. Generate or update PO files for your app:

   ```bash
   bench update-translations --app frappe --language th
   ```

2. Translate the PO file:

   ```bash
   ./bin/translate-po apps/frappe/frappe/locale/th.po
   ```

3. The tool will:
   - Parse the PO file and identify untranslated entries
   - Send them in batches to the AI service
   - Apply the translations back to the PO file
   - Save progress after each batch
   - Update the metadata when complete

4. After translation, rebuild the app:

   ```bash
   bench build
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

### Missing Dependencies

If you get import errors, ensure all dependencies are installed:

```bash
pip install -r apps/translation_tools/requirements.txt
```

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

เครื่องมือนี้มีประโยชน์อย่างยิ่งสำหรับการแปล ERPNext เป็นภาษาไทย แต่สามารถปรับให้เข้ากับภาษาใดก็ได้

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
bench get-app https://github.com/yourusername/translation_tools

# ติดตั้งแอปบนไซต์ของคุณ
bench --site your-site.local install-app translation_tools

# รันสคริปต์ติดตั้ง
./apps/translation_tools/setup.sh
```

สคริปต์ติดตั้งจะ:

1. ติดตั้งไลบรารี Python ที่จำเป็น
2. ตั้งค่ายูทิลิตี้การแปล
3. สร้างคำสั่ง bench ที่สะดวก (`translate-po`)
4. แจ้งเตือนให้คุณบันทึก API key ของคุณสำหรับการใช้งานในอนาคต

## การใช้งาน

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

### การอ้างอิงคำสั่งทั้งหมด

```bash
วิธีใช้: translate-po [options] <po_file_path>

ตัวเลือก:
  --target-lang=<language>     ภาษาเป้าหมาย (ค่าเริ่มต้น: th สำหรับภาษาไทย)
  --api-key=<key>              API key (จำเป็นเว้นแต่บันทึกระหว่างการติดตั้ง)
  --model-provider=<provider>  บริการ AI ที่จะใช้ (openai หรือ claude)
  --model=<model>              โมเดลที่จะใช้ (ค่าเริ่มต้น: gpt-4-1106-preview)
  --batch-size=<size>          รายการต่อการเรียก API (ค่าเริ่มต้น: 10)
  --temperature=<temp>         อุณหภูมิของโมเดล (ค่าเริ่มต้น: 0.3)
  --max-tokens=<tokens>        โทเค็นสูงสุดต่อการเรียก API (ค่าเริ่มต้น: 512)
  --output=<path>              เส้นทางไฟล์ผลลัพธ์
  --dry-run                    แสดงรายการโดยไม่ต้องแปล
```

## ขั้นตอนการแปลภาษา

1. สร้างหรืออัปเดตไฟล์ PO สำหรับแอปของคุณ:

   ```bash
   bench update-translations --app frappe --language th
   ```

2. แปลไฟล์ PO:

   ```bash
   ./bin/translate-po apps/frappe/frappe/locale/th.po
   ```

3. เครื่องมือจะ:
   - แยกวิเคราะห์ไฟล์ PO และระบุรายการที่ยังไม่ได้แปล
   - ส่งรายการเป็นชุดไปยังบริการ AI
   - นำการแปลกลับมาใส่ในไฟล์ PO
   - บันทึกความคืบหน้าหลังจากแต่ละชุด
   - อัปเดตข้อมูลเมตาเมื่อเสร็จสมบูรณ์

4. หลังจากการแปล ให้สร้างแอปใหม่:

   ```bash
   bench build
   ```

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

### ปัญหารูปแบบการตอบสนอง

โมเดลที่แตกต่างกันจะส่งคืนการตอบสนองในรูปแบบที่แตกต่างกัน หากคุณพบปัญหาการแยกวิเคราะห์:

- ใช้โมเดลที่ใหม่กว่าที่รองรับการตอบสนอง JSON (gpt-4-1106-preview)
- ลองผู้ให้บริการโมเดล Claude ซึ่งอาจจัดการกับการตอบสนองบางประเภทได้ดีกว่า

### การขาดการพึ่งพา

หากคุณได้รับข้อผิดพลาดการนำเข้า ตรวจสอบให้แน่ใจว่าการพึ่งพาทั้งหมดได้รับการติดตั้ง:

```bash
pip install -r apps/translation_tools/requirements.txt
```

## ใบอนุญาต

โครงการนี้ได้รับอนุญาตภายใต้ MIT License - ดูไฟล์ LICENSE สำหรับรายละเอียด

## การมีส่วนร่วม

ยินดีต้อนรับการมีส่วนร่วม! โปรดส่ง Pull Request
