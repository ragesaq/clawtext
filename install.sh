#!/bin/bash
# Clawtext Auto-Installer
# Makes Clawtext "just work" with OpenClaw

set -e

echo "🦀 Clawtext Auto-Installer"
echo "=========================="

# Check if OpenClaw is installed
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw not found. Install it first:"
    echo "   npm install -g openclaw"
    exit 1
fi

# Get OpenClaw directory
OPENCLAW_DIR="$HOME/.openclaw"
if [ ! -d "$OPENCLAW_DIR" ]; then
    echo "❌ OpenClaw directory not found at $OPENCLAW_DIR"
    exit 1
fi

echo "✅ OpenClaw found at $OPENCLAW_DIR"

# Clone or update Clawtext
if [ -d "clawtext" ]; then
    echo "📦 Updating existing Clawtext..."
    cd clawtext
    git pull origin main
else
    echo "📦 Cloning Clawtext repository..."
    git clone https://github.com/ragesaq/clawtext.git
    cd clawtext
fi

echo "🔧 Installing dependencies..."
npm install

echo "🔗 Making globally available..."
npm link

echo "🚀 Installing extension..."
cp lib/clawtext-extension.ts "$OPENCLAW_DIR/extensions/clawtext-extension.ts"

echo "🔧 Creating default config..."
cat > "$OPENCLAW_DIR/config/clawtext.json" << EOF
{
  "enabled": true,
  "clusterOptimization": "daily",
  "minConfidence": 0.7,
  "maxMemories": 10,
  "tokenBudget": 2000,
  "hybridSearch": {
    "semanticWeight": 0.7,
    "keywordWeight": 0.3,
    "recencyBoost": true,
    "pinnedBoost": true
  }
}
EOF

echo "🔄 Restarting OpenClaw gateway..."
openclaw gateway restart

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 What's been set up:"
echo "   1. Clawtext library installed globally"
echo "   2. Auto-integration extension installed"
echo "   3. Default configuration created"
echo "   4. OpenClaw gateway restarted"
echo ""
echo "🎯 To verify it's working:"
echo "   openclaw gateway status"
echo "   (Look for Clawtext initialization messages)"
echo ""
echo "📖 Next steps:"
echo "   1. Run a session to see faster context loading"
echo "   2. Check ~/.openclaw/workspace/memory/clusters/"
echo "   3. Review docs/QUICK_START.md for troubleshooting"
echo ""
echo "Need help? Check https://github.com/ragesaq/clawtext/issues"