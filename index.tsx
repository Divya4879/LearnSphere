import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Type } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


type View = 'learning' | 'planner';
type ContentType = 'Explanation' | 'Study Notes' | 'Flashcards' | 'Interactive Quiz' | 'Real-World Examples' | 'Case Studies' | 'Mindmap' | 'In-depth Explanation' | 'Overview' | 'Key Takeaways' | 'Simple Explanation';
type LearningFlowStep = 'profile' | 'syllabus' | 'topic' | 'generate' | 'result';
type AcademicLevel = 'Primary School' | 'Secondary School' | 'High School' | 'College' | 'University' | 'Bachelor' | 'Master' | 'PhD' | 'Researcher' | 'Other';
type QuizType = 'mcq_single' | 'mcq_multiple' | 'subjective_short';
type ContentSource = 'ai_knowledge' | 'pdf_upload' | 'url';
type QuizQuestion = {
    question: string;
    options?: string[]; // Optional for subjective
    answer: string[]; // Array for multiple choice
    type: QuizType;
    explanation: string;
};
type Quiz = {
    title: string;
    questions: QuizQuestion[];
    swotAnalysis: string;
};

type Syllabus = {
    unit: string;
    topics: string[];
}[];
type TopicSelection = {
    unit: string | null;
    topics: string[];
};

type Flashcard = { question: string; answer: string; };
type StudyPlan = { day: number; topic: string; task: string; };
type GroundingChunk = { web?: { uri?: string; title?: string; } };


const App: React.FC = () => {
    const [view, setView] = useState<View>('learning');

    return (
        <div style={styles.appContainer}>
            <Nav onNavClick={setView} />
            <div style={styles.container}>
                 {view === 'learning' && <MainContent />}
                 {view === 'planner' && <StudyPlanner />}
            </div>
        </div>
    );
};

const Nav: React.FC<{ onNavClick: (view: View) => void }> = ({ onNavClick }) => {
    return (
        <nav style={styles.nav}>
            <span style={styles.navTitle} onClick={() => onNavClick('learning')} >LearnSphere AI</span>
            <div>
                <button style={styles.navButton} onClick={() => onNavClick('learning')}>Start Learning</button>
                <button style={styles.navButton} onClick={() => onNavClick('planner')}>Create Study Plan</button>
            </div>
        </nav>
    );
};


const MainContent: React.FC = () => {
    // Overall App State
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    // Learning Flow State
    const [flowStep, setFlowStep] = useState<LearningFlowStep>('profile');
    
    // Step 1: Profile
    const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('University');
    const [customAcademicLevel, setCustomAcademicLevel] = useState('');
    const [specialization, setSpecialization] = useState('');

    // Step 2: Syllabus
    const [subject, setSubject] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [syllabus, setSyllabus] = useState<Syllabus | null>(null);

    // Step 3: Topic Selection
    const [topicSelection, setTopicSelection] = useState<TopicSelection>({ unit: null, topics: [] });

    // Step 4: Generate
    const [contentType, setContentType] = useState<ContentType>('In-depth Explanation');
    const [contentSource, setContentSource] = useState<ContentSource>('ai_knowledge');
    const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState('');
    
    // Step 5: Result
    const [result, setResult] = useState<any>(null);
    const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[] | null>(null);
    const [quizContent, setQuizContent] = useState<Quiz | null>(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Get API client from window
    const api = (window as any).LearnSphereAPI;

    const resetFlow = () => {
        setFlowStep('profile');
        setAcademicLevel('University');
        setCustomAcademicLevel('');
        setSpecialization('');
        setSubject('');
        setSyllabus(null);
        setTopicSelection({ unit: null, topics: [] });
        setContentType('In-depth Explanation');
        setContentSource('ai_knowledge');
        setUploadedPdf(null);
        setSourceUrl('');
        setResult(null);
        setGroundingChunks(null);
        setQuizContent(null);
        setError('');
        setIsLoading(false);
        setIsExtracting(false);
    };
    
    const handleSyllabusExtract = async (file: File) => {
        if (!api) {
            setError('API client not available');
            return;
        }
        setIsExtracting(true);
        setError('');
        try {
            const base64Image = await fileToBase64(file);
            const syllabusSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        unit: { type: Type.STRING, description: "The name of the unit or chapter." },
                        topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of topics within this unit." }
                    },
                    required: ['unit', 'topics']
                }
            };
            const prompt = { parts: [ { inlineData: { mimeType: file.type, data: base64Image } }, { text: "Extract the units and topics from this syllabus image. Structure the output as a clean JSON array." }] };
            const response = await api.generateContent('gemini-2.5-flash', prompt, { responseMimeType: "application/json", responseSchema: syllabusSchema });
            const extracted = JSON.parse(response.text.trim());
            setSyllabus(extracted);
        } catch (e: any) {
            setError(`Failed to extract from syllabus. Please try again or enter topics manually. Error: ${e.message}`);
            setSyllabus(null); // Clear partial results
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGenerateContent = async (newContentType?: ContentType, iterationFeedback?: string) => {
        if (!api) { 
            setError('API client not available'); 
            return; 
        }
        
        const currentContentType = newContentType || contentType;

        setIsLoading(true);
        setError('');
        if (!iterationFeedback) { // only clear results if it's a new generation
            setResult(null);
            setGroundingChunks(null);
            setQuizContent(null);
        }
        
        try {
            const finalAcademicLevel = academicLevel === 'Other' ? customAcademicLevel : academicLevel;
            const selectionText = topicSelection.unit ? `the unit "${topicSelection.unit}"` : `the topics: ${topicSelection.topics.join(', ')}`;
            const basePrompt = `You are an expert educator creating content for a "${finalAcademicLevel}" student specializing in "${specialization}" for the subject "${subject}".`;
            const taskInstruction = getTaskInstruction(currentContentType, subject, selectionText);

            // Handle Mindmap (Image Generation) separately
            if (currentContentType === 'Mindmap') {
                setError('Mindmap generation is not available in this version. Please select another content type.');
                setIsLoading(false);
                return;
            } 
                Use a clean font and a professional, aesthetic color palette suitable for learning. 
                Ensure there is enough space between elements to avoid overcrowding. Do not include any text that is not part of the mindmap itself.`;

                const imageResponse = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: mindmapPrompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: '16:9'
                    }
                });
                if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                    setResult(imageResponse.generatedImages[0].image.imageBytes);
                    setContentType(currentContentType);
                    setFlowStep('result');
                } else {
                    throw new Error("Mindmap image could not be generated.");
                }
                return; // End execution here for mindmap
            
            let contents: any = '';
            const config: any = {};

            if (iterationFeedback) {
                 contents = `You are an AI assistant helping a student refine educational content.
                The student is studying "${subject}".
                Here is the ORIGINAL CONTENT they were given:\n---\n${result}\n---\n
                The student has the following feedback/request for alteration:\n---\n${iterationFeedback}\n---\n
                Please regenerate the content, incorporating the student's feedback. Output only the new, refined content.`;
            } else if (contentSource === 'pdf_upload') {
                if (!uploadedPdf) {
                    setError('Please upload a PDF file to use as a source.');
                    setIsLoading(false);
                    return;
                }
                const base64Pdf = await fileToBase64(uploadedPdf);
                contents = { parts: [
                    { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                    { text: `Based on the content of the attached PDF file ("${uploadedPdf.name}"), ${taskInstruction}` }
                ]};
            } else if (contentSource === 'url') {
                if (!sourceUrl.trim()) {
                    setError('Please enter a URL to use as a source.');
                    setIsLoading(false);
                    return;
                }
                config.tools = [{googleSearch: {}}];
                contents = `Using Google Search to access information from the specific URL: ${sourceUrl}, ${basePrompt} ${taskInstruction}`;
            } else { // 'ai_knowledge'
                contents = `${basePrompt} Based on their syllabus topics, please generate content for ${selectionText}. ${taskInstruction}`;
            }
            
            if (currentContentType === 'Flashcards') {
                 config.responseMimeType = "application/json";
                 config.responseSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }}, required: ['question', 'answer'] }};
            }

            const response = await api.generateContent("gemini-2.5-flash", contents, config);
            
            setGroundingChunks(response.groundingMetadata?.groundingChunks || null);
            
            const text = response.text.trim();
             if (currentContentType === 'Flashcards') {
                const jsonData = JSON.parse(text);
                setResult(jsonData);
            } else {
                setResult(text);
            }
            setContentType(currentContentType);
            setFlowStep('result');
        } catch (e: any) {
            setError(`An error occurred: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
            } else {
                setResult(text);
            }
            setContentType(currentContentType);
            setFlowStep('result');
        } catch (e: any) {
            setError(`An error occurred: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateQuiz = async (quizType: QuizType) => {
        if (!api || !result) { return; }
        setIsGeneratingQuiz(true);
        setError('');
        setQuizContent(null);
        try {
            const contextText = typeof result === 'string' ? result.substring(0, 8000) : JSON.stringify(result).substring(0, 8000); // Truncate for context
            const selectionText = topicSelection.unit ? `the unit "${topicSelection.unit}"` : `the topics: ${topicSelection.topics.join(', ')}`;
            
            let typeInstruction = '';
            let optionsInstruction = '';
            switch (quizType) {
                case 'mcq_single': 
                    typeInstruction = 'single-choice multiple choice questions. Each question must have exactly one correct answer.'; 
                    optionsInstruction = "For each question, you MUST provide an 'options' array containing 4 plausible string options.";
                    break;
                case 'mcq_multiple': 
                    typeInstruction = 'multiple-choice questions where some questions can have more than one correct answer.'; 
                    optionsInstruction = "For each question, you MUST provide an 'options' array containing 4-5 plausible string options.";
                    break;
                case 'subjective_short': 
                    typeInstruction = 'short subjective answer questions. The answer should be a concise phrase or sentence.'; 
                    optionsInstruction = "For this type, the 'options' field should be omitted.";
                    break;
            }

            const prompt = `Based on the following content for the subject "${subject}" on ${selectionText}, generate a quiz.
            The quiz should contain 5-7 challenging questions.
            The question type is: ${typeInstruction}.
            ${optionsInstruction}
            For each question, provide a detailed explanation for the correct answer.
            The 'answer' field in the JSON response must always be an array of strings, even if there is only one correct answer.
            After the quiz, provide a comprehensive SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for a student based on potential performance on this quiz.
            --- CONTENT ---
            ${contextText}
            --- END CONTENT ---`;

            const quizSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                answer: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The correct answer(s). Always an array, even for single or subjective answers." },
                                type: { type: Type.STRING, enum: ['mcq_single', 'mcq_multiple', 'subjective_short'] },
                                explanation: { type: Type.STRING }
                            },
                            required: ['question', 'answer', 'type', 'explanation']
                        }
                    },
                    swotAnalysis: { type: Type.STRING }
                },
                required: ['title', 'questions', 'swotAnalysis']
            };

            const response = await api.generateContent("gemini-2.5-flash", prompt, { responseMimeType: "application/json", responseSchema: quizSchema });
            const quizData = JSON.parse(response.text.trim());
            setQuizContent(quizData);

        } catch (e: any) {
            setError(`Failed to generate quiz: ${e.message}`);
        } finally {
            setIsGeneratingQuiz(false);
        }
    };
    
    const downloadPdf = async () => {
        if (!contentRef.current) return;
        const canvas = await html2canvas(contentRef.current, { backgroundColor: '#1a1a2d', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        let newImgHeight = pdfWidth / ratio;
        let heightLeft = newImgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, newImgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = -newImgHeight + heightLeft;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, newImgHeight);
            heightLeft -= pdfHeight;
        }
        
        const filename = sanitizeFilename(`${subject}_${topicSelection.unit || topicSelection.topics.join('_')}_${contentType}`);
        pdf.save(`${filename}.pdf`);
    };

    const renderCurrentStep = () => {
        if (error) {
            return <div style={styles.errorContainer}><p style={styles.error}>{error}</p><button style={styles.actionButton} onClick={resetFlow}>Start Over</button></div>;
        }

        switch(flowStep) {
            case 'profile':
                return <ProfileStep setAcademicLevel={setAcademicLevel} setCustomAcademicLevel={setCustomAcademicLevel} setSpecialization={setSpecialization} academicLevel={academicLevel} customAcademicLevel={customAcademicLevel} specialization={specialization} onNext={() => setFlowStep('syllabus')} />;
            case 'syllabus':
                return <SyllabusStep subject={subject} setSubject={setSubject} isExtracting={isExtracting} onExtract={handleSyllabusExtract} onNext={() => setFlowStep('topic')} syllabusLoaded={!!syllabus} />;
            case 'topic':
                if (!syllabus) return <p>Syllabus data is missing. Please go back.</p>;
                return <TopicSelectionStep syllabus={syllabus} selection={topicSelection} setSelection={setTopicSelection} onNext={() => setFlowStep('generate')} />;
            case 'generate':
                return <GenerateStep 
                            contentType={contentType} setContentType={setContentType} 
                            onGenerate={() => handleGenerateContent()} 
                            isLoading={isLoading} 
                            contentSource={contentSource} setContentSource={setContentSource} 
                            uploadedPdf={uploadedPdf} setUploadedPdf={setUploadedPdf}
                            sourceUrl={sourceUrl} setSourceUrl={setSourceUrl}
                       />;
            case 'result':
                return <ResultView 
                            result={result} 
                            contentType={contentType} 
                            groundingChunks={groundingChunks} 
                            onDownloadPdf={downloadPdf} 
                            contentRef={contentRef}
                            subject={subject}
                            topicSelection={topicSelection}
                            onGenerateQuiz={handleGenerateQuiz}
                            isGeneratingQuiz={isGeneratingQuiz}
                            quizContent={quizContent}
                            setQuizContent={setQuizContent}
                            onRefineContentType={handleGenerateContent}
                            onChangeTopics={() => setFlowStep('topic')}
                            onChangeSubject={() => setFlowStep('syllabus')}
                            onIterate={handleGenerateContent}
                            isLoading={isLoading}
                       />;
            default:
                return <p>Something went wrong.</p>
        }
    };

    return (
        <main style={styles.main}>
             <h1 style={styles.title}>LearnSphere AI Learning Studio</h1>
             <p style={styles.subtitle}>{flowStep !== 'result' ? "Your personalized learning journey starts here." : "Here is your generated content."}</p>
             {flowStep !== 'profile' && flowStep !== 'result' && <button onClick={() => setFlowStep(prev => prev === 'syllabus' ? 'profile' : prev === 'topic' ? 'syllabus' : 'topic')} style={styles.backButton}>&larr; Back</button>}
             {flowStep === 'result' && <button onClick={resetFlow} style={styles.actionButton}>+ Start New Session</button>}
             {renderCurrentStep()}
        </main>
    );
};

// --- WIZARD STEP COMPONENTS ---

const ProfileStep = ({ academicLevel, customAcademicLevel, specialization, setAcademicLevel, setCustomAcademicLevel, setSpecialization, onNext }: any) => {
    const isNextDisabled = academicLevel === 'Other' && !customAcademicLevel.trim();
    return (
        <div style={styles.wizardStep}>
            <h2 style={styles.subheading}><span style={styles.stepNumber}>1</span>Tell us about yourself</h2>
            <label style={styles.label}>Your current or highest academic level:</label>
            <div style={styles.selectWrapper}>
                <select value={academicLevel} onChange={e => setAcademicLevel(e.target.value)} style={styles.select} aria-label="Select academic level">
                    {['Primary School', 'Secondary School', 'High School', 'College', 'University', 'Bachelor', 'Master', 'PhD', 'Researcher', 'Other'].map(level => <option key={level} value={level}>{level}</option>)}
                </select>
            </div>
            {academicLevel === 'Other' && <input type="text" value={customAcademicLevel} onChange={e => setCustomAcademicLevel(e.target.value)} placeholder="e.g., MCAT Prep, Self-Taught Developer" style={{...styles.input, marginTop: '1rem'}} aria-label="Custom academic level" />}
            
            {['College', 'University', 'Bachelor', 'Master', 'PhD', 'Researcher'].includes(academicLevel) && <>
                <label style={{...styles.label, marginTop: '1rem'}}>Degree or Specialization (Optional):</label>
                <input type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g., Computer Science, Renaissance Art" style={styles.input} aria-label="Degree or Specialization"/>
            </>}
            <button onClick={onNext} disabled={isNextDisabled} style={{...styles.generateButton, marginTop: '2rem'}}>Next &rarr;</button>
        </div>
    );
};

const SyllabusStep = ({ subject, setSubject, isExtracting, onExtract, onNext, syllabusLoaded }: any) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onExtract(file);
    };
    return (
        <div style={styles.wizardStep}>
            <h2 style={styles.subheading}><span style={styles.stepNumber}>2</span>Subject and Syllabus</h2>
            <label style={styles.label}>What is the subject?</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Introduction to Psychology" style={styles.input} />
            
            <label style={{...styles.label, marginTop: '1.5rem'}}>Upload your syllabus image:</label>
            <input type="file" id="syllabus-upload" accept="image/*" onChange={handleFileChange} style={styles.fileInput} disabled={isExtracting} />
            <label htmlFor="syllabus-upload" style={{...styles.uploadButton, ...(isExtracting ? { opacity: 0.6, cursor: 'wait' } : {})}} aria-label="Upload syllabus image">
                {isExtracting ? 'Analyzing Syllabus...' : syllabusLoaded ? '✔️ Syllabus Loaded!' : '📄 Choose Image'}
            </label>
            {isExtracting && <LoadingSpinner simple />}

            <button onClick={onNext} disabled={!syllabusLoaded || !subject.trim()} style={{...styles.generateButton, marginTop: '2rem'}}>Next &rarr;</button>
        </div>
    );
};

const TopicSelectionStep = ({ syllabus, selection, setSelection, onNext }: any) => {
    const handleUnitSelect = (unitName: string) => {
        if (selection.unit === unitName) {
            setSelection({ unit: null, topics: [] }); // Deselect
        } else {
            setSelection({ unit: unitName, topics: [] }); // Select unit, clear topics
        }
    };
    const handleTopicSelect = (topicName: string) => {
        const newTopics = selection.topics.includes(topicName)
            ? selection.topics.filter((t: string) => t !== topicName)
            : [...selection.topics, topicName];
        
        if (newTopics.length > 3) return; // Enforce max 3 topics

        setSelection({ unit: null, topics: newTopics }); // Select topic, clear unit
    };
    const isNextDisabled = !selection.unit && selection.topics.length === 0;

    return (
        <div style={styles.wizardStep}>
            <h2 style={styles.subheading}><span style={styles.stepNumber}>3</span>Select Your Focus</h2>
            <p style={styles.labelDescription}>Choose one entire unit OR up to three topics to study.</p>
            <div style={styles.topicSelectionContainer}>
                {syllabus.map(({ unit, topics }: { unit: string, topics: string[] }) => (
                    <div key={unit} style={styles.unitContainer}>
                        <div style={styles.checkboxContainer}>
                            <input type="checkbox" id={`unit-${unit}`} checked={selection.unit === unit} onChange={() => handleUnitSelect(unit)} />
                            <label htmlFor={`unit-${unit}`} style={styles.unitLabel}>{unit}</label>
                        </div>
                        <div style={styles.topicList}>
                            {topics.map(topic => (
                                <div key={topic} style={styles.checkboxContainer}>
                                    <input type="checkbox" id={`topic-${topic}`} checked={selection.topics.includes(topic)} onChange={() => handleTopicSelect(topic)} disabled={selection.topics.length >= 3 && !selection.topics.includes(topic)} />
                                    <label htmlFor={`topic-${topic}`}>{topic}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onNext} disabled={isNextDisabled} style={{...styles.generateButton, marginTop: '2rem'}}>Next &rarr;</button>
        </div>
    );
};

const GenerateStep = ({ contentType, setContentType, onGenerate, isLoading, contentSource, setContentSource, uploadedPdf, setUploadedPdf, sourceUrl, setSourceUrl }: any) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedPdf(file);
        }
    };
    
    return (
    <div style={styles.wizardStep}>
        <h2 style={styles.subheading}><span style={styles.stepNumber}>4</span>Choose Your Learning Method</h2>
        
        <label style={styles.label}>Content Source:</label>
        <p style={styles.labelDescription}>Where should the AI get its information from?</p>
        <div style={styles.selectWrapper}>
            <select value={contentSource} onChange={e => setContentSource(e.target.value)} style={styles.select}>
                 <option value="ai_knowledge">AI Knowledge (Default)</option>
                 <option value="pdf_upload">Upload PDF</option>
                 <option value="url">Online Resource (URL)</option>
            </select>
        </div>

        {contentSource === 'pdf_upload' && (
            <div style={{marginTop: '1rem'}}>
                <input type="file" id="source-upload" accept=".pdf" onChange={handleFileChange} style={styles.fileInput} />
                <label htmlFor="source-upload" style={styles.uploadButton} aria-label="Upload source PDF file">
                    {uploadedPdf ? `✔️ ${uploadedPdf.name}` : '📄 Choose PDF File'}
                </label>
            </div>
        )}

        {contentSource === 'url' && (
            <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} style={{...styles.input, marginTop: '1rem'}} placeholder="https://example.com/resource" />
        )}

        <label style={{...styles.label, marginTop: '1.5rem'}}>How do you want to learn this content?</label>
        <div style={styles.selectWrapper}>
            <select value={contentType} onChange={e => setContentType(e.target.value)} style={styles.select}>
                 <option value="In-depth Explanation">In-depth Explanation (Comprehensive)</option>
                 <option value="Simple Explanation">Simple Explanation (Easy to Understand)</option>
                 <option value="Mindmap">Mindmap (Visual Diagram)</option>
                 <option value="Overview">Overview (Quick Summary)</option>
                 <option value="Key Takeaways">Key Takeaways (Keywords & Points)</option>
                 <option value="Study Notes">Study Notes</option>
                 <option value="Flashcards">Flashcards</option>
                 <option value="Real-World Examples">Real-World Examples</option>
                 <option value="Case Studies">Case Studies</option>
            </select>
        </div>
        <button onClick={onGenerate} disabled={isLoading} style={{...styles.generateButton, marginTop: '2rem'}}>
             {isLoading ? 'Generating...' : '✨ Generate Content'}
        </button>
        {isLoading && <LoadingSpinner />}
    </div>
)};

// --- RESULT VIEW and SUBCOMPONENTS ---

const ResultView = ({ result, contentType, groundingChunks, onDownloadPdf, contentRef, subject, topicSelection, onGenerateQuiz, isGeneratingQuiz, quizContent, setQuizContent, onRefineContentType, onChangeTopics, onChangeSubject, onIterate, isLoading }: any) => {
    if (!result) return <p>No content generated.</p>;
    
    const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50);

    const downloadFlashcards = () => {
         const filename = sanitizeFilename(`${subject}_${topicSelection.unit || topicSelection.topics.join('_')}_Flashcards`);
         const csvContent = "data:text/csv;charset=utf-8," + "Question,Answer\n" + (result as Flashcard[]).map(fc => `"${fc.question.replace(/"/g, '""')}","${fc.answer.replace(/"/g, '""')}"`).join("\n");
         const link = document.createElement("a");
         link.setAttribute("href", encodeURI(csvContent));
         link.setAttribute("download", `${filename}.csv`);
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
    };
    
    const renderMainContent = () => {
         if (contentType === 'Flashcards' && Array.isArray(result)) {
            return <FlashcardView flashcards={result} />;
        }
        if (contentType === 'Mindmap' && typeof result === 'string') {
            return <MindmapView imageBase64={result} />;
        }
        if (typeof result === 'string') {
            return (
                 <div ref={contentRef}>
                     <FormattedContent content={result} />
                 </div>
            );
        }
        return <p>Unsupported content format.</p>;
    };

    return (
        <div style={styles.resultsContainer}>
             <RefineContent 
                currentType={contentType} 
                onRegenerate={onRefineContentType}
                onChangeTopics={onChangeTopics}
                onChangeSubject={onChangeSubject}
             />

            <div style={styles.resultActions}>
                {typeof result === 'string' && contentType !== 'Mindmap' && <button style={styles.actionButton} onClick={onDownloadPdf}>Download as PDF</button>}
                {contentType === 'Flashcards' && <button style={styles.actionButton} onClick={downloadFlashcards}>Download as CSV</button>}
            </div>

            {groundingChunks && groundingChunks.length > 0 && <GroundingSourceDisplay chunks={groundingChunks} />}
            
            {renderMainContent()}
            
            <IterateWithFeedback onIterate={onIterate} isLoading={isLoading} />

            <div style={styles.feynmanContainer}>
                 <FeynmanTechniqueModule originalContent={result} subject={subject} topicSelection={topicSelection} />
            </div>
            
             <div style={styles.quizSection}>
                <h3 style={styles.subheading}>Test Your Knowledge</h3>
                {quizContent ? (
                    <QuizRunner quiz={quizContent} onFinish={() => setQuizContent(null)} subject={subject} topicSelection={topicSelection} />
                ) : (
                    <QuizGenerator onGenerate={onGenerateQuiz} isLoading={isGeneratingQuiz} />
                )}
            </div>
        </div>
    );
};

const RefineContent = ({ currentType, onRegenerate, onChangeTopics, onChangeSubject }: any) => {
    const [selectedType, setSelectedType] = useState(currentType);

    const handleRegenerate = () => {
        onRegenerate(selectedType);
    };

    return (
        <div style={styles.refineContainer}>
            <h3 style={styles.refineTitle}>Refine Your Content</h3>
            <div style={styles.refineControls}>
                 <div style={{...styles.selectWrapper, flexGrow: 1}}>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={styles.select}>
                         <option value="In-depth Explanation">In-depth Explanation</option>
                         <option value="Simple Explanation">Simple Explanation</option>
                         <option value="Mindmap">Mindmap (Visual Diagram)</option>
                         <option value="Overview">Overview</option>
                         <option value="Key Takeaways">Key Takeaways</option>
                         <option value="Study Notes">Study Notes</option>
                         <option value="Flashcards">Flashcards</option>
                         <option value="Real-World Examples">Real-World Examples</option>
                         <option value="Case Studies">Case Studies</option>
                    </select>
                </div>
                <button onClick={handleRegenerate} style={styles.refineButton}>🔄 Regenerate</button>
                <button onClick={onChangeTopics} style={styles.refineButton}>📝 Change Topics</button>
                <button onClick={onChangeSubject} style={styles.refineButton}>📚 Change Subject</button>
            </div>
        </div>
    );
};

const IterateWithFeedback = ({ onIterate, isLoading }: any) => {
    const [feedback, setFeedback] = useState('');

    const handleRefine = () => {
        if (!feedback.trim()) return;
        onIterate(undefined, feedback);
        setFeedback('');
    };

    return (
        <div style={styles.iterateContainer}>
            <h3 style={styles.subheading}>Iterate with Feedback</h3>
            <p>Not quite right? Tell the AI what to change.</p>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} style={styles.feynmanTextarea} placeholder="e.g., 'Explain this more simply' or 'Add more detail about the history of this topic'..." rows={4} />
            <button onClick={handleRefine} disabled={isLoading} style={styles.actionButton}>
                {isLoading ? 'Refining...' : 'Refine Content'}
            </button>
        </div>
    );
};


const FormattedContent: React.FC<{ content: string }> = ({ content }) => {
    const formatLine = (line: string) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return { __html: line };
    };

    const formatted = useMemo(() => {
        const lines = content.split('\n');
        const elements: JSX.Element[] = [];
        let listType: 'ul' | 'ol' | null = null;
        let listItems: string[] = [];
        let isCodeBlock = false;
        let codeContent = '';

        const closeList = () => {
            if (listType && listItems.length > 0) {
                const ListTag = listType;
                elements.push(<ListTag key={`list-${elements.length}`} style={styles.list}>{listItems.map((item, i) => <li key={i} style={styles.listItem} dangerouslySetInnerHTML={formatLine(item)} />)}</ListTag>);
                listItems = [];
                listType = null;
            }
        };

        const closeCodeBlock = () => {
            if (isCodeBlock) {
                 elements.push(<pre key={`pre-${elements.length}`} style={styles.codeBlock}><code>{codeContent}</code></pre>);
                 codeContent = '';
                 isCodeBlock = false;
            }
        }
        
        lines.forEach((line, index) => {
            if (line.trim().startsWith('```')) {
                if (isCodeBlock) {
                    closeCodeBlock();
                } else {
                    closeList();
                    isCodeBlock = true;
                }
                return;
            }
            if (isCodeBlock) {
                codeContent += line + '\n';
                return;
            }

            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('### ')) { closeList(); elements.push(<h3 key={index} style={styles.contentH3}>{trimmedLine.substring(4)}</h3>); }
            else if (trimmedLine.startsWith('## ')) { closeList(); elements.push(<h2 key={index} style={styles.contentH2}>{trimmedLine.substring(3)}</h2>); }
            else if (trimmedLine.startsWith('# ')) { closeList(); elements.push(<h1 key={index} style={styles.contentH1}>{trimmedLine.substring(2)}</h1>); }
            else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                if (listType !== 'ul') closeList();
                listType = 'ul';
                listItems.push(trimmedLine.substring(2));
            } else if (trimmedLine.match(/^\d+\.\s/)) {
                 if (listType !== 'ol') closeList();
                 listType = 'ol';
                 listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
            } else if (trimmedLine) {
                closeList();
                elements.push(<p key={index} style={styles.paragraph} dangerouslySetInnerHTML={formatLine(line)} />);
            }
        });
        closeList();
        closeCodeBlock();
        return elements;
    }, [content]);

    return <div>{formatted}</div>;
};

// --- UTILITY & HELPER COMPONENTS ---

const MindmapView: React.FC<{ imageBase64: string }> = ({ imageBase64 }) => {
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    const downloadMindmap = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'mindmap.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div style={styles.resultActions}>
                <button style={styles.actionButton} onClick={downloadMindmap}>Download as PNG</button>
            </div>
            <div style={styles.mindmapContainer}>
                <img src={imageUrl} alt="Generated Mindmap" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
            </div>
        </div>
    );
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const getTaskInstruction = (contentType: ContentType, subject: string, selection: string): string => {
    switch (contentType) {
        case 'In-depth Explanation': return `Generate a comprehensive, well-structured explanation of ${selection} suitable for an advanced student. It should be 2000-3000 words, using clear headings, subheadings, and paragraphs with markdown for formatting. Explain complex concepts thoroughly with examples.`;
        case 'Simple Explanation': return `Explain ${selection} in the simplest possible terms. Use analogies, real-world examples, and avoid jargon. The target audience is a complete beginner.`;
        case 'Mindmap': return `Create a mindmap for ${selection}.`; // Generic instruction for the image model prompt
        case 'Overview': return `Provide a captivating and high-level overview of ${selection}. It should be engaging and spark curiosity, highlighting the most interesting aspects and importance of the topic without getting bogged down in details.`;
        case 'Key Takeaways': return `Generate a list of key takeaways for ${selection}. This should include bullet points of critical facts, important keywords with definitions.`;
        case 'Study Notes': return `Generate concise study notes for ${selection}. Use bullet points, bold keywords, and a clear, organized structure. Focus on the most critical information a student needs to know for an exam.`;
        case 'Flashcards': return `Create a set of 10-15 flashcards for ${selection}. Each flashcard should have a clear 'question' and a concise 'answer'. The questions should test key concepts, definitions, and principles.`;
        case 'Real-World Examples': return `Provide several real-world examples or applications of ${selection}. Explain how these concepts are used in industry, technology, or everyday life.`;
        case 'Case Studies': return `Generate a short case study related to ${selection}. Present a problem, explain how the principles were applied, and what the outcome was.`;
        default: return `Please provide information on ${selection} for a student of "${subject}".`;
    }
};
const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 100);

const LoadingSpinner: React.FC<{simple?: boolean}> = ({ simple = false }) => (
    <div style={styles.spinnerContainer}>
        <div style={styles.spinner}></div>
        {!simple && <p>Your AI tutor is thinking...</p>}
    </div>
);
const GroundingSourceDisplay: React.FC<{ chunks: GroundingChunk[] }> = ({ chunks }) => (
    <div style={styles.groundingContainer}>
        <h4 style={styles.groundingTitle}>Sources from Google Search:</h4>
        <ul style={styles.groundingList}>
            {chunks.map((chunk, index) => (
                chunk.web && chunk.web.uri && <li key={index}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" style={styles.groundingLink}>{chunk.web.title || chunk.web.uri}</a></li>
            ))}
        </ul>
    </div>
);

// --- QUIZ COMPONENTS ---
const QuizGenerator = ({ onGenerate, isLoading }: any) => {
    const [quizType, setQuizType] = useState<QuizType>('mcq_single');
    return (
        <div style={styles.quizGenerator}>
            <p>Select a quiz type to test your understanding.</p>
            <div style={styles.selectWrapper}>
                <select value={quizType} onChange={e => setQuizType(e.target.value as QuizType)} style={styles.select}>
                    <option value="mcq_single">MCQ (Single Choice)</option>
                    <option value="mcq_multiple">MCQ (Multiple Choice)</option>
                    <option value="subjective_short">Short Answer</option>
                </select>
            </div>
            <button onClick={() => onGenerate(quizType)} disabled={isLoading} style={styles.actionButton}>
                {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
            </button>
        </div>
    )
};

const QuizRunner = ({ quiz, onFinish, subject, topicSelection }: { quiz: Quiz, onFinish: () => void, subject: string, topicSelection: TopicSelection }) => {
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string[] }>({});
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState<{ score: number; incorrectQuestions: QuizQuestion[] } | null>(null);
    const [personalizedSuggestions, setPersonalizedSuggestions] = useState('');
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const api = (window as any).LearnSphereAPI;

    const handleAnswerChange = (questionIndex: number, answer: string, isMultiChoice: boolean) => {
        setUserAnswers(prev => {
            const newAnswers = { ...prev };
            const currentAnswers = newAnswers[questionIndex] || [];
            if (isMultiChoice) {
                if (currentAnswers.includes(answer)) {
                    newAnswers[questionIndex] = currentAnswers.filter(a => a !== answer);
                } else {
                    newAnswers[questionIndex] = [...currentAnswers, answer];
                }
            } else {
                newAnswers[questionIndex] = [answer];
            }
            return newAnswers;
        });
    };

    const handleSubmit = async () => {
        let score = 0;
        const incorrectQuestions: QuizQuestion[] = [];
        quiz.questions.forEach((q, i) => {
            const correctAnswers = q.answer.sort();
            const givenAnswers = (userAnswers[i] || []).sort();
            if (JSON.stringify(correctAnswers) === JSON.stringify(givenAnswers)) {
                score++;
            } else {
                incorrectQuestions.push(q);
            }
        });
        setResults({ score, incorrectQuestions });
        setSubmitted(true);

        if (incorrectQuestions.length > 0 && ai) {
            setIsLoadingSuggestions(true);
            try {
                const selectionText = topicSelection.unit ? `the unit "${topicSelection.unit}"` : `the topics: ${topicSelection.topics.join(', ')}`;
                const incorrectPrompts = incorrectQuestions.map(q => `Question: ${q.question}\nCorrect Answer: ${q.answer.join(', ')}\nExplanation: ${q.explanation}`).join('\n\n');
                const prompt = `A student studying "${subject}" for ${selectionText} answered some quiz questions incorrectly. Based on their errors below, generate a "Personalized Study Suggestions" section. For each incorrect area, explain the core concept they might be missing and suggest 1-2 high-quality online resources (like a specific Wikipedia page, a university lecture video on YouTube, or a well-regarded tutorial article) to help them understand it better. Format this as markdown.\n\nINCORRECT QUESTIONS:\n${incorrectPrompts}`;
                const response = await api.generateContent("gemini-2.5-flash", prompt);
                setPersonalizedSuggestions(response.text);
            } catch (e) {
                setPersonalizedSuggestions("Could not generate personalized suggestions at this time.");
            } finally {
                setIsLoadingSuggestions(false);
            }
        }
    };

    if (submitted && results) {
        return (
            <div style={styles.quizContainer}>
                <h3 style={styles.subheading}>Quiz Results</h3>
                <h4 style={styles.quizScore}>Your Score: {results.score} / {quiz.questions.length} ({Math.round((results.score / quiz.questions.length) * 100)}%)</h4>
                <div style={styles.quizResultsBreakdown}>
                    {quiz.questions.map((q, i) => {
                        const isCorrect = !results.incorrectQuestions.includes(q);
                        const givenAnswer = (userAnswers[i] || ['No answer']).join(', ');
                        return (
                            <div key={i} style={{...styles.quizResultItem, borderColor: isCorrect ? '#50fa7b' : '#ff5555'}}>
                                <p><strong>{i + 1}. {q.question}</strong></p>
                                <p style={{color: isCorrect ? '#50fa7b' : '#ff5555' }}>Your Answer: {givenAnswer}</p>
                                {!isCorrect && <p style={{ color: '#50fa7b' }}>Correct Answer: {q.answer.join(', ')}</p>}
                                <p><em>Explanation:</em> {q.explanation}</p>
                            </div>
                        );
                    })}
                </div>
                 {personalizedSuggestions && (
                     <div style={styles.personalizedSuggestions}>
                         <h4 style={styles.subheading}>Personalized Study Suggestions</h4>
                         <FormattedContent content={personalizedSuggestions} />
                     </div>
                 )}
                {isLoadingSuggestions && <LoadingSpinner simple />}
                 <div style={styles.swotSection}>
                    <h4 style={styles.subheading}>SWOT Analysis</h4>
                    <FormattedContent content={quiz.swotAnalysis} />
                 </div>
                <button onClick={onFinish} style={{ ...styles.actionButton, marginTop: '1rem' }}>Finish & Close Quiz</button>
            </div>
        );
    }

    return (
        <div style={styles.quizContainer}>
            <h3 style={styles.quizQuestion}>{quiz.title}</h3>
            {quiz.questions.map((q, i) => (
                <div key={i} style={styles.quizQuestionBlock}>
                    <p><strong>{i + 1}. {q.question}</strong></p>
                    {q.type === 'subjective_short' ? (
                        <input type="text" style={styles.input} onChange={e => handleAnswerChange(i, e.target.value, false)} />
                    ) : (
                        <div style={styles.quizOptions}>
                            {(q.options || []).map((option, optIndex) => (
                                <div key={optIndex} style={styles.checkboxContainer}>
                                    <input
                                        type={q.type === 'mcq_single' ? 'radio' : 'checkbox'}
                                        id={`q${i}-opt${optIndex}`}
                                        name={`q${i}`}
                                        value={option}
                                        onChange={() => handleAnswerChange(i, option, q.type === 'mcq_multiple')}
                                    />
                                    <label htmlFor={`q${i}-opt${optIndex}`}>{option}</label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <button onClick={handleSubmit} style={{ ...styles.actionButton, marginTop: '1.5rem', width: '100%', padding: '1rem' }}>Grade My Quiz</button>
        </div>
    );
};

// --- FEYNMAN & FLASHCARD COMPONENTS ---
const FeynmanTechniqueModule = ({ originalContent, subject, topicSelection }: any) => {
    const api = (window as any).LearnSphereAPI;
    const [feynmanInput, setFeynmanInput] = useState('');
    const [feynmanFeedback, setFeynmanFeedback] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const ai = useMemo(() => apiKey ? new GoogleGenAI({ apiKey }) : null, [apiKey]);

    const handleEvaluation = async () => {
        if (!feynmanInput.trim() || !originalContent || !api) return;
        setIsEvaluating(true);
        setFeynmanFeedback('');
        try {
            const context = typeof originalContent === 'string' ? originalContent : JSON.stringify(originalContent);
            const selectionText = topicSelection.unit ? `the unit "${topicSelection.unit}"` : `the topics: ${topicSelection.topics.join(', ')}`;
            const prompt = `You are an expert educator. A student studying "${subject}" has tried to explain ${selectionText} using the Feynman Technique.
            The original, correct explanation is:\n---\n${context.substring(0, 4000)}\n---\n\nHere is the student's explanation:\n---\n${feynmanInput}\n---\n
            Please evaluate the student's explanation. Point out any inaccuracies, unclear points, or gaps in their understanding. Be encouraging and provide constructive feedback to help them improve. Address the student directly.`;
             const response = await api.generateContent("gemini-2.5-flash", prompt);
            setFeynmanFeedback(response.text);
        } catch (e: any) { setFeynmanFeedback(`An error occurred: ${e.message}`); }
        finally { setIsEvaluating(false); }
    };

    return (
        <>
            <h3 style={styles.subheading}>Test My Explanation (The Feynman Technique)</h3>
            <p>Explain this topic in your own words, as simply as you can, as if you were teaching it to someone else.</p>
            <textarea value={feynmanInput} onChange={(e) => setFeynmanInput(e.target.value)} style={styles.feynmanTextarea} placeholder="Type your explanation here..." rows={8} />
            <button onClick={handleEvaluation} disabled={isEvaluating} style={styles.actionButton}>
                {isEvaluating ? 'Evaluating...' : 'Get Feedback'}
            </button>
            {feynmanFeedback && <div style={styles.feynmanFeedback}><h4 style={{marginTop: 0}}>Feedback:</h4><FormattedContent content={feynmanFeedback} /></div>}
        </>
    );
};

const FlashcardView = ({ flashcards }: { flashcards: Flashcard[] }) => {
    const [testState, setTestState] = useState({ active: false, cardsToTest: [] as Flashcard[], masteredCards: [] as Flashcard[], currentIndex: 0, showAnswer: false });
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (testState.active) {
        return <FlashcardTestView state={testState} setState={setTestState} />;
    }
    const card = flashcards[currentCardIndex];
    return (
        <div style={styles.flashcardResultContainer}>
             <div style={styles.resultActions}>
                <button style={styles.actionButton} onClick={() => setTestState({ active: true, cardsToTest: [...flashcards].sort(() => Math.random() - 0.5), masteredCards: [], currentIndex: 0, showAnswer: false })}>Test My Knowledge</button>
            </div>
            <p style={styles.flashcardProgress}>{currentCardIndex + 1} / {flashcards.length}</p>
            <div style={{...styles.flashcard, ...(isFlipped ? styles.flashcardFlipped : {})}} onClick={() => setIsFlipped(!isFlipped)} role="button" aria-pressed={isFlipped} tabIndex={0} onKeyPress={(e) => { if (e.key === ' ' || e.key === 'Enter') setIsFlipped(!isFlipped); }}>
                <div style={styles.flashcardInner}><div style={styles.flashcardFront}><p>{card.question}</p></div><div style={styles.flashcardBack}><p>{card.answer}</p></div></div>
            </div>
            <div style={styles.flashcardNav}><button style={styles.navButton} onClick={() => { setCurrentCardIndex(p => Math.max(0, p - 1)); setIsFlipped(false); }}>Previous</button><button style={styles.navButton} onClick={() => { setCurrentCardIndex(p => Math.min(flashcards.length - 1, p + 1)); setIsFlipped(false); }}>Next</button></div>
        </div>
    );
};

const FlashcardTestView: React.FC<{ state: any; setState: React.Dispatch<React.SetStateAction<any>>; }> = ({ state, setState }) => {
    if (state.cardsToTest.length === 0) {
        return (
            <div style={styles.flashcardTestComplete}>
                <h2 style={styles.subheading}>Congratulations!</h2>
                <p>You've mastered all the flashcards for this topic.</p>
                <button style={styles.actionButton} onClick={() => setState((prev: any) => ({ ...prev, active: false }))}>Back to Flashcards</button>
            </div>
        );
    }
    const currentCard = state.cardsToTest[state.currentIndex];
    const handleAnswer = (knewIt: boolean) => {
        const nextState = { ...state, showAnswer: false, currentIndex: state.currentIndex };
        let cardsToTest = [...state.cardsToTest];
        if (knewIt) {
            const mastered = cardsToTest.splice(state.currentIndex, 1)[0];
            nextState.masteredCards = [...state.masteredCards, mastered];
        } else {
            // Move card to a random position in the latter half of the deck to re-test later
            const cardToMove = cardsToTest.splice(state.currentIndex, 1)[0];
            const insertIndex = Math.floor(cardsToTest.length / 2) + Math.floor(Math.random() * (cardsToTest.length / 2));
            cardsToTest.splice(insertIndex, 0, cardToMove);
        }
        if (state.currentIndex >= cardsToTest.length) nextState.currentIndex = 0;
        nextState.cardsToTest = cardsToTest;
        setState(nextState);
    };
    const totalCards = state.cardsToTest.length + state.masteredCards.length;
    const progress = (state.masteredCards.length / totalCards) * 100;
    return (
        <div style={styles.flashcardTestContainer}>
            <h3 style={styles.subheading}>Test My Knowledge</h3>
            <div style={styles.progressBarContainer}><div style={{...styles.progressBar, width: `${progress}%`}} /></div>
            <p>{state.masteredCards.length} / {totalCards} Mastered</p>
            <div style={styles.flashcardTestCard}>
                <p style={styles.flashcardTestQuestion}>{currentCard.question}</p>
                {state.showAnswer && <p style={styles.flashcardTestAnswer}>{currentCard.answer}</p>}
            </div>
            {!state.showAnswer ? <button style={styles.actionButton} onClick={() => setState((prev: any) => ({ ...prev, showAnswer: true }))}>Show Answer</button>
             : <div style={styles.flashcardTestActions}><button style={styles.testButtonCorrect} onClick={() => handleAnswer(true)}>I Knew It!</button><button style={styles.testButtonIncorrect} onClick={() => handleAnswer(false)}>Needs Review</button></div>}
        </div>
    );
};


// --- STUDY PLANNER ---
const StudyPlanner: React.FC = () => {
    const api = (window as any).LearnSphereAPI;
    const [subject, setSubject] = useState('');
    const [topics, setTopics] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState<StudyPlan[] | null>(null);

    const ai = useMemo(() => apiKey ? new GoogleGenAI({ apiKey }) : null, [apiKey]);
    
    const handleSyllabusImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !api) return;
        setIsExtracting(true);
        setError('');
        try {
            const base64Image = await fileToBase64(file);
            const prompt = { parts: [ { inlineData: { mimeType: file.type, data: base64Image } }, { text: "Extract the list of topics and units from this syllabus image. List them clearly, separated by newlines. Only output the topics, nothing else." }] };
            const response = await api.generateContent('gemini-2.5-flash', prompt);
            setTopics(prev => `${prev ? prev + '\n' : ''}${response.text}`);
        } catch (e: any) { setError(`Failed to extract topics: ${e.message}`); }
        finally { setIsExtracting(false); }
    };
    
    const handleGeneratePlan = async () => {
        if (!apiKey) { setError('API key is missing.'); return; }
        if (!subject || !topics || !startDate || !endDate) { setError('Please fill in all fields.'); return; }
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        if (start >= end) { setError("End date must be after the start date."); return; }
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        setIsLoading(true);
        setError('');
        setPlan(null);
        try {
            if (!api) throw new Error("API client not initialized");
            const prompt = `You are an expert academic planner. Create a realistic study plan for the subject "${subject}". The student needs to cover the following topics:\n${topics}\nThe plan should start on ${startDate} and end on ${endDate}, which is a total of ${dayCount} days. Allocate topics evenly across the days. Include days for review and practice tests. Be realistic about the workload.`;
            const planSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.INTEGER }, topic: { type: Type.STRING }, task: { type: Type.STRING }}, required: ['day', 'topic', 'task'] }};
            const response = await api.generateContent("gemini-2.5-flash", prompt, { responseMimeType: "application/json", responseSchema: planSchema });
            const json = JSON.parse(response.text.trim());
            setPlan(json);
        } catch (e: any) { setError(`Failed to generate plan: ${e.message}`); }
        finally { setIsLoading(false); }
    };

    const downloadPlan = () => {
        if (!plan) return;
        const filename = sanitizeFilename(`${subject}_Study_Plan`);
        const csvContent = "data:text/csv;charset=utf-8," + "Day,Date,Topic,Task\n" + plan.map(item => { const planDate = new Date(`${startDate}T00:00:00`); planDate.setDate(planDate.getDate() + item.day - 1); const dateString = planDate.toLocaleDateString(); return `${item.day},${dateString},"${item.topic.replace(/"/g, '""')}","${item.task.replace(/"/g, '""')}"`; }).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
         <main style={styles.main}>
             <h1 style={styles.title}>AI Study Planner</h1>
             <p style={styles.subtitle}>Let's create a strategic roadmap for your success.</p>
            <div style={styles.plannerForm}>
                <label style={styles.label}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={styles.input} placeholder="e.g., Biology 101" />
                <label style={styles.label}>Topics / Syllabus</label>
                <p style={styles.labelDescription}>Enter topics one per line, or upload a syllabus image.</p>
                <label htmlFor="planner-syllabus-upload" style={styles.uploadButton}>{isExtracting ? 'Extracting...' : '📄 Upload Syllabus Image'}</label>
                <input type="file" accept="image/*" onChange={handleSyllabusImageUpload} style={styles.fileInput} id="planner-syllabus-upload" />
                <textarea value={topics} onChange={e => setTopics(e.target.value)} style={styles.textarea} rows={10} placeholder="Chapter 1: Cell Division&#10;Chapter 2: Genetics..." />
                <div style={styles.dateContainer}>
                    <div><label style={styles.label}>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} /></div>
                    <div><label style={styles.label}>End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} /></div>
                </div>
                <button onClick={handleGeneratePlan} disabled={isLoading || isExtracting} style={styles.generateButton}>{isLoading ? 'Creating Plan...' : '🗓️ Create My Study Plan'}</button>
                {error && <p style={styles.error}>{error}</p>}
            </div>
            {isLoading && <LoadingSpinner />}
            {plan && (
                <div style={styles.resultsContainer}>
                    <div style={styles.resultActions}><button style={styles.actionButton} onClick={downloadPlan}>Download Plan</button></div>
                    <h2 style={styles.subheading}>Your {subject} Study Plan</h2>
                    <div style={styles.planTableContainer}>
                        <table style={styles.planTable}>
                            <thead><tr><th style={styles.planTh}>Day</th><th style={styles.planTh}>Date</th><th style={styles.planTh}>Topic</th><th style={styles.planTh}>Task</th></tr></thead>
                            <tbody>
                                {plan.map(item => { const planDate = new Date(`${startDate}T00:00:00`); planDate.setDate(planDate.getDate() + item.day - 1); return (<tr key={item.day}><td style={styles.planTd}>{item.day}</td><td style={styles.planTd}>{planDate.toLocaleDateString()}</td><td style={styles.planTd}>{item.topic}</td><td style={styles.planTd}>{item.task}</td></tr>); })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
};


const styles: { [key: string]: React.CSSProperties } = {
    appContainer: { fontFamily: "'Poppins', sans-serif", backgroundColor: '#1a1a2d', minHeight: '100vh', color: '#e0e0ff' },
    container: { maxWidth: '1000px', margin: '0 auto', padding: '0 2rem 2rem 2rem' },
    main: { backgroundColor: '#2d2d4f', borderRadius: '12px', padding: '2rem 2.5rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)', marginTop: '2rem' },
    title: { fontSize: '2.2rem', fontWeight: 700, color: '#f92672', textAlign: 'center', marginBottom: '0.5rem' },
    subtitle: { fontSize: '1.1rem', color: '#a0a0c0', textAlign: 'center', marginBottom: '2.5rem' },
    subheading: { fontSize: '1.5rem', color: '#61dafb', borderBottom: '2px solid #7b68ee', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center' },
    error: { color: '#ff5555', backgroundColor: 'rgba(255, 85, 85, 0.1)', padding: '0.75rem', borderRadius: '4px', textAlign: 'center', marginTop: '1rem', border: '1px solid #ff5555' },
    errorContainer: { textAlign: 'center', padding: '2rem' },
    nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #4a4a70', backgroundColor: '#2d2d4f' },
    navTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#f92672', cursor: 'pointer' },
    navButton: { background: 'none', border: 'none', color: '#a0a0c0', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginLeft: '1rem', padding: '0.5rem 1rem', borderRadius: '6px', transition: 'background-color 0.2s ease, color 0.2s ease' },
    wizardStep: { border: '1px solid #4a4a70', borderRadius: '8px', padding: '2rem', backgroundColor: '#1a1a2d' },
    label: { fontSize: '1rem', fontWeight: 600, color: '#e0e0ff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' },
    labelDescription: { fontSize: '0.9rem', color: '#a0a0c0', margin: '-0.75rem 0 0.5rem 0', fontStyle: 'italic' },
    stepNumber: { backgroundColor: '#f92672', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginRight: '0.75rem', fontWeight: 700, flexShrink: 0, fontSize: '1rem' },
    input: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #4a4a70', borderRadius: '6px', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s', backgroundColor: '#1a1a2d', color: '#e0e0ff' },
    selectWrapper: { position: 'relative' },
    select: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #4a4a70', borderRadius: '6px', appearance: 'none', backgroundColor: '#1a1a2d', cursor: 'pointer', color: '#e0e0ff' },
    textarea: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #4a4a70', borderRadius: '6px', boxSizing: 'border-box', backgroundColor: '#1a1a2d', color: '#e0e0ff' },
    fileInput: { display: 'none' },
    uploadButton: { display: 'inline-block', padding: '0.75rem 1.25rem', backgroundColor: 'transparent', color: '#61dafb', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, textAlign: 'center', border: '2px dashed #61dafb', transition: 'background-color 0.2s ease, color 0.2s ease', width: '100%', boxSizing: 'border-box' },
    generateButton: { width: '100%', padding: '1rem', fontSize: '1.2rem', fontWeight: 600, color: 'white', backgroundColor: '#f92672', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 10px rgba(249, 38, 114, 0.3)' },
    backButton: { background: 'none', border: 'none', color: '#a0a0c0', cursor: 'pointer', marginBottom: '1rem' },
    
    topicSelectionContainer: { maxHeight: '400px', overflowY: 'auto', border: '1px solid #4a4a70', borderRadius: '6px', padding: '1rem', backgroundColor: '#2d2d4f' },
    unitContainer: { marginBottom: '1rem' },
    unitLabel: { fontWeight: 'bold', fontSize: '1.1rem', color: '#61dafb' },
    topicList: { paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' },
    checkboxContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem' },

    resultsContainer: { marginTop: '2rem', padding: '1.5rem', backgroundColor: '#1a1a2d', borderRadius: '8px', minHeight: '100px' },
    resultActions: { display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' },
    actionButton: { padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 600, color: 'white', backgroundColor: '#7b68ee', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s ease' },
    
    refineContainer: { backgroundColor: '#2d2d4f', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #4a4a70' },
    refineTitle: { margin: '0 0 1rem 0', color: '#f92672', fontSize: '1.2rem' },
    refineControls: { display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' },
    refineButton: { padding: '0.75rem 1rem', flexGrow: 1, backgroundColor: 'transparent', border: '1px solid #7b68ee', color: '#e0e0ff', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s ease' },

    iterateContainer: { marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #4a4a70' },

    contentH1: { fontSize: '2rem', color: '#f92672', marginTop: '1.5em', marginBottom: '0.5em', borderBottom: '2px solid #4a4a70' },
    contentH2: { fontSize: '1.6rem', color: '#61dafb', marginTop: '1.5em', marginBottom: '0.5em' },
    contentH3: { fontSize: '1.3rem', color: '#7b68ee', marginTop: '1.5em', marginBottom: '0.5em' },
    paragraph: { lineHeight: 1.7, marginBottom: '1em', color: '#a0a0c0' },
    list: { marginBottom: '1em', paddingLeft: '2em' },
    listItem: { lineHeight: 1.6, marginBottom: '0.5em' },
    codeBlock: { backgroundColor: '#111122', padding: '1rem', borderRadius: '6px', overflowX: 'auto', fontFamily: 'monospace', color: '#e0e0ff', margin: '1rem 0', border: '1px solid #4a4a70' },
    mindmapContainer: { backgroundColor: '#1a1a2d', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' },

    groundingContainer: { margin: '1rem 0', padding: '1rem', backgroundColor: 'rgba(97, 218, 251, 0.1)', borderRadius: '8px', border: '1px solid #61dafb' },
    groundingTitle: { margin: '0 0 0.5rem 0', color: '#61dafb', fontSize: '1rem' },
    groundingList: { margin: 0, paddingLeft: '1.5rem' },
    groundingLink: { color: '#a0a0c0', textDecoration: 'underline' },

    flashcardResultContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    flashcardProgress: { fontSize: '1rem', color: '#a0a0c0', marginBottom: '1rem' },
    flashcard: { width: '400px', height: '250px', perspective: '1000px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' },
    flashcardInner: { position: 'relative', width: '100%', height: '100%', textAlign: 'center', transition: 'transform 0.6s', transformStyle: 'preserve-3d' },
    flashcardFlipped: { transform: 'rotateY(180deg)' },
    flashcardFront: { position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', backgroundColor: '#4a4a70', color: '#e0e0ff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', fontSize: '1.2rem', fontWeight: 600 },
    flashcardBack: { position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', backgroundColor: '#7b68ee', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', transform: 'rotateY(180deg)', fontSize: '1.1rem' },
    flashcardNav: { marginTop: '1.5rem', display: 'flex', gap: '1rem' },

    flashcardTestContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' },
    flashcardTestCard: { width: '90%', minHeight: '200px', border: '1px solid #4a4a70', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', backgroundColor: '#2d2d4f' },
    flashcardTestQuestion: { fontSize: '1.3rem', fontWeight: 600, color: '#e0e0ff', margin: 0 },
    flashcardTestAnswer: { fontSize: '1.1rem', color: '#a0a0c0', marginTop: '1rem', borderTop: '1px dashed #4a4a70', paddingTop: '1rem' },
    flashcardTestActions: { display: 'flex', gap: '1rem' },
    testButtonCorrect: { padding: '0.8rem 1.5rem', fontSize: '1rem', fontWeight: 600, color: 'white', backgroundColor: '#50fa7b', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    testButtonIncorrect: { padding: '0.8rem 1.5rem', fontSize: '1rem', fontWeight: 600, color: 'white', backgroundColor: '#ff5555', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    flashcardTestComplete: { textAlign: 'center', padding: '2rem' },
    
    quizSection: { marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #4a4a70' },
    quizGenerator: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' },
    quizContainer: { padding: '1rem' },
    quizQuestion: { fontSize: '1.4rem', marginBottom: '1.5rem', color: '#e0e0ff' },
    quizQuestionBlock: { marginBottom: '1.5rem', borderBottom: '1px solid #4a4a70', paddingBottom: '1.5rem' },
    quizOptions: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' },
    quizScore: { fontSize: '1.8rem', color: '#50fa7b', textAlign: 'center', margin: '1rem 0' },
    quizResultsBreakdown: { maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' },
    quizResultItem: { marginBottom: '1rem', padding: '1rem', borderRadius: '6px', borderLeft: '5px solid' },
    personalizedSuggestions: { marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(97, 218, 251, 0.1)', borderRadius: '8px' },
    swotSection: { marginTop: '2rem' },
    
    progressBarContainer: { height: '20px', width: '100%', backgroundColor: '#1a1a2d', borderRadius: '10px', margin: '1rem 0', border: '1px solid #4a4a70' },
    progressBar: { height: '100%', backgroundColor: '#50fa7b', borderRadius: '10px', transition: 'width 0.5s ease-in-out' },

    feynmanContainer: { marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #4a4a70' },
    feynmanTextarea: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #4a4a70', borderRadius: '6px', boxSizing: 'border-box', minHeight: '120px', marginBottom: '1rem', backgroundColor: '#1a1a2d', color: '#e0e0ff' },
    feynmanFeedback: { marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(123, 104, 238, 0.1)', borderRadius: '6px', border: '1px solid #7b68ee' },

    plannerForm: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' },
    dateContainer: { display: 'flex', gap: '1rem', width: '100%' },
    planTableContainer: { overflowX: 'auto' },
    planTable: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    planTh: { backgroundColor: '#7b68ee', color: 'white', padding: '0.75rem', textAlign: 'left' },
    planTd: { padding: '0.75rem', borderBottom: '1px solid #4a4a70' },

    spinnerContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: '#a0a0c0', margin: '1rem 0' },
    spinner: { border: '4px solid #4a4a70', borderTop: '4px solid #f92672', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
body { margin: 0; }
* { box-sizing: border-box; }
select {
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20256%20256%22%3E%3Cpath%20fill%3D%22%23f92672%22%20d%3D%22M208.5%2093.1l-75.1%2075.1a12.1%2012.1%200%2001-17%200l-75.1-75.1a12%2012%200%200117-17l66.6%2066.6%2066.6-66.6a12%2012%200%200117%2017z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E');
    background-repeat: no-repeat; background-position: right .7em top 50%; background-size: 1.2em auto; padding-right: 2.5em;
}
select option { background: #1a1a2d; color: #e0e0ff; }
select::-ms-expand { display: none; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #f92672; box-shadow: 0 0 0 3px rgba(249, 38, 114, 0.3); }
button:disabled { opacity: 0.5; cursor: not-allowed; background-color: #555 !important; box-shadow: none; }
nav button:hover { color: #f92672; background-color: rgba(249, 38, 114, 0.1); }
.generateButton:hover:not(:disabled) { background-color: #ff8ac5; }
.actionButton:hover:not(:disabled) { background-color: #9887fa; }
.uploadButton:hover { background-color: rgba(97, 218, 251, 0.1); color: #fff; }
.refineButton:hover { background-color: #4a4a70; }
input[type="checkbox"], input[type="radio"] { accent-color: #f92672; }
`;
document.head.appendChild(styleSheet);


const root = createRoot(document.getElementById('root')!);
root.render(<App />);