#!/usr/bin/env python3
"""
Generate git information for the MkDocs site.
This script creates a git-info.json file with current git commit hash and timestamp.
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

def get_git_commit_hash():
    """Get the current git commit hash."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

def get_git_short_hash():
    """Get the short git commit hash."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

def get_git_branch():
    """Get the current git branch."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

def main():
    """Generate git information and save to JSON file."""
    # Get git information
    commit_hash = get_git_commit_hash()
    short_hash = get_git_short_hash()
    branch = get_git_branch()
    timestamp = datetime.now().isoformat()
    
    # Create git info data
    git_info = {
        'commit_hash': commit_hash or 'unknown',
        'short_hash': short_hash or 'unknown',
        'branch': branch or 'unknown',
        'build_timestamp': timestamp,
        'build_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # Determine output path
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / 'docs' / 'git-info.json'
    
    # Write git info to JSON file
    try:
        with open(output_path, 'w') as f:
            json.dump(git_info, f, indent=2)
        
        print(f"Git info generated successfully:")
        print(f"  Commit: {git_info['short_hash']}")
        print(f"  Branch: {git_info['branch']}")
        print(f"  Timestamp: {git_info['build_date']}")
        print(f"  Output: {output_path}")
        
    except Exception as e:
        print(f"Error writing git info: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
