#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Setup script for conventional commits and release automation
 */

class SetupManager {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
  }

  /**
   * Execute shell command
   */
  exec(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        stdio: options.silent ? 'pipe' : 'inherit',
        cwd: this.projectRoot,
        ...options 
      });
      return result ? result.trim() : '';
    } catch (error) {
      if (!options.allowFailure) {
        console.error(`Error executing command: ${command}`);
        console.error(error.message);
        process.exit(1);
      }
      return null;
    }
  }

  /**
   * Setup git commit message template
   */
  setupCommitTemplate() {
    console.log('📝 Setting up git commit message template...');
    this.exec('git config commit.template .gitmessage');
    console.log('✅ Git commit template configured');
  }

  /**
   * Setup git hooks
   */
  setupGitHooks() {
    console.log('🪝 Setting up git hooks...');
    
    const hooksDir = path.join(this.projectRoot, '.githooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Create commit-msg hook for conventional commits validation
    const commitMsgHook = `#!/bin/sh
# Conventional Commits validation hook

commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?(!)?: .{1,50}'

error_msg="Invalid commit message format. Please use conventional commits format:
<type>[optional scope]: <description>

Examples:
  feat: add new authentication feature
  fix(ui): resolve navigation menu issue
  docs: update README with setup instructions
  
For more info: https://www.conventionalcommits.org/"

if ! grep -qE "$commit_regex" "$1"; then
    echo "$error_msg" >&2
    exit 1
fi
`;

    const commitMsgHookPath = path.join(hooksDir, 'commit-msg');
    fs.writeFileSync(commitMsgHookPath, commitMsgHook);
    
    // Make hook executable on Unix systems
    if (process.platform !== 'win32') {
      this.exec(`chmod +x ${commitMsgHookPath}`);
    }

    this.exec('git config core.hooksPath .githooks');
    console.log('✅ Git hooks configured');
  }

  /**
   * Install required dependencies
   */
  installDependencies() {
    console.log('📦 Checking release automation dependencies...');
    const result = this.exec('npm install --save-dev conventional-changelog-cli conventional-commits-parser semver', { allowFailure: true });
    if (result === null) {
      console.log('✅ Dependencies already up to date');
    } else {
      console.log('✅ Dependencies installed');
    }
  }

  /**
   * Create sample conventional commits
   */
  createSampleCommits() {
    console.log('📝 Creating sample conventional commit messages...');
    
    const samples = [
      'feat: add automated changelog generation',
      'fix: resolve version update issue in release script',
      'docs: add conventional commits guide',
      'chore: setup release automation workflow'
    ];

    console.log('Sample commit messages you can use:');
    samples.forEach(sample => {
      console.log(`  ${sample}`);
    });
  }

  /**
   * Run complete setup
   */
  setup() {
    console.log('🚀 Setting up release automation for Libre WebUI...\n');
    
    this.installDependencies();
    this.setupCommitTemplate();
    this.setupGitHooks();
    this.createSampleCommits();
    
    console.log('\n✅ Setup complete! You can now use the following commands:');
    console.log('  npm run release        - Create patch release');
    console.log('  npm run release:minor  - Create minor release');
    console.log('  npm run release:major  - Create major release');
    console.log('  npm run changelog      - Generate changelog preview');
    console.log('\n📝 Use conventional commit messages for automatic changelog generation.');
    console.log('💡 Run "git commit" to see the commit message template.');
  }
}

const setupManager = new SetupManager();
setupManager.setup();
