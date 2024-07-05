const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

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

module.exports = {
  analyzeDependencies,
  checkCodeQuality,
  profilePerformance,
  generateAPIDocs,
  automatedCodeReview
};