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
    console.log('Extracting text from PDF file:', file.name, 'Size:', file.size, 'bytes');
    const arrayBuffer = await file.arrayBuffer();
    console.log('PDF file loaded into array buffer, size:', arrayBuffer.byteLength);
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF document loaded, pages:', pdf.numPages);
    
    let textContent = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages for performance
    
    for (let i = 1; i <= maxPages; i++) {
      console.log('Processing page', i);
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      console.log('Page', i, 'text items:', text.items.length);
      
      const pageText = text.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (pageText) {
        textContent += pageText + '\n\n';
        console.log('Page', i, 'extracted text length:', pageText.length);
      } else {
        console.log('Page', i, 'has no selectable text');
      }
    }
    
    const result = textContent.trim();
    console.log('Total extracted text length:', result.length);
    
    // If we extracted no text, this might be an image-only PDF
    if (!result) {
      throw new Error('No selectable text found in PDF. This may be an image-only PDF which cannot be processed for quiz generation. Please ensure your PDF contains selectable text.');
    }
    
    // Clean up the extracted text to improve parsing
    const cleanedResult = result
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/\u2013/g, '-') // Replace en dash with hyphen
      .replace(/\u2014/g, '-') // Replace em dash with hyphen
      .replace(/\u2018/g, "'") // Replace left single quotation mark
      .replace(/\u2019/g, "'") // Replace right single quotation mark
      .replace(/\u201c/g, '"') // Replace left double quotation mark
      .replace(/\u201d/g, '"') // Replace right double quotation mark
      .replace(/\u2026/g, '...') // Replace horizontal ellipsis
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters except newlines and tabs
      .trim();
    
    return cleanedResult;
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
    console.log('Extracting text from DOCX file:', file.name, 'Size:', file.size, 'bytes');
    const arrayBuffer = await file.arrayBuffer();
    console.log('DOCX file loaded into array buffer, size:', arrayBuffer.byteLength);
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();
    console.log('Extracted DOCX text length:', text.length);
    
    // If we extracted no text, this might be an empty or corrupted DOCX
    if (!text) {
      throw new Error('No text content found in DOCX file. Please ensure your document contains text content.');
    }
    
    // Clean up the extracted text to improve parsing
    const cleanedText = text
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/\u2013/g, '-') // Replace en dash with hyphen
      .replace(/\u2014/g, '-') // Replace em dash with hyphen
      .replace(/\u2018/g, "'") // Replace left single quotation mark
      .replace(/\u2019/g, "'") // Replace right single quotation mark
      .replace(/\u201c/g, '"') // Replace left double quotation mark
      .replace(/\u201d/g, '"') // Replace right double quotation mark
      .replace(/\u2026/g, '...') // Replace horizontal ellipsis
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters except newlines and tabs
      .trim();
    
    return cleanedText;
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
    console.log('Extracting text from TXT file:', file.name, 'Size:', file.size, 'bytes');
    const text = await file.text();
    const trimmedText = text.trim();
    console.log('Extracted TXT text length:', trimmedText.length);
    
    // If we extracted no text, this might be an empty TXT file
    if (!trimmedText) {
      throw new Error('No text content found in TXT file. Please ensure your file contains text content.');
    }
    
    // Clean up the extracted text to improve parsing
    const cleanedText = trimmedText
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/\u2013/g, '-') // Replace en dash with hyphen
      .replace(/\u2014/g, '-') // Replace em dash with hyphen
      .replace(/\u2018/g, "'") // Replace left single quotation mark
      .replace(/\u2019/g, "'") // Replace right single quotation mark
      .replace(/\u201c/g, '"') // Replace left double quotation mark
      .replace(/\u201d/g, '"') // Replace right double quotation mark
      .replace(/\u2026/g, '...') // Replace horizontal ellipsis
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters except newlines and tabs
      .trim();
    
    return cleanedText;
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
  console.log('Extracting quiz document text from file:', file.name, 'Type:', file.type);
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  console.log('File extension:', fileExtension);
  
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