import { getInputGuidelines, getQuestionGuidelines } from "./exam-guidelines";
import { latex_examples } from "./latex_examples";

// Constants for absolute minimum requirements
const MINIMUM_LESSONS = 3;
const MINIMUM_CHALLENGES_PER_LESSON = 3;

export function generateTextPrompt(
  language: string,
  requestedLessons: number,
  requestedChallenges: number,
  topic: { title: string; description: string }
): string {
  return `
!Your Answer MUST be in ${language}!
Generate content for: ${topic.title}
Description: ${topic.description}

TRY to create ${requestedLessons} lessons with ${requestedChallenges} challenges each.
MUST HAVE AT LEAST ${MINIMUM_LESSONS} lessons with ${MINIMUM_CHALLENGES_PER_LESSON} challenges each!

${getInputGuidelines()}

----------------------------------------------------------------
FORMAT YOUR RESPONSE EXACTLY LIKE THIS - DO NOT ADD ANYTHING ELSE:

Lesson 1: [Lesson Title]

T: [SELECT/ASSIST]
Q: [Question]
CA: [Correct Answer 1]
CA: [Correct Answer 2 - if needed]
CA: [Correct Answer 3 - if needed]
WA: [Wrong Answer - Add enough to total 4 answers]
WA: [Wrong Answer - Add if needed]
WA: [Wrong Answer - Add if needed]
H: [Helpful Hint]
EX: [Detailed Explanation]

// CONTINUE THIS EXACT FORMAT:
// - MUST have EXACTLY 4 total answers per question (CA + WA = 4)
// - If 1 CA: add 3 WA
// - If 2 CA: add 2 WA
// - If 3 CA: add 1 WA
// - If 4 CA: add 0 WA
// - **SELECT TYPE** -> ALWAYS ENSURE 1 CORRECT ANSWER IS PRESENT!
// - AT LEAST ${MINIMUM_CHALLENGES_PER_LESSON} challenges per lesson
// - TRY for ${requestedChallenges} challenges per lesson
// - Number lessons sequentially (Lesson 2, Lesson 3, etc.)
// - TRY for ${requestedLessons} lessons total
// - MUST have AT LEAST ${MINIMUM_LESSONS} lessons
// - Maintain same logical structure and formatting

----------------------------------------------------------------

Example (Single Answer):
T: SELECT
Q: What primary factor drove the Industrial Revolution's rapid spread across Europe?
CA: The development of standardized manufacturing processes
WA: The invention of the steam engine alone
WA: Increased population in urban areas
WA: The availability of raw materials
H: Consider the role of reproducibility in manufacturing
EX: Standardization enabled consistent quality and rapid knowledge transfer

Example (Assist Answer - 1 Correct Answer)
T: ASSIST
Q: What was the fundamental innovation that enabled the Renaissance's artistic revolution?
CA: The development of mathematical perspective in painting
WA: The invention of oil-based paints
WA: The patronage system of wealthy families
WA: The rediscovery of classical texts
H: Consider what allowed artists to create more realistic three-dimensional representations
EX: Mathematical perspective, developed by architects like Brunelleschi, revolutionized how artists could represent three-dimensional space on flat surfaces, enabling unprecedented realism in Renaissance art

Example (Assist Answer - 2 Correct Answers)

T: ASSIST
Q: Which factors were primarily responsible for the rapid spread of the Black Death in medieval Europe?
CA: The lack of understanding about disease transmission
CA: The dense population in medieval cities
WA: The widespread use of gunpowder weapons
WA: The decline of feudal agriculture
H: Think about urban conditions and medical knowledge in the 14th century
EX: The combination of poor understanding of disease transmission and crowded urban conditions created perfect conditions for the plague's rapid spread through Europe's population centers

Example (Assist Answer - 3 Correct Answers)

T: ASSIST
Q: What key developments enabled the Age of Exploration in the 15th century?
CA: The development of improved navigation instruments
CA: The invention of more accurate maritime maps
CA: Advances in shipbuilding technology
WA: The invention of the steam engine
H: Consider the technological prerequisites for long-distance ocean voyages
EX: The combination of better navigation tools, improved maps, and advanced ship designs made long-distance maritime exploration possible and increasingly reliable

Example (Assist Answer - 4 Correct Answers)

T: ASSIST 
Q: Which factors contributed to the success of the Agricultural Revolution?
CA: The development of crop rotation systems
CA: The introduction of new farming tools
CA: The enclosure of common lands
CA: The breeding of improved livestock
H: Consider both technological and social changes in farming practices
EX: The Agricultural Revolution succeeded through the combined effects of improved farming techniques, better tools, land management changes, and livestock breeding, which together dramatically increased food production

${getQuestionGuidelines()}

IMPORTANT:
- TRY to generate ${requestedLessons} lessons
- MUST have AT LEAST ${MINIMUM_LESSONS} lessons
- Each lesson MUST have AT LEAST ${MINIMUM_CHALLENGES_PER_LESSON} challenges
- ONLY use the format shown - NO additional text`;
}

export function generateMathPrompt(
  language: string,
  requestedLessons: number,
  requestedChallenges: number,
  topic: { title: string; description: string }
): string {
  const basePrompt = generateTextPrompt(language, requestedLessons, requestedChallenges, topic);
  
  return `${basePrompt}

${getQuestionGuidelines()}

MATH QUESTION REQUIREMENTS:

1. Question Format:
T: SELECT/ASSIST
Q: Must present clear mathematical problem
- For equations: $[equation]$
- For graphs: Use proper coordinate notation
- For proofs: State all given conditions
- For word problems: All variables clearly defined

2. Answer Format:
CA: Must include complete solution
- Full step-by-step workings
- Use $\\begin{aligned} ... \\end{aligned}$ for multi-step solutions
- Include units where applicable
- State final answer clearly

3. Wrong Answer Format:
WA: Must reflect common mathematical errors
- Sign errors: e.g., $-x$ instead of $+x$
- Calculation mistakes: e.g., $x^2$ instead of $2x$
- Conceptual errors: e.g., confusing sine and cosine
- Process errors: e.g., incorrect integration steps

4. Hint Format:
H: Must guide without solving
- Point to relevant formulas
- Suggest solution approach
- Identify key concepts
- No partial solutions

5. Explanation Format:
EX: Must justify all steps
- Explain why each step is valid
- Point out why wrong answers are incorrect
- Reference mathematical principles
- Show alternative approaches if relevant

----------------------------------------------------------------
FORMAT YOUR RESPONSE EXACTLY LIKE THIS - DO NOT ADD ANYTHING ELSE:

Lesson 1: [Lesson Title]

T: [SELECT/ASSIST]
Q: [Question]
CA: [Correct Answer 1]
CA: [Correct Answer 2 - if needed]
CA: [Correct Answer 3 - if needed]
WA: [Wrong Answer - Add enough to total 4 answers]
WA: [Wrong Answer - Add if needed]
WA: [Wrong Answer - Add if needed]
H: [Helpful Hint]
EX: [Detailed Explanation]

// CONTINUE THIS EXACT FORMAT:
// - MUST have EXACTLY 4 total answers per question (CA + WA = 4)
// - If 1 CA: add 3 WA
// - If 2 CA: add 2 WA
// - If 3 CA: add 1 WA
// - AT LEAST ${MINIMUM_CHALLENGES_PER_LESSON} challenges per lesson
// - TRY for ${requestedChallenges} challenges per lesson
// - Number lessons sequentially (Lesson 2, Lesson 3, etc.)
// - TRY for ${requestedLessons} lessons total
// - MUST have AT LEAST ${MINIMUM_LESSONS} lessons
// - Maintain same logical structure and formatting

----------------------------------------------------------------

${latex_examples} 

LATEX TECHNICAL REQUIREMENTS:

please integrate the equations in the following format:
$$
\\int_{a}^{b} f(x)\\,dx
$$

IMPORTANT RULES:
1. TRY to create ${requestedLessons} lessons
2. MUST have AT LEAST ${MINIMUM_LESSONS} lessons
3. Each lesson MUST have AT LEAST ${MINIMUM_CHALLENGES_PER_LESSON} challenges
4. ALL math MUST be in LaTeX
5. EVERY math expression MUST be properly formatted
6. ONLY use the exact format shown - NO extra text
7. FOLLOW all math guidelines above`;
}