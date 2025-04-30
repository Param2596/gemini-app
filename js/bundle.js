import { Remarkable } from 'remarkable';
import hljs from 'highlight.js';

// Make them available on the window object so your existing code works
window.Remarkable = Remarkable;
window.hljs = hljs;

// Import your other JavaScript files
import './config.js';
import './api.js';
import './terminal.js';
import './app.js';