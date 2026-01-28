/**
 * dom-utils.js - Shared utilities for safe DOM manipulation
 */

const domUtils = {
    /**
     * Safely creates an element with properties and attributes
     * @param {string} tag 
     * @param {Object} options 
     * @returns {HTMLElement}
     */
    createElement(tag, options = {}) {
        const { className, textContent, innerText, attributes = {}, datasets = {}, styles = {}, events = {}, children = [] } = options;
        const el = document.createElement(tag);

        if (className) {
            if (Array.isArray(className)) {
                el.classList.add(...className.filter(Boolean));
            } else {
                el.className = className;
            }
        }

        if (textContent !== undefined) el.textContent = textContent;
        if (innerText !== undefined) el.innerText = innerText;

        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                el.setAttribute(key, value);
            }
        });

        Object.entries(datasets).forEach(([key, value]) => {
            el.dataset[key] = value;
        });

        Object.entries(styles).forEach(([key, value]) => {
            el.style[key] = value;
        });

        Object.entries(events).forEach(([type, listener]) => {
            el.addEventListener(type, listener);
        });

        children.forEach(child => {
            if (child instanceof Node) {
                el.appendChild(child);
            } else if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            }
        });

        return el;
    },

    /**
     * Safely clears all children of a node
     * @param {HTMLElement} node 
     */
    clearNode(node) {
        if (!node) return;
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    },

    /**
     * Safely set text content for an element by ID
     * @param {string} id 
     * @param {string} text 
     */
    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    /**
     * Batch update multiple elements with text content
     * @param {Object} updates { id: text }
     */
    batchSetText(updates) {
        Object.entries(updates).forEach(([id, text]) => {
            this.setText(id, text);
        });
    }
};

window.domUtils = domUtils;
