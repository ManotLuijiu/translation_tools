// This module will be responsible for loading the Thai fonts into pdfMake
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize with the default fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// Function to convert font file to base64
const loadFont = async (url) => {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  return Buffer.from(data).toString('base64');
};

// Function to load all Thai fonts and configure pdfMake
export const initThaiPdfMake = async () => {
  try {
    // Load Thai fonts
    const fontNormal = await loadFont('/assets/translation_tools/fonts/Sarabun/Sarabun-Regular.ttf');
    const fontBold = await loadFont('/assets/translation_tools/fonts/Sarabun/Sarabun-Bold.ttf');
    const fontItalic = await loadFont('/assets/translation_tools/fonts/Sarabun/Sarabun-Italic.ttf');
    const fontBoldItalic = await loadFont('/assets/translation_tools/fonts/Sarabun/Sarabun-BoldItalic.ttf');

    // Add to virtual file system
    pdfMake.vfs['Sarabun-Regular.ttf'] = fontNormal;
    pdfMake.vfs['Sarabun-Bold.ttf'] = fontBold;
    pdfMake.vfs['Sarabun-Italic.ttf'] = fontItalic;
    pdfMake.vfs['Sarabun-BoldItalic.ttf'] = fontBoldItalic;

    // Configure font in pdfMake
    pdfMake.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      },
      THSarabun: {
        normal: 'Sarabun-Regular.ttf',
        bold: 'Sarabun-Bold.ttf',
        italics: 'Sarabun-Italic.ttf',
        bolditalics: 'Sarabun-BoldItalic.ttf'
      }
    };

    return true;
  } catch (error) {
    console.error('Error loading Thai fonts:', error);
    return false;
  }
};

export default initThaiPdfMake;