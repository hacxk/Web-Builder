require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const diff = require('diff');

// Language-specific parsers
const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babelGenerate = require('@babel/generator').default;
const typescript = require('typescript');
const pythonParser = require('tree-sitter-python');
const Parser = require('tree-sitter');

const util = require('util');
const execPromise = util.promisify(exec);
const {
  analyzeDependencies,
  checkCodeQuality,
  profilePerformance,
  generateAPIDocs,
  automatedCodeReview,
  askAi,
  advancedRealTimeCodeSession
} = require('./advanced_self_upgrading_assistant');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

let currentProject = null;
let chatHistory = [];
let chalk;
async function loadChalk() {
  return (await import('chalk')).default;
}

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

async function createFileOrFolder(path, content = null, chalk) {
  try {
    if (content === null) {
      await fs.mkdir(path, { recursive: true });
      console.log(chalk.green(`Folder created: ${path}`));
    } else {
      const dirPath = path.dirname(path);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path, content);
      console.log(chalk.green(`File created: ${path}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error creating file/folder: ${path}`, error.message));
  }
}

async function processAIResponse(response, chalk, originalFilePath) {
  const fileCreationRegex = /```file:(.+?)\n([\s\S]*?)```/g;
  const folderCreationRegex = /```folder:(.+?)```/g;
  let match;

  try {
    while ((match = fileCreationRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2].trim();

      if (filePath === originalFilePath) {
        // Update the original file
        await fs.writeFile(filePath, fileContent, 'utf-8');
        console.log(chalk.green(`Updated file: ${filePath}`));
      } else {
        // Create a new file
        await createFileOrFolder(filePath, fileContent, chalk);
      }
    }

    while ((match = folderCreationRegex.exec(response)) !== null) {
      const folderPath = match[1].trim();
      await createFileOrFolder(folderPath, null, chalk);
    }
  } catch (error) {
    console.error(chalk.red(`Error processing AI response: ${error.message}`));
  }
}

async function upgradeFunction(functionName, functionCode, model, previousFunctions, chalk) {
  const context = previousFunctions.map(fn => `${fn.name}:\n${fn.code}`).join('\n\n');
  const prompt = `
    You are an AI specialized in improving JavaScript code. Your task is to enhance the following function:
   
    ${functionName}:
    ${functionCode}
    Context of previously upgraded functions:
    ${context}
    Please improve this function considering the following aspects:
    1. Performance optimization
    2. Code readability and maintainability
    3. Error handling and robustness
    4. Modern JavaScript features and best practices
    5. Consistency with previously upgraded functions
    6. Advanced AI-driven code generation capabilities
    7. Enhanced project management features
    8. Improved self-upgrading mechanisms
    9. Security enhancements
    10. Scalability improvements
    11. Integration with external APIs or services if applicable
    12. Implementation of design patterns where appropriate
    Provide the entire improved function within a code block using the format:
    \`\`\`javascript
    // Improved function here
    \`\`\`
    Also, provide a brief explanation of the improvements made, including any potential trade-offs or considerations.
  `;
  console.log(chalk.yellow(`Upgrading function: ${functionName}`));
  try {
    const result = await model.generateContent(prompt);
    const improvedCode = result.response.text();
    const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)\s*```/;
    const match = improvedCode.match(codeBlockRegex);
    if (match) {
      const upgradedFunction = match[1].trim();
      const explanation = improvedCode.split('```')[2]?.trim() || 'No explanation provided.';
      return { upgradedFunction, explanation };
    } else {
      throw new Error('No valid code block found in AI response');
    }
  } catch (error) {
    console.error(chalk.red(`Error in AI response for ${functionName}:`, error.message));
    throw error;
  }
}

async function upgradeSelf(chalk, model) {
  const fileName = 'upgrade.js';
  let fileContent;
  try {
    fileContent = await fs.readFile(fileName, 'utf-8');
  } catch (error) {
    console.error(chalk.red(`Error reading file ${fileName}:`, error.message));
    return;
  }

  const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}/g;
  let upgradedContent = fileContent;
  const upgradedFunctions = [];
  console.log(chalk.cyan('Starting advanced self-upgrade process...'));

  // Create a backup before making any changes
  const backupFileName = `${fileName}.backup-${Date.now()}.js`;
  try {
    await fs.writeFile(backupFileName, fileContent);
    console.log(chalk.green(`Original file backed up as: ${backupFileName}`));
  } catch (error) {
    console.error(chalk.red(`Error creating backup file:`, error.message));
    return;
  }

  // Analyze dependencies and update them if necessary
  await updateDependencies(chalk);

  let match;
  while ((match = functionRegex.exec(fileContent)) !== null) {
    const functionName = match[1];
    const functionCode = match[0];
    console.log(chalk.yellow(`Found function: ${functionName}`));
    try {
      const { upgradedFunction, explanation } = await upgradeFunction(functionName, functionCode, model, upgradedFunctions, chalk);

      // Use a more precise replacement method
      upgradedContent = upgradedContent.replace(
        new RegExp(`(^|\\n)${escapeRegExp(functionCode)}($|\\n)`, 'g'),
        `$1${upgradedFunction}$2`
      );

      upgradedFunctions.push({ name: functionName, code: upgradedFunction });
      console.log(chalk.green(`Function ${functionName} upgraded successfully.`));
      console.log(chalk.blue('Improvements:'));
      console.log(chalk.blue(explanation));

      // Validate the upgraded function
      await validateFunction(upgradedFunction, chalk);
    } catch (error) {
      console.error(chalk.red(`Error upgrading function ${functionName}:`, error.message));
      console.log(chalk.yellow(`Keeping original implementation for ${functionName}`));
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  // Add new features if necessary
  try {
    upgradedContent = await addNewFeatures(upgradedContent, model, chalk);
  } catch (error) {
    console.error(chalk.red(`Error adding new features:`, error.message));
  }

  try {
    await fs.writeFile(fileName, upgradedContent);
    console.log(chalk.green('Advanced self-upgrade complete. New version saved.'));
  } catch (error) {
    console.error(chalk.red(`Error writing upgraded file:`, error.message));
    return;
  }

  // Run tests if available
  await runTests(chalk);

  const shouldRestart = await question(chalk.yellow('Do you want to restart the program now to use the upgraded version? (y/n) '), chalk);
  if (shouldRestart.toLowerCase() === 'y') {
    console.log(chalk.green('Restarting the program...'));
    restartProgram();
  } else {
    console.log(chalk.yellow('Please restart the program manually to use the upgraded version.'));
  }
}

function restartProgram() {
  process.on('exit', () => {
    require('child_process').spawn(process.argv[0], process.argv.slice(1), {
      cwd: process.cwd(),
      detached: true,
      stdio: 'inherit'
    });
  });
  process.exit();
}

async function updateDependencies(chalk) {
  console.log(chalk.cyan('Checking for dependency updates...'));
  try {
    const { stdout } = await execAsync('npm outdated --json');
    let outdatedDeps;
    try {
      outdatedDeps = JSON.parse(stdout);
    } catch (parseError) {
      console.error(chalk.red('Error parsing npm outdated output:', parseError.message));
      console.log(chalk.yellow('Raw output:'), stdout);
      return;
    }
    if (Object.keys(outdatedDeps).length > 0) {
      console.log(chalk.yellow('Updating dependencies...'));
      const { stdout: updateStdout, stderr: updateStderr } = await execAsync('npm update');
      console.log(chalk.green('Dependencies updated successfully.'));
      console.log(chalk.blue('Update details:'), updateStdout);
      if (updateStderr) console.log(chalk.yellow('Update warnings:'), updateStderr);
    } else {
      console.log(chalk.green('All dependencies are up to date.'));
    }
  } catch (error) {
    console.error(chalk.red('Error updating dependencies:', error.message));
    if (error.stdout) console.log(chalk.yellow('Command output:'), error.stdout);
    if (error.stderr) console.log(chalk.yellow('Command errors:'), error.stderr);
  }
}


async function validateFunction(functionCode, chalk) {
  try {
    // Use a JavaScript runtime to evaluate the function
    new Function(functionCode);
    console.log(chalk.green('Function validated successfully.'));
  } catch (error) {
    console.error(chalk.red('Function validation failed:', error.message));
    throw error; // Re-throw to trigger the recovery mechanism
  }
}

async function addNewFeatures(content, model, chalk) {
  console.log(chalk.cyan('Analyzing for potential new features...'));
  const prompt = `
    Analyze the following code and suggest new features or functions that could enhance its capabilities:
    ${content}
    Provide suggestions in the following format:
    1. [Feature Name]: [Brief description]
    \`\`\`javascript
    // Implementation
    \`\`\`
    2. [Feature Name]: [Brief description]
    \`\`\`javascript
    // Implementation
    \`\`\`
    ...
  `;
  const result = await model.generateContent(prompt);
  const suggestions = result.response.text();
  console.log(chalk.yellow('AI Suggestions for new features:'));
  console.log(suggestions);

  const shouldAdd = await question(chalk.yellow('Do you want to add these new features? (y/n) '), chalk);
  if (shouldAdd.toLowerCase() === 'y') {
    const featureRegex = /\d+\.\s+\[(.+?)\]:[^\n]+\n```(?:javascript|js)?\s*([\s\S]*?)```/g;
    let match;
    while ((match = featureRegex.exec(suggestions)) !== null) {
      const [, featureName, implementation] = match;
      content += `\n\n// New feature: ${featureName}\n${implementation.trim()}`;
    }
    console.log(chalk.green('New features added successfully.'));
  }
  return content;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runTests(chalk) {
  console.log(chalk.cyan('Running tests...'));
  try {
    const { stdout, stderr } = await execAsync('npm test');
    console.log(chalk.green('Tests completed successfully.'));
    console.log(chalk.blue('Test output:'), stdout);
    if (stderr) console.log(chalk.yellow('Test warnings:'), stderr);
  } catch (error) {
    console.error(chalk.red('Error running tests:', error.message));
    if (error.stdout) console.log(chalk.yellow('Test output:'), error.stdout);
    if (error.stderr) console.log(chalk.yellow('Test errors:'), error.stderr);
  }
}

async function question(query, chalk) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(query, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}


async function createFileOrFolder(pathString, content, chalk) {
  try {
    const normalizedPath = path.normalize(pathString);
    const dirname = path.dirname(normalizedPath);

    if (content === null) {
      // This is a folder
      await fs.mkdir(normalizedPath, { recursive: true });
      console.log(chalk.green(`Created folder: ${normalizedPath}`));
    } else {
      // This is a file
      await fs.mkdir(dirname, { recursive: true });
      await fs.writeFile(normalizedPath, content);
      console.log(chalk.green(`Created/Updated file: ${normalizedPath}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error creating file/folder ${pathString}: ${error.message}`));
  }
}

async function createProject(projectName, chalk, model) {
  try {
    currentProject = projectName;
    await fs.mkdir(projectName);
    process.chdir(projectName);
    await execPromise('npm init -y');
    console.log(chalk.green(`Project ${projectName} created and initialized.`));

    // Generate project structure using AI
    const projectStructurePrompt = `Generate a modern project structure for a ${projectName} project. Include common directories and essential files. Use the following format for your response:

    \`\`\`folder:./src
    \`\`\`
    \`\`\`folder:./tests
    \`\`\`
    \`\`\`file:./src/index.js
    // Main entry point
    console.log('Hello, ${projectName}!');
    \`\`\`
    \`\`\`file:./README.md
    # ${projectName}

    Project description and setup instructions go here.
    \`\`\`
    `;

    const result = await model.generateContent(projectStructurePrompt);
    const generatedStructure = result.response.text();
    await processAIResponse(generatedStructure, chalk);

    console.log(chalk.green('AI-generated project structure created.'));
  } catch (error) {
    console.error(chalk.red("Error creating project:", error.message));
  }
}

async function installDependency(dependency, chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }
  try {
    await execPromise(`npm install ${dependency}`);
    console.log(chalk.green(`Installed ${dependency}`));

    // Update package.json
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    packageJson.dependencies[dependency] = `^${(await execPromise(`npm view ${dependency} version`)).stdout.trim()}`;
    await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
    console.log(chalk.green('package.json updated'));
  } catch (error) {
    console.error(chalk.red("Error installing dependency:", error.message));
  }
}

async function runCommand(command, chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }
  try {
    const { stdout, stderr } = await execPromise(command);
    console.log('stdout:', stdout);
    if (stderr) console.error('stderr:', stderr);
  } catch (error) {
    console.error(chalk.red("Error running command:", error.message));
  }
}

// Improved searchFiles function with advanced options and error handling
async function searchFiles(keyword, options = {}, chalk) {
  const { caseSensitive = false, fileType = null, recursive = false, maxDepth = Infinity } = options;
  const searchDir = async (dir, depth = 0) => {
    if (depth > maxDepth) return [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let results = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && recursive) {
          results = results.concat(await searchDir(fullPath, depth + 1));
        } else if (entry.isFile()) {
          if (fileType && !entry.name.endsWith(`.${fileType}`)) continue;
          const match = caseSensitive ? entry.name.includes(keyword) : entry.name.toLowerCase().includes(keyword.toLowerCase());
          if (match) results.push(fullPath);
        }
      }
      return results;
    } catch (error) {
      console.error(chalk.red(`Error searching in directory ${dir}:`, error.message));
      return [];
    }
  };

  try {
    const matchingFiles = await searchDir('.');
    console.log(chalk.cyan(`Files matching '${keyword}':`));
    matchingFiles.forEach(file => console.log(chalk.cyan(file)));
    return matchingFiles;
  } catch (error) {
    throw new Error(`Error searching files: ${error.message}`);
  }
}

async function gitOperations(operation, args, chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }

  try {
    switch (operation) {
      case 'init':
        await execPromise('git init');
        console.log(chalk.green('Git repository initialized.'));
        break;
      case 'add':
        await execPromise(`git add ${args.join(' ')}`);
        console.log(chalk.green('Files added to staging area.'));
        break;
      case 'commit':
        await execPromise(`git commit -m "${args.join(' ')}"`);
        console.log(chalk.green('Changes committed.'));
        break;
      case 'status':
        const { stdout } = await execPromise('git status');
        console.log(chalk.cyan('Git status:'));
        console.log(stdout);
        break;
      default:
        console.log(chalk.yellow(`Unsupported git operation: ${operation}`));
    }
  } catch (error) {
    console.error(chalk.red("Error performing git operation:", error.message));
  }
}

// Improved saveCodeSnippet with tagging and versioning
async function saveCodeSnippet(name, content, tags, chalk) {
  try {
    const snippetsDir = path.join(currentProject || '.', 'snippets');
    await fs.mkdir(snippetsDir, { recursive: true });
    const snippetFile = path.join(snippetsDir, `${name}.json`);
    let snippet = { versions: [] };

    if (await fs.access(snippetFile).then(() => true).catch(() => false)) {
      snippet = JSON.parse(await fs.readFile(snippetFile, 'utf-8'));
    }

    const newVersion = {
      content,
      tags,
      timestamp: new Date().toISOString(),
      version: snippet.versions.length + 1
    };

    snippet.versions.unshift(newVersion);
    await fs.writeFile(snippetFile, JSON.stringify(snippet, null, 2));
    console.log(chalk.green(`Snippet '${name}' saved (version ${newVersion.version})`));
  } catch (error) {
    throw new Error(`Error saving code snippet: ${error.message}`);
  }
}

// Improved listCodeSnippets with filtering by tags and version history
async function listCodeSnippets(options = {}, chalk) {
  const { tag, showVersions = false } = options;
  try {
    const snippetsDir = path.join(currentProject || '.', 'snippets');
    const files = await fs.readdir(snippetsDir);
    console.log(chalk.cyan('Saved code snippets:'));
    for (const file of files) {
      const snippetContent = JSON.parse(await fs.readFile(path.join(snippetsDir, file), 'utf-8'));
      const latestVersion = snippetContent.versions[0];
      if (!tag || latestVersion.tags.includes(tag)) {
        console.log(chalk.cyan(`- ${path.parse(file).name} (Tags: ${latestVersion.tags.join(', ')})`));
        if (showVersions) {
          snippetContent.versions.forEach((version, index) => {
            console.log(chalk.gray(`  Version ${version.version}: ${new Date(version.timestamp).toLocaleString()}`));
          });
        }
      }
    }
  } catch (error) {
    console.log(chalk.yellow('No saved snippets found or error occurred:', error.message));
  }
}

async function advancedInteractiveCodeReview(filePath, chalk, model) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileExtension = path.extname(filePath).toLowerCase();
    console.log(chalk.yellow(`Starting advanced interactive code review for ${filePath}`));

    let updatedContent;
    try {
      switch (fileExtension) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          updatedContent = await reviewJavaScriptTypescript(fileContent, filePath, chalk, model, fileExtension);
          break;
        case '.py':
          updatedContent = await reviewPython(fileContent, filePath, chalk, model);
          break;
        default:
          updatedContent = await reviewGeneric(fileContent, filePath, chalk, model);
      }
    } catch (parseError) {
      console.error(chalk.red(`Error parsing file: ${parseError.message}`));
      console.log(chalk.yellow('Falling back to generic line-by-line review.'));
      updatedContent = await reviewGeneric(fileContent, filePath, chalk, model);
    }

    // Show diff and ask for confirmation
    console.log(chalk.cyan('\nReview Changes:'));
    const changes = diff.diffLines(fileContent, updatedContent);
    changes.forEach((part) => {
      const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.grey;
      process.stdout.write(color(part.value));
    });

    const confirmChanges = await question('\nApply these changes? (y/n): ', chalk);
    if (confirmChanges.toLowerCase() === 'y') {
      await fs.writeFile(filePath, updatedContent);
      console.log(chalk.green(`Advanced interactive code review completed for ${filePath}`));
    } else {
      console.log(chalk.yellow('Changes discarded.'));
    }
  } catch (error) {
    console.error(chalk.red(`Error during advanced interactive code review: ${error.message}`));
  }
}

async function reviewJavaScriptTypescript(fileContent, filePath, chalk, model, fileExtension) {
  const isTypescript = ['.ts', '.tsx'].includes(fileExtension);
  let ast;
  try {
    ast = babelParser.parse(fileContent, {
      sourceType: 'module',
      plugins: ['jsx', ...(isTypescript ? ['typescript'] : [])],
    });
  } catch (parseError) {
    console.error(chalk.red(`Error parsing ${isTypescript ? 'TypeScript' : 'JavaScript'} file: ${parseError.message}`));
    throw parseError;
  }

  const functions = [];
  babelTraverse(ast, {
    FunctionDeclaration(path) {
      functions.push(path);
    },
    ArrowFunctionExpression(path) {
      if (path.parent.type === 'VariableDeclarator') {
        functions.push(path);
      }
    },
    ClassMethod(path) {
      functions.push(path);
    },
  });

  for (const functionPath of functions) {
    const functionCode = babelGenerate(functionPath.node).code;
    console.log(chalk.cyan('\nReviewing function:'));
    console.log(chalk.white(functionCode));

    const suggestion = await getAISuggestion(functionCode, filePath, model);
    console.log(chalk.yellow('AI Suggestion:'), suggestion);

    if (suggestion.toLowerCase() !== "no improvements needed") {
      const userAction = await question('Apply this suggestion? (y/n/e/skip): ', chalk);
      if (userAction.toLowerCase() === 'y') {
        const improvedCode = await getAIImprovement(functionCode, suggestion, model);
        try {
          const improvedAst = babelParser.parse(improvedCode, {
            sourceType: 'module',
            plugins: ['jsx', ...(isTypescript ? ['typescript'] : [])],
          });
          functionPath.replaceWith(improvedAst.program.body[0]);
          console.log(chalk.green('Function updated.'));
        } catch (parseError) {
          console.error(chalk.red(`Error parsing improved code: ${parseError.message}`));
          console.log(chalk.yellow('Skipping this improvement.'));
        }
      } else if (userAction.toLowerCase() === 'e') {
        const manualEdit = await question('Enter your manual edit (entire function): ', chalk);
        try {
          const manualAst = babelParser.parse(manualEdit, {
            sourceType: 'module',
            plugins: ['jsx', ...(isTypescript ? ['typescript'] : [])],
          });
          functionPath.replaceWith(manualAst.program.body[0]);
          console.log(chalk.green('Function manually updated.'));
        } catch (parseError) {
          console.error(chalk.red(`Error parsing manual edit: ${parseError.message}`));
          console.log(chalk.yellow('Skipping this manual edit.'));
        }
      } else if (userAction.toLowerCase() === 'skip') {
        console.log(chalk.yellow('Skipping remaining functions.'));
        break;
      }
    }
  }

  return babelGenerate(ast).code;
}

async function reviewPython(fileContent, filePath, chalk, model) {
  const parser = new Parser();
  parser.setLanguage(pythonParser);
  const tree = parser.parse(fileContent);

  const functions = [];
  traverseTree(tree.rootNode, (node) => {
    if (node.type === 'function_definition') {
      functions.push(node);
    }
  });

  let updatedContent = fileContent;
  for (const functionNode of functions) {
    const functionCode = fileContent.slice(functionNode.startIndex, functionNode.endIndex);
    console.log(chalk.cyan('\nReviewing function:'));
    console.log(chalk.white(functionCode));

    const suggestion = await getAISuggestion(functionCode, filePath, model);
    console.log(chalk.yellow('AI Suggestion:'), suggestion);

    if (suggestion.toLowerCase() !== "no improvements needed") {
      const userAction = await question('Apply this suggestion? (y/n/e/skip): ', chalk);
      if (userAction.toLowerCase() === 'y') {
        const improvedCode = await getAIImprovement(functionCode, suggestion, model);
        updatedContent = updatedContent.slice(0, functionNode.startIndex) + improvedCode + updatedContent.slice(functionNode.endIndex);
        console.log(chalk.green('Function updated.'));
      } else if (userAction.toLowerCase() === 'e') {
        const manualEdit = await question('Enter your manual edit (entire function): ', chalk);
        updatedContent = updatedContent.slice(0, functionNode.startIndex) + manualEdit + updatedContent.slice(functionNode.endIndex);
        console.log(chalk.green('Function manually updated.'));
      } else if (userAction.toLowerCase() === 'skip') {
        console.log(chalk.yellow('Skipping remaining functions.'));
        break;
      }
    }
  }

  return updatedContent;
}

async function reviewGeneric(fileContent, filePath, chalk, model) {
  const lines = fileContent.split('\n');
  const updatedLines = [...lines];

  for (let i = 0; i < lines.length; i++) {
    console.log(chalk.cyan(`Line ${i + 1}: ${lines[i]}`));
    const suggestion = await getAISuggestion(lines[i], filePath, model, i + 1);
    console.log(chalk.yellow('AI Suggestion:'), suggestion);

    if (suggestion.toLowerCase() !== "no improvements needed") {
      const userAction = await question('Apply this suggestion? (y/n/e/skip): ', chalk);
      if (userAction.toLowerCase() === 'y') {
        const improvedLine = await getAIImprovement(lines[i], suggestion, model);
        updatedLines[i] = improvedLine.trim();
        console.log(chalk.green('Line updated.'));
      } else if (userAction.toLowerCase() === 'e') {
        const manualEdit = await question('Enter your manual edit: ', chalk);
        updatedLines[i] = manualEdit;
        console.log(chalk.green('Line manually updated.'));
      } else if (userAction.toLowerCase() === 'skip') {
        console.log(chalk.yellow('Skipping remaining lines.'));
        break;
      }
    }
  }

  return updatedLines.join('\n');
}

async function getAISuggestion(code, filePath, model, lineNumber = null) {
  const prompt = lineNumber
    ? `Analyze the following line of code and provide suggestions for improvement:
       ${code}
       Context: This is line ${lineNumber} of the file ${filePath}.
       Provide a brief suggestion if improvements can be made, or say "No improvements needed" if the line is good as is.`
    : `Analyze the following code and provide suggestions for improvement:
       ${code}
       Context: This code is from the file ${filePath}.
       Provide a brief suggestion if improvements can be made, or say "No improvements needed" if the code is good as is.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function getAIImprovement(code, suggestion, model) {
  const prompt = `Given the original code:
    ${code}
    And the suggestion:
    ${suggestion}
    Provide an improved version of the code, implementing the suggestion.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function traverseTree(node, callback) {
  callback(node);
  for (let i = 0; i < node.childCount; i++) {
    traverseTree(node.child(i), callback);
  }
}

async function question(prompt, chalk) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(chalk.blue(prompt), (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

async function runTests(testCommand, chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }
  console.log(chalk.cyan(`Running tests: ${testCommand}`));
  try {
    const { stdout, stderr } = await execPromise(testCommand);
    console.log(chalk.green('Test results:'));
    console.log(stdout);
    if (stderr) console.error(chalk.red('Errors:'), stderr);
  } catch (error) {
    console.error(chalk.red('Error running tests:'), error.message);
  }
}

async function upgradeFile(filePath, chalk, model, fileType, upgradePlan) {
  console.log(chalk.yellow(`Upgrading file: ${filePath}`));
  const originalContent = await fs.readFile(filePath, 'utf-8');

  const upgradePrompt = `
    Upgrade the following ${fileType} code according to the upgrade plan:
    Upgrade Plan: ${JSON.stringify(upgradePlan, null, 2)}

    Original ${filePath} Code:
    \`\`\`${filePath}
    ${originalContent}
    \`\`\`

    Provide the upgraded code within a code block and explain the changes made.
  `;

  let retries = 3;
  while (retries > 0) {
    try {
      await delay(5000)
      const result = await model.generateContent(upgradePrompt);
      const aiResponse = result.response.text();

      const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/;
      const match = aiResponse.match(codeBlockRegex);

      if (match) {
        const upgradedCode = match[1].trim();
        await fs.writeFile(filePath, upgradedCode);
        console.log(chalk.green(`File ${filePath} has been upgraded.`));

        const explanation = aiResponse.split('```').pop().trim();
        return {
          file: filePath,
          changes: diffSummary(originalContent, upgradedCode),
          explanation: explanation
        };
      } else {
        throw new Error('Failed to extract upgraded code from AI response');
      }
    } catch (error) {
      console.error(chalk.yellow(`Error upgrading file ${filePath}, retrying... (${retries} attempts left)`));
      console.error(chalk.yellow(error));
      retries--;
      if (retries === 0) {
        console.error(chalk.red(`Failed to upgrade file ${filePath} after multiple attempts`));
        return {
          file: filePath,
          changes: 'Upgrade failed',
          explanation: `Error: ${error.message}`
        };
      }
      await delay(5000); // Wait 5 seconds before retrying
    }
  }
}


function getFileType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const fileTypeMap = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.css': 'css',
    '.html': 'html',
    '.json': 'json',
    // Add more mappings as needed
  };
  return fileTypeMap[extension] || 'unknown';
}

function isUpgradableFile(fileType) {
  const upgradableTypes = ['javascript', 'typescript', 'python', 'java', 'css', 'html', 'json'];
  return upgradableTypes.includes(fileType);
}

function diffSummary(originalContent, upgradedContent) {
  const changes = diff.diffLines(originalContent, upgradedContent);
  let added = 0, removed = 0, changed = 0;

  changes.forEach((part) => {
    if (part.added) added += part.count;
    else if (part.removed) removed += part.count;
    else changed += part.count;
  });

  return `${added} lines added, ${removed} lines removed, ${changed} lines changed`;
}

async function performPostUpgradeActions(folderPath, upgradePlan, upgradeSummary, chalk, model) {
  console.log(chalk.cyan('Performing post-upgrade actions...'));

  // Update dependencies
  if (upgradePlan.dependencyUpdates) {
    console.log(chalk.yellow('Updating dependencies...'));
    for (const [dep, version] of Object.entries(upgradePlan.dependencyUpdates)) {
      try {
        await execPromise(`npm install ${dep}@${version}`);
        console.log(chalk.green(`Updated ${dep} to version ${version}`));
      } catch (error) {
        console.error(chalk.red(`Failed to update ${dep}:`, error.message));
      }
    }
  }

  // Generate updated documentation
  console.log(chalk.yellow('Generating updated documentation...'));
  await generateDocumentation(folderPath, chalk, model, upgradeSummary);

  // Run tests if available
  if (await fs.access(path.join(folderPath, 'package.json')).then(() => true).catch(() => false)) {
    console.log(chalk.yellow('Running tests...'));
    try {
      const { stdout } = await execPromise('npm test');
      console.log(chalk.green('Tests completed successfully.'));
      console.log(stdout);
    } catch (error) {
      console.error(chalk.red('Error running tests:', error.message));
    }
  }

  console.log(chalk.green('Post-upgrade actions completed.'));
}

async function upgradeFolder(folderPath, chalk, model) {
  try {
    const files = await fs.readdir(folderPath, { withFileTypes: true });
    const totalFiles = files.length;
    let processedFiles = 0;
    const upgradeSummary = [];

    console.log(chalk.cyan(`Starting advanced folder upgrade for ${folderPath}`));
    console.log(chalk.yellow('Analyzing folder structure and files...'));

    // Analyze folder structure
    const folderStructure = await analyzeFolderStructure(folderPath);
    console.log(chalk.blue('Folder structure analysis complete.'));

    // Generate upgrade plan with delay
    await delay(1000); // Add a 1-second delay before making the API call
    const upgradePlan = await generateUpgradePlan(folderStructure, model);
    console.log(chalk.green('Upgrade plan generated. Proceeding with upgrades...'));

    for (const file of files) {
      const filePath = path.join(folderPath, file.name);

      if (file.isFile()) {
        const fileType = getFileType(file.name);
        if (isUpgradableFile(fileType)) {
          await delay(7000); // Add a 1-second delay before processing each file
          const upgradeSummaryItem = await upgradeFile(filePath, chalk, model, fileType, upgradePlan);
          upgradeSummary.push(upgradeSummaryItem);
          processedFiles++;
          console.log(chalk.cyan(`Progress: ${processedFiles}/${totalFiles} files processed`));
        } else {
          console.log(chalk.yellow(`Skipping non-upgradable file: ${file.name}`));
        }
      } else if (file.isDirectory()) {
        await upgradeFolder(filePath, chalk, model);
      }
    }

    // Post-upgrade actions
    await delay(1000); // Add a 1-second delay before post-upgrade actions
    await performPostUpgradeActions(folderPath, upgradePlan, upgradeSummary, chalk, model);

    console.log(chalk.green(`Advanced folder upgrade complete for ${folderPath}. ${processedFiles}/${totalFiles} files were processed.`));
    displayUpgradeSummary(upgradeSummary, chalk);

  } catch (error) {
    console.error(chalk.red("Error upgrading folder:", error.message));
    throw error; // Propagate the error for higher-level error handling
  }
}

async function analyzeFolderStructure(folderPath) {
  const structure = {
    path: folderPath,
    files: [],
    subfolders: [],
    dependencies: new Set(),
    languages: new Set(),
  };

  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      const fileType = getFileType(entry.name);
      structure.files.push({ name: entry.name, type: fileType });
      structure.languages.add(fileType);

      if (entry.name === 'package.json') {
        const packageJson = JSON.parse(await fs.readFile(path.join(folderPath, entry.name), 'utf-8'));
        Object.keys(packageJson.dependencies || {}).forEach(dep => structure.dependencies.add(dep));
        Object.keys(packageJson.devDependencies || {}).forEach(dep => structure.dependencies.add(dep));
      }
    } else if (entry.isDirectory()) {
      structure.subfolders.push(await analyzeFolderStructure(path.join(folderPath, entry.name)));
    }
  }

  return structure;
}

async function generateUpgradePlan(folderStructure, model) {
  const prompt = `
      Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code.
     You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything 
    Given the following folder structure and analysis, generate an upgrade plan:
    ${JSON.stringify(folderStructure, null, 2)}

    Provide an upgrade plan that includes:
    1. Suggested architectural improvements
    2. Dependency updates and their potential impacts
    3. Code modernization strategies for each detected language
    4. Performance optimization opportunities
    5. Security enhancement recommendations
    6. Modern language features and best practices: Use the latest features of ${folderStructure} where appropriate, and follow best practices for coding style and design.
    7. Potential new features or improvements: Consider whether there are any additional features or improvements that could be made to enhance the functionality or usability of the code.
    8. Error handling and robustness: The code should be able to handle unexpected inputs or situations gracefully, without crashing or producing incorrect results.
    9. Performance optimizations: Identify any areas where performance could be improved, such as reducing complexity or using more efficient algorithms or data structures.

    Format the upgrade plan as a JSON object.
  `;

  let retries = 3;
  while (retries > 0) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error(chalk.yellow(`Error generating upgrade plan, retrying... (${retries} attempts left)`));
      console.error(chalk.yellow(error));
      retries--;
      if (retries === 0) throw error;
      await delay(5000); // Wait 5 seconds before retrying
    }
  }
}


async function generateDocumentation(filePath, chalk, model) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileExtension = path.extname(filePath).slice(1);
    console.log(chalk.yellow(`Generating documentation for ${filePath}...`));

    const prompt = `
      Analyze the following ${fileExtension} code and generate comprehensive documentation:

      \`\`\`${fileExtension}
      ${fileContent}
      \`\`\`
You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything
      Generate documentation that includes:
      1. Overview of the file's purpose
      2. Detailed explanations of functions and classes
      3. Parameters, return values, and their types
      4. Usage examples
      5. Any important notes or caveats

      Additional Notes:
      1. Need to Be Highly Proffessional 
      2. Need to Be Highly Beautifull
      3. Need to Be 100% Human Written

      Provide the documentation in Markdown format.
    `;

    const result = await model.generateContent(prompt);
    const documentation = result.response.text();

    const docFilePath = `${filePath}.md`;
    await fs.writeFile(docFilePath, documentation);
    console.log(chalk.green(`Documentation generated: ${docFilePath}`));
  } catch (error) {
    console.error(chalk.red(`Error generating documentation for ${filePath}:`, error.message));
  }
}

function displayUpgradeSummary(upgradeSummary, chalk) {
  console.log(chalk.cyan('\nUpgrade Summary:'));
  upgradeSummary.forEach(item => {
    console.log(chalk.blue(`\nFile: ${item.file}`));
    console.log(chalk.green(`Changes: ${item.changes}`));
    console.log(chalk.yellow('Explanation:'));
    console.log(item.explanation);
  });
}

async function optimizePerformance(filePath, chalk, model) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileExtension = path.extname(filePath).slice(1);
    console.log(chalk.yellow(`Optimizing performance for ${filePath}...`));

    const prompt = `
      Analyze and optimize the performance of the following ${fileExtension} code:

      \`\`\`${fileExtension}
      ${fileContent}
      \`\`\`
You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything
      Provide optimizations focusing on:
      1. Algorithmic efficiency
      2. Memory usage
      3. Asynchronous operations
      4. Caching strategies
      5. Resource management

      Return the optimized code within a code block using:
      \`\`\`file:${filePath}
      // Optimized code here
      \`\`\`

      After the code block, provide a brief explanation of the optimizations made.
    `;

    const result = await model.generateContent(prompt);
    const optimizedCode = result.response.text();

    await processAIResponse(optimizedCode, chalk);

    console.log(chalk.green(`File ${filePath} has been optimized for performance.`));

    // Extract and log the explanation
    const explanationMatch = optimizedCode.match(/```[\s\S]*?```\s*([\s\S]*)/);
    if (explanationMatch) {
      console.log(chalk.cyan('\nExplanation of optimizations:'));
      console.log(explanationMatch[1].trim());
    }
  } catch (error) {
    console.error(chalk.red(`Error optimizing performance for ${filePath}:`, error.message));
  }
}

async function generateTestCases(filePath, chalk, model) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileExtension = path.extname(filePath).slice(1);
    console.log(chalk.yellow(`Generating test cases for ${filePath}...`));

    const prompt = `
      Analyze the following ${fileExtension} code and generate comprehensive test cases:

      \`\`\`${fileExtension}
      ${fileContent}
      \`\`\`
You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything
      Generate test cases that cover:
      1. Normal operation scenarios
      2. Edge cases
      3. Error handling
      4. Performance benchmarks

      Provide the test cases using a testing framework appropriate for ${fileExtension}.
      Use the following format:

      \`\`\`file:${path.basename(filePath, path.extname(filePath))}.test.${fileExtension}
      // Test cases here
      \`\`\`
    `;

    const result = await model.generateContent(prompt);
    const testCases = result.response.text();

    await processAIResponse(testCases, chalk);

    console.log(chalk.green(`Test cases generated for ${filePath}.`));
  } catch (error) {
    console.error(chalk.red(`Error generating test cases for ${filePath}:`, error.message));
  }
}

async function runSecurity(chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }
  console.log(chalk.cyan('Running security audit...'));
  try {
    const { stdout, stderr } = await execPromise('npm audit');
    console.log(chalk.green('Security audit results:'));
    console.log(stdout);
    if (stderr) console.error(chalk.red('Errors:'), stderr);

    // Run additional security checks
    await execPromise('npm install -g snyk');
    const { stdout: snykOutput } = await execPromise('snyk test');
    console.log(chalk.green('Snyk security test results:'));
    console.log(snykOutput);
  } catch (error) {
    console.error(chalk.red('Error running security audit:'), error.message);
  }
}

async function deployProject(platform, chalk) {
  if (!currentProject) {
    console.log(chalk.yellow("No active project. Create a project first."));
    return;
  }
  console.log(chalk.cyan(`Deploying project to ${platform}...`));
  try {
    switch (platform.toLowerCase()) {
      case 'heroku':
        await execPromise('heroku create');
        await execPromise('git push heroku main');
        console.log(chalk.green('Project deployed to Heroku.'));
        break;
      case 'netlify':
        await execPromise('npx netlify-cli deploy');
        console.log(chalk.green('Project deployed to Netlify.'));
        break;
      // Add more deployment platforms as needed
      default:
        console.log(chalk.yellow(`Unsupported deployment platform: ${platform}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error deploying to ${platform}:`), error.message);
  }
}

async function run() {
  chalk = await loadChalk();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{
          text: `You Have 1.8Million Token So. You are an advanced AI coding assistant with expertise in multiple programming languages and software development practices. You can help with coding tasks, file operations, project management, and provide detailed explanations. When suggesting file or folder creation, please use the following formats:

For files:
\`\`\`file:./path/to/file.extension
// File content here
\`\`\`

For folders:
\`\`\`folder:./path/to/folder
\`\`\`

This will allow me to automatically create the files or folders based on your suggestions. You can also suggest project creation, dependency installation, running commands, and best practices for software development. Always strive to provide the most advanced and efficient solutions possible.` }],
      },
      {
        role: 'model',
        parts: [{ text: "You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything Understood. I'm ready to assist you with advanced coding tasks, file and folder operations, and project management across multiple programming languages. I'll use the specified formats for suggesting file and folder creation, ensuring that my responses can be automatically processed to create the necessary structure. I'll provide cutting-edge solutions and best practices for software development. How can I help you with your project today?" }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 150000,
    },
  });

  console.log(chalk.bold.green('Welcome to the Advanced AI Coding Assistant!'));
  console.log(chalk.cyan('Type "help" for a list of available commands.'));

  while (true) {
    const userInput = await question("\nEnter your command: ", chalk);

    if (userInput.toLowerCase() === 'exit') {
      console.log(chalk.green("Goodbye!"));
      break;
    }

    if (userInput.toLowerCase() === '::upgrade') {
      await upgradeSelf(chalk, model);
      continue;
    }


    if (userInput.toLowerCase().startsWith('::active')) {
      const filePath = userInput.split(' ')[1];
      if (!filePath) {
        console.log(chalk.yellow("Please provide a file path. Usage: ::active <file_path>"));
        continue;
      }
      advancedRealTimeCodeSession(filePath, chalk, model)
        .catch(error => console.error('Session error:', error));
      continue;
    }

    if (userInput.toLowerCase() === 'help') {
      console.log(chalk.cyan('Available commands:'));
      console.log(chalk.cyan('- ask <content>: Perform a result from AI'));
      console.log(chalk.cyan('- ::active <filepath>: Perform a Real-Time Coding Session With Ai'));
      console.log(chalk.cyan('- ::upgrade: Upgrade and improve all functions in this script'));
      console.log(chalk.cyan('- project:create <name>: Create a new project'));
      console.log(chalk.cyan('- project:install <dependency>: Install a dependency'));
      console.log(chalk.cyan('- project:run <command>: Run a command in the project directory'));
      console.log(chalk.cyan('- file:read <path>: Read the contents of a file'));
      console.log(chalk.cyan('- file:list [directory]: List files in a directory'));
      console.log(chalk.cyan('- file:search <keyword>: Search for files containing a keyword'));
      console.log(chalk.cyan('- git:init: Initialize a git repository'));
      console.log(chalk.cyan('- git:add <files>: Add files to git staging area'));
      console.log(chalk.cyan('- git:commit <message>: Commit changes'));
      console.log(chalk.cyan('- git:status: Show git status'));
      console.log(chalk.cyan('- snippet:save <name>: Save a code snippet'));
      console.log(chalk.cyan('- snippet:list: List saved code snippets'));
      console.log(chalk.cyan('- test:run <command>: Run tests'));
      console.log(chalk.cyan('- file:upgrade <path>: Upgrade and improve a file using AI'));
      console.log(chalk.cyan('- folder:upgrade <path>: Upgrade and improve all files in a folder using AI'));
      console.log(chalk.cyan('- project:analyze-deps: Analyze project dependencies'));
      console.log(chalk.cyan('- project:check-quality: Check code quality using ESLint'));
      console.log(chalk.cyan('- project:profile <file>: Profile performance of a file'));
      console.log(chalk.cyan('- project:generate-docs: Generate API documentation'));
      console.log(chalk.cyan('- file:review <path>: Perform automated code review'));
      console.log(chalk.cyan('- file:optimize <path>: Optimize file performance'));
      console.log(chalk.cyan('- file:generate-tests <path>: Generate test cases for a file'));
      console.log(chalk.cyan('- file:interactive-review <path>: Review Code function by function and Change Improvements Real Time!'));
      console.log(chalk.cyan('- file:document-this <path>: Generate Documentation for a file'));
      console.log(chalk.cyan('- project:security: Run security audit'));
      console.log(chalk.cyan('- project:deploy <platform>: Deploy project to specified platform'));
      console.log(chalk.cyan('- exit: Quit the program'));
      continue;
    }

    if (userInput.startsWith('project:')) {
      const [command, ...args] = userInput.slice(8).split(' ');

      try {
        switch (command) {
          case 'create':
            await createProject(args[0], chalk, model);
            break;
          case 'install':
            await installDependency(args.join(' '), chalk, model);
            break;
          case 'run':
            await runCommand(args.join(' '), chalk, model);
            break;
          case 'analyze-deps':
            await analyzeDependencies(chalk, model);
            break;
          case 'check-quality':
            await checkCodeQuality(chalk, model);
            break;
          case 'profile':
            await profilePerformance(args[0], chalk, model);
            break;
          case 'generate-docs':
            await generateAPIDocs(chalk, model);
            break;
          default:
            console.log(chalk.yellow("Invalid project operation."));
        }
      } catch (error) {
        console.error(chalk.red("Error performing project operation:", error.message));
      }
    } else if (userInput.startsWith('file:')) {
      const [command, ...args] = userInput.slice(5).split(' ');

      try {
        switch (command) {
          case 'read':
            const content = await fs.readFile(args[0], 'utf-8');
            console.log(chalk.cyan(`Content of ${args[0]}:`));
            console.log(content);
            break;
          case 'list':
            const files = await fs.readdir(args[0] || '.');
            console.log(chalk.cyan(`Files in ${args[0] || 'current directory'}:`));
            files.forEach(file => console.log(chalk.cyan(file)));
            break;
          case 'search':
            await searchFiles(args[0], chalk);
            break;
          case 'upgrade':
            await upgradeFile(args[0], chalk, model);
            break;
          case 'review':
            await automatedCodeReview(args[0], chalk, model);
            break;
          case 'optimize':
            await optimizePerformance(args[0], chalk, model);
            break;
          case 'document-this':
            await generateDocumentation(args[0], chalk, model);
            break;
          case 'generate-tests':
            await generateTestCases(args[0], chalk, model);
            break;
          case 'interactive-review':
            await advancedInteractiveCodeReview(args[0], chalk, model);
            break;

          default:
            console.log(chalk.yellow("Invalid file operation."));
        }
      } catch (error) {
        console.error(chalk.red("Error performing file operation:", error.message));
      }
    } else if (userInput.startsWith('git:')) {
      const [command, ...args] = userInput.slice(4).split(' ');
      try {
        await gitOperations(command, args, chalk);
      } catch (error) {
        console.error(chalk.red("Error performing git operation:", error.message));
      }
    } else if (userInput.startsWith('snippet:')) {
      const [command, ...args] = userInput.slice(8).split(' ');
      try {
        switch (command) {
          case 'save':
            const snippetContent = await question("Enter the code snippet (press Enter twice to finish):\n", chalk);
            await saveCodeSnippet(args[0], snippetContent, chalk);
            break;
          case 'list':
            await listCodeSnippets(chalk);
            break;
          default:
            console.log(chalk.yellow("Invalid snippet operation. Use 'save' or 'list'."));
        }
      } catch (error) {
        console.error(chalk.red("Error performing snippet operation:", error.message));
      }
    } else if (userInput.startsWith('test:')) {
      const [command, ...args] = userInput.slice(5).split(' ');
      if (command === 'run') {
        await runTests(args.join(' '), chalk);
      } else {
        console.log(chalk.yellow("Invalid test operation. Use 'test:run <command>'."));
      }
    } else if (userInput.startsWith('folder:')) {
      const [command, ...args] = userInput.slice(7).split(' ');

      try {
        switch (command) {
          case 'upgrade':
            await upgradeFolder(args[0], chalk, model);
            break;
          default:
            console.log(chalk.yellow("Invalid folder operation. Use 'upgrade'."));
        }
      } catch (error) {
        console.error(chalk.red("Error performing folder operation:", error.message));
      }
    } else {
      try {
        let fileContent;
        let path;
        const fileMatch = userInput.match(/readfile:([^\s]+)/);
        if (fileMatch) {
          const filePath = fileMatch[1];
          path = fileMatch[1]
          console.log(chalk.yellow(`Reading file: ${filePath}`));
          try {
            // Check if the file exists
            await fs.access(filePath);
            // Read the file content
            fileContent = await fs.readFile(filePath, 'utf-8');
            console.log(chalk.green(`File content:${fileContent}`));
          } catch (error) {
            console.error(chalk.red(`Error reading file: ${error.message}`));
          }
        } else {
          console.log(chalk.blue('No valid readfile command found in the input.'));
        }

        console.log(chalk.yellow('Sending request to AI...'));

        const result = await chat.sendMessageStream(`\`\`\`${path}
          ${fileContent}\`\`\` ` + userInput + `\`\`\`file:./path/to/file.extension
// File content here
\`\`\`

For folders:
\`\`\`folder:./path/to/folder
\`\`\`` + 'You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything' + `
\`\`\`file:./path/to/file.extension
// File content here
\`\`\`

For folders:
\`\`\`folder:./path/to/folder
\`\`\``);
        let responseText = '';
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          process.stdout.write(chunkText);
          responseText += chunkText;
        }
        console.log('\n');
        await processFileCreation(responseText, chalk)
        // await processAIResponse(responseText, chalk);
        chatHistory.push({ role: 'user', parts: [{ text: userInput }] });
        chatHistory.push({
          role: 'model', parts: [{
            text: responseText + ' You have 1.5 Million Token Window So Dont be affraid of creating atlest 500 Lines of code taht is easy for u alaways be acctive and advanced also Remember, always send the latest working code. Do not provide examples or placeholders Example:  // ... (Your existing code). Your response should always include the full, updated code. always use this code blcok method and send full code your are willing to do do anything' + `
\`\`\`file:./path/to/file.extension
// File content here
\`\`\`

For folders:
\`\`\`folder:./path/to/folder
\`\`\`` }]
        });
      } catch (error) {
        console.error(chalk.red("Error communicating with AI:", error.message));
      }
    }
  }
}

async function processFileCreation(response, chalk) {
  const lines = response.split('\n');
  let currentFilePath = null;
  let currentFileContent = [];

  for (const line of lines) {
    if (line.startsWith('```folder:')) {
      const folderPath = line.split(':')[1].trim();
      await createFolder(folderPath, chalk);
    } else if (line.startsWith('```file:')) {
      if (currentFilePath) {
        await writeFile(currentFilePath, currentFileContent.join('\n'), chalk);
      }
      currentFilePath = line.split(':')[1].trim();
      currentFileContent = [];
    } else if (line === '```' && currentFilePath) {
      await writeFile(currentFilePath, currentFileContent.join('\n'), chalk);
      currentFilePath = null;
      currentFileContent = [];
    } else if (currentFilePath) {
      currentFileContent.push(line);
    }
  }

  if (currentFilePath) {
    await writeFile(currentFilePath, currentFileContent.join('\n'), chalk);
  }
}

async function createFolder(folderPath, chalk) {
  try {
    await fs.mkdir(folderPath, { recursive: true });
    console.log(chalk.green(`Created folder: ${folderPath}`));
  } catch (error) {
    console.error(chalk.red(`Error creating folder ${folderPath}:`, error.message));
  }
}

async function writeFile(filePath, content, chalk) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`Created/Updated file: ${filePath}`));
  } catch (error) {
    console.error(chalk.red(`Error writing file ${filePath}:`, error.message));
  }
}


run().catch(error => console.error('Fatal error:', error.message));
