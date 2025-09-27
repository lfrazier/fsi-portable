#!/bin/bash
# Build script for FSI Portable MkDocs site

set -e  # Exit on any error

echo "🔧 Building FSI Portable site..."

# Generate git information
echo "📝 Generating git information..."
python3 scripts/generate-git-info.py

# Build the MkDocs site
echo "🏗️  Building MkDocs site..."
mkdocs build

echo "✅ Build complete!"
echo "📁 Site built in 'site/' directory"
echo "🚀 Run 'mkdocs serve' to preview locally"
