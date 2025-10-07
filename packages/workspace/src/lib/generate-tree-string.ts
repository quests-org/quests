// via https://github.com/yamadashy/repomix/blob/b42fc6e26fe19400071be18d6dfa2d19171374e0/src/core/file/fileTreeGenerate.ts

interface TreeNode {
  children: TreeNode[];
  isDirectory: boolean;
  name: string;
}

const createTreeNode = (name: string, isDirectory: boolean): TreeNode => ({
  children: [],
  isDirectory,
  name,
});

export function generateTreeString(
  files: string[],
  emptyDirPaths: string[] = [],
): string {
  const tree = generateFileTree(files, emptyDirPaths);
  return treeToString(tree).trim();
}

function addPathToTree(
  root: TreeNode,
  path: string,
  isDirectory: boolean,
): void {
  const parts = path.split("/");
  let currentNode = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    let child = currentNode.children.find((c) => c.name === part);

    if (!child) {
      child = createTreeNode(part ?? "", !isLastPart || isDirectory);
      currentNode.children.push(child);
    }

    currentNode = child;
  }
}

function generateFileTree(
  files: string[],
  emptyDirPaths: string[] = [],
): TreeNode {
  const root: TreeNode = createTreeNode("root", true);

  for (const file of files) {
    addPathToTree(root, file, false);
  }

  // Add empty directories
  for (const dir of emptyDirPaths) {
    addPathToTree(root, dir, true);
  }

  return root;
}

function sortTreeNodes(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });

  for (const child of node.children) {
    sortTreeNodes(child);
  }
}

function treeToString(node: TreeNode, prefix = ""): string {
  sortTreeNodes(node);
  let result = "";

  for (const child of node.children) {
    result += `${prefix}${child.name}${child.isDirectory ? "/" : ""}\n`;
    if (child.isDirectory) {
      result += treeToString(child, `${prefix}  `);
    }
  }

  return result;
}
