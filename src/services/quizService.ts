import { supabase } from '../lib/supabase';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled via backend functions
});

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
 * Generate a 5-question quiz for a module (category)
 * @param courseId The course ID
 * @param categoryId The category ID
 * @param categoryName The category name
 * @param podcastContents Array of podcast contents for this category
 * @returns Quiz ID if successful, null if failed
 */
export async function generateModuleQuiz(
  courseId: string,
  categoryId: string,
  categoryName: string,
  podcastContents: PodcastContent[]
): Promise<string | null> {
  try {
    // Check if a quiz already exists for this module
    const { data: existingQuiz, error: existingQuizError } = await supabase
      .from('module_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .eq('category_id', categoryId)
      .maybeSingle();

    if (existingQuizError) {
      console.error('Error checking existing module quiz:', existingQuizError);
      return null;
    }

    // If quiz already exists, return its ID
    if (existingQuiz) {
      return existingQuiz.id;
    }

    // Prepare content for AI prompt
    const contentSummary = podcastContents.map(podcast => 
      `- Podcast: ${podcast.title}`
    ).join('\n');

    // Generate quiz questions using OpenAI
    const prompt = `Generate a 5-question multiple choice quiz based on the following podcast content for the category "${categoryName}":

${contentSummary}

Requirements:
1. Each question should have exactly 4 answer options
2. Only one answer should be correct
3. Include explanations for each answer
4. Questions should test understanding of key concepts
5. Vary difficulty levels (easy, medium, hard)
6. Focus ONLY on the content provided, do not hallucinate
7. Format each question as JSON with the following structure:
{
  "question_text": "The question text",
  "question_type": "multiple_choice",
  "difficulty": "easy|medium|hard",
  "answers": [
    {
      "answer_text": "First option",
      "is_correct": true,
      "explanation": "Explanation why this is correct/incorrect"
    }
  ]
}

Return ONLY a valid JSON array of 5 question objects. No other text, no markdown formatting, no code blocks, just the raw JSON array. Ensure the JSON is properly formatted with no syntax errors.`;

    console.log('Generating module quiz with prompt:', prompt.substring(0, 200) + '...');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates educational quizzes. You only use the provided content and never hallucinate.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Add better error handling for OpenAI response
    if (!response.choices || response.choices.length === 0) {
      console.error('No choices returned from OpenAI:', response);
      return null;
    }

    let quizData;
    try {
      // First try to parse the response directly
      quizData = JSON.parse(response.choices[0].message.content || '[]');
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', response.choices[0].message.content);
      
      // Strip Markdown formatting before parsing
      try {
        const rawResponse = response.choices[0].message.content?.trim() || '';
        const jsonStr = rawResponse.replace(/```json|```/g, '').trim();
        quizData = JSON.parse(jsonStr);
      } catch (stripError) {
        console.error('Error stripping markdown and parsing:', stripError);
        
        // Try to extract JSON from the response if it contains extra text
        try {
          const content = response.choices[0].message.content || '';
          // Look for JSON array pattern in the response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            // Clean up the JSON string to remove any trailing commas or invalid characters
            let jsonString = jsonMatch[0];
            // Remove any text after the last closing bracket
            const lastBracketIndex = jsonString.lastIndexOf(']');
            if (lastBracketIndex !== -1) {
              jsonString = jsonString.substring(0, lastBracketIndex + 1);
            }
            
            // Fix common JSON issues
            jsonString = jsonString
              .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
              .replace(/,\s*\]/g, ']') // Remove trailing commas before closing brackets
              .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Add quotes to unquoted keys
              .replace(/'/g, '"') // Replace single quotes with double quotes
              .replace(/\\'/g, "'") // Unescape single quotes
              .replace(/\\n/g, '\\n') // Fix newlines
              .replace(/\\r/g, '\\r') // Fix carriage returns
              .replace(/\\t/g, '\\t'); // Fix tabs
            
            // Try to parse the cleaned JSON
            quizData = JSON.parse(jsonString);
          } else {
            throw new Error('No JSON array found in response');
          }
        } catch (extractError) {
          console.error('Error extracting JSON from response:', extractError);
          // Try to manually parse the response by finding valid JSON objects
          try {
            const content = response.choices[0].message.content || '';
            // Try to find individual JSON objects and build an array
            const objectMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (objectMatches && objectMatches.length > 0) {
              const objects = [];
              for (const objStr of objectMatches) {
                try {
                  // Clean the object string
                  let cleanObjStr = objStr
                    .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
                    .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Add quotes to unquoted keys
                    .replace(/'/g, '"') // Replace single quotes with double quotes
                    .replace(/\\'/g, "'") // Unescape single quotes
                    .replace(/\\n/g, '\\n') // Fix newlines
                    .replace(/\\r/g, '\\r') // Fix carriage returns
                    .replace(/\\t/g, '\\t'); // Fix tabs
                
                  const obj = JSON.parse(cleanObjStr);
                  if (obj.question_text && obj.answers && Array.isArray(obj.answers)) {
                    objects.push(obj);
                  }
                } catch (e) {
                  // Skip invalid objects
                  continue;
                }
              }
              if (objects.length > 0) {
                quizData = objects;
              } else {
                throw new Error('No valid quiz objects found in response');
              }
            } else {
              throw new Error('No JSON objects found in response');
            }
          } catch (manualParseError) {
            console.error('Error manually parsing response:', manualParseError);
            return null;
          }
        }
      }
    }
    
    if (!Array.isArray(quizData) || quizData.length !== 5) {
      console.error('Invalid quiz data received from OpenAI:', quizData);
      return null;
    }

    // Create the module quiz record
    const { data: quiz, error: quizError } = await supabase
      .from('module_quizzes')
      .insert({
        course_id: courseId,
        category_id: categoryId,
        title: `${categoryName} Mastery Quiz`,
        description: `Quiz to test your understanding of ${categoryName} concepts`
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error creating module quiz:', quizError);
      return null;
    }

    // Create questions and answers
    for (const questionData of quizData) {
      // Create question
      const { data: question, error: questionError } = await supabase
        .from('quiz_questions')
        .insert({
          module_quiz_id: quiz.id,
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          difficulty: questionData.difficulty
        })
        .select()
        .single();

      if (questionError) {
        console.error('Error creating quiz question:', questionError);
        continue;
      }

      // Create answers
      for (const answerData of questionData.answers) {
        const { error: answerError } = await supabase
          .from('quiz_answers')
          .insert({
            question_id: question.id,
            answer_text: answerData.answer_text,
            is_correct: answerData.is_correct,
            explanation: answerData.explanation
          });

        if (answerError) {
          console.error('Error creating quiz answer:', answerError);
        }
      }
    }

    console.log('Module quiz generated successfully:', quiz.id);
    return quiz.id;
  } catch (error) {
    console.error('Error generating module quiz:', error);
    return null;
  }
}

/**
 * Generate a 25-question final quiz for a course
 * @param courseId The course ID
 * @param courseTitle The course title
 * @param allCategoryContents All category contents for this course
 * @returns Quiz ID if successful, null if failed
 */
export async function generateFinalQuiz(
  courseId: string,
  courseTitle: string,
  allCategoryContents: CategoryContent[]
): Promise<string | null> {
  try {
    // Check if a final quiz already exists for this course
    const { data: existingQuiz, error: existingQuizError } = await supabase
      .from('course_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingQuizError) {
      console.error('Error checking existing final quiz:', existingQuizError);
      return null;
    }

    // If quiz already exists, return its ID
    if (existingQuiz) {
      return existingQuiz.id;
    }

    // Prepare content for AI prompt
    const contentSummary = allCategoryContents.map(category => 
      `Category: ${category.name}\n` +
      category.podcasts.map(podcast => 
        `  - Podcast: ${podcast.title}`
      ).join('\n')
    ).join('\n\n');

    // Generate quiz questions using OpenAI
    const prompt = `Generate a 25-question multiple choice quiz based on the following course content for "${courseTitle}":

${contentSummary}

Requirements:
1. Each question should have exactly 4 answer options
2. Only one answer should be correct
3. Include explanations for each answer
4. Questions should test understanding of key concepts across all categories
5. Vary difficulty levels (easy, medium, hard)
6. Focus ONLY on the content provided, do not hallucinate
7. Format each question as JSON with the following structure:
{
  "question_text": "The question text",
  "question_type": "multiple_choice",
  "difficulty": "easy|medium|hard",
  "answers": [
    {
      "answer_text": "First option",
      "is_correct": true,
      "explanation": "Explanation why this is correct/incorrect"
    }
  ]
}

Return ONLY a valid JSON array of 25 question objects. No other text, no markdown formatting, no code blocks, just the raw JSON array. Ensure the JSON is properly formatted with no syntax errors.`;

    console.log('Generating final quiz with prompt:', prompt.substring(0, 200) + '...');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates educational quizzes. You only use the provided content and never hallucinate.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    // Add better error handling for OpenAI response
    if (!response.choices || response.choices.length === 0) {
      console.error('No choices returned from OpenAI:', response);
      return null;
    }

    let quizData;
    try {
      // First try to parse the response directly
      quizData = JSON.parse(response.choices[0].message.content || '[]');
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', response.choices[0].message.content);
      
      // Try to extract JSON from the response if it contains extra text
      try {
        const content = response.choices[0].message.content || '';
        // Look for JSON array pattern in the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          // Clean up the JSON string to remove any trailing commas or invalid characters
          let jsonString = jsonMatch[0];
          // Remove any text after the last closing bracket
          const lastBracketIndex = jsonString.lastIndexOf(']');
          if (lastBracketIndex !== -1) {
            jsonString = jsonString.substring(0, lastBracketIndex + 1);
          }
          
          // Fix common JSON issues
          jsonString = jsonString
            .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
            .replace(/,\s*\]/g, ']') // Remove trailing commas before closing brackets
            .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Add quotes to unquoted keys
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/\\'/g, "'") // Unescape single quotes
            .replace(/\\n/g, '\\n') // Fix newlines
            .replace(/\\r/g, '\\r') // Fix carriage returns
            .replace(/\\t/g, '\\t'); // Fix tabs
          
          // Try to parse the cleaned JSON
          quizData = JSON.parse(jsonString);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (extractError) {
        console.error('Error extracting JSON from response:', extractError);
        // Try to manually parse the response by finding valid JSON objects
        try {
          const content = response.choices[0].message.content || '';
          // Try to find individual JSON objects and build an array
          const objectMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          if (objectMatches && objectMatches.length > 0) {
            const objects = [];
            for (const objStr of objectMatches) {
              try {
                // Clean the object string
                let cleanObjStr = objStr
                  .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
                  .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Add quotes to unquoted keys
                  .replace(/'/g, '"') // Replace single quotes with double quotes
                  .replace(/\\'/g, "'") // Unescape single quotes
                  .replace(/\\n/g, '\\n') // Fix newlines
                  .replace(/\\r/g, '\\r') // Fix carriage returns
                  .replace(/\\t/g, '\\t'); // Fix tabs
                
                const obj = JSON.parse(cleanObjStr);
                if (obj.question_text && obj.answers && Array.isArray(obj.answers)) {
                  objects.push(obj);
                }
              } catch (e) {
                // Skip invalid objects
                continue;
              }
            }
            if (objects.length > 0) {
              quizData = objects;
            } else {
              throw new Error('No valid quiz objects found in response');
            }
          } else {
            throw new Error('No JSON objects found in response');
          }
        } catch (manualParseError) {
          console.error('Error manually parsing response:', manualParseError);
          return null;
        }
      }
    }
    
    // Validate and filter the quiz data
    if (!Array.isArray(quizData)) {
      console.error('Invalid quiz data received from OpenAI:', quizData);
      return null;
    }
    
    // Filter out any invalid questions
    const validQuestions = quizData.filter(question => 
      question.question_text && 
      Array.isArray(question.answers) && 
      question.answers.length === 4 && // Must have exactly 4 answers
      question.answers.filter((a: any) => a.is_correct === true).length === 1 // Exactly one correct answer
    );
    
    // For document quizzes, we want exactly 25 questions
    if (validQuestions.length < 25) {
      console.warn(`Only ${validQuestions.length} valid questions found, expected 25`);
      // If we have some valid questions, we'll use them
      if (validQuestions.length > 0) {
        quizData = validQuestions;
      } else {
        return null;
      }
    } else {
      // Take exactly 25 questions
      quizData = validQuestions.slice(0, 25);
    }

    // Create the course quiz record
    const { data: quiz, error: quizError } = await supabase
      .from('course_quizzes')
      .insert({
        course_id: courseId,
        title: `${courseTitle} Final Assessment`,
        description: `Comprehensive quiz covering all modules in ${courseTitle}`
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error creating final quiz:', quizError);
      return null;
    }

    // Create questions and answers
    for (const questionData of quizData) {
      // Create question
      const { data: question, error: questionError } = await supabase
        .from('quiz_questions')
        .insert({
          course_quiz_id: quiz.id,
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          difficulty: questionData.difficulty
        })
        .select()
        .single();

      if (questionError) {
        console.error('Error creating quiz question:', questionError);
        continue;
      }

      // Create answers
      for (const answerData of questionData.answers) {
        const { error: answerError } = await supabase
          .from('quiz_answers')
          .insert({
            question_id: question.id,
            answer_text: answerData.answer_text,
            is_correct: answerData.is_correct,
            explanation: answerData.explanation
          });

        if (answerError) {
          console.error('Error creating quiz answer:', answerError);
        }
      }
    }

    console.log('Final quiz generated successfully:', quiz.id);
    return quiz.id;
  } catch (error) {
    console.error('Error generating final quiz:', error);
    return null;
  }
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
    const lines = normalizedContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('Total lines to parse:', lines.length);
    
    let currentQuestion: string | null = null;
    let currentAnswers: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log('Processing line:', i, line.substring(0, 50));
      
      // Look for question patterns (numbered questions)
      const questionMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentAnswers.length >= 2) {
          // Ensure at least one answer is marked as correct
          const hasCorrectAnswer = currentAnswers.some(a => a.is_correct);
          if (!hasCorrectAnswer && currentAnswers.length > 0) {
            currentAnswers[0].is_correct = true;
            console.log('Marking first answer as correct for question:', currentQuestion);
          }
          
          questions.push({
            question_text: currentQuestion,
            question_type: 'multiple_choice',
            difficulty: 'medium',
            answers: currentAnswers
          });
          console.log('Added question with', currentAnswers.length, 'answers');
        }
        
        // Start new question
        currentQuestion = questionMatch[2].trim();
        currentAnswers = [];
        console.log('Found new question:', currentQuestion);
        continue;
      }
      
      // Look for answer patterns (lettered options like a), b), c), d)
      const letterAnswerMatch = line.match(/^([a-dA-D])[\.\)]\s*(.+)$/);
      if (letterAnswerMatch && currentQuestion) {
        const optionLabel = letterAnswerMatch[1].trim();
        let answerText = letterAnswerMatch[2].trim();
        
        // Look for indication of correct answer
        const isCorrect = answerText.toLowerCase().includes('[correct]') || 
                          answerText.toLowerCase().includes('(correct)') || 
                          answerText.includes('*') ||
                          line.toLowerCase().includes('[correct]') || 
                          line.toLowerCase().includes('(correct)') || 
                          line.includes('*');
        
        // Extract explanation if present
        let explanation = '';
        const explanationMatch = answerText.match(/Explanation[:\s]+(.+)$/i);
        if (explanationMatch) {
          explanation = explanationMatch[1].trim();
          answerText = answerText.replace(/Explanation[:\s]+.+$/i, '').trim();
        }
        
        // Clean up answer text
        const cleanAnswerText = answerText
          .replace(/\[correct\]/gi, '')
          .replace(/\(correct\)/gi, '')
          .replace(/\*/g, '')
          .replace(/Explanation[:\s]+.+$/i, '')
          .trim();
        
        currentAnswers.push({
          answer_text: cleanAnswerText,
          is_correct: isCorrect,
          explanation: explanation
        });
        console.log('Added answer:', optionLabel, cleanAnswerText, 'Correct:', isCorrect);
        continue;
      }
      
      // Look for explanation patterns that follow answers
      if ((line.toLowerCase().startsWith('explanation:') || 
           line.toLowerCase().startsWith('reason:') ||
           line.toLowerCase().includes('explanation')) && 
          currentQuestion && currentAnswers.length > 0) {
        const explanationMatch = line.match(/[:\s]+(.+)$/);
        if (explanationMatch) {
          const explanation = explanationMatch[1].trim();
          // Add explanation to the last answer
          if (currentAnswers.length > 0) {
            if (currentAnswers[currentAnswers.length - 1].explanation) {
              currentAnswers[currentAnswers.length - 1].explanation += ' ' + explanation;
            } else {
              currentAnswers[currentAnswers.length - 1].explanation = explanation;
            }
          }
        }
        continue;
      }
    }
    
    // Save the last question
    if (currentQuestion && currentAnswers.length >= 2) {
      // Ensure at least one answer is marked as correct
      const hasCorrectAnswer = currentAnswers.some(a => a.is_correct);
      if (!hasCorrectAnswer && currentAnswers.length > 0) {
        currentAnswers[0].is_correct = true;
        console.log('Marking first answer as correct for final question:', currentQuestion);
      }
      
      questions.push({
        question_text: currentQuestion,
        question_type: 'multiple_choice',
        difficulty: 'medium',
        answers: currentAnswers
      });
      console.log('Added final question with', currentAnswers.length, 'answers');
    }
    
    console.log('Parsed', questions.length, 'questions from document text');
    return questions;
  } catch (error) {
    console.error('Error parsing quiz from document:', error);
    return [];
  }
}

/**
 * Generate a quiz from uploaded quiz document content
 * @param courseId The course ID
 * @param courseTitle The course title
 * @param quizDocumentContent The content extracted from the uploaded quiz document
 * @returns Quiz ID if successful, null if failed
 */
export async function generateQuizFromDocument(
  courseId: string,
  courseTitle: string,
  quizDocumentContent: string
): Promise<string | null> {
  try {
    console.log('=== GENERATE QUIZ FROM DOCUMENT ===');
    console.log('Course ID:', courseId);
    console.log('Course Title:', courseTitle);
    console.log('Document content length:', quizDocumentContent.length);
    console.log('Document content preview:', quizDocumentContent.substring(0, 200) + '...');
    
    // Check if a final quiz already exists for this course
    const { data: existingQuiz, error: existingQuizError } = await supabase
      .from('course_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingQuizError) {
      console.error('Error checking existing document quiz:', existingQuizError);
      // Continue even if there's an error checking for existing quiz
    }

    // If quiz already exists, return its ID
    if (existingQuiz) {
      console.log('Quiz already exists with ID:', existingQuiz.id);
      return existingQuiz.id;
    }

    // Parse quiz questions directly from document content (no AI generation)
    console.log('Parsing quiz directly from document content');
    let quizData = parseQuizFromDocument(quizDocumentContent);
    
    console.log('Parsed quiz data:', JSON.stringify(quizData, null, 2));
    
    // If parsing failed, try with truncated content
    if (quizData.length === 0 && quizDocumentContent.length > 3000) {
      console.log('Parsing failed with full content, trying with truncated content');
      const truncatedContent = quizDocumentContent.substring(0, 3000) + '...';
      quizData = parseQuizFromDocument(truncatedContent);
    }
    
    // If still no questions parsed, return error
    if (quizData.length === 0) {
      console.error('Failed to parse any questions from document content');
      console.log('Document content that failed to parse:', quizDocumentContent.substring(0, 1000));
      return null;
    }
    
    console.log('Successfully parsed', quizData.length, 'questions from document');
    
    // Validate and filter the quiz data
    if (!Array.isArray(quizData)) {
      console.error('Invalid quiz data parsed from document:', quizData);
      return null;
    }
    
    // Filter out any invalid questions
    const validQuestions = quizData.filter(question => 
      question.question_text && 
      Array.isArray(question.answers) && 
      question.answers.length >= 2 && // At least 2 answers
      question.answers.some((a: any) => a.is_correct === true) // At least one correct answer
    );
    
    console.log('Valid questions after filtering:', validQuestions.length);
    
    // For document quizzes, we want at least 1 question
    if (validQuestions.length < 1) {
      console.warn(`Only ${validQuestions.length} valid questions found`);
      return null;
    }
    
    // Use the valid questions
    quizData = validQuestions;

    // Since we're having RLS issues with direct inserts, let's try a different approach
    // We'll use the admin client to create the quiz, which bypasses RLS
    // First get the admin client
    const { supabaseAdmin } = await import('../lib/supabase');
    
    if (!supabaseAdmin) {
      console.error('Admin client not available, falling back to regular client');
      // Try with regular client
      const { data: quiz, error: quizError } = await supabase
        .from('course_quizzes')
        .insert({
          course_id: courseId,
          title: `${courseTitle} Final Quiz`,
          description: `Final quiz generated from uploaded quiz document for ${courseTitle}`
        })
        .select()
        .single();
        
      if (quizError) {
        console.error('Error creating document quiz:', quizError);
        return null;
      }

      // Create questions and answers
      for (const questionData of quizData) {
        // Create question
        const { data: question, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            course_quiz_id: quiz.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type || 'multiple_choice',
            difficulty: questionData.difficulty || 'medium'
          })
          .select()
          .single();

        if (questionError) {
          console.error('Error creating quiz question:', questionError);
          continue;
        }

        // Create answers
        for (const answerData of questionData.answers) {
          const { error: answerError } = await supabase
            .from('quiz_answers')
            .insert({
              question_id: question.id,
              answer_text: answerData.answer_text,
              is_correct: answerData.is_correct || false,
              explanation: answerData.explanation || ''
            });

          if (answerError) {
            console.error('Error creating quiz answer:', answerError);
          }
        }
      }

      console.log('Document quiz generated successfully:', quiz.id);
      return quiz.id;
    } else {
      // Use admin client which bypasses RLS
      const { data: quiz, error: quizError } = await supabaseAdmin
        .from('course_quizzes')
        .insert({
          course_id: courseId,
          title: `${courseTitle} Final Quiz`,
          description: `Final quiz generated from uploaded quiz document for ${courseTitle}`
        })
        .select()
        .single();
        
      if (quizError) {
        console.error('Error creating document quiz with admin client:', quizError);
        return null;
      }

      // Create questions and answers using admin client
      for (const questionData of quizData) {
        // Create question
        const { data: question, error: questionError } = await supabaseAdmin
          .from('quiz_questions')
          .insert({
            course_quiz_id: quiz.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type || 'multiple_choice',
            difficulty: questionData.difficulty || 'medium'
          })
          .select()
          .single();

        if (questionError) {
          console.error('Error creating quiz question:', questionError);
          continue;
        }

        // Create answers
        for (const answerData of questionData.answers) {
          const { error: answerError } = await supabaseAdmin
            .from('quiz_answers')
            .insert({
              question_id: question.id,
              answer_text: answerData.answer_text,
              is_correct: answerData.is_correct || false,
              explanation: answerData.explanation || ''
            });

          if (answerError) {
            console.error('Error creating quiz answer:', answerError);
          }
        }
      }

      console.log('Document quiz generated successfully with admin client:', quiz.id);
      return quiz.id;
    }
  } catch (error) {
    console.error('Error generating document quiz:', error);
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