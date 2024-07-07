const dotenv = require('dotenv');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const { performance } = require('perf_hooks');

dotenv.config();

let chalk;
async function loadChalk() {
    return (await import('chalk')).default;
}

class WebsiteGenerator {
    constructor() {
        this.aiModel = this.initializeAIModel();
        this.baseDir = path.join(process.cwd(), 'generated_website');
        this.structure = [];
        this.fileContents = new Map();
        this.dependencies = {
            php: ['vlucas/phpdotenv', 'bramus/router', 'twig/twig', 'ezyang/htmlpurifier', 'guzzlehttp/guzzle', 'monolog/monolog', 'phpunit/phpunit', 'squizlabs/php_codesniffer', 'phpstan/phpstan'],
            js: ['tailwindcss', 'alpinejs', 'axios', 'dompurify', 'luxon', 'chart.js', 'cypress', 'eslint', 'prettier']
        };
        this.configFiles = [
            '.env', 'composer.json', 'package.json', 'tailwind.config.js',
            'webpack.config.js', '.gitignore', 'docker-compose.yml',
        ];
        this.conversationHistory = [];
        this.performanceMetrics = new Map();
    }

    initializeAIModel() {
        try {
            const genAI = new GoogleGenerativeAI(process.env.API_KEY);
            return genAI.getGenerativeModel({
                model: "gemini-1.5-pro-latest",
                generationConfig: {
                    temperature: 1.7,
                    topK: 60,
                    topP: 2.8,
                    maxOutputTokens: 290000,
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            });
        } catch (error) {
            console.error(chalk.red('Error initializing AI model:', error));
            throw new Error('Failed to initialize AI model. Please check your API key and try again.');
        }
    }

    async generateAIResponse(prompt, retries = 5) {
        const startTime = performance.now();
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const chat = this.aiModel.startChat({
                    history: this.conversationHistory,
                    role: prompt.role,
                    generationConfig: {
                        maxOutputTokens: 90000,
                    },
                });

                console.log(chalk.green('[PROMPT]' + prompt));
                let result;

                try {
                    result = await chat.sendMessageStream('Warning!: Send Your Response Without Caught by This [GoogleGenerativeAI Error]: Candidate was blocked due to RECITATION' + prompt);
                } catch (streamError) {
                    console.error(chalk.red('Stream Error:', streamError));
                    result = await chat.sendMessage('Warning!: Send Your Response Without Caught by This [GoogleGenerativeAI Error]: Candidate was blocked due to RECITATION' + prompt);
                }

                let text = '';
                if (result.stream) {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        process.stdout.write(chalk.blue(chunkText));
                        text += chunkText;
                    }
                } else {
                    text = result.text;
                    console.log(chalk.blue(text));
                }
                console.log('\n');

                this.conversationHistory.push({ role: "user", parts: [{ text: prompt }] });
                this.conversationHistory.push({ role: "model", parts: [{ text: text }] });
                this.limitConversationHistory();

                const endTime = performance.now();
                this.performanceMetrics.set(prompt.slice(0, 50), endTime - startTime);

                return text;
            } catch (error) {
                console.error(chalk.yellow(`API Error (Attempt ${attempt}/${retries}):`, error));
                if (attempt < retries) {
                    // Remove the last interaction from history before retrying
                    if (this.conversationHistory.length > 0) {
                        this.conversationHistory.pop(); // Remove model's response
                    }
                    if (this.conversationHistory.length > 0) {
                        this.conversationHistory.pop(); // Remove user's prompt
                    }

                    const backoffTime = Math.pow(2, attempt) * 1000;
                    console.log(chalk.yellow(`Retrying in ${backoffTime / 1000} seconds...`));
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                } else {
                    throw new Error(`Failed to generate AI response after ${retries} attempts`);
                }
            }
        }
    }




    async createBaseStructure() {
        const baseStructure = [
            { type: 'folder', name: 'public' },
            { type: 'folder', name: 'src' },
            { type: 'folder', name: 'src/includes' },
            { type: 'folder', name: 'src/templates' },
            { type: 'folder', name: 'src/classes' },
            { type: 'folder', name: 'src/middleware' },
            { type: 'folder', name: 'src/controllers' },
            { type: 'folder', name: 'src/models' },
            { type: 'folder', name: 'config' },
            { type: 'folder', name: 'assets' },
            { type: 'folder', name: 'assets/css' },
            { type: 'folder', name: 'assets/js' },
            { type: 'folder', name: 'assets/images' },
            { type: 'folder', name: 'assets/fonts' },
            { type: 'folder', name: 'tests' },
            { type: 'folder', name: 'tests/unit' },
            { type: 'folder', name: 'tests/integration' },
            { type: 'folder', name: 'tests/e2e' },
            { type: 'folder', name: 'docs' },
            { type: 'folder', name: 'database' },
            { type: 'folder', name: 'database/migrations' },
            { type: 'folder', name: 'database/seeds' },
            { type: 'folder', name: 'logs' },
            { type: 'folder', name: 'scripts' },
            { type: 'folder', name: 'storage' },
            { type: 'folder', name: 'storage/cache' },
            { type: 'folder', name: 'storage/uploads' },
            { type: 'folder', name: 'storage/sessions' },
        ];

        await Promise.all(baseStructure.map(item => this.createFolder(item.name)));
    }

    async createFolder(folderName) {
        const folderPath = path.join(this.baseDir, folderName);
        try {
            await fs.mkdir(folderPath, { recursive: true });
            console.log(chalk.green(`Created folder: ${folderName}`));
            this.structure.push({ type: 'folder', name: folderName });
        } catch (error) {
            console.error(chalk.red(`Error creating folder ${folderName}:`, error));
        }
    }

    async createComponent(componentName, initialPrompt) {
        const filePath = this.getComponentFilePath(componentName);
        let continueExpanding = true;
        let componentContent = '';
        let iteration = 1;

        console.log(chalk.cyan(`Starting to create component ${componentName}.`)); // Initial message

        while (continueExpanding) {
            const aiPrompt = `Create a highly advanced and feature-rich ${componentName} with PHP for a PHP website using TailwindCSS and Alpine.js. The component should be visually stunning, fully responsive, and incorporate cutting-edge design principles. Include detailed comments explaining complex sections of the code. Ensure the component follows best practices for security, performance, accessibility, and SEO. Implement advanced features such as lazy loading, skeleton loading, infinite scrolling, or virtualized lists where applicable.
    
    Current project structure:
    ${JSON.stringify(this.structure, null, 2)}
    
    Current content:
    ${componentContent}
    
    Iteration: ${iteration}
    
    Your task is to enhance the ${componentName} based on the provided structure and content. Focus on improving the visual appeal, responsiveness, and incorporating modern design principles. Ensure the code is well-commented, especially for complex sections. Adhere to best practices for security, performance, accessibility, and SEO. Implement advanced features like lazy loading, skeleton loading, infinite scrolling, or virtualized lists as necessary.`;

            try {
                const newContent = await this.generateAIResponse(aiPrompt);
                componentContent += this.sanitizeCodeBlock(newContent);

                console.log(chalk.yellow(`Component ${componentName} - Iteration ${iteration} complete. Preview:`));
                console.log(componentContent); // Show the current state of the component
                await this.saveComponentToFile(filePath, componentContent);
                continueExpanding = await this.askForExpansion(componentName);
                iteration++;
            } catch (error) {
                console.error(chalk.red(`Error generating content for ${componentName}:`, error));
                continueExpanding = await this.askToRetry(componentName);
            }
        }

        await this.saveComponentToFile(filePath, componentContent);
        console.log(chalk.green(`Component ${componentName} created successfully.`)); // Final message
    }

    sanitizeCodeBlock(content) {
        try {
            const regex = /```(?:[a-z]*\n)?([\s\S]*?)```/gi;
            const matches = [...content.matchAll(regex)];
            if (matches.length > 0) {
                return matches.map(match => match[1]).join('\n');
            } else {
                console.log(chalk.yellow('No content found inside triple backticks.'));
                return content; // Return the entire content if no triple backticks are found
            }
        } catch (error) {
            console.error(chalk.red(`Error sanitizing code block:`, error));
            return content;
        }
    }

    getComponentFilePath(componentName) {
        const fileName = `${componentName}.php`;
        if (componentName === 'index') {
            return path.join(this.baseDir, 'public', fileName);
        } else if (['header', 'footer'].includes(componentName)) {
            return path.join(this.baseDir, 'src', 'includes', fileName);
        } else {
            return path.join(this.baseDir, 'src', 'templates', fileName);
        }
    }

    async saveComponentToFile(filePath, content) {
        try {
            await fs.writeFile(filePath, content);
            console.log(chalk.green(`Component saved to ${filePath}`));
            this.fileContents.set(filePath, content);
            this.structure.push({ type: 'file', name: path.relative(this.baseDir, filePath) });
        } catch (error) {
            console.error(chalk.red(`Error saving component to ${filePath}:`, error));
        }
    }


    async askForExpansion(componentName) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question(chalk.yellow(`Do you want to expand the ${componentName} component further? (yes/no): `), resolve);
        });
        rl.close();

        return answer.toLowerCase() === 'yes';
    }

    async createConfigFiles() {
        for (const fileName of this.configFiles) {
            const filePath = path.join(this.baseDir, fileName);
            const content = await this.generateAIResponse(`Create a ${fileName} file for a modern PHP website project. Include necessary configurations and best practices.`);
            await this.saveComponentToFile(filePath, content);
        }
    }

    async createDatabaseMigration() {
        const migrationContent = await this.generateAIResponse(`Create a database migration file for creating a users table with modern fields and indexes.`);
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const migrationPath = path.join(this.baseDir, 'database', 'migrations', `${timestamp}_create_users_table.php`);
        await this.saveComponentToFile(migrationPath, migrationContent);
    }

    async installDependencies() {
        console.log(chalk.cyan('Installing PHP dependencies...'));
        await this.execCommand('composer install', this.baseDir);

        console.log(chalk.cyan('Installing JavaScript dependencies...'));
        await this.execCommand('npm install', this.baseDir);
    }

    async execCommand(command, cwd) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    console.error(chalk.red(`Error executing command: ${command}`));
                    console.error(chalk.red(stderr));
                    reject(error);
                } else {
                    console.log(chalk.green(stdout));
                    resolve(stdout);
                }
            });
        });
    }

    async generateDocumentation() {
        const docContent = await this.generateAIResponse(`Create comprehensive documentation for the website project, including:
        1. Project overview
        2. Folder structure explanation
        3. Installation instructions
        4. Configuration guide
        5. Usage examples
        6. API documentation (if applicable)
        7. Troubleshooting tips
        8. Security best practices
        9. Performance optimization guidelines
        10. Deployment instructions
        
        Current project structure:
        ${JSON.stringify(this.structure, null, 2)}`);

        const docPath = path.join(this.baseDir, 'docs', 'README.md');
        await this.saveComponentToFile(docPath, docContent);
    }

    async createSecurityMiddleware() {
        const middlewareContent = await this.generateAIResponse(`Create a comprehensive SecurityMiddleware.php file that implements various security measures such as:
        1. Setting security headers
        2. CSRF protection
        3. XSS prevention
        4. Rate limiting
        5. IP blocking
        6. Input validation and sanitization`);

        const middlewarePath = path.join(this.baseDir, 'src', 'middleware', 'SecurityMiddleware.php');
        await this.saveComponentToFile(middlewarePath, middlewareContent);
    }

    async createTestSuite() {
        const testFiles = [
            'UserTest.php',
            'SecurityMiddlewareTest.php',
            'ApiTest.php',
            'DatabaseTest.php',
            'ComponentRenderTest.php',
            'PerformanceTest.php'
        ];

        for (const testFile of testFiles) {
            console.log(chalk.yellow(`Creating test file: ${testFile}`));
            const testContent = await this.generateAIResponse(`Create a PHPUnit test file named ${testFile} with comprehensive test cases for the corresponding functionality. Include tests for edge cases, error handling, and performance benchmarks where applicable.`);
            const testPath = path.join(this.baseDir, 'tests', 'unit', testFile);
            await this.saveComponentToFile(testPath, testContent);
        }

        // Create test configuration file
        const phpunitConfig = await this.generateAIResponse(`Create a phpunit.xml configuration file that sets up the testing environment, including database connections, test suites, and code coverage reports.`);
        const phpunitConfigPath = path.join(this.baseDir, 'phpunit.xml');
        await this.saveComponentToFile(phpunitConfigPath, phpunitConfig);

        // Create Cypress E2E tests
        console.log(chalk.yellow('Setting up Cypress E2E tests...'));

        // Create Cypress configuration
        const cypressConfig = await this.generateAIResponse(`Create a cypress.json configuration file with appropriate settings for E2E testing of the PHP website.`);
        const cypressConfigPath = path.join(this.baseDir, 'cypress.json');
        await this.saveComponentToFile(cypressConfigPath, cypressConfig);

        // Create Cypress test files
        const cypressTestFiles = [
            'home_page_spec.js',
            'navigation_spec.js',
            'user_authentication_spec.js',
            'form_submission_spec.js',
            'api_integration_spec.js'
        ];

        for (const testFile of cypressTestFiles) {
            console.log(chalk.yellow(`Creating Cypress test file: ${testFile}`));
            const testContent = await this.generateAIResponse(`Create a Cypress E2E test file named ${testFile} that thoroughly tests the corresponding functionality of the PHP website. Include tests for user interactions, API calls, form submissions, and error handling where applicable.`);
            const testPath = path.join(this.baseDir, 'cypress', 'integration', testFile);
            await this.saveComponentToFile(testPath, testContent);
        }

        // Create Cypress support file
        const cypressSupportContent = await this.generateAIResponse(`Create a Cypress support file (commands.js) that includes custom commands and utility functions to assist with E2E testing of the PHP website.`);
        const cypressSupportPath = path.join(this.baseDir, 'cypress', 'support', 'commands.js');
        await this.saveComponentToFile(cypressSupportPath, cypressSupportContent);

        // Create Cypress fixtures
        const fixtureTypes = ['users', 'products', 'orders'];
        for (const fixtureType of fixtureTypes) {
            const fixtureContent = await this.generateAIResponse(`Create a Cypress fixture file (${fixtureType}.json) with sample data for ${fixtureType} to be used in E2E tests.`);
            const fixturePath = path.join(this.baseDir, 'cypress', 'fixtures', `${fixtureType}.json`);
            await this.saveComponentToFile(fixturePath, fixtureContent);
        }

        console.log(chalk.green('Cypress E2E test setup completed.'));

        // Create a script to run all tests
        const testRunnerScript = `
    #!/bin/bash
    echo "Running PHPUnit tests..."
    ./vendor/bin/phpunit
    
    echo "Running Cypress E2E tests..."
    npx cypress run
    
    echo "Running Accessibility tests..."
    node scripts/a11y-test.js
    
    echo "All tests completed."
        `;
        const testRunnerPath = path.join(this.baseDir, 'scripts', 'run_all_tests.sh');
        await fs.writeFile(testRunnerPath, testRunnerScript);
        await fs.chmod(testRunnerPath, '755');
        console.log(chalk.green('Test runner script created.'));
    }


    async setupContinuousIntegration() {
        const ciConfig = await this.generateAIResponse(`Create a .github/workflows/ci.yml file for GitHub Actions that includes:
            1. Running PHPUnit tests
            2. Static code analysis using PHP_CodeSniffer and PHPStan
            3. Security checks with SensioLabs Security Checker
            4. Code style checks with PHP-CS-Fixer
            5. Deployment to staging/production environments using deployer.org
            6. Performance benchmarking and reporting
            7. Automatic dependency updates with Dependabot`);

        const ciPath = path.join(this.baseDir, '.github', 'workflows', 'ci.yml');
        await this.saveComponentToFile(ciPath, ciConfig);

        // Create additional CI/CD related files
        const files = [
            { name: '.github/dependabot.yml', prompt: 'Create a Dependabot configuration file for automatic dependency updates.' },
            { name: 'deploy.php', prompt: 'Create a Deployer configuration file for automated deployments to staging and production environments.' },
            { name: '.php-cs-fixer.dist.php', prompt: 'Create a PHP-CS-Fixer configuration file for maintaining consistent code style.' }
        ];

        for (const file of files) {
            const content = await this.generateAIResponse(file.prompt);
            const filePath = path.join(this.baseDir, file.name);
            await this.saveComponentToFile(filePath, content);
        }
    }

    async createApiEndpoints() {
        const apiFiles = [
            'UserController.php',
            'AuthController.php',
            'ProductController.php'
        ];

        for (const apiFile of apiFiles) {
            const apiContent = await this.generateAIResponse(`Create a RESTful API controller named ${apiFile} with proper routing, input validation, error handling, and rate limiting. Include OpenAPI/Swagger documentation for each endpoint.`);
            const apiPath = path.join(this.baseDir, 'src', 'controllers', apiFile);
            await this.saveComponentToFile(apiPath, apiContent);
        }

        // Generate OpenAPI specification
        const openApiSpec = await this.generateAIResponse('Create an OpenAPI 3.0 specification file (openapi.yaml) that documents all API endpoints, request/response schemas, and security requirements.');
        const openApiPath = path.join(this.baseDir, 'docs', 'openapi.yaml');
        await this.saveComponentToFile(openApiPath, openApiSpec);
    }

    async setupLogging() {
        const loggingConfig = await this.generateAIResponse(`Create a logging configuration file that sets up proper error logging, request logging, and integrates with a logging service like ELK stack or Papertrail. Include log rotation and different log levels for development and production environments.`);
        const loggingPath = path.join(this.baseDir, 'config', 'logging.php');
        await this.saveComponentToFile(loggingPath, loggingConfig);

        // Create log handlers
        const logHandlers = ['ErrorLogHandler.php', 'RequestLogHandler.php', 'SecurityLogHandler.php'];
        for (const handler of logHandlers) {
            const handlerContent = await this.generateAIResponse(`Create a ${handler} that implements proper logging strategies and integrates with the logging configuration.`);
            const handlerPath = path.join(this.baseDir, 'src', 'logging', handler);
            await this.saveComponentToFile(handlerPath, handlerContent);
        }
    }

    async createDeploymentScripts() {
        const deployScriptContent = await this.generateAIResponse(`Create a deployment script that automates the process of deploying the website to a production server, including steps for:
            1. Database migrations
            2. Asset compilation and minification
            3. Cache clearing
            4. Zero-downtime deployment using Laravel Envoy or similar tools
            5. Rollback mechanism in case of deployment failure
            6. Environment-specific configuration management`);
        const deployScriptPath = path.join(this.baseDir, 'scripts', 'deploy.sh');
        await this.saveComponentToFile(deployScriptPath, deployScriptContent);

        // Create additional deployment-related files
        const files = [
            { name: 'Envoy.blade.php', prompt: 'Create a Laravel Envoy file for defining deployment tasks and strategies.' },
            { name: 'scripts/rollback.sh', prompt: 'Create a rollback script to revert to the previous stable version in case of deployment issues.' },
            { name: 'scripts/health_check.sh', prompt: 'Create a health check script to verify the deployed application is functioning correctly.' }
        ];

        for (const file of files) {
            const content = await this.generateAIResponse(file.prompt);
            const filePath = path.join(this.baseDir, file.name);
            await this.saveComponentToFile(filePath, content);
        }
    }

    async generateSitemap() {
        const sitemapContent = await this.generateAIResponse(`Create a PHP script that generates a dynamic sitemap.xml file for the website, including all relevant pages and setting appropriate priorities and change frequencies. Implement caching to improve performance and automatic updates when content changes.`);
        const sitemapPath = path.join(this.baseDir, 'public', 'sitemap.php');
        await this.saveComponentToFile(sitemapPath, sitemapContent);

        // Create a cron job to regularly update the sitemap
        const cronJobContent = await this.generateAIResponse('Create a cron job configuration to regularly update the sitemap.xml file.');
        const cronJobPath = path.join(this.baseDir, 'config', 'cron.php');
        await this.saveComponentToFile(cronJobPath, cronJobContent);
    }

    async setupServiceWorker() {
        const serviceWorkerContent = await this.generateAIResponse(`Create a service-worker.js file that implements:
            1. Offline functionality with a fallback page
            2. Advanced caching strategies (e.g., stale-while-revalidate for API requests)
            3. Background sync for offline form submissions
            4. Push notifications with subscription management
            5. Periodic background sync for content updates`);
        const serviceWorkerPath = path.join(this.baseDir, 'public', 'service-worker.js');
        await this.saveComponentToFile(serviceWorkerPath, serviceWorkerContent);

        // Create a script to register the service worker
        const registerSWContent = await this.generateAIResponse('Create a JavaScript file to register the service worker and handle updates.');
        const registerSWPath = path.join(this.baseDir, 'assets', 'js', 'register-sw.js');
        await this.saveComponentToFile(registerSWPath, registerSWContent);
    }

    async createAccessibilityGuide() {
        const a11yGuideContent = await this.generateAIResponse(`Create a comprehensive accessibility guide for developers working on this project, including:
            1. WCAG 2.1 AA compliance checklist
            2. Best practices for creating accessible content
            3. Tools and techniques for testing accessibility
            4. Common pitfalls and how to avoid them
            5. Keyboard navigation and screen reader considerations
            6. Color contrast and typography guidelines
            7. Accessible form design principles
            8. ARIA roles and attributes usage guide
            9. Accessibility testing process and tools (e.g., axe, WAVE, screen readers)
            10. Resources for further learning and staying updated on accessibility standards`);
        const a11yGuidePath = path.join(this.baseDir, 'docs', 'accessibility-guide.md');
        await this.saveComponentToFile(a11yGuidePath, a11yGuideContent);

        // Create an accessibility testing script
        const a11yTestContent = await this.generateAIResponse('Create a script that runs automated accessibility tests using tools like axe-core or pa11y, and generates a report of issues found.');
        const a11yTestPath = path.join(this.baseDir, 'scripts', 'a11y-test.js');
        await this.saveComponentToFile(a11yTestPath, a11yTestContent);
    }

    async generatePerformanceReport() {
        console.log(chalk.cyan('Generating performance report...'));
        const reportContent = 'Performance Metrics:\n\n';
        for (const [prompt, time] of this.performanceMetrics.entries()) {
            reportContent += `${prompt}: ${time.toFixed(2)}ms\n`;
        }
        const reportPath = path.join(this.baseDir, 'docs', 'performance-report.md');
        await fs.writeFile(reportPath, reportContent);
        console.log(chalk.green(`Performance report saved to ${reportPath}`));
    }

    async askToRetry(componentName) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question(chalk.yellow(`Do you want to retry generating the ${componentName} component? (yes/no): `), resolve);
        });
        rl.close();

        return answer.toLowerCase() === 'yes';
    }

    async splitLongResponse(prompt) {
        let fullResponse = '';
        let continueGenerating = true;
        let retryCount = 0;
        const maxRetries = 3;
        const maxTokens = 87000; // Assuming most of the 20000 tokens were used
        const delayBetweenAttempts = 1000; // 1 second delay between attempts

        while (continueGenerating && retryCount < maxRetries) {
            try {
                const partialResponse = await this.generateAIResponse({
                    ...prompt,
                    content: prompt.content + "\nContinue from where you left off: " + fullResponse.slice(-500) // Provide context from the previous response
                });

                fullResponse += partialResponse;

                if (partialResponse.length < maxTokens) {
                    continueGenerating = false;
                } else {
                    // Check for a natural break point (end of a sentence or paragraph)
                    const lastPeriodIndex = partialResponse.lastIndexOf('.');
                    const lastNewlineIndex = partialResponse.lastIndexOf('\n');
                    const breakIndex = Math.max(lastPeriodIndex, lastNewlineIndex);

                    if (breakIndex !== -1) {
                        fullResponse = fullResponse.slice(0, fullResponse.length - (partialResponse.length - breakIndex));
                    }
                }

                retryCount = 0; // Reset retry count on successful attempt
            } catch (error) {
                console.error(chalk.yellow(`Error generating response (Attempt ${retryCount + 1}/${maxRetries}):`, error));
                retryCount++;

                if (retryCount < maxRetries) {
                    console.log(chalk.yellow(`Retrying in ${delayBetweenAttempts / 1000} seconds...`));
                    await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
                } else {
                    throw new Error(`Failed to generate complete response after ${maxRetries} attempts.`);
                }
            }
        }

        return fullResponse;
    }


    limitConversationHistory(maxMessages = 10) {
        if (this.conversationHistory.length > maxMessages) {
            this.conversationHistory = this.conversationHistory.slice(-maxMessages);
        }
    }
}

async function main() {
    chalk = await loadChalk();
    const generator = new WebsiteGenerator();

    try {
        console.log(chalk.cyan('Creating folder structure...'));
        await generator.createBaseStructure();

        console.log(chalk.cyan('Creating configuration files...'));
        await generator.createConfigFiles();

        console.log(chalk.cyan('Creating database migration...'));
        await generator.createDatabaseMigration();

        console.log(chalk.cyan('Creating security middleware...'));
        await generator.createSecurityMiddleware();

        const components = [
            { name: 'index', prompt: 'Create a cutting-edge, secure index.php file that serves as the entry point for the website. Include advanced routing, robust security measures, and comprehensive error handling. Implement server-side rendering optimization techniques.' },
            { name: 'header', prompt: 'Generate a highly responsive header.php file using TailwindCSS for styling and Alpine.js for advanced interactivity. Include dynamic navigation generation with multi-level menus, a mobile-friendly animated menu, and a smooth dark mode toggle with persistence.' },
            { name: 'footer', prompt: 'Create a feature-rich footer.php file with animated social media links, dynamic copyright information, and an advanced newsletter signup form. Use Alpine.js for form validation with real-time feedback, implement CSRF protection, and add a language switcher component.' },
            { name: 'home', prompt: 'Design a state-of-the-art home.php template with a parallax hero section, animated content areas, and dynamic content loading with skeleton screens. Implement intersection observer for lazy loading images and animations, use Alpine.js for interactive elements, and ensure WCAG AAA compliance.' },
            { name: 'about', prompt: 'Develop an engaging about.php template with company information, interactive team member profiles, and an animated timeline of company milestones. Use Alpine.js for an interactive timeline component with filtering options, implement schema.org markup for enhanced SEO, and add a virtual tour feature.' },
            { name: 'contact', prompt: 'Create a sophisticated contact.php template with a multi-step form that includes CSRF protection, advanced input validation, and asynchronous submission using Alpine.js and Axios. Implement rate limiting, honeypot fields, and Google reCAPTCHA v3 for spam prevention. Add a real-time chat widget option.' },
            { name: 'services', prompt: 'Design a cutting-edge services.php template showcasing the company\'s offerings with interactive 3D elements and animated call-to-action buttons. Implement a filterable and sortable grid of services using Alpine.js with smooth transitions, add microdata for rich snippets, and include a comparison feature.' },
            { name: 'blog', prompt: 'Develop a state-of-the-art blog.php template for displaying blog posts with infinite scroll pagination, dynamic categories, and an advanced search feature with autocomplete. Use Alpine.js for dynamic content loading, filtering, and a reading progress indicator. Implement social sharing with preview generation and a sophisticated commenting system with threading and real-time updates.' },
            { name: 'user-dashboard', prompt: 'Create a comprehensive user-dashboard.php template with secure authentication, advanced user profile management, and highly personalized content recommendations. Implement secure session handling with JWT, CSRF protection, two-factor authentication options, and OAuth integration. Add interactive data visualizations and a user activity timeline.' },
        ];

        for (const component of components) {
            console.log(chalk.cyan(`Generating ${component.name} component...`));
            await generator.createComponent(component.name, component.prompt);
        }

        console.log(chalk.cyan('Creating test suite...'));
        await generator.createTestSuite();

        console.log(chalk.cyan('Setting up continuous integration...'));
        await generator.setupContinuousIntegration();

        console.log(chalk.cyan('Creating API endpoints...'));
        await generator.createApiEndpoints();

        console.log(chalk.cyan('Setting up logging...'));
        await generator.setupLogging();

        console.log(chalk.cyan('Creating deployment scripts...'));
        await generator.createDeploymentScripts();

        console.log(chalk.cyan('Generating sitemap...'));
        await generator.generateSitemap();

        console.log(chalk.cyan('Setting up service worker...'));
        await generator.setupServiceWorker();

        console.log(chalk.cyan('Creating accessibility guide...'));
        await generator.createAccessibilityGuide();

        console.log(chalk.cyan('Installing dependencies...'));
        await generator.installDependencies();

        console.log(chalk.cyan('Generating documentation...'));
        await generator.generateDocumentation();

        console.log(chalk.green('Website generation complete!'));
    } catch (error) {
        console.error(chalk.red('Error during website generation:', error));
    }
}

module.exports = { main }