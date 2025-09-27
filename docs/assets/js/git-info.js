// Git info display script for MkDocs
(function() {
    'use strict';
    
    // Function to get git commit hash
    async function getGitCommitHash() {
        try {
            // Try to fetch from a git-info.json file first (if available)
            const response = await fetch('/git-info.json');
            if (response.ok) {
                const data = await response.json();
                return data.commit_hash;
            }
        } catch (error) {
            console.log('No git-info.json found, using fallback method');
        }
        
        // Fallback: try to get git info from the current page's meta tags or use a placeholder
        const metaCommit = document.querySelector('meta[name="git-commit"]');
        if (metaCommit) {
            return metaCommit.getAttribute('content');
        }
        
        // If no git info available, return a placeholder
        return 'unknown';
    }
    
    // Function to get current timestamp
    function getCurrentTimestamp() {
        return new Date().toLocaleString();
    }
    
    // Function to format git commit hash (show first 7 characters)
    function formatCommitHash(hash) {
        if (hash === 'unknown') return hash;
        return hash.substring(0, 7);
    }
    
    // Function to update the git info display
    async function updateGitInfo() {
        const commitHash = await getGitCommitHash();
        const timestamp = getCurrentTimestamp();
        
        // Update commit hash display
        const commitElement = document.getElementById('git-commit-hash');
        if (commitElement) {
            commitElement.textContent = formatCommitHash(commitHash);
            commitElement.title = `Full commit hash: ${commitHash}`;
        }
        
        // Update timestamp display
        const timestampElement = document.getElementById('build-timestamp');
        if (timestampElement) {
            timestampElement.textContent = timestamp;
        }
        
        // Update last updated timestamp
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = timestamp;
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateGitInfo);
    } else {
        updateGitInfo();
    }
    
    // Update timestamp every minute
    setInterval(() => {
        const timestampElement = document.getElementById('build-timestamp');
        const lastUpdatedElement = document.getElementById('last-updated');
        const currentTime = new Date().toLocaleString();
        
        if (timestampElement) {
            timestampElement.textContent = currentTime;
        }
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = currentTime;
        }
    }, 60000); // Update every minute
    
})();
