const operatorIdent = "@";
const symbols = [
    "import",
];

const configuration = require('./htb.json');

function overwriteDestination(config, content) {
    if(!fs.existsSync(join(__dirname, config.destination))) {
        fs.mkdirSync(join(__dirname, config.destination), { recursive: true });
    } else {
        for (const file of fs.readdirSync(join(__dirname, config.destination))) {
            fs.unlinkSync(join(__dirname, config.destination, file));
        }
    }
    fs.writeFileSync(join(__dirname, config.destination, config.outFile), content);
}

class ParseTree {
    constructor() {
    }
    get rootNode() {
        return this._rootNode;
    }
    set rootNode(rootNode) {
        this._rootNode = rootNode;
    }
}

class ParseTreeNode {
    constructor(id, data) {
        this.id = id;
        this.data = data;
        this._children = [];
    }
    get children() {
        return this._children;
    }
    set children(children) {
        this._children = children;
    }
    addChild(child) {
        this._children.push(child);
    }
}

const fs = require('fs');
const {join} = require('path');

function makeHTML(tree) {
    let rootFileContent = fs.readFileSync(join(__dirname, tree.id)).toString();
    for (const child of tree.children) {
        rootFileContent = rootFileContent.replace(`@import(${child.id})`, makeHTML(child))
    }
    return rootFileContent;
}

function parseFileAt(path, tree) {
    const fileStr = fs.readFileSync(join(__dirname, path)).toString();
    const imports = parseFileContent(fileStr).map(result => { return {...result, path}});
    const treeNode = new ParseTreeNode(path, imports);
    if (tree.rootNode === undefined) {
        tree.rootNode = treeNode;
    }
    if (imports.length) {
        let childNodes = [];
        for (const imp of imports) {
            const childNode = parseFileAt(imp.value, tree);
            childNodes.push(childNode)
        }
        treeNode.children = childNodes;
    }
    return treeNode;
}

function parse(path, tree) {
    return parseFileAt(path, tree);
}

function start() {
    const parseTree = new ParseTree();
    const parsed = parse(configuration.entryPoint, parseTree);
    overwriteDestination(configuration, makeHTML(parsed));
}


/**
 * 
 * @param {String} str 
 */
function parseFileContent(str) {
    let symbols = [];
    let index = -1;

    const parseValue = () => {
        const startIndex = index + 1;
        if (index > str.length - 1) {
            throw Error("Unexpected EOL");
        }
        const nextValueChar = (word) => {
            index += 1;
            if (index > str.length - 1) {
                throw Error("Unexpected EOL");
            }
            const retrievedChar = str[index];
            if (retrievedChar === ')') {
                return word;
            }
            return nextValueChar(`${word}${retrievedChar}`);
        }
        return nextValueChar("");
    }

    const parseSymbol = () => {
        const startIndex = index + 1;
        if (index > str.length - 1) {
            throw Error("Unexpected EOL");
        }
        const nextSymbolChar = (word) => {
            index += 1;
            if (index > str.length - 1) {
                throw Error("Unexpected EOL");
            }
            const retrievedChar = str[index];
            if (retrievedChar === '(') {
                return word;
            }
            return nextSymbolChar(`${word}${retrievedChar}`);
        }
        const symbol = nextSymbolChar("");
        const value = parseValue();
        return {
            symbol, value, startIndex, endIndex: index,
        };
    }

    const nextChar = () => {
        index += 1;
        if (index > str.length - 1) return;

        const retrievedChar = str[index];
        if (retrievedChar === operatorIdent) {
             const symbol = parseSymbol();
             symbols.push(symbol);
        }
        nextChar();
    }

    nextChar();

    return symbols;
}

start();