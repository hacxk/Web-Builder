const dotenv = require('dotenv');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

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
            php: ['vlucas/phpdotenv', 'bramus/router', 'twig/twig', 'ezyang/htmlpurifier', 'guzzlehttp/guzzle'],
            js: ['tailwindcss', 'alpinejs', 'axios', 'dompurify', 'luxon']
        };
        this.configFiles = [
            '.env', 'composer.json', 'package.json', 'tailwind.config.js',
            'webpack.config.js', 'phpunit.xml', '.gitignore', 'docker-compose.yml'
        ];
        this.conversationHistory = [];
    }

    initializeAIModel() {
        try {
            const genAI = new GoogleGenerativeAI(process.env.API_KEY);
            return genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                generationConfig: {
                    temperature: 0.9,
                    topK: 26,
                    topP: 0.2,
                    maxOutputTokens: 100000,
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
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const chat = this.aiModel.startChat({
                    history: this.conversationHistory,
                    generationConfig: {
                        maxOutputTokens: 10000,
                    },
                });

                const result = await chat.sendMessageStream(prompt);
                let text = '';
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    process.stdout.write(chalk.blue(chunkText));
                    text += chunkText;
                }
                console.log('\n');

                this.conversationHistory.push({ role: "user", parts: [{ text: prompt }] });
                this.conversationHistory.push({ role: "model", parts: [{ text: text }] });

                // Trim conversation history if it gets too long
                if (this.conversationHistory.length > 10) {
                    this.conversationHistory = this.conversationHistory.slice(-10);
                }

                return text;
            } catch (error) {
                console.error(chalk.yellow(`API Error (Attempt ${attempt}/${retries}):`, error));
                if (attempt < retries) {
                    console.log(chalk.yellow(`Retrying in 6 seconds...`));
                    await new Promise(resolve => setTimeout(resolve, 6000));
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
            { type: 'folder', name: 'docs' },
            { type: 'folder', name: 'database' },
            { type: 'folder', name: 'logs' },
            { type: 'folder', name: 'scripts' },
            { type: 'folder', name: 'storage' },
            { type: 'folder', name: 'storage/cache' },
            { type: 'folder', name: 'storage/uploads' },
        ];

        for (const item of baseStructure) {
            await this.createFolder(item.name);
        }
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
        let continueExpanding = true;
        let componentContent = '';
        let iteration = 1;

        while (continueExpanding) {
            const aiPrompt = `Create a highly advanced and feature-rich ${componentName} for a PHP website using TailwindCSS and Alpine.js. 
            The component should be visually stunning, fully responsive, and incorporate cutting-edge design principles. 
            Include detailed comments explaining complex sections of the code.
            Ensure the component follows best practices for security, performance, accessibility, and SEO.
            Implement advanced features such as lazy loading, skeleton loading, infinite scrolling, or virtualized lists where applicable.
            
            Current project structure:
            ${JSON.stringify(this.structure, null, 2)}
            
            Current content:
            ${componentContent}
            
            Iteration: ${iteration}
            
            ${initialPrompt}`;

            try {
                const newContent = await this.generateAIResponse(aiPrompt);
                componentContent += this.sanitizeCodeBlock(newContent);

                console.log(chalk.yellow(`Component ${componentName} - Iteration ${iteration} complete.`));
                continueExpanding = await this.askForExpansion(componentName);
                iteration++;
            } catch (error) {
                console.error(chalk.red(`Error generating content for ${componentName}:`, error));
                console.log(chalk.yellow(`Retrying ${componentName} generation...`));
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        const filePath = this.getComponentFilePath(componentName);
        await this.saveComponentToFile(filePath, componentContent);
    }

    sanitizeCodeBlock(content) {
        try {
            // Extract content inside triple backticks and remove file type identifiers
            const regex = /```(?:[a-z]*\n)?([\s\S]*?)```/gi;
            const matches = [...content.matchAll(regex)];
            if (matches.length > 0) {
                // Extract the content without backticks and file type identifiers
                return matches.map(match => match[1]).join('\n');
            } else {
                console.log(chalk.yellow('No content found inside triple backticks.'));
                return '';
            }
        } catch (error) {
            console.error(chalk.red(`Error sanitizing code block:`, error));
            return '';
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
            const regex = /```(?:[a-z]*\n)?([\s\S]*?)```/gi;
            const matches = [...content.matchAll(regex)];
            if (matches.length > 0) {
                const extractedContent = matches.map(match => match[1]).join('\n');
                await fs.writeFile(filePath, extractedContent);
                console.log(chalk.green(`Component saved to ${filePath}`));
                this.fileContents.set(filePath, extractedContent);
                this.structure.push({ type: 'file', name: path.relative(this.baseDir, filePath) });
            } else {
                console.log(chalk.yellow('No content found inside triple backticks.'));
            }
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
        const migrationPath = path.join(this.baseDir, 'database', 'migrations', `${Date.now()}_create_users_table.php`);
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
            const testPath = path.join(this.baseDir, 'tests', testFile);
            await this.saveComponentToFile(testPath, testContent);
        }

        // Create test configuration file
        const phpunitConfig = await this.generateAIResponse(`Create a phpunit.xml configuration file that sets up the testing environment, including database connections, test suites, and code coverage reports.`);
        const phpunitConfigPath = path.join(this.baseDir, 'phpunit.xml');
        await this.saveComponentToFile(phpunitConfigPath, phpunitConfig);
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
            const apiContent = await this.generateAIResponse(`Create a RESTful API controller named ${apiFile} with proper routing, input validation, and error handling.`);
            const apiPath = path.join(this.baseDir, 'src', 'controllers', apiFile);
            await this.saveComponentToFile(apiPath, apiContent);
        }
    }

    async setupLogging() {
        const loggingConfig = await this.generateAIResponse(`Create a logging configuration file that sets up proper error logging, request logging, and integrates with a logging service like ELK stack or Papertrail.`);
        const loggingPath = path.join(this.baseDir, 'config', 'logging.php');
        await this.saveComponentToFile(loggingPath, loggingConfig);
    }

    async createDeploymentScripts() {
        const deployScriptContent = await this.generateAIResponse(`Create a deployment script that automates the process of deploying the website to a production server, including steps for database migrations, asset compilation, and cache clearing.`);
        const deployScriptPath = path.join(this.baseDir, 'scripts', 'deploy.sh');
        await this.saveComponentToFile(deployScriptPath, deployScriptContent);
    }

    async generateSitemap() {
        const sitemapContent = await this.generateAIResponse(`Create a PHP script that generates a dynamic sitemap.xml file for the website, including all relevant pages and setting appropriate priorities and change frequencies.`);
        const sitemapPath = path.join(this.baseDir, 'public', 'sitemap.php');
        await this.saveComponentToFile(sitemapPath, sitemapContent);
    }

    async setupServiceWorker() {
        const serviceWorkerContent = await this.generateAIResponse(`Create a service-worker.js file that implements offline functionality, caching strategies, and push notifications for the website.`);
        const serviceWorkerPath = path.join(this.baseDir, 'public', 'service-worker.js');
        await this.saveComponentToFile(serviceWorkerPath, serviceWorkerContent);
    }

    async createAccessibilityGuide() {
        const a11yGuideContent = await this.generateAIResponse(`Create an accessibility guide for developers working on this project, including best practices, WCAG compliance checklist, and tools for testing accessibility.`);
        const a11yGuidePath = path.join(this.baseDir, 'docs', 'accessibility-guide.md');
        await this.saveComponentToFile(a11yGuidePath, a11yGuideContent);
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

main();