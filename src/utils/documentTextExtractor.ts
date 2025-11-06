import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set the worker URL for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text content from a PDF file
 * @param file The PDF file to extract text from
 * @returns Promise<string> The extracted text content
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let textContent = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages for performance
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      const pageText = text.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (pageText) {
        textContent += pageText + '\n\n';
      }
    }
    
    return textContent.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF file. Please ensure the file is a valid PDF with selectable text.');
  }
}

/**
 * Extract text content from a DOCX file
 * @param file The DOCX file to extract text from
 * @returns Promise<string> The extracted text content
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX file. Please ensure the file is a valid DOCX document.');
  }
}

/**
 * Extract text content from a TXT file
 * @param file The TXT file to extract text from
 * @returns Promise<string> The extracted text content
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw new Error('Failed to extract text from TXT file. Please ensure the file is a valid text document.');
  }
}

/**
 * Extract text content from a quiz document based on its file type
 * @param file The file to extract text from
 * @returns Promise<string> The extracted text content
 */
export async function extractQuizDocumentText(file: File): Promise<string> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'pdf':
      return extractTextFromPDF(file);
    case 'docx':
      return extractTextFromDOCX(file);
    case 'txt':
      return extractTextFromTXT(file);
    default:
      throw new Error(`Unsupported file type: ${fileExtension}. Supported types are PDF, DOCX, and TXT.`);
  }
}