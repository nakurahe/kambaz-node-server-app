/**
 * Transforms LLM-generated quiz JSON to Kambaz Quiz/Questions schema
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Transform pipeline output to Kambaz Quiz format
 * @param {Object} pipelineQuiz - Quiz JSON from run_pipeline.py
 * @param {string} courseId - Course ID
 * @param {Object} options - Additional options
 * @returns {Object} Kambaz quiz object
 */
export function transformToKambazQuiz(pipelineQuiz, courseId, options = {}) {
    const metadata = pipelineQuiz.quiz_metadata || {};
    
    // Calculate total points (1 point per question by default)
    const questions = pipelineQuiz.questions || [];
    const totalPoints = questions.length;
    
    return {
        _id: uuidv4(),
        title: metadata.title || options.title || "Auto-Generated Quiz",
        course: courseId,
        description: metadata.description || "Quiz automatically generated from video content",
        quizType: "Graded Quiz",
        points: totalPoints,
        assignmentGroup: "Quizzes",
        shuffleAnswers: true,
        timeLimit: metadata.estimated_time_minutes || Math.max(20, questions.length * 2),
        multipleAttempts: false,
        howManyAttempts: 1,
        showCorrectAnswers: true,
        accessCode: "",
        oneQuestionAtATime: true,
        webcamRequired: false,
        lockQuestionsAfterAnswering: false,
        dueDate: options.dueDate || null,
        availableFrom: options.availableFrom || new Date(),
        availableUntil: options.availableUntil || null,
        published: false // Start unpublished so instructor can review
    };
}

/**
 * Transform pipeline questions to Kambaz Questions format
 * @param {Object} pipelineQuiz - Quiz JSON from run_pipeline.py
 * @param {string} quizId - The Kambaz quiz ID
 * @returns {Array} Array of Kambaz question objects
 */
export function transformToKambazQuestions(pipelineQuiz, quizId) {
    const questions = pipelineQuiz.questions || [];
    
    return questions.map((q, index) => {
        // Extract answer texts from options
        const options = q.options || [];
        const answers = options.map(opt => opt.text);
        
        // Find correct answer index
        const correctAnswerLetter = q.correct_answer; // e.g., "A", "B", "C", "D"
        const correctIndex = correctAnswerLetter ? 
            correctAnswerLetter.charCodeAt(0) - 'A'.charCodeAt(0) : 0;
        
        return {
            _id: uuidv4(),
            quiz: quizId,
            questionType: "MultipleChoice",
            title: q.topic,
            questionDescription: q.question_text,
            points: 1,
            answers: answers,
            correctAnswers: [correctIndex],
            // Store additional metadata for reference
            metadata: {
                explanation: q.explanation,
                difficulty: q.difficulty,
                topic: q.topic,
                reference: q.reference,
                originalQuestionNumber: q.question_number
            }
        };
    });
}

/**
 * Full transformation from pipeline output to Kambaz format
 * @param {Object} pipelineQuiz - Quiz JSON from run_pipeline.py
 * @param {string} courseId - Course ID
 * @param {Object} options - Additional options
 * @returns {Object} { quiz, questions }
 */
export function transformPipelineOutput(pipelineQuiz, courseId, options = {}) {
    const quiz = transformToKambazQuiz(pipelineQuiz, courseId, options);
    const questions = transformToKambazQuestions(pipelineQuiz, quiz._id);
    
    return { quiz, questions };
}
