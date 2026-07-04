/**
 * Trie Data Structure for Autocomplete Landmark Search
 * Case-insensitive prefix search.
 */

class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        // Store landmark details at the end of word node
        this.landmarks = []; // Array of { id, name }
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    /**
     * Inserts a landmark name and its ID into the Trie.
     * @param {string} word Landmark name
     * @param {string} id Landmark ID (e.g., 'N1')
     */
    insert(word, id) {
        if (!word) return;
        
        const normalized = word.toLowerCase().trim();
        let current = this.root;

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (!current.children[char]) {
                current.children[char] = new TrieNode();
            }
            current = current.children[char];
        }
        
        current.isEndOfWord = true;
        // Avoid duplicate landmark insertions
        if (!current.landmarks.some(l => l.id === id)) {
            current.landmarks.push({ id, name: word });
        }
    }

    /**
     * Finds all landmarks that match the given prefix.
     * @param {string} prefix Search term
     * @returns {Array} Array of { id, name } matching landmarks
     */
    searchSuggestions(prefix) {
        if (!prefix) return [];
        
        const normalized = prefix.toLowerCase().trim();
        let current = this.root;

        // Traverse to the end of the prefix
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (!current.children[char]) {
                return []; // Prefix not found
            }
            current = current.children[char];
        }

        // Collect all landmarks from this node down
        const results = [];
        this._collectAllLandmarks(current, results);
        return results;
    }

    /**
     * Helper recursive function to collect all leaf landmarks
     */
    _collectAllLandmarks(node, results) {
        if (node.isEndOfWord) {
            results.push(...node.landmarks);
        }

        for (const char in node.children) {
            this._collectAllLandmarks(node.children[char], results);
        }
    }
}

// Export for browser global context
window.Trie = Trie;
