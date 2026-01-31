class BM25 {
  constructor(documents, options = {}) {
    this.documents = documents;
    this.k1 = options.k1 || 1.5;
    this.b = options.b || 0.75;
    this.idf = {};
    this.avgDocLength = 0;
    this.docLengths = [];

    this.buildIndex();
  }

  buildIndex() {
    const docCount = this.documents.length;
    const termDocCount = {};

    // Calculate document lengths and term frequencies
    this.documents.forEach((doc) => {
      const text = (doc.text || '').toLowerCase();
      const tokens = this.tokenize(text);
      this.docLengths.push(tokens.length);

      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach((term) => {
        termDocCount[term] = (termDocCount[term] || 0) + 1;
      });
    });

    // Calculate average document length
    this.avgDocLength = this.docLengths.reduce((a, b) => a + b, 0) / docCount || 1;

    // Calculate IDF for each term
    Object.keys(termDocCount).forEach((term) => {
      const docsWithTerm = termDocCount[term];
      this.idf[term] = Math.log((docCount - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
    });
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((token) => token.length > 0);
  }

  search(query, limit = 10) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    this.documents.forEach((doc, docIndex) => {
      let score = 0;
      const docText = (doc.text || '').toLowerCase();
      const docTokens = this.tokenize(docText);
      const docLength = this.docLengths[docIndex];

      queryTokens.forEach((term) => {
        const termFreq = docTokens.filter((t) => t === term).length;
        const idf = this.idf[term] || 0;

        const numerator = idf * termFreq * (this.k1 + 1);
        const denominator =
          termFreq + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

        score += numerator / denominator;
      });

      if (score > 0) {
        scores.push({ doc, score, index: docIndex });
      }
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export default BM25;
