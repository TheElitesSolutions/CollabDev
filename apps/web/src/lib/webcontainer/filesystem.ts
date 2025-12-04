/**
 * WebContainer Filesystem Utilities
 *
 * Handles conversion between project files and WebContainer filesystem format,
 * and provides utilities for syncing files.
 */

import type { FileSystemTree, DirectoryNode, FileNode } from '@webcontainer/api';

/**
 * Project file structure (from your backend)
 */
export interface ProjectFile {
  id: string;
  name: string;
  content: string | null;
  isFolder: boolean;
  parentId: string | null;
  path?: string;
}

/**
 * Convert flat project files array to WebContainer FileSystemTree
 */
export function filesToWebContainerTree(files: ProjectFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  // Build a map of id -> file for quick lookup
  const fileMap = new Map<string, ProjectFile>();
  files.forEach((file) => fileMap.set(file.id, file));

  // Build path for each file
  function getPath(file: ProjectFile): string[] {
    const parts: string[] = [file.name];
    let current = file;

    while (current.parentId) {
      const parent = fileMap.get(current.parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }

    return parts;
  }

  // Process each file
  files.forEach((file) => {
    const pathParts = getPath(file);

    if (file.isFolder) {
      // Create directory structure
      setNestedDirectory(tree, pathParts);
    } else {
      // Create file
      setNestedFile(tree, pathParts, file.content || '');
    }
  });

  return tree;
}

/**
 * Set a nested directory in the tree
 */
function setNestedDirectory(tree: FileSystemTree, pathParts: string[]): void {
  let current = tree;

  pathParts.forEach((part, index) => {
    if (!current[part]) {
      current[part] = { directory: {} };
    }

    const node = current[part];
    if ('directory' in node) {
      current = node.directory;
    }
  });
}

/**
 * Set a nested file in the tree
 */
function setNestedFile(
  tree: FileSystemTree,
  pathParts: string[],
  content: string,
): void {
  let current = tree;

  // Navigate/create parent directories
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!current[part]) {
      current[part] = { directory: {} };
    }

    const node = current[part];
    if ('directory' in node) {
      current = node.directory;
    }
  }

  // Set the file
  const fileName = pathParts[pathParts.length - 1];
  current[fileName] = {
    file: { contents: content },
  };
}

/**
 * Create a basic package.json for new projects
 */
export function createDefaultPackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {},
      devDependencies: {
        vite: '^5.0.0',
      },
    },
    null,
    2,
  );
}

/**
 * Create a starter project template
 */
export function createStarterTemplate(projectName: string): FileSystemTree {
  return {
    'package.json': {
      file: { contents: createDefaultPackageJson(projectName) },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`,
      },
    },
    src: {
      directory: {
        'main.js': {
          file: {
            contents: `// ${projectName}
console.log('Hello from ${projectName}!');

document.getElementById('app').innerHTML = \`
  <h1>Welcome to ${projectName}</h1>
  <p>Edit src/main.js to get started.</p>
\`;`,
          },
        },
        'style.css': {
          file: {
            contents: `body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}`,
          },
        },
      },
    },
  };
}

/**
 * Check if a file is a text file that can be edited
 */
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.html',
    '.css',
    '.scss',
    '.less',
    '.md',
    '.txt',
    '.yml',
    '.yaml',
    '.xml',
    '.svg',
    '.env',
    '.gitignore',
    '.eslintrc',
    '.prettierrc',
  ];

  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return textExtensions.includes(ext) || !filename.includes('.');
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}
