class GroqAPI {
    constructor(apiKey) {
      this.apiKey = apiKey;
      this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    }
  
    // Helper function to extract the entire code block (including the delimiters)
    extractBlock(text) {
      // Matches a block that starts with ``` and ends with ```
      const regex = /(```[\s\S]*?```)/;
      const match = text.match(regex);
      return match && match[1] ? match[1].trim() : text;
    }
  
    async sendMessage(prompt, modelName) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{
              role: 'user',
              content: prompt
            }],
            temperature: 0.2,
            max_tokens: 8000
          })
        });
  
        if (!response.ok) {
          const errorData = await response.text();
          console.error('API Response:', response.status, errorData);
          throw new Error(`API call failed: ${response.status} - ${errorData}`);
        }
  
        const data = await response.json();
        console.log('Groq API response:', data);
  
        // Extract the entire code block (with ``` and closing ```)
        const rawContent = data.choices[0].message.content;
        const responseContent = this.extractBlock(rawContent);
  
        return {
          content: responseContent
        };
      } catch (error) {
        console.error('Error calling Groq API:', error);
        throw error;
      }
    }
  }  