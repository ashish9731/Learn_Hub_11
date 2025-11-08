import { supabase } from '../lib/supabase';

interface PodcastContent {
  id: string;
  title: string;
  mp3_url: string;
}

interface CategoryContent {
  id: string;
  name: string;
  podcasts: PodcastContent[];
}

interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  answers: {
    answer_text: string;
    is_correct: boolean;
    explanation: string;
  }[];
}

/**
 * Parse quiz questions from uploaded document content
 * @param documentContent The content extracted from the uploaded quiz document
 * @returns Array of quiz questions parsed from the document
 */
function parseQuizFromDocument(documentContent: string): any[] {
  try {
    console.log('Parsing quiz from document content length:', documentContent.length);
    console.log('Document content preview:', documentContent.substring(0, 500) + '...');
    
    // Handle empty or whitespace-only content
    if (!documentContent || documentContent.trim().length === 0) {
      console.log('Document content is empty');
      return [];
    }
    
    // Try to parse as JSON first (if document contains pre-formatted JSON)
    try {
      const jsonData = JSON.parse(documentContent);
      if (Array.isArray(jsonData)) {
        // Validate that it's in the correct format
        const validQuestions = jsonData.filter(question => 
          question.question_text && 
          Array.isArray(question.answers) && 
          question.answers.length >= 2 && // At least 2 answers
          question.answers.some((a: any) => a.is_correct === true) // At least one correct answer
        );
        if (validQuestions.length > 0) {
          console.log('Parsed quiz from JSON format with', validQuestions.length, 'questions');
          return validQuestions;
        }
      }
    } catch (jsonError) {
      // Not JSON format, continue with text parsing
      console.log('Document is not in JSON format, parsing as text');
    }
    
    // Enhanced text parsing with better question/answer detection
    const questions: any[] = [];
    
    // Normalize line endings and split into lines
    const normalizedContent = documentContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Keep empty lines to preserve document structure
    const lines = normalizedContent.split('\n');
    
    console.log('Total lines to parse:', lines.length);
    
    // If we have very few lines, it's likely not a proper quiz document
    if (lines.length < 5) {
      console.log('Too few lines to parse as quiz document');
      return [];
    }
    
    // Parse using block-based approach
    let i = 0;
    let currentQuestion: string | null = null;
    let currentAnswers: Array<{answer_text: string, is_correct: boolean, explanation: string}> = [];
    let correctAnswerLetter = '';
    let collectingExplanation = false;
    let explanationBuffer = '';
    let inAnswerSection = false;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Look for question pattern (e.g., "Question 1: What is the capital of France?")
      // Also match your format: "Question 1: What is the primary aim of coaching in the workplace?"
      const questionMatch = trimmedLine.match(/^(?:Question\s*)?(\d+)[\.\-\):]?\s*(.+)$/i);
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentAnswers.length >= 2) {
          // Mark correct answer if we found the answer line
          let correctAnswerFound = false;
          if (correctAnswerLetter && correctAnswerLetter.length === 1) {
            const answerIndex = correctAnswerLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
            if (answerIndex >= 0 && answerIndex < currentAnswers.length) {
              currentAnswers[answerIndex].is_correct = true;
              // Add any collected explanation to the correct answer
              if (explanationBuffer) {
                currentAnswers[answerIndex].explanation = explanationBuffer.trim();
              }
              correctAnswerFound = true;
            }
          }
          
          // If no correct answer was explicitly specified, default to first answer as fallback
          // but only if we have at least one answer
          if (!correctAnswerFound && currentAnswers.length > 0) {
            console.log('No correct answer specified in document for question:', currentQuestion, '- defaulting to first answer');
            currentAnswers[0].is_correct = true;
            // Add any collected explanation to the first answer
            if (explanationBuffer) {
              currentAnswers[0].explanation = explanationBuffer.trim();
            }
          }
          
          questions.push({
            question_text: currentQuestion,
            question_type: 'multiple_choice',
            difficulty: 'medium',
            answers: currentAnswers
          });
          console.log('Added question:', currentQuestion, 'with', currentAnswers.length, 'answers');
        }
        
        // Start new question
        const questionNumber = questionMatch[1];
        currentQuestion = questionMatch[2].trim();
        currentAnswers = [];
        correctAnswerLetter = '';
        collectingExplanation = false;
        explanationBuffer = '';
        inAnswerSection = false;
        console.log('Found question:', questionNumber, currentQuestion);
      } 
      // Look for answer options with various formats (e.g., "a) Paris", "(b) London", "c. Berlin")
      // Also handle your format where answers might be on the same line
      else if (currentQuestion && (trimmedLine.match(/^[\(\[]?[a-dA-D][\.\)\]]?\s*(.+)$/) || 
               trimmedLine.match(/^([a-dA-D])[\.\)]\s*(.+)$/))) {
        const answerMatch = trimmedLine.match(/^[\(\[]?([a-dA-D])[\.\)\]]?\s*(.+)$/) || 
                           trimmedLine.match(/^([a-dA-D])[\.\)]\s*(.+)$/);
        if (answerMatch) {
          const letter = answerMatch[1].toUpperCase();
          const answerText = answerMatch[2].trim();
          console.log('Found answer option:', letter, answerText);
          currentAnswers.push({
            answer_text: answerText,
            is_correct: false,
            explanation: ''
          });
          inAnswerSection = true;
        }
      }
      // Handle your specific format where all answers might be on consecutive lines without "Question" prefix
      else if (currentQuestion && !trimmedLine.toLowerCase().startsWith('answer:') && 
               !trimmedLine.toLowerCase().startsWith('correct answer:') &&
               !trimmedLine.toLowerCase().startsWith('solution:') &&
               !trimmedLine.toLowerCase().startsWith('explanation:') &&
               trimmedLine.match(/^[a-dA-D][\.\)]\s*.+$/)) {
        const answerMatch = trimmedLine.match(/^([a-dA-D])[\.\)]\s*(.+)$/);
        if (answerMatch) {
          const letter = answerMatch[1].toUpperCase();
          const answerText = answerMatch[2].trim();
          console.log('Found inline answer option:', letter, answerText);
          currentAnswers.push({
            answer_text: answerText,
            is_correct: false,
            explanation: ''
          });
          inAnswerSection = true;
        }
      }
      // Look for various answer line formats (e.g., "Answer: a", "Correct Answer: B")
      else if (currentQuestion && inAnswerSection && 
               (trimmedLine.toLowerCase().startsWith('answer:') || 
                trimmedLine.toLowerCase().startsWith('correct answer:') ||
                trimmedLine.toLowerCase().startsWith('solution:') ||
                trimmedLine.toLowerCase().match(/^answer\s*[a-d][\.\)]?/i) ||
                trimmedLine.toLowerCase().match(/^correct\s+answer\s*[a-d][\.\)]?/i))) {
        // Extract the answer value from different formats
        let answerValue = '';
        if (trimmedLine.toLowerCase().startsWith('answer:')) {
          answerValue = trimmedLine.substring(7).trim();
        } else if (trimmedLine.toLowerCase().startsWith('correct answer:')) {
          answerValue = trimmedLine.substring(15).trim();
        } else if (trimmedLine.toLowerCase().startsWith('solution:')) {
          answerValue = trimmedLine.substring(9).trim();
        } else if (trimmedLine.toLowerCase().match(/^answer\s*[a-d][\.\)]?/i)) {
          const match = trimmedLine.toLowerCase().match(/^answer\s*([a-d])[\.\)]?/i);
          if (match) {
            answerValue = match[1];
          }
        } else if (trimmedLine.toLowerCase().match(/^correct\s+answer\s*[a-d][\.\)]?/i)) {
          const match = trimmedLine.toLowerCase().match(/^correct\s+answer\s*([a-d])[\.\)]?/i);
          if (match) {
            answerValue = match[1];
          }
        }
        
        console.log('Found answer indicator:', answerValue);
        
        // Handle different answer formats
        if (answerValue.length === 1 && /^[A-Da-d]$/.test(answerValue)) {
          correctAnswerLetter = answerValue.toUpperCase();
          console.log('Set correct answer letter:', correctAnswerLetter);
        } else if (answerValue.match(/^([A-Da-d])[\.\)]/)) {
          const letterMatch = answerValue.match(/^([A-Da-d])[\.\)]/);
          if (letterMatch) {
            correctAnswerLetter = letterMatch[1].toUpperCase();
            console.log('Set correct answer letter from format:', correctAnswerLetter);
          }
        }
        inAnswerSection = false;
      }
      // Look for explanation (e.g., "Explanation: Paris is the capital of France.")
      else if (currentQuestion && trimmedLine.toLowerCase().startsWith('explanation:')) {
        collectingExplanation = true;
        const explanationText = trimmedLine.substring(12).trim();
        explanationBuffer = explanationText;
        console.log('Found explanation start:', explanationText);
        inAnswerSection = false;
      }
      // Continue explanation text
      else if (collectingExplanation && trimmedLine !== '' && 
               !trimmedLine.match(/^(?:Question\s*)?(\d+)[\.\-\):]?\s*(.+)$/i)) {
        // Append to the explanation buffer
        if (explanationBuffer) {
          explanationBuffer += ' ' + trimmedLine;
        } else {
          explanationBuffer = trimmedLine;
        }
        console.log('Continued explanation:', trimmedLine);
      }
      // Stop collecting explanation when we hit a new question or answer section
      else if (collectingExplanation && 
               (trimmedLine.match(/^(?:Question\s*)?(\d+)[\.\-\):]?\s*(.+)$/i) || 
                trimmedLine.toLowerCase().startsWith('answer:') ||
                trimmedLine.toLowerCase().startsWith('correct answer:') ||
                trimmedLine.toLowerCase().startsWith('solution:') ||
                trimmedLine.match(/^[\(\[]?[a-dA-D][\.\)\]]?\s*(.+)$/))) {
        collectingExplanation = false;
      }
      
      i++;
    }
    
    // Save the last question
    if (currentQuestion && currentAnswers.length >= 2) {
      // Mark correct answer if we found the answer line
      let correctAnswerFound = false;
      if (correctAnswerLetter && correctAnswerLetter.length === 1) {
        const answerIndex = correctAnswerLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
        if (answerIndex >= 0 && answerIndex < currentAnswers.length) {
          currentAnswers[answerIndex].is_correct = true;
          // Add any collected explanation to the correct answer
          if (explanationBuffer) {
            currentAnswers[answerIndex].explanation = explanationBuffer.trim();
          }
          correctAnswerFound = true;
        }
      }
      
      // If no correct answer was explicitly specified, default to first answer as fallback
      // but only if we have at least one answer
      if (!correctAnswerFound && currentAnswers.length > 0) {
        console.log('No correct answer specified in document for final question:', currentQuestion, '- defaulting to first answer');
        currentAnswers[0].is_correct = true;
        // Add any collected explanation to the first answer
        if (explanationBuffer) {
          currentAnswers[0].explanation = explanationBuffer.trim();
        }
      }
      
      questions.push({
        question_text: currentQuestion,
        question_type: 'multiple_choice',
        difficulty: 'medium',
        answers: currentAnswers
      });
      console.log('Added final question:', currentQuestion, 'with', currentAnswers.length, 'answers');
    }
    
    // If we still have no questions, try a more flexible parsing approach
    if (questions.length === 0) {
      console.log('No questions parsed with standard approach, trying flexible parsing...');
      return parseQuizFlexible(documentContent);
    }
    
    console.log('Parsed', questions.length, 'questions from document text');
    return questions;
  } catch (error) {
    console.error('Error parsing quiz from document:', error);
    return [];
  }
}

/**
 * Flexible parsing approach for various quiz formats
 * @param documentContent The content extracted from the uploaded quiz document
 * @returns Array of quiz questions parsed from the document
 */
function parseQuizFlexible(documentContent: string): any[] {
  try {
    console.log('Using flexible parsing approach');
    
    // Split content into blocks by double newlines or "Question" markers
    const separatorRegex = new RegExp('\\n\\s*\\n\\s*\\n|\\n\\s*Question\\s*\\d+\\s*:', 'i');
    const blocks = documentContent.split(separatorRegex);
    const questions: any[] = [];
    
    // Also try splitting by multiple newlines if the above doesn't work well
    let allBlocks = blocks;
    if (blocks.length <= 1) {
      // Try a different approach for your specific format
      const questionBlocks = documentContent.split(/(?=Question \d+:)/i);
      if (questionBlocks.length > 1) {
        allBlocks = questionBlocks;
      } else {
        // Try splitting by numbered questions with explanations
        allBlocks = documentContent.split(/(?=Question \d+:|Answer: [a-dA-D]|Explanation:)/i);
      }
    }
    
    for (const block of allBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;
      
      // Try to extract question and answers from each block
      const lines = trimmedBlock.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 3) continue; // Need at least question + 2 answers
      
      // Extract question (first line that doesn't look like an answer)
      let questionText = '';
      let answerLines: string[] = [];
      let explanation = '';
      let correctAnswer = '';
      
      // Handle your specific format: "Question 1: What is the primary aim..."
      const questionMatch = trimmedBlock.match(/Question \d+:\s*(.+?)(?=[a-dA-D][\.\)]|\n[a-dA-D][\.\)])/is);
      if (questionMatch) {
        questionText = questionMatch[1].trim();
        // Extract everything after the question as potential answers
        const afterQuestion = trimmedBlock.substring(questionMatch.index! + questionMatch[0].length);
        answerLines = afterQuestion.split('\n').map(line => line.trim()).filter(line => line);
      } else {
        // Fallback to original approach
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // If line looks like an answer option, it's the start of answers
          if (line.match(/^[a-dA-D][\.\)]\s*.+$/)) {
            questionText = lines.slice(0, i).join(' ');
            answerLines = lines.slice(i);
            break;
          }
        }
      }
      
      // If we couldn't separate question from answers, skip this block
      if (!questionText || answerLines.length < 2) continue;
      
      // Extract answers and correct answer
      const answers: Array<{answer_text: string, is_correct: boolean, explanation: string}> = [];
      let correctAnswerLetter = '';
      
      // Look for "Answer: X" or "Correct Answer: X" in the answer lines
      for (const line of answerLines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('answer:') || lowerLine.startsWith('correct answer:')) {
          const answerValueMatch = line.match(/[:\s]([a-dA-D])[\.\)]?/i);
          if (answerValueMatch) {
            correctAnswerLetter = answerValueMatch[1].toUpperCase();
            break;
          }
        }
      }
      
      // Extract answer options
      for (const line of answerLines) {
        // Look for answer options like "a) To provide direct solutions to employees"
        const answerMatch = line.match(/^([a-dA-D])[\.\)]\s*(.+)$/);
        if (answerMatch) {
          const letter = answerMatch[1].toUpperCase();
          const answerText = answerMatch[2].trim();
          
          answers.push({
            answer_text: answerText,
            is_correct: false,
            explanation: '' // Will be filled later
          });
        }
      }
      
      // Look for explanation after the answer
      const explanationMatch = trimmedBlock.match(/Explanation:\s*(.+?)(?=\n\n|Question \d+:|$)/is);
      if (explanationMatch && answers.length > 0) {
        const explanationText = explanationMatch[1].trim();
        // Assign explanation to the correct answer if we have one, otherwise to the first answer
        if (correctAnswerLetter && answers.some(a => a.is_correct)) {
          const correctAnswer = answers.find(a => a.is_correct);
          if (correctAnswer) {
            correctAnswer.explanation = explanationText;
          }
        } else if (answers.length > 0) {
          answers[0].explanation = explanationText;
        }
      }
      
      // If we found valid answers, add the question
      if (answers.length >= 2 && (answers.some(a => a.is_correct) || correctAnswerLetter)) {
        // If we found a correct answer letter but didn't mark any answer as correct, do it now
        if (correctAnswerLetter && !answers.some(a => a.is_correct)) {
          const correctAnswer = answers.find(a => a.answer_text.charAt(0).toUpperCase() === correctAnswerLetter || 
                                                  a.answer_text.startsWith(correctAnswerLetter + ')') ||
                                                  a.answer_text.startsWith(correctAnswerLetter + '.'));
          if (correctAnswer) {
            correctAnswer.is_correct = true;
          } else {
            // Fallback: mark the answer that matches the letter
            const letterMatchAnswer = answers.find(a => a.answer_text.toUpperCase().includes(`(${correctAnswerLetter})`) || 
                                                        a.answer_text.toUpperCase().includes(`${correctAnswerLetter}.`));
            if (letterMatchAnswer) {
              letterMatchAnswer.is_correct = true;
            } else {
              // Last resort: mark the first answer as correct
              answers[0].is_correct = true;
            }
          }
        }
        
        questions.push({
          question_text: questionText,
          question_type: 'multiple_choice',
          difficulty: 'medium',
          answers: answers
        });
        console.log('Added question via flexible parsing:', questionText);
      } else if (answers.length >= 2) {
        // If no correct answer marked, default to first answer
        answers[0].is_correct = true;
        questions.push({
          question_text: questionText,
          question_type: 'multiple_choice',
          difficulty: 'medium',
          answers: answers
        });
        console.log('Added question via flexible parsing (default first answer):', questionText);
      }
    }
    
    // Special handling for your exact format
    if (questions.length === 0) {
      console.log('Trying special format parsing for your exact format');
      const specialQuestions = parseSpecialFormat(documentContent);
      if (specialQuestions.length > 0) {
        questions.push(...specialQuestions);
      }
    }
    
    console.log('Flexible parsing found', questions.length, 'questions');
    return questions;
  } catch (error) {
    console.error('Error in flexible parsing:', error);
    return [];
  }
}

/**
 * Special parsing for your exact format
 * @param documentContent The content extracted from the uploaded quiz document
 * @returns Array of quiz questions parsed from the document
 */
function parseSpecialFormat(documentContent: string): any[] {
  try {
    console.log('Using special format parsing');
    const questions: any[] = [];
    
    // Split by "Question" markers
    const questionBlocks = documentContent.split(/(?=Question \d+:)/i).filter(block => block.trim());
    
    for (const block of questionBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;
      
      // Extract question text - handle the case where everything is on one line
      // Match: Question 1: What is the primary aim of coaching in the workplace?a) To provide...
      const questionMatch = trimmedBlock.match(/Question\s*\d+:\s*(.+?)(?=\s*[a-dA-D][\.\)]|\s*$)/i);
      if (!questionMatch) {
        console.log('No question match found in block:', trimmedBlock.substring(0, 100));
        continue;
      }
      
      const questionText = questionMatch[1].trim();
      console.log('Extracted question text:', questionText);
      
      // Extract answers - handle the case where everything is concatenated
      const answers: Array<{answer_text: string, is_correct: boolean, explanation: string}> = [];
      
      // Look for all answer options in the block
      const answerRegex = /([a-dA-D])[\.\)]\s*([^a-dA-D]*?)(?=\s*[a-dA-D][\.\)]|\s*Answer:|\s*Explanation:|\s*$)/gi;
      let answerMatch;
      const foundAnswers: Array<{letter: string, text: string}> = [];
      
      while ((answerMatch = answerRegex.exec(trimmedBlock)) !== null) {
        const letter = answerMatch[1].toUpperCase();
        const text = answerMatch[2].trim();
        if (text) {
          foundAnswers.push({letter, text});
        }
      }
      
      // If we didn't find answers with the regex, try a different approach
      if (foundAnswers.length === 0) {
        // Try to extract answers manually by looking for patterns
        const answerPatterns = [
          /a[\.\)]\s*([^bB]*)/,
          /b[\.\)]\s*([^cC]*)/,
          /c[\.\)]\s*([^dD]*)/,
          /d[\.\)]\s*(.*)/
        ];
        
        for (let i = 0; i < answerPatterns.length; i++) {
          const match = trimmedBlock.match(answerPatterns[i]);
          if (match && match[1]) {
            const letters = ['A', 'B', 'C', 'D'];
            const text = match[1].trim();
            // Remove any trailing Answer: or Explanation: parts
            const cleanText = text.replace(/\s*(Answer:|Explanation:).*$/, '').trim();
            if (cleanText) {
              foundAnswers.push({letter: letters[i], text: cleanText});
            }
          }
        }
      }
      
      // Convert found answers to the proper format
      for (const answer of foundAnswers) {
        answers.push({
          answer_text: answer.text,
          is_correct: false, // Will be set later
          explanation: ''
        });
      }
      
      if (answers.length < 2) {
        console.log('Not enough answers found, skipping question');
        continue;
      }
      
      // Extract correct answer
      const answerRegexPattern = /Answer:\s*([a-dA-D])/i;
      const answerMatchResult = trimmedBlock.match(answerRegexPattern);
      if (answerMatchResult) {
        const correctLetter = answerMatchResult[1].toUpperCase();
        console.log('Found correct answer letter:', correctLetter);
        
        // Mark the correct answer
        for (let i = 0; i < foundAnswers.length; i++) {
          if (foundAnswers[i].letter === correctLetter) {
            answers[i].is_correct = true;
            break;
          }
        }
        
        // If we didn't find a match, default to first answer
        if (!answers.some(a => a.is_correct)) {
          answers[0].is_correct = true;
        }
      } else {
        // Default to first answer
        answers[0].is_correct = true;
      }
      
      // Extract explanation
      const explanationMatch = trimmedBlock.match(/Explanation:\s*(.+?)(?=Question\s*\d+:|$)/is);
      if (explanationMatch) {
        const explanationText = explanationMatch[1].trim();
        console.log('Found explanation:', explanationText);
        
        // Assign to correct answer
        const correctAnswer = answers.find(a => a.is_correct);
        if (correctAnswer) {
          correctAnswer.explanation = explanationText;
        } else {
          answers[0].explanation = explanationText;
        }
      }
      
      questions.push({
        question_text: questionText,
        question_type: 'multiple_choice',
        difficulty: 'medium',
        answers: answers
      });
      console.log('Added question via special format parsing:', questionText);
    }
    
    console.log('Special format parsing found', questions.length, 'questions');
    return questions;
  } catch (error) {
    console.error('Error in special format parsing:', error);
    return [];
  }
}

/**
 * Generate a quiz from an uploaded document for a specific course
 * This function parses the document content and creates quiz questions directly
 * without using AI generation
 * 
 * @param courseId - The ID of the course
 * @param courseTitle - The title of the course
 * @param quizDocumentContent - The text content extracted from the uploaded document
 * @returns Promise<string | null> - The ID of the generated quiz or null if failed
 */
export async function generateQuizFromDocument(
  courseId: string,
  courseTitle: string,
  quizDocumentContent: string
): Promise<string | null> {
  try {
    console.log('=== DEBUG: START QUIZ GENERATION ===');
    console.log('Course ID:', courseId);
    console.log('Course Title:', courseTitle);
    console.log('Document content length:', quizDocumentContent.length);
    console.log('Document content preview (first 500 chars):', quizDocumentContent.substring(0, 500));
    
    // Replace multiple spaces with a single space to normalize text
    const text = quizDocumentContent
      .replace(/\r?\n|\r/g, ' ') // remove line breaks
      .replace(/\s{2,}/g, ' ')   // collapse extra spaces
      .trim();
      
    console.log('Normalized text length:', text.length);
    console.log('Normalized text preview (first 500 chars):', text.substring(0, 500));

    // 🧩 Regex that works even if there are no newlines
    const pattern =
      /Question\s*(\d+):\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)\s*Answer:\s*([a-dA-D])\s*Explanation:\s*(.*?)(?=\s*Question\s*\d+:|$)/gims;

    console.log('Applying regex pattern to parse questions...');
    const matches = Array.from(text.matchAll(pattern));
    
    console.log('Regex matches found:', matches.length);
    
    // Log first few matches for debugging
    if (matches.length > 0) {
      console.log('First match details:', {
        fullMatch: matches[0][0],
        questionNumber: matches[0][1],
        questionText: matches[0][2],
        optionA: matches[0][3],
        optionB: matches[0][4],
        optionC: matches[0][5],
        optionD: matches[0][6],
        correctAnswer: matches[0][7],
        explanation: matches[0][8]
      });
    }

    if (matches.length === 0) {
      console.error('❌ No questions parsed from document text');
      console.log('Full normalized text:', text);
      return null;
    }

    console.log(`✅ Found ${matches.length} questions in document`);

    // Get the admin client if available
    let supabaseClient = supabase;
    let usingAdminClient = false;
    
    try {
      const { supabaseAdmin } = await import('../lib/supabase');
      if (supabaseAdmin) {
        supabaseClient = supabaseAdmin;
        usingAdminClient = true;
        console.log('Using admin client for quiz generation');
      } else {
        console.log('Admin client not available, using regular client');
      }
    } catch (importError) {
      console.log('Could not import admin client, using regular client');
    }
    
    console.log('Supabase client type:', usingAdminClient ? 'Admin' : 'Regular');

    // Check if a quiz already exists for this course
    console.log('Checking for existing quiz for course:', courseId);
    const { data: existingQuiz, error: existingQuizError } = await supabaseClient
      .from('course_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (existingQuizError) {
      console.error('Error checking for existing quiz:', existingQuizError);
    } else {
      console.log('Existing quiz check result:', existingQuiz);
    }
    
    // If an existing quiz is found, delete it and its questions/answers
    if (existingQuiz) {
      console.log('Found existing quiz, deleting it:', existingQuiz.id);
      
      // Get all question IDs for this quiz
      const { data: questions, error: questionsError } = await supabaseClient
        .from('quiz_questions')
        .select('id')
        .eq('course_quiz_id', existingQuiz.id);
      
      if (questionsError) {
        console.error('Error fetching quiz questions:', questionsError);
      } else {
        console.log('Found', questions?.length || 0, 'questions to delete');
      }
      
      // Delete existing quiz answers
      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        console.log('Deleting', questionIds.length, 'quiz answers for existing questions');
        
        const { error: deleteAnswersError } = await supabaseClient
          .from('quiz_answers')
          .delete()
          .in('question_id', questionIds);
        
        if (deleteAnswersError) {
          console.error('Error deleting quiz answers:', deleteAnswersError);
        } else {
          console.log('Successfully deleted quiz answers');
        }
      }
      
      // Delete existing quiz questions
      const { error: deleteQuestionsError } = await supabaseClient
        .from('quiz_questions')
        .delete()
        .eq('course_quiz_id', existingQuiz.id);
      
      if (deleteQuestionsError) {
        console.error('Error deleting quiz questions:', deleteQuestionsError);
      } else {
        console.log('Successfully deleted quiz questions');
      }
      
      // Delete the quiz itself
      const { error: deleteQuizError } = await supabaseClient
        .from('course_quizzes')
        .delete()
        .eq('id', existingQuiz.id);
      
      if (deleteQuizError) {
        console.error('Error deleting existing quiz:', deleteQuizError);
      } else {
        console.log('Successfully deleted existing quiz');
      }
      
      console.log('Deleted existing quiz, will regenerate from document content');
    }

    // Create quiz with enhanced verification
    console.log('Creating new quiz for course:', courseId);
    const { data: quizInsert, error: quizError } = await supabaseClient
      .from('course_quizzes')
      .insert({
        course_id: courseId,
        title: `${courseTitle} - Auto Quiz`,
        description: 'Automatically generated quiz from document',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (quizError || !quizInsert?.id) {
      console.error('❌ Quiz creation failed:', quizError);
      return null;
    }

    const courseQuizId = quizInsert.id;
    console.log('✅ Verified quiz exists with ID:', courseQuizId);

    // Re-fetch to confirm it's actually visible (RLS check)
    console.log('Verifying quiz visibility with RLS check...');
    const { data: verify, error: verifyError } = await supabaseClient
      .from('course_quizzes')
      .select('id')
      .eq('id', courseQuizId)
      .maybeSingle();

    if (verifyError || !verify) {
      console.error('❌ Quiz not found after insert - RLS likely blocking visibility');
      console.error('Verification error:', verifyError);
      return null;
    }
    
    console.log('✅ Quiz visibility verified');

    // Add a small delay to ensure consistency
    await new Promise(resolve => setTimeout(resolve, 100));

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const [, qNum, questionText, a, b, c, d, correctLetter, explanation] = match;
      
      console.log(`Processing question ${i + 1}/${matches.length}:`, qNum);
      console.log(`Question text: ${questionText}`);
      console.log(`Options: a) ${a}, b) ${b}, c) ${c}, d) ${d}`);
      console.log(`Correct answer: ${correctLetter}`);
      console.log(`Explanation: ${explanation}`);

      // Insert question
      console.log(`Inserting question ${qNum}...`);
      const { data: questionData, error: qErr } = await supabaseClient
        .from('quiz_questions')
        .insert({
          course_quiz_id: courseQuizId,
          question_text: questionText.trim(),
          difficulty: 'medium'
        })
        .select('id')
        .single();

      if (qErr || !questionData?.id) {
        console.error(`Error inserting question ${qNum}:`, qErr);
        continue;
      }

      const qid = questionData.id;
      console.log(`✅ Question ${qNum} inserted with ID:`, qid);
      
      // Add a small delay to ensure consistency
      await new Promise(resolve => setTimeout(resolve, 50));

      const options = [
        { key: 'a', text: a },
        { key: 'b', text: b },
        { key: 'c', text: c },
        { key: 'd', text: d }
      ];

      for (const opt of options) {
        const isCorrect = opt.key.toLowerCase() === correctLetter.toLowerCase();
        console.log(`Inserting answer ${opt.key} for question ${qNum}, isCorrect: ${isCorrect}`);
        
        const { error: answerError } = await supabaseClient.from('quiz_answers').insert({
          question_id: qid,
          answer_text: opt.text.trim(),
          is_correct: isCorrect,
          explanation: isCorrect ? explanation.trim() : ''
        });
        
        if (answerError) {
          console.error(`Error inserting answer for question ${qNum}, option ${opt.key}:`, answerError);
        } else {
          console.log(`✅ Answer ${opt.key} inserted successfully`);
        }
      }
    }

    console.log(`✅ Quiz ${courseQuizId} created successfully with ${matches.length} questions.`);
    return courseQuizId;
  } catch (err) {
    console.error('generateQuizFromDocument failed:', err);
    return null;
  }
}

/**
 * Start a quiz attempt for a user
 * @param userId The user ID
 * @param quizId The quiz ID (either module or course quiz)
 * @param isModuleQuiz Whether this is a module quiz or course quiz
 * @returns Attempt ID if successful, null if failed
 */
export async function startQuizAttempt(
  userId: string,
  quizId: string,
  isModuleQuiz: boolean
): Promise<string | null> {
  try {
    const { data: attempt, error } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: userId,
        [isModuleQuiz ? 'module_quiz_id' : 'course_quiz_id']: quizId
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting quiz attempt:', error);
      return null;
    }

    return attempt.id;
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    return null;
  }
}

/**
 * Submit a quiz answer
 * @param attemptId The attempt ID
 * @param questionId The question ID
 * @param selectedAnswerId The selected answer ID
 * @returns True if successful, false if failed
 */
export async function submitQuizAnswer(
  attemptId: string,
  questionId: string,
  selectedAnswerId: string
): Promise<{ success: boolean; isCorrect: boolean; correctAnswerId: string | null; explanation: string | null }> {
  try {
    // Get the correct answer for this question
    const { data: correctAnswer, error: answerError } = await supabase
      .from('quiz_answers')
      .select('id, is_correct, explanation')
      .eq('question_id', questionId)
      .eq('is_correct', true)
      .maybeSingle();

    if (answerError) {
      console.error('Error fetching correct answer:', answerError);
      return { success: false, isCorrect: false, correctAnswerId: null, explanation: null };
    }

    const isCorrect = correctAnswer?.id === selectedAnswerId;

    // Save the user's answer
    const { error: submitError } = await supabase
      .from('user_quiz_answers')
      .insert({
        attempt_id: attemptId,
        question_id: questionId,
        selected_answer_id: selectedAnswerId,
        is_correct: isCorrect
      });

    if (submitError) {
      console.error('Error submitting quiz answer:', submitError);
      return { success: false, isCorrect: false, correctAnswerId: null, explanation: null };
    }

    return {
      success: true,
      isCorrect: isCorrect,
      correctAnswerId: correctAnswer?.id || null,
      explanation: correctAnswer?.explanation || null
    };
  } catch (error) {
    console.error('Error submitting quiz answer:', error);
    return { success: false, isCorrect: false, correctAnswerId: null, explanation: null };
  }
}

/**
 * Complete a quiz attempt and calculate score
 * @param attemptId The attempt ID
 * @returns True if successful, false if failed
 */
export async function completeQuizAttempt(attemptId: string): Promise<boolean> {
  try {
    // Get all answers for this attempt
    const { data: answers, error: answersError } = await supabase
      .from('user_quiz_answers')
      .select('is_correct')
      .eq('attempt_id', attemptId);

    if (answersError) {
      console.error('Error fetching quiz answers:', answersError);
      return false;
    }

    // Calculate score
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(answer => answer.is_correct).length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = correctAnswers >= 13; // 13 correct answers to pass (52% for 25 questions)

    // Update the attempt with completion data
    const { error: updateError } = await supabase
      .from('user_quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        score: score,
        total_questions: totalQuestions,
        passed: passed
      })
      .eq('id', attemptId);

    if (updateError) {
      console.error('Error completing quiz attempt:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error completing quiz attempt:', error);
    return false;
  }
}

/**
 * Get user's quiz attempts for a course
 * @param userId The user ID
 * @param courseId The course ID
 * @returns Array of quiz attempts with details
 */
export async function getUserQuizAttempts(userId: string, courseId: string) {
  try {
    // Get module quiz attempts
    const { data: moduleAttempts, error: moduleError } = await supabase
      .from('user_quiz_attempts')
      .select(`
        id,
        started_at,
        completed_at,
        score,
        total_questions,
        passed,
        module_quizzes!inner (
          id,
          title,
          category_id,
          content_categories (name)
        )
      `)
      .eq('user_id', userId)
      .eq('module_quizzes.course_id', courseId);

    if (moduleError) {
      console.error('Error fetching module quiz attempts:', moduleError);
    }

    // Get course quiz attempts
    const { data: courseAttempts, error: courseError } = await supabase
      .from('user_quiz_attempts')
      .select(`
        id,
        started_at,
        completed_at,
        score,
        total_questions,
        passed,
        course_quizzes!inner (
          id,
          title
        )
      `)
      .eq('user_id', userId)
      .eq('course_quizzes.course_id', courseId);

    if (courseError) {
      console.error('Error fetching course quiz attempts:', courseError);
    }

    return {
      moduleAttempts: moduleAttempts || [],
      courseAttempts: courseAttempts || []
    };
  } catch (error) {
    console.error('Error fetching user quiz attempts:', error);
    return {
      moduleAttempts: [],
      courseAttempts: []
    };
  }
}

/**
 * Get detailed results for a quiz attempt
 * @param attemptId The attempt ID
 * @returns Detailed results including questions, answers, and explanations
 */
export async function getQuizAttemptDetails(attemptId: string) {
  try {
    // Get the attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('user_quiz_attempts')
      .select(`
        id,
        started_at,
        completed_at,
        score,
        total_questions,
        passed,
        module_quizzes (title, content_categories (name)),
        course_quizzes (title)
      `)
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError) {
      console.error('Error fetching quiz attempt:', attemptError);
      return null;
    }

    // Get questions and user answers with proper joins
    const { data: questions, error: questionsError } = await supabase
      .from('user_quiz_answers')
      .select(`
        question_id,
        selected_answer_id,
        is_correct,
        quiz_questions (question_text, difficulty)
      `)
      .eq('attempt_id', attemptId);

    if (questionsError) {
      console.error('Error fetching quiz questions:', questionsError);
      return null;
    }

    // Get selected answers details
    const selectedAnswerIds = questions
      .map(q => q.selected_answer_id)
      .filter((id): id is string => id !== null);

    const { data: selectedAnswersData, error: selectedAnswersError } = selectedAnswerIds.length > 0
      ? await supabase
          .from('quiz_answers')
          .select('id, answer_text, is_correct, explanation')
          .in('id', selectedAnswerIds)
      : { data: [], error: null };

    if (selectedAnswersError) {
      console.error('Error fetching selected answers:', selectedAnswersError);
      return null;
    }

    // Get correct answers for each question
    const questionIds = questions.map(q => q.question_id);
    const { data: correctAnswersData, error: correctAnswersError } = questionIds.length > 0
      ? await supabase
          .from('quiz_answers')
          .select('id, question_id, answer_text, explanation')
          .in('question_id', questionIds)
          .eq('is_correct', true)
      : { data: [], error: null };

    if (correctAnswersError) {
      console.error('Error fetching correct answers:', correctAnswersError);
      return null;
    }

    // Format the data for display
    const formattedQuestions = questions.map(q => {
      const selectedAnswer = selectedAnswersData?.find(a => a.id === q.selected_answer_id) || null;
      const correctAnswer = correctAnswersData?.find(a => a.question_id === q.question_id) || null;
      
      // Access the first item in the quiz_questions array
      const quizQuestion = Array.isArray(q.quiz_questions) ? q.quiz_questions[0] : q.quiz_questions;
      
      return {
        question_text: quizQuestion?.question_text || '',
        difficulty: quizQuestion?.difficulty || 'medium',
        selected_answer: selectedAnswer?.answer_text || '',
        selected_is_correct: q.is_correct || false,
        correct_answer: correctAnswer?.answer_text || '',
        explanation: selectedAnswer?.explanation || '',
        correct_explanation: correctAnswer?.explanation || ''
      };
    });

    return {
      ...attempt,
      questions: formattedQuestions
    };
  } catch (error) {
    console.error('Error fetching quiz attempt details:', error);
    return null;
  }
}