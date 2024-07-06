const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { debounce, throttle } = require('lodash');
const { promisify } = require('util');
const readline = require('readline');
const sleep = promisify(setTimeout);

async function question(query, chalk) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(chalk.bold(query), answer => {
    rl.close();
    resolve(answer);
  }));
}

async function analyzeDependencies(chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }

  try {
    console.log(chalk.cyan("Analyzing project dependencies..."));
    await execPromise('npm install dependency-cruiser --save-dev');
    const { stdout } = await execPromise('npx depcruise src --include-only "^src" --output-type dot');
    await fs.writeFile('dependency-graph.dot', stdout);
    console.log(chalk.green("Dependency graph generated: dependency-graph.dot"));
    console.log(chalk.yellow("To visualize, install Graphviz and run: dot -Tpng dependency-graph.dot -o dependency-graph.png"));
  } catch (error) {
    console.error(chalk.red("Error analyzing dependencies:", error.message));
  }
}

async function checkCodeQuality(chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }

  try {
    console.log(chalk.cyan("Checking code quality..."));
    await execPromise('npm install eslint --save-dev');
    await execPromise('npx eslint --init');
    const { stdout, stderr } = await execPromise('npx eslint src');
    console.log(chalk.green("ESLint results:"));
    console.log(stdout);
    if (stderr) console.error(chalk.red("Errors:"), stderr);
  } catch (error) {
    console.error(chalk.red("Error checking code quality:", error.message));
  }
}

async function profilePerformance(filePath, chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }

  try {
    console.log(chalk.cyan(`Profiling performance of ${filePath}...`));
    await execPromise('npm install clinic --save-dev');
    const { stdout } = await execPromise(`npx clinic doctor -- node ${filePath}`);
    console.log(chalk.green("Performance profile generated. Check the generated HTML file for results."));
    console.log(stdout);
  } catch (error) {
    console.error(chalk.red("Error profiling performance:", error.message));
  }
}

async function generateAPIDocs(chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }

  try {
    console.log(chalk.cyan("Generating API documentation..."));
    await execPromise('npm install jsdoc --save-dev');
    await execPromise('npx jsdoc src -r -d docs');
    console.log(chalk.green("API documentation generated in the 'docs' folder."));
  } catch (error) {
    console.error(chalk.red("Error generating API documentation:", error.message));
  }
}

async function automatedCodeReview(filePath, chalk, model) {
  try {
    console.log(chalk.cyan(`Performing automated code review for ${filePath}...`));
    const fileContent = await fs.readFile(filePath, 'utf-8');

    const prompt = `
      Perform a code review on the following code and provide suggestions for improvement:

      ${fileContent}

      Please provide your review in the following format:
      1. Overall assessment
      2. Potential issues or bugs
      3. Code style and readability improvements
      4. Performance optimization suggestions
      5. Security considerations
    `;

    const result = await model.generateContent(prompt);
    const review = result.response.text();

    console.log(chalk.green("Automated Code Review Results:"));
    console.log(review);

    const saveReview = await question(chalk.yellow("Do you want to save this review? (y/n) "), chalk);
    if (saveReview.toLowerCase() === 'y') {
      const reviewPath = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}_review.md`);
      await fs.writeFile(reviewPath, review);
      console.log(chalk.green(`Review saved to ${reviewPath}`));
    }
  } catch (error) {
    console.error(chalk.red("Error performing automated code review:", error.message));
  }
}

async function askAi(filePath, chalk, model) {
  try {
    console.log(chalk.cyan(`AI model is loading...`));
    const prompt = `
      Always Be Active and 100% Confident EXPLAIN LIKE A BUTTER WHAT WE ASK
      ${filePath}
    `;
    const result = await chat.sendMessageStream(userInput);
    let responseText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      process.stdout.write(chunkText);
      responseText += chunkText;
    }
    console.log('\n');
    await processAIResponse(responseText, chalk);
    chatHistory.push({ role: 'user', parts: [{ text: userInput }] });
    chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
   
    console.log(chalk.green("AI Result:"));
    console.log(responseText);

    // Process AI response for file/folder creation
    await processFileCreation(responseText);

  } catch (error) {
    console.error(chalk.red("Error performing AI review:", error.message));
  }
}

async function processFileCreation(response) {
  const lines = response.split('\n');
  let currentFilePath = null;
  let currentFileContent = [];

  for (const line of lines) {
    if (line.startsWith('```folder:')) {
      const folderPath = line.split(':')[1].trim();
      await fs.mkdir(folderPath, { recursive: true });
      console.log(chalk.green(`Created folder: ${folderPath}`));
    } else if (line.startsWith('```file:')) {
      if (currentFilePath) {
        await writeFile(currentFilePath, currentFileContent.join('\n'));
      }
      currentFilePath = line.split(':')[1].trim();
      currentFileContent = [];
    } else if (line === '```' && currentFilePath) {
      await writeFile(currentFilePath, currentFileContent.join('\n'));
      currentFilePath = null;
      currentFileContent = [];
    } else if (currentFilePath) {
      currentFileContent.push(line);
    }
  }

  // Write any remaining file content
  if (currentFilePath) {
    await writeFile(currentFilePath, currentFileContent.join('\n'));
  }
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  console.log(chalk.green(`Created/Updated file: ${filePath}`));
}



async function advancedRealTimeCodeSession(filePath, chalk, model) {
  console.log(chalk.green(`Starting enhanced advanced real-time code session for ${filePath}`));

  let previousContent = '';
  let aiSuggestions = new Map();

  const watcher = chokidar.watch(filePath, {
    persistent: true,
    usePolling: true,
    interval: 100
  });

  const processChanges = debounce(async (path) => {
    try {
      const content = await fs.readFile(path, 'utf-8');
      if (content === previousContent) return;

      console.log(chalk.cyan('File updated. Performing advanced analysis...'));

      // Analyze code structure
      const codeStructure = analyzeCodeStructure(content);
      console.log(chalk.yellow('Code Structure Analysis:'));
      console.log(JSON.stringify(codeStructure, null, 2));

      // Analyze code changes and get AI suggestions
      const changedLines = getChangedLines(previousContent, content);
      for (const lineNumber of changedLines) {
        await processLine(lineNumber, content, model, chalk, aiSuggestions);
      }

      // Generate and display real-time code insights
      const insights = await generateAdvancedCodeInsights(content, model, chalk);

      // Apply AI suggestions and insights to the file
      const updatedContent = applyAISuggestionsAndInsights(content, aiSuggestions, insights);

      // Write updated content with AI-generated comments back to file
      await fs.writeFile(path, updatedContent, 'utf-8');

      console.log(chalk.green('File updated with AI suggestions and insights.'));

      previousContent = updatedContent;
    } catch (error) {
      console.error(chalk.red('Error in real-time session:', error));
    }
  }, 5000); // 5 seconds debounce time

  watcher.on('change', processChanges);

  console.log(chalk.green(`Watching ${filePath} for changes. Press Ctrl+C to stop.`));

  // Keep the process running
  return new Promise(() => { });
}

const processLine = throttle(async (lineNumber, content, model, chalk, aiSuggestions) => {
  const lines = content.split('\n');
  const contextStart = Math.max(0, lineNumber - 3);
  const contextEnd = Math.min(lines.length, lineNumber + 2);
  const contextLines = lines.slice(contextStart, contextEnd);

  const prompt = `
    Analyze this JavaScript code snippet in the context of a larger file:
    
    \`\`\`javascript
    ${contextLines.join('\n')}
    \`\`\`
    
    Focus on line ${lineNumber - contextStart + 1} (1-indexed in this snippet).
    
    Provide:
    1. A concise explanation of the code's purpose.
    2. Potential optimizations or best practices, considering modern JavaScript features.
    3. Possible edge cases or error scenarios, including security considerations.
    4. A suggested inline comment (if appropriate) that adds value beyond just restating the code.
    5. Any potential impact on application performance or scalability.
    
    Format your response as JSON with keys: purpose, optimizations, edgeCases, comment, performanceImpact.
  `;

  try {
    const result = await model.generateContent([{ type: "text", text: prompt }]);
    const suggestion = result.response.text();

    try {
      const parsedSuggestion = parseAIResponse(suggestion);
      aiSuggestions.set(lineNumber, parsedSuggestion);

      // Display AI insights
      console.log(chalk.blue(`AI Insights for line ${lineNumber}:`));
      console.log(chalk.cyan(`Purpose: ${parsedSuggestion.purpose}`));
      console.log(chalk.green(`Optimizations: ${parsedSuggestion.optimizations}`));
      console.log(chalk.yellow(`Edge Cases: ${parsedSuggestion.edgeCases}`));
      console.log(chalk.magenta(`Performance Impact: ${parsedSuggestion.performanceImpact}`));

      // Automatically insert AI-generated inline comment
      if (parsedSuggestion.comment) {
        content = insertInlineComment(content, lineNumber, parsedSuggestion.comment);
      }
    } catch (parseError) {
      console.error(chalk.red('Error parsing AI suggestion:', parseError.message));
    }
  } catch (error) {
    console.error(chalk.red('Error generating AI suggestion:', error.message));
    if (error.message.includes('429')) {
      console.log(chalk.yellow('Rate limit reached. Implementing exponential backoff...'));
      await exponentialBackoff(() => processLine(lineNumber, content, model, chalk, aiSuggestions));
    }
  }
}, 10000, { leading: true, trailing: false }); // Throttle to one request per 10 seconds

async function exponentialBackoff(func, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await func();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      console.log(chalk.yellow(`Retrying in ${delay / 1000} seconds...`));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function parseAIResponse(response) {
  try {
    return JSON.parse(response);
  } catch (e) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn(chalk.yellow('Failed to parse AI response as JSON. Extracting available information.'));
        return {
          purpose: extractInfo(response, 'purpose'),
          optimizations: extractInfo(response, 'optimizations'),
          edgeCases: extractInfo(response, 'edge cases'),
          comment: extractInfo(response, 'comment'),
          performanceImpact: extractInfo(response, 'performance impact')
        };
      }
    } else {
      throw new Error('Unable to parse AI response');
    }
  }
}

function extractInfo(text, key) {
  const regex = new RegExp(`${key}:?\\s*(.+?)(?=\\n|$)`, 'is');
  const match = text.match(regex);
  return match ? match[1].trim() : 'Information not available';
}

function analyzeCodeStructure(content) {
  const structure = {
    functionCount: 0,
    asyncFunctionCount: 0,
    classCount: 0,
    importCount: 0,
    exportCount: 0,
    loopCount: 0,
    conditionalCount: 0,
    tryBlockCount: 0,
    callbackCount: 0,
    promiseCount: 0,
    complexityScore: 0
  };

  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.match(/\bfunction\s+\w+\s*\(/)) structure.functionCount++;
    if (line.match(/\basync\s+function\s+\w+\s*\(/)) structure.asyncFunctionCount++;
    if (line.match(/\bclass\s+\w+/)) structure.classCount++;
    if (line.match(/\bimport\s+.+from/)) structure.importCount++;
    if (line.match(/\bexport\s+(default\s+)?\w+/)) structure.exportCount++;
    if (line.match(/\b(for|while)\s*\(/)) structure.loopCount++;
    if (line.match(/\bif\s*\(/)) structure.conditionalCount++;
    if (line.match(/\btry\s*\{/)) structure.tryBlockCount++;
    if (line.match(/\b\w+\s*\(\s*(?:function|\([^)]*\)\s*=>\s*{)/)) structure.callbackCount++;
    if (line.match(/\bnew\s+Promise\s*\(/)) structure.promiseCount++;
  });

  structure.complexityScore = calculateComplexityScore(structure);

  return structure;
}

function calculateComplexityScore(structure) {
  return (
    structure.functionCount * 2 +
    structure.asyncFunctionCount * 3 +
    structure.classCount * 4 +
    structure.loopCount * 2 +
    structure.conditionalCount * 1.5 +
    structure.tryBlockCount * 1 +
    structure.callbackCount * 1.5 +
    structure.promiseCount * 2
  );
}

function getChangedLines(oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const changedLines = [];

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      changedLines.push(i + 1);
    }
  }

  return changedLines;
}

function applyAISuggestionsAndInsights(content, aiSuggestions, insights) {
  let lines = content.split('\n');

  // Apply line-specific suggestions
  for (const [lineNumber, suggestion] of aiSuggestions.entries()) {
    lines[lineNumber - 1] = `${lines[lineNumber - 1]} // AI: ${suggestion.comment}`;
  }

  // Add overall insights as a comment block at the top of the file
  const insightComments = [
    '/**',
    ' * AI-Generated Code Insights:',
    ` * Quality Score: ${insights.qualityScore}`,
    ` * Security Issues: ${insights.securityIssues}`,
    ` * Scalability: ${insights.scalabilityConsiderations}`,
    ' * Top Improvements:',
    ...insights.improvements.map((imp, i) => ` *   ${i + 1}. ${imp}`),
    ` * Architecture: ${insights.architectureAssessment}`,
    ` * Performance Considerations: ${insights.performanceConsiderations}`,
    ' */',
    ''
  ];

  return [...insightComments, ...lines].join('\n');
}

function insertInlineComment(content, lineNumber, comment) {
  const lines = content.split('\n');
  lines[lineNumber - 1] += ` // AI: ${comment}`;
  return lines.join('\n');
}

async function generateAdvancedCodeInsights(content, model, chalk) {
  const insightPrompt = `
    Perform an advanced analysis of this JavaScript code and provide detailed insights:
    
    \`\`\`javascript
    ${content}
    \`\`\`
    
    Provide:
    1. Code quality score (0-100) with detailed justification.
    2. Potential security vulnerabilities, including specific attack vectors if applicable.
    3. Scalability considerations, focusing on potential bottlenecks.
    4. Top 5 improvement suggestions, ordered by priority.
    5. Overall code architecture assessment, including patterns used and potential improvements.
    6. Performance considerations and optimization opportunities.
    7. Maintainability score (0-100) with justification.
    8. Code smell detection and refactoring suggestions.
    
    Format your response as JSON with keys: qualityScore, qualityJustification, securityIssues, scalabilityConsiderations, improvements, architectureAssessment, performanceConsiderations, maintainabilityScore, maintainabilityJustification, codeSmells.
  `;

  try {
    const result = await model.generateContent([{ type: "text", text: insightPrompt }]);
    const insightText = result.response.text();

    try {
      const insights = parseAIResponse(insightText);
      displayInsights(insights, chalk);
      return insights;
    } catch (parseError) {
      console.error(chalk.red('Error parsing advanced code insights:', parseError.message));
      return {};
    }
  } catch (error) {
    console.error(chalk.red('Error generating advanced code insights:', error.message));
    if (error.message.includes('429')) {
      console.log(chalk.yellow('Rate limit reached for code insights. Implementing exponential backoff...'));
      return await exponentialBackoff(() => generateAdvancedCodeInsights(content, model, chalk));
    }
  }
}

function displayInsights(insights, chalk) {
  console.log(chalk.green(`Code Quality Score: ${insights.qualityScore || 'N/A'}`));
  console.log(chalk.yellow(`Quality Justification: ${insights.qualityJustification || 'N/A'}`));
  console.log(chalk.red(`Security Issues: ${insights.securityIssues || 'N/A'}`));
  console.log(chalk.blue(`Scalability Considerations: ${insights.scalabilityConsiderations || 'N/A'}`));
  console.log(chalk.magenta('Top 5 Improvements:'));
  (insights.improvements || []).forEach((improvement, index) => {
    console.log(chalk.magenta(`  ${index + 1}. ${improvement}`));
  });
  console.log(chalk.cyan(`Architecture Assessment: ${insights.architectureAssessment || 'N/A'}`));
  console.log(chalk.yellow(`Performance Considerations: ${insights.performanceConsiderations || 'N/A'}`));
  console.log(chalk.green(`Maintainability Score: ${insights.maintainabilityScore || 'N/A'}`));
  console.log(chalk.yellow(`Maintainability Justification: ${insights.maintainabilityJustification || 'N/A'}`));
  console.log(chalk.red('Code Smells:'));
  (insights.codeSmells || []).forEach((smell, index) => {
    console.log(chalk.red(`  ${index + 1}. ${smell}`));
  });
}


module.exports = {
  analyzeDependencies,
  checkCodeQuality,
  profilePerformance,
  generateAPIDocs,
  automatedCodeReview,
  askAi,
  advancedRealTimeCodeSession
};
