#!/bin/bash
# Clawtext Auto-Installer v1.1.0
# One-command setup for maximum effectiveness

set -e

echo "🦀 Clawtext Auto-Installer"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION found. Need 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Find OpenClaw directory
OPENCLAW_DIR=""
if [ -d "$HOME/.openclaw" ]; then
    OPENCLAW_DIR="$HOME/.openclaw"
elif [ -d "/opt/openclaw" ]; then
    OPENCLAW_DIR="/opt/openclaw"
else
    echo -e "${YELLOW}⚠️  OpenClaw directory not found at standard locations${NC}"
    read -p "Enter OpenClaw directory path: " OPENCLAW_DIR
    if [ ! -d "$OPENCLAW_DIR" ]; then
        echo -e "${RED}❌ Directory not found: $OPENCLAW_DIR${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ OpenClaw found: $OPENCLAW_DIR${NC}"

# Get Clawtext source
CLAWTEXT_SRC=""
if [ -d "$(dirname "$0")/lib" ]; then
    # Running from repo
    CLAWTEXT_SRC="$(dirname "$0")"
elif [ -d "$HOME/clawtext" ]; then
    CLAWTEXT_SRC="$HOME/clawtext"
else
    echo -e "${BLUE}📦 Cloning Clawtext repository...${NC}"
    git clone https://github.com/ragesaq/clawtext.git "$HOME/clawtext"
    CLAWTEXT_SRC="$HOME/clawtext"
fi

echo -e "${GREEN}✅ Clawtext source: $CLAWTEXT_SRC${NC}"

# Create extension directory
EXTENSION_DIR="$OPENCLAW_DIR/extensions"
mkdir -p "$EXTENSION_DIR"

# Copy the auto-extension
echo ""
echo "🔧 Installing Clawtext extension..."
cp "$CLAWTEXT_SRC/lib/clawtext-auto.ts" "$EXTENSION_DIR/"
echo -e "${GREEN}✅ Extension installed${NC}"

# Copy library files
echo "📚 Installing Clawtext libraries..."
CLAWTEXT_LIB="$OPENCLAW_DIR/workspace/clawtext"
mkdir -p "$CLAWTEXT_LIB"

# Copy all lib files
cp -r "$CLAWTEXT_SRC/lib/"* "$CLAWTEXT_LIB/"
echo -e "${GREEN}✅ Libraries installed${NC}"

# Create directories
echo "📁 Creating storage directories..."
mkdir -p "$OPENCLAW_DIR/workspace/memory/clusters"
mkdir -p "$OPENCLAW_DIR/workspace/memory/entities"
echo -e "${GREEN}✅ Directories created${NC}"

# Create default config if not exists
CONFIG_FILE="$OPENCLAW_DIR/workspace/clawtext/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚙️  Creating default configuration..."
    cat > "$CONFIG_FILE" << 'EOF'
{
  "autoDetect": true,
  "useClusters": true,
  "useAdaptiveFeatures": true,
  "useEntityTracking": true,
  "adaptiveAggressiveness": "balanced",
  "clusterThreshold": 50,
  "performanceMode": "auto"
}
EOF
    echo -e "${GREEN}✅ Configuration created${NC}"
fi

# Detect memory size and suggest optimizations
echo ""
echo "🔍 Analyzing your OpenClaw setup..."

MEMORY_DIR="$OPENCLAW_DIR/workspace/memory"
MEMORY_COUNT=0
if [ -d "$MEMORY_DIR" ]; then
    MEMORY_COUNT=$(find "$MEMORY_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
fi

echo "   Memory files detected: $MEMORY_COUNT"

if [ "$MEMORY_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}   💡 New installation detected${NC}"
    echo "   Clawtext will activate once you have memories"
elif [ "$MEMORY_COUNT" -lt 50 ]; then
    echo -e "${GREEN}   ✅ Small memory store - optimal for learning${NC}"
    echo "   Clawtext will use conservative optimization"
elif [ "$MEMORY_COUNT" -lt 200 ]; then
    echo -e "${GREEN}   ✅ Medium memory store - balanced mode${NC}"
    echo "   Clawtext will adapt to your usage patterns"
else
    echo -e "${GREEN}   ✅ Large memory store - full optimization${NC}"
    echo "   Clawtext will maximize performance"
fi

# Check if OpenClaw is running
echo ""
echo "🔄 Checking OpenClaw gateway..."

if command -v openclaw &> /dev/null; then
    if openclaw gateway status &> /dev/null; then
        echo -e "${YELLOW}⚠️  OpenClaw is running. Restart required.${NC}"
        echo "   Run: openclaw gateway restart"
        
        read -p "   Restart now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🔄 Restarting OpenClaw..."
            openclaw gateway restart
            echo -e "${GREEN}✅ OpenClaw restarted${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  OpenClaw not running. Start it to activate Clawtext.${NC}"
        echo "   Run: openclaw gateway start"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check OpenClaw status${NC}"
fi

# Final summary
echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo -e "${GREEN}Clawtext is now installed and will auto-activate on next OpenClaw start.${NC}"
echo ""
echo "📖 Quick Start:"
echo "   1. Start/restart OpenClaw: openclaw gateway restart"
echo "   2. Use your agent normally - Clawtext works automatically"
echo "   3. Check status anytime: openclaw command clawtext-stats"
echo ""
echo "🔧 Available Commands:"
echo "   openclaw command clawtext-stats      # View statistics"
echo "   openclaw command clawtext-optimize   # Optimize clusters"
echo "   openclaw command clawtext-entity Alice  # Query entity state"
echo ""
echo "📚 Documentation:"
echo "   https://github.com/ragesaq/clawtext#readme"
echo ""
echo -e "${BLUE}Features active:${NC}"
echo "   • O(1) cluster lookup for instant session starts"
echo "   • Hybrid search (BM25 + semantic) for better recall"
echo "   • Adaptive feature selection (smart escalation)"
echo "   • Entity state tracking (structured data extraction)"
echo "   • Temporal decay (fresh memory prioritization)"
echo "   • Automatic optimization and background tasks"
echo ""
echo -e "${GREEN}Happy enhanced remembering! 🧠✨${NC}"
echo ""

# Create a marker file to indicate successful install
touch "$OPENCLAW_DIR/.clawtext-installed"

exit 0