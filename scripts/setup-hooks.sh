#!/bin/bash
# Manual GGA Hook Setup for Route Flow
# Run this script to install GGA hooks manually

set -e

echo "🤖 Setting up GGA hooks for Route Flow..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if GGA is installed
if ! command -v gga &> /dev/null; then
    echo "📦 Installing GGA..."
    # Install GGA via Homebrew or clone
    if command -v brew &> /dev/null; then
        brew install gentleman-programming/tap/gga
    else
        git clone https://github.com/Gentleman-Programming/gentleman-guardian-angel.git /tmp/gga
        cd /tmp/gga && ./install.sh
    fi
fi

# Ensure .gga config exists
if [ ! -f ".gga" ]; then
    echo "📝 Creating .gga config..."
    cat > .gga << 'EOF'
# GGA Configuration for Route Flow
PROVIDER=ollama:llama3
CACHE_ENABLED=true
TIMEOUT=30
MAX_FILES=10
EOF
fi

# Create hooks directory
mkdir -p .git/hooks

# Install pre-commit hook
echo "🪝 Installing pre-commit hook..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# GGA Pre-commit Hook - Runs on every commit
# Validates staged files against coding standards

# Run GGA review on staged files
gga run && exit 0 || {
    echo "❌ GGA review failed. Fix the issues above or skip with --no-verify"
    exit 1
}
EOF
chmod +x .git/hooks/pre-commit

# Install pre-push hook  
echo "🪝 Installing pre-push hook..."
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# GGA Pre-push Hook - Runs before push
# Runs full project review and tests

echo "🧪 Running pre-push checks..."

# Run tests
echo "Running tests..."
npm test -- --run || {
    echo "❌ Tests failed"
    exit 1
}

# Run GGA review on changed files
echo "Running GGA review..."
gga run --ci || {
    echo "❌ GGA review failed"
    exit 1
}

echo "✅ All pre-push checks passed!"
exit 0
EOF
chmod +x .git/hooks/pre-push

echo ""
echo "✅ GGA hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  📝 pre-commit  - Reviews staged files"
echo "  📤 pre-push    - Runs tests + GGA review before push"
echo ""
echo "To bypass hooks (use sparingly):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
