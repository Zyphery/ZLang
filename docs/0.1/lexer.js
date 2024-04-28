class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

class Lexer {
    constructor(input) {
        this.input = input;
        this.position = 0;
        this.tokens = [];

        // Regular expressions for token identification
        this.identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        this.numberRegex = /^-?\d+(\.\d+)?(_\d{3})*$/;
        this.stringRegex = /^"([^"\\]|\\.)*"|^'([^'\\]|\\.)*'/;

        // List of built-in types
        this.builtInTypes = [
            'var', 'real', 'int', 'uint', 'char', 'string', 'bool', 'enum', 'array', 'dict'
        ];

        // List of non-built-in types
        this.customTypes = [
            'object', 'color', 'vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'aabb'
        ];

        // List of keywords organized by categories
        this.keywords = {
            'func': 'FUNCTION_DEFINITION',
            'def': 'CLASS_DEFINITION',
            'op': 'OPERATOR_OVERRIDE',
            'scope': 'NAMESPACE',
            'include': 'INCLUDE',
            'use': 'REFERENCE_SIMPLIFICATION',
            'super': 'CALL_PARENT_FUNCTION',
            'static': 'STATIC_DECLARATION',
            'const': 'CONSTANT_DEFINITION',
            'iterate': 'LOOP_ITERATION',
            'match': 'SWITCH_STATEMENT',
            'catch': 'TRY_CATCH',
            'pass': 'LOOP_ITERATION_END',
            'put': 'APPEND_TO_OUTPUT',
            'end': 'CONCLUSION',
            'from': 'LOOP_INDEX_SETTING',
            'as': 'TYPE_CONVERSION',
            'if': 'CONDITIONAL_STATEMENT',
            'else': 'ELSE_STATEMENT',
            'self': 'CURRENT_OBJECT_REFERENCE',
            'null': 'NULL_VALUE',
            'true': 'BOOLEAN_TRUE',
            'false': 'BOOLEAN_FALSE',
            'not': 'BITWISE_NOT',
            'and': 'BITWISE_AND',
            'or': 'BITWISE_OR',
            'xor': 'BITWISE_XOR',
        };

        // List of operators
        this.operators = {
            '+': 'UNARY_PLUS',
            '-': 'UNARY_MINUS',
            '~': 'UNARY_BITWISE_INVERT',
            '!': 'BITWISE_NOT',
            '&': 'BITWISE_AND',
            '|': 'BITWISE_OR',
            '^': 'BITWISE_XOR',
            'not': 'BOOLEAN_NOT',
            'and': 'BOOLEAN_AND',
            'or': 'BOOLEAN_OR',
            'xor': 'BOOLEAN_XOR',
            '**': 'EXPONENTIATION',
            '<<': 'BITSHIFT_LEFT',
            '>>': 'BITSHIFT_RIGHT',
            '+': 'ADDITION',
            '-': 'SUBTRACTION',
            '*': 'MULTIPLICATION',
            '/': 'DIVISION',
            '%': 'MODULUS',
            '=': 'ASSIGNMENT',
            '+=': 'ASSIGNMENT_ADDITION',
            '-=': 'ASSIGNMENT_SUBTRACTION',
            '*=': 'ASSIGNMENT_MULTIPLICATION',
            '/=': 'ASSIGNMENT_DIVISION',
            '==': 'EQUALITY',
            '!=': 'INEQUALITY',
            '<': 'LESS_THAN',
            '>': 'GREATER_THAN',
            '<=': 'LESS_THAN_OR_EQUAL',
            '>=': 'GREATER_THAN_OR_EQUAL',
            'if': 'TERNARY_IF_ELSE',
        };
    }

    tokenize() {
        while (this.position < this.input.length) {
            let char = this.input[this.position];

            // Skip whitespace and handle comments
            if (/\s/.test(char)) {
                this.handleWhitespaceAndComments();
                continue;
            }

            // Process other tokens
            if (this.numberRegex.test(this.input.slice(this.position))) {
                this.tokenizeNumber();
                continue;
            }

            if (this.stringRegex.test(this.input.slice(this.position))) {
                this.tokenizeString();
                continue;
            }

            if (this.identifierRegex.test(char)) {
                this.tokenizeIdentifierOrKeyword();
                continue;
            }

            if (this.isOperator(char)) {
                this.tokenizeOperator();
                continue;
            }

            // Check for '(' in the context of built-in type declaration
            if (char === '(' && this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type === 'BUILT_IN_TYPE') {
                this.tokens.push(new Token('OPEN_PAREN', '('));
                this.position++;
                this.tokenize(); // Recursively tokenize the parameter
                this.tokens.push(new Token('CLOSE_PAREN', ')'));
                continue;
            }

            // Check for file paths with extensions
            if (char === '.' && /[a-zA-Z]/.test(this.input[this.position + 1])) {
                this.position++; // Skip the '.'
                this.tokenizeFilePath();
                continue;
            }

            // If no match, raise an error
            throw new Error(`Unexpected character: ${char} at ${this.position}`);
        }

        return this.tokens;
    }

    handleWhitespaceAndComments() {
        // Skip whitespace and handle comments
        while (this.position < this.input.length && (/[\s#]/.test(this.input[this.position]) || this.isMultiLineComment())) {
            if (this.input[this.position] === '#') {
                this.handleSingleLineComment();
            } else if (this.isMultiLineComment()) {
                this.handleMultiLineComment();
            } else {
                this.position++;
            }
        }
    }

    isMultiLineComment() {
        return this.input.startsWith('##', this.position);
    }

    handleSingleLineComment() {
        // Skip everything after '#' until the end of the line
        while (this.position < this.input.length && this.input[this.position] !== '\n') {
            this.position++;
        }
    }

    handleMultiLineComment() {
        // Skip everything after '##' until the next '##' or end of file
        this.position += 2; // Skip '##'
        while (
            this.position < this.input.length &&
            !(this.input[this.position] === '#' && this.input[this.position + 1] === '#')
        ) {
            this.position++;
        }
        this.position += 2; // Skip '##'
    }

    tokenizeNumber() {
        const match = this.input.slice(this.position).match(this.numberRegex)[0];
        const cleanedMatch = match.replace(/_/g, '');

        // Check if it's part of a built-in type declaration
        if (this.input[this.position + cleanedMatch.length] === '(') {
            this.tokens.push(new Token('BUILT_IN_TYPE', cleanedMatch));
            this.tokens.push(new Token('OPEN_PAREN', '('));
            this.position += cleanedMatch.length + 1; // Skip '('
            this.tokenize(); // Recursively tokenize the parameter
            this.tokens.push(new Token('CLOSE_PAREN', ')'));
        } else {
            // Check if it's a floating-point number
            if (/^[-+]?\d*\.\d+$/.test(cleanedMatch)) {
                this.tokens.push(new Token('FLOAT_LITERAL', parseFloat(cleanedMatch)));
            } else {
                this.tokens.push(new Token('INTEGER_LITERAL', parseInt(cleanedMatch, 10)));
            }
            this.position += match.length;
        }
    }

    tokenizeString() {
        const match = this.input.slice(this.position).match(this.stringRegex)[0];
        this.tokens.push(new Token('STRING', match));
        this.position += match.length;
    }

    tokenizeIdentifierOrKeyword() {
        let match = '';
        while (this.identifierRegex.test(this.input[this.position])) {
            match += this.input[this.position++];
        }

        // Check if the identifier is a keyword
        const keywordType = this.keywords[match];
        if (keywordType) {
            this.tokens.push(new Token(keywordType, match));

            if (match === 'real' && this.input[this.position] === '(') {
                // Tokenize built-in type with parameters
                this.tokens.push(new Token('OPEN_PAREN', '('));
                this.position++; // Skip '('
                this.tokenize(); // Recursively tokenize the parameter
                this.tokens.push(new Token('CLOSE_PAREN', ')'));
            }
        } else {
            this.tokens.push(new Token('IDENTIFIER', match));
        }
    }

    isOperator(char) {
        // Check if the character is the start of an operator
        for (const op in this.operators) {
            if (this.input.startsWith(op, this.position)) {
                return true;
            }
        }
        return false;
    }

    tokenizeOperator() {
        // Check for multi-character operators
        for (const op in this.operators) {
            if (this.input.startsWith(op, this.position)) {
                this.tokens.push(new Token(this.operators[op], op));
                this.position += op.length;
                return;
            }
        }

        // Single-character operator
        const char = this.input[this.position++];
        this.tokens.push(new Token(this.operators[char], char));
    }

    tokenizeFilePath() {
        let path = '';
        while (this.position < this.input.length && /[a-zA-Z0-9_.\/\\]/.test(this.input[this.position])) {
            path += this.input[this.position++];
        }
        this.tokens.push(new Token('FILE_PATH', path));
    }
}
