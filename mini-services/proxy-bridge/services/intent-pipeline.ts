/**
 * Intent Pipeline Service
 * 
 * Analyzes incoming user queries using lightweight local classification 
 * (regex/keyword matching) to determine if the prompt requires triggering 
 * the RAG (Retrieval-Augmented Generation) flow.
 */

export interface IntentAnalysis {
  requiresRAG: boolean;
  confidence: number;
  matchedKeywords: string[];
  intentType: 'rag_codebase' | 'rag_docs' | 'rag_architecture' | 'general';
}

export class IntentPipeline {
  // Keyword and regex patterns for different RAG intents
  private static readonly RAG_PATTERNS = {
    codebase: [
      /\b(codebase|repo|repository|code|files?|folder|directory)\b/i,
      /\b(where is|how is .* implemented|where can i find)\b/i,
      /\b(function|class|method|module|component) .*\b/i,
      /\b(api|endpoint|route)s?\b/i
    ],
    docs: [
      /\b(doc|docs|documentation|readme|specification|specs?)\b/i,
      /\b(how to use|how do i use|example of)\b/i,
      /\b(guide|tutorial|manual)\b/i
    ],
    architecture: [
      /\b(architecture|design|structure|system|flow|diagram)\b/i,
      /\b(how does .* work|what is the purpose of)\b/i,
      /\b(database schema|data model)\b/i
    ]
  };

  /**
   * Analyzes a user query to determine if it requires RAG
   * @param query The user's input string
   * @returns IntentAnalysis object with RAG requirement and confidence
   */
  public analyze(query: string): IntentAnalysis {
    if (!query || query.trim() === '') {
      return {
        requiresRAG: false,
        confidence: 0,
        matchedKeywords: [],
        intentType: 'general'
      };
    }

    const matchedKeywords: string[] = [];
    let bestIntentType: IntentAnalysis['intentType'] = 'general';
    let highestConfidence = 0;

    // Check each category
    for (const [intentCategory, patterns] of Object.entries(IntentPipeline.RAG_PATTERNS)) {
      let categoryMatches = 0;
      
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match) {
          categoryMatches++;
          if (match[0] && !matchedKeywords.includes(match[0].toLowerCase())) {
            matchedKeywords.push(match[0].toLowerCase());
          }
        }
      }

      // Simple confidence scoring: 0.5 for 1 match, 0.8 for 2, 0.95 for 3+
      let confidence = 0;
      if (categoryMatches === 1) confidence = 0.5;
      else if (categoryMatches === 2) confidence = 0.8;
      else if (categoryMatches >= 3) confidence = 0.95;

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestIntentType = `rag_${intentCategory}` as IntentAnalysis['intentType'];
      }
    }

    // Threshold for triggering RAG (e.g., confidence >= 0.5)
    const requiresRAG = highestConfidence >= 0.5;

    return {
      requiresRAG,
      confidence: highestConfidence,
      matchedKeywords,
      intentType: requiresRAG ? bestIntentType : 'general'
    };
  }
}

// Singleton instance export
export const intentPipeline = new IntentPipeline();
