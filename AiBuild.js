require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
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

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

let currentProject = null;
let chatHistory = [];

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

async function processAIResponse(response, chalk) {
  const fileCreationRegex = /```file:(.+?)\n([\s\S]*?)```/g;
  const folderCreationRegex = /```folder:(.+?)```/g;
  let match;

  try {
    while ((match = fileCreationRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2].trim();
      await createFileOrFolder(filePath, fileContent, chalk);
    }

    while ((match = folderCreationRegex.exec(response)) !== null) {
      const folderPath = match[1].trim();
      await createFileOrFolder(folderPath, null, chalk);
    }
  } catch (error) {
    console.error(chalk.red(`Error processing AI response: ${error.message}`));
  }
}

async function upgradeFunction(functionName, functionCode, model, previousFunctions = [], chalk) {
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

    Provide the entire improved function within a code block using the format:
    \`\`\`javascript
    // Improved function here
    \`\`\`

    Also, provide a brief explanation of the improvements made.
  `;

  console.log(chalk.yellow(`Upgrading function: ${functionName}`));

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
}

async function upgradeSelf(chalk, model) {
  const fileName = 'advanced_self_upgrading_assistant.js';
  let fileContent = await fs.readFile(fileName, 'utf-8');
  const functionRegex = /async function (\w+)\([^)]*\) {[\s\S]*?}/g;

  let match;
  let upgradedContent = fileContent;
  const upgradedFunctions = [];

  console.log(chalk.cyan('Starting advanced self-upgrade process...'));

  while ((match = functionRegex.exec(fileContent)) !== null) {
    const functionName = match[1];
    const functionCode = match[0];

    try {
      const { upgradedFunction, explanation } = await upgradeFunction(functionName, functionCode, model, upgradedFunctions, chalk);
      upgradedContent = upgradedContent.replace(functionCode, upgradedFunction);
      upgradedFunctions.push({ name: functionName, code: upgradedFunction });

      console.log(chalk.green(`Function ${functionName} upgraded successfully.`));
      console.log(chalk.blue('Improvements:'));
      console.log(chalk.blue(explanation));
    } catch (error) {
      console.error(chalk.red(`Error upgrading function ${functionName}:`, error.message));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const backupFileName = `${fileName}.backup-${Date.now()}.js`;
  await fs.writeFile(backupFileName, fileContent);
  console.log(chalk.green(`Original file backed up as: ${backupFileName}`));

  await fs.writeFile(fileName, upgradedContent);
  console.log(chalk.green('Advanced self-upgrade complete. New version saved.'));

  const shouldRestart = await question(chalk.yellow('Do you want to restart the program now to use the upgraded version? (y/n) '), chalk);
  if (shouldRestart.toLowerCase() === 'y') {
    console.log(chalk.green('Restarting the program...'));
    process.on('exit', () => {
      require('child_process').spawn(process.argv.shift(), process.argv, {
        cwd: process.cwd(),
        detached: true,
        stdio: 'inherit'
      });
    });
    process.exit();
  } else {
    console.log(chalk.yellow('Please restart the program manually to use the upgraded version.'));
  }
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

async function searchFiles(keyword, chalk) {
  try {
    const files = await fs.readdir('.');
    const matchingFiles = files.filter(file => file.includes(keyword));
    console.log(chalk.cyan(`Files matching '${keyword}':`));
    matchingFiles.forEach(file => console.log(chalk.cyan(file)));
  } catch (error) {
    console.error(chalk.red("Error searching files:", error.message));
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

async function saveCodeSnippet(name, content, chalk) {
  try {
    const snippetsDir = path.join(currentProject || '.', 'snippets');
    await fs.mkdir(snippetsDir, { recursive: true });
    const filePath = path.join(snippetsDir, `${name}.js`);
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`Snippet '${name}' saved to ${filePath}`));
  } catch (error) {
    console.error(chalk.red("Error saving code snippet:", error.message));
  }
}

async function listCodeSnippets(chalk) {
  try {
    const snippetsDir = path.join(currentProject || '.', 'snippets');
    const files = await fs.readdir(snippetsDir);
    console.log(chalk.cyan('Saved code snippets:'));
    files.forEach(file => console.log(chalk.cyan(`- ${path.parse(file).name}`)));
  } catch (error) {
    console.log(chalk.yellow('No saved snippets found or error occurred:', error.message));
  }
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

async function upgradeFile(filePath, chalk, model) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileExtension = path.extname(filePath).slice(1);
    console.log(chalk.yellow(`Sending ${filePath} content to AI for improvement...`));

    const prompt = `
      Analyze and refactor the following ${fileExtension} code:

      Original ${fileExtension.toUpperCase()} Code:
      \`\`\`${fileExtension}
      ${fileContent}
      \`\`\`

      Enhance this code to create a more efficient, maintainable, and feature-rich implementation. Consider:
      1. Performance optimizations
      2. Code readability and organization
      3. Error handling and robustness
      4. Modern language features and best practices
      5. Potential new features or improvements

      Provide the improved code within a code block using:
      \`\`\`file:${filePath}
      // Improved code here
      \`\`\`

      After the code block, provide a brief explanation of your changes and enhancements.
    `;

    const result = await model.generateContent(prompt);
    const improvedCode = result.response.text();

    await processAIResponse(improvedCode, chalk);

    console.log(chalk.green(`File ${filePath} has been upgraded.`));

    // Extract and log the explanation
    const explanationMatch = improvedCode.match(/```[\s\S]*?```\s*([\s\S]*)/);
    if (explanationMatch) {
      console.log(chalk.cyan('\nExplanation of changes:'));
      console.log(explanationMatch[1].trim());
    }
  } catch (error) {
    console.error(chalk.red(`Error upgrading file ${filePath}:`, error.message));
  }
}

async function upgradeFolder(folderPath, chalk, model) {
  try {
    const files = await fs.readdir(folderPath);
    const totalFiles = files.length;
    let processedFiles = 0;

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        await upgradeFile(filePath, chalk, model);
        processedFiles++;
        console.log(chalk.cyan(`Progress: ${processedFiles}/${totalFiles} files processed`));
      } else if (stats.isDirectory()) {
        await upgradeFolder(filePath, chalk, model);
      }
    }

    console.log(chalk.green(`Folder upgrade complete. ${processedFiles}/${totalFiles} files were processed.`));
  } catch (error) {
    console.error(chalk.red("Error upgrading folder:", error.message));
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
  const chalk = await loadChalk();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{
          text: `You are an advanced AI coding assistant with expertise in multiple programming languages and software development practices. You can help with coding tasks, file operations, project management, and provide detailed explanations. When suggesting file or folder creation, please use the following formats:

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
        parts: [{ text: "Understood. I'm ready to assist you with advanced coding tasks, file and folder operations, and project management across multiple programming languages. I'll use the specified formats for suggesting file and folder creation, ensuring that my responses can be automatically processed to create the necessary structure. I'll provide cutting-edge solutions and best practices for software development. How can I help you with your project today?" }],
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
        console.log(chalk.yellow('Sending request to AI...'));
        const result = await chat.sendMessageStream(userInput);
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
        chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
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
