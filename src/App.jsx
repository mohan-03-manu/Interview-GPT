import { useEffect, useState } from "react";
import OpenAI from "openai";
import { parse } from "dotenv";
 // speech recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;

  // API 
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  })

function App() {
  const [isListening , setInListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedbackLoadingStatus, setFeedbackLoadingStatus] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [reAttempt, setReAttempt] = useState(false);
  const [question, setQuestion] = useState(null);
  const [questionStatus, setQuestionStatus] = useState(true);
  
  useEffect(()=>{
       async function fetchQuestion(){
        await getQuestion();
       }
       fetchQuestion();
       recognition.onresult = (e)=>{
       const current = e.resultIndex;
       const transcript = e.results[current][0].transcript;
       setTranscript(transcript)
       }

       recognition.onend = async()=>{
        setInListening(false);
        await getFeedback();
       }
  }, [])

  const handleStartListening = ()=>{
    setInListening(true);
    setFeedback(null);
    recognition.start();
  }
  const handleStopListening = async()=>{
    setInListening(false);
    recognition.stop();
     await getFeedback();
  }
  // reattempt 
  const handleReAttempt=()=>{
    setFeedback(null);
    handleStartListening()
  }


  
// get question
const getQuestion= async ()=>{
    setQuestionStatus(true);
    setFeedback(null);
    setTranscript('');
    try{
      console.log('getting question')
       const completion = await openai.chat.completions.create({
         messages:[
           {role: "system",
             content: "You are an AI interview coach. Return only a single random javascript  question  "
           },
           {role: "user", 
            content: "Give me a random question of javascript?"
           }
         ],
         model: 'gpt-5.4-mini',
       })
        const question = completion.choices[0].message.content;
        setQuestion(question);
        setQuestionStatus(false);
      }catch(e){
        console.log("error:", e)
      }finally{
         setQuestionStatus(false);
     }
  }



  // get feedback 
  const getFeedback= async ()=>{
    setFeedbackLoadingStatus(true);
    try{
      console.log('analysing answer')
       const completion = await openai.chat.completions.create({
         messages:[
           {role: "system", content: "You are an interview coach. The answers you'll review are from speech-to-text transcription. Ignore minor speech recognition errors, filler words or slight grammatical issues that are common in spoken responses. Focus on evaluating the core content and meaning rather than exact wording. You must respond with a JSON object containing exactly three fields: correctness (how relevant the answer was) (0-5) (if the answer is not relevant do give 0 ), completeness (how complete the answer was) (0-5) (if the answer is not relevant do give 0 ), and feedback (string)." },
           {role: "user", content: `Question: ${question}
                 Answer:${transcript}
                   
                 Provide your evaluation as a JSON object with this exact structure:
                   {
                     "correctness": <number 0-5>,
                     "completeness": <number 0-5>,
                     "feedback": "<your detailed feedback in max 150 words>"
                    }` }
         ],
         model: 'gpt-5.4-mini',
         response_format: {type: "json_object"}
       })
        const gptFeedback = completion.choices[0].message.content;
        const Feedback = JSON.parse(gptFeedback);
        setFeedback(Feedback);
    }catch(e){
        console.log("error:", e)
    }finally{
      setFeedbackLoadingStatus(false);
    }
  }
  return (
    <>
      <div className="w-full h-screen overflow-hidden bg-gray-50">
        <div className={`max-w-4xl mx-auto ${feedbackLoadingStatus || feedback ? 'flex' : 'text-center'}`}>
          {/* question container */}
          <div className={`transition-all  ${feedbackLoadingStatus || feedback ? 'w-1/2  h-screen p-5 ' : 'max-w-xl mx-auto '}`}>
            <h1 className="text-xl font-semibold mt-24">{questionStatus ? "Loading question....." : question}</h1>

            <p className="mt-10">Record your answer</p>
            <p className="text-sm text-neutral-600 mb-5">Try to answer the question in an accurate manner and to the point in max 2 minutes & then the assistant will analyze your answer and give you the feedback.</p>
            
             <div className={`flex gap-2 ${feedbackLoadingStatus || feedback ? '' : 'justify-center'}`}>
               <button onClick={isListening ? handleStopListening : handleStartListening} className={ `text-white px-6 py-3 rounded-xl ${isListening ? 'bg-black' : 'bg-blue-600'} ${feedback ? 'hidden' : ''}` } >{isListening ? 'Submit Answer' : 'Start Answering'}</button>
               <button onClick={handleReAttempt} className={`py-2 px-5 rounded-full ${feedback ? 'bg-neutral-100' :'hidden' }`}>{feedback ? 'Re Attempt Question' : ''}</button>
               <button onClick={getQuestion} className={`py-2 px-5 rounded-full ${isListening ? "hidden" : "bg-white border"} `}> {isListening ? "" :"Next question" }</button>
             </div>
             <p className="text-red-600 mt-8">{transcript}</p>
          </div>
          {/* feedback container */}
          <div className={`transition-all ${feedbackLoadingStatus || feedback ? 'w-1/2 border-l h-screen p-5' : 'w-0 '}`}>
            {feedback &&(
               <div className="mt-24">
               <p>{feedbackLoadingStatus ? 'Lets see how you answered!' : ''}</p>
               <div className="border p-3 rounded-lg ">
                <div className="flex items-center justify-between">
                  <h1>Correctness </h1>
                  <h1>{feedback.correctness}/5</h1>
                </div>
                <div className="flex gap-1 mt-2">
                   {[...Array(5)].map((_,i)=>{
                   return <div key={i} className={`h-1 flex-1 rounded-full ${i<Number(feedback.correctness) ? 'bg-blue-600' : 'bg-neutral-200' }`}></div>
                })}
                </div>
               </div>

               <div className="border my-3 p-3 rounded-lg ">
                <div className="flex items-center justify-between">
                  <h1>Completeness</h1>
                  <h1>{feedback.completeness}/5</h1>
                </div>
                <div className="flex gap-1 mt-2">
                   {[...Array(5)].map((_,i)=>{
                   return <div key={i} className={`h-1 flex-1 rounded-full ${i<Number(feedback.completeness) ? 'bg-blue-600' : 'bg-neutral-200' }`}></div>
                })}
                </div>
               </div>
               <p>{feedback.feedback}</p>
               </div>
            )}
           
          </div>
        </div>
      </div>

      
    </>
  )
}

export default App;
