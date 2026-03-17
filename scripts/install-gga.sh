#!/bin/bash
# GGA Installation Script for Route Flow
# This script installs GGA and configures git hooks

set -e

echo "🤖 Installing Gentleman Guardian Angel (GGA)..."

# Check if GGA is already installed
if command -v gga &> /dev/null; then
    echo "✅ GGA is already installed"
else
    echo "📦 Installing GGA..."
    
    # Clone GGA repository
    GGA_DIR="/tmp/gga"
    if [ -d "$GGA_DIR" ]; then
        rm -rf "$GGA_DIR"
    fi
    
    git clone https://github.com/Gentleman-Programming/gentleman-guardian-angel.git "$GGA_DIR"
    cd "$GGA_DIR"
    ./install.sh
    
    echo "✅ GGA installed successfully"
fi

# Initialize GGA config if not exists
if [ ! -f ".gga" ]; then
    echo "📝 Creating GGA configuration..."
    gga init
fi

# Install pre-commit hook
echo "🪝 Installing pre-commit hook..."
gga install

# Install pre-push hook
echo "🪝 Installing pre-push hook..."
gga install --pre-push

echo ""
echo "✅ GGA installation complete!"
echo ""
echo "Usage:"
echo "  gga run          - Review staged files manually"
echo "  gga run --ci     - Run in CI mode"
echo "  gga config       - Show current configuration"
echo ""
echo "The following hooks have been installed:"
echo "  - pre-commit: Reviews staged files before commit"
echo "  - pre-push: Reviews files before push"
