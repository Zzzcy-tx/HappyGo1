module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1695306835762, function(require, module, exports) {

// classic singleton yargs API, to use yargs
// without running as a singleton do:
// require('yargs/yargs')(process.argv.slice(2))
const yargs = require('./yargs')
const processArgv = require('./build/lib/process-argv')

Argv(processArgv.getProcessArgvWithoutBin())

module.exports = Argv

function Argv (processArgs, cwd) {
  const argv = yargs(processArgs, cwd, require)
  singletonify(argv)
  return argv
}

/*  Hack an instance of Argv with process.argv into Argv
    so people can do
    require('yargs')(['--beeble=1','-z','zizzle']).argv
    to parse a list of args and
    require('yargs').argv
    to get a parsed version of process.argv.
*/
function singletonify (inst) {
  Object.keys(inst).forEach((key) => {
    if (key === 'argv') {
      Argv.__defineGetter__(key, inst.__lookupGetter__(key))
    } else if (typeof inst[key] === 'function') {
      Argv[key] = inst[key].bind(inst)
    } else {
      Argv.__defineGetter__('$0', () => {
        return inst.$0
      })
      Argv.__defineGetter__('parsed', () => {
        return inst.parsed
      })
    }
  })
}

}, function(modId) {var map = {"./yargs":1695306835763,"./build/lib/process-argv":1695306835779}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835763, function(require, module, exports) {


// an async function fails early in Node.js versions prior to 8.
async function requiresNode8OrGreater () {}
requiresNode8OrGreater()

const { Yargs, rebase } = require('./build/lib/yargs')
const Parser = require('yargs-parser')

exports = module.exports = Yargs
exports.rebase = rebase

// allow consumers to directly use the version of yargs-parser used by yargs
exports.Parser = Parser

}, function(modId) { var map = {"./build/lib/yargs":1695306835764}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835764, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isYargsInstance = exports.rebase = exports.Yargs = void 0;
const command_1 = require("./command");
const common_types_1 = require("./common-types");
const yerror_1 = require("./yerror");
const usage_1 = require("./usage");
const argsert_1 = require("./argsert");
const fs = require("fs");
const completion_1 = require("./completion");
const path = require("path");
const validation_1 = require("./validation");
const obj_filter_1 = require("./obj-filter");
const apply_extends_1 = require("./apply-extends");
const middleware_1 = require("./middleware");
const processArgv = require("./process-argv");
const is_promise_1 = require("./is-promise");
const Parser = require("yargs-parser");
const y18nFactory = require("y18n");
const setBlocking = require("set-blocking");
const findUp = require("find-up");
const requireMainFilename = require("require-main-filename");
function Yargs(processArgs = [], cwd = process.cwd(), parentRequire = require) {
    const self = {};
    let command;
    let completion = null;
    let groups = {};
    const globalMiddleware = [];
    let output = '';
    const preservedGroups = {};
    let usage;
    let validation;
    let handlerFinishCommand = null;
    const y18n = y18nFactory({
        directory: path.resolve(__dirname, '../../locales'),
        updateFiles: false
    });
    self.middleware = middleware_1.globalMiddlewareFactory(globalMiddleware, self);
    self.scriptName = function (scriptName) {
        self.customScriptName = true;
        self.$0 = scriptName;
        return self;
    };
    // ignore the node bin, specify this in your
    // bin file with #!/usr/bin/env node
    let default$0;
    if (/\b(node|iojs|electron)(\.exe)?$/.test(process.argv[0])) {
        default$0 = process.argv.slice(1, 2);
    }
    else {
        default$0 = process.argv.slice(0, 1);
    }
    self.$0 = default$0
        .map(x => {
        const b = rebase(cwd, x);
        return x.match(/^(\/|([a-zA-Z]:)?\\)/) && b.length < x.length ? b : x;
    })
        .join(' ').trim();
    if (process.env._ !== undefined && processArgv.getProcessArgvBin() === process.env._) {
        self.$0 = process.env._.replace(`${path.dirname(process.execPath)}/`, '');
    }
    // use context object to keep track of resets, subcommand execution, etc
    // submodules should modify and check the state of context as necessary
    const context = { resets: -1, commands: [], fullCommands: [], files: [] };
    self.getContext = () => context;
    // puts yargs back into an initial state. any keys
    // that have been set to "global" will not be reset
    // by this action.
    let options;
    self.resetOptions = self.reset = function resetOptions(aliases = {}) {
        context.resets++;
        options = options || {};
        // put yargs back into an initial state, this
        // logic is used to build a nested command
        // hierarchy.
        const tmpOptions = {};
        tmpOptions.local = options.local ? options.local : [];
        tmpOptions.configObjects = options.configObjects ? options.configObjects : [];
        // if a key has been explicitly set as local,
        // we should reset it before passing options to command.
        const localLookup = {};
        tmpOptions.local.forEach((l) => {
            localLookup[l] = true;
            (aliases[l] || []).forEach((a) => {
                localLookup[a] = true;
            });
        });
        // add all groups not set to local to preserved groups
        Object.assign(preservedGroups, Object.keys(groups).reduce((acc, groupName) => {
            const keys = groups[groupName].filter(key => !(key in localLookup));
            if (keys.length > 0) {
                acc[groupName] = keys;
            }
            return acc;
        }, {}));
        // groups can now be reset
        groups = {};
        const arrayOptions = [
            'array', 'boolean', 'string', 'skipValidation',
            'count', 'normalize', 'number',
            'hiddenOptions'
        ];
        const objectOptions = [
            'narg', 'key', 'alias', 'default', 'defaultDescription',
            'config', 'choices', 'demandedOptions', 'demandedCommands', 'coerce',
            'deprecatedOptions'
        ];
        arrayOptions.forEach(k => {
            tmpOptions[k] = (options[k] || []).filter(k => !localLookup[k]);
        });
        objectOptions.forEach((k) => {
            tmpOptions[k] = obj_filter_1.objFilter(options[k], k => !localLookup[k]);
        });
        tmpOptions.envPrefix = options.envPrefix;
        options = tmpOptions;
        // if this is the first time being executed, create
        // instances of all our helpers -- otherwise just reset.
        usage = usage ? usage.reset(localLookup) : usage_1.usage(self, y18n);
        validation = validation ? validation.reset(localLookup) : validation_1.validation(self, usage, y18n);
        command = command ? command.reset() : command_1.command(self, usage, validation, globalMiddleware);
        if (!completion)
            completion = completion_1.completion(self, usage, command);
        completionCommand = null;
        output = '';
        exitError = null;
        hasOutput = false;
        self.parsed = false;
        return self;
    };
    self.resetOptions();
    // temporary hack: allow "freezing" of reset-able state for parse(msg, cb)
    const frozens = [];
    function freeze() {
        frozens.push({
            options,
            configObjects: options.configObjects.slice(0),
            exitProcess,
            groups,
            strict,
            strictCommands,
            completionCommand,
            output,
            exitError,
            hasOutput,
            parsed: self.parsed,
            parseFn,
            parseContext,
            handlerFinishCommand
        });
        usage.freeze();
        validation.freeze();
        command.freeze();
    }
    function unfreeze() {
        const frozen = frozens.pop();
        common_types_1.assertNotStrictEqual(frozen, undefined);
        let configObjects;
        ({
            options,
            configObjects,
            exitProcess,
            groups,
            output,
            exitError,
            hasOutput,
            parsed: self.parsed,
            strict,
            strictCommands,
            completionCommand,
            parseFn,
            parseContext,
            handlerFinishCommand
        } = frozen);
        options.configObjects = configObjects;
        usage.unfreeze();
        validation.unfreeze();
        command.unfreeze();
    }
    self.boolean = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('boolean', keys);
        return self;
    };
    self.array = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('array', keys);
        return self;
    };
    self.number = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('number', keys);
        return self;
    };
    self.normalize = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('normalize', keys);
        return self;
    };
    self.count = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('count', keys);
        return self;
    };
    self.string = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('string', keys);
        return self;
    };
    self.requiresArg = function (keys) {
        // the 2nd paramter [number] in the argsert the assertion is mandatory
        // as populateParserHintSingleValueDictionary recursively calls requiresArg
        // with Nan as a 2nd parameter, although we ignore it
        argsert_1.argsert('<array|string|object> [number]', [keys], arguments.length);
        // If someone configures nargs at the same time as requiresArg,
        // nargs should take precedent,
        // see: https://github.com/yargs/yargs/pull/1572
        // TODO: make this work with aliases, using a check similar to
        // checkAllAliases() in yargs-parser.
        if (typeof keys === 'string' && options.narg[keys]) {
            return self;
        }
        else {
            populateParserHintSingleValueDictionary(self.requiresArg, 'narg', keys, NaN);
        }
        return self;
    };
    self.skipValidation = function (keys) {
        argsert_1.argsert('<array|string>', [keys], arguments.length);
        populateParserHintArray('skipValidation', keys);
        return self;
    };
    function populateParserHintArray(type, keys) {
        keys = [].concat(keys);
        keys.forEach((key) => {
            key = sanitizeKey(key);
            options[type].push(key);
        });
    }
    self.nargs = function (key, value) {
        argsert_1.argsert('<string|object|array> [number]', [key, value], arguments.length);
        populateParserHintSingleValueDictionary(self.nargs, 'narg', key, value);
        return self;
    };
    self.choices = function (key, value) {
        argsert_1.argsert('<object|string|array> [string|array]', [key, value], arguments.length);
        populateParserHintArrayDictionary(self.choices, 'choices', key, value);
        return self;
    };
    self.alias = function (key, value) {
        argsert_1.argsert('<object|string|array> [string|array]', [key, value], arguments.length);
        populateParserHintArrayDictionary(self.alias, 'alias', key, value);
        return self;
    };
    // TODO: actually deprecate self.defaults.
    self.default = self.defaults = function (key, value, defaultDescription) {
        argsert_1.argsert('<object|string|array> [*] [string]', [key, value, defaultDescription], arguments.length);
        if (defaultDescription) {
            common_types_1.assertSingleKey(key);
            options.defaultDescription[key] = defaultDescription;
        }
        if (typeof value === 'function') {
            common_types_1.assertSingleKey(key);
            if (!options.defaultDescription[key])
                options.defaultDescription[key] = usage.functionDescription(value);
            value = value.call();
        }
        populateParserHintSingleValueDictionary(self.default, 'default', key, value);
        return self;
    };
    self.describe = function (key, desc) {
        argsert_1.argsert('<object|string|array> [string]', [key, desc], arguments.length);
        setKey(key, true);
        usage.describe(key, desc);
        return self;
    };
    function setKey(key, set) {
        populateParserHintSingleValueDictionary(setKey, 'key', key, set);
        return self;
    }
    function demandOption(keys, msg) {
        argsert_1.argsert('<object|string|array> [string]', [keys, msg], arguments.length);
        populateParserHintSingleValueDictionary(self.demandOption, 'demandedOptions', keys, msg);
        return self;
    }
    self.demandOption = demandOption;
    self.coerce = function (keys, value) {
        argsert_1.argsert('<object|string|array> [function]', [keys, value], arguments.length);
        populateParserHintSingleValueDictionary(self.coerce, 'coerce', keys, value);
        return self;
    };
    function populateParserHintSingleValueDictionary(builder, type, key, value) {
        populateParserHintDictionary(builder, type, key, value, (type, key, value) => {
            options[type][key] = value;
        });
    }
    function populateParserHintArrayDictionary(builder, type, key, value) {
        populateParserHintDictionary(builder, type, key, value, (type, key, value) => {
            options[type][key] = (options[type][key] || []).concat(value);
        });
    }
    function populateParserHintDictionary(builder, type, key, value, singleKeyHandler) {
        if (Array.isArray(key)) {
            // an array of keys with one value ['x', 'y', 'z'], function parse () {}
            key.forEach((k) => {
                builder(k, value);
            });
        }
        else if (((key) => typeof key === 'object')(key)) {
            // an object of key value pairs: {'x': parse () {}, 'y': parse() {}}
            for (const k of common_types_1.objectKeys(key)) {
                builder(k, key[k]);
            }
        }
        else {
            singleKeyHandler(type, sanitizeKey(key), value);
        }
    }
    function sanitizeKey(key) {
        if (key === '__proto__')
            return '___proto___';
        return key;
    }
    function deleteFromParserHintObject(optionKey) {
        // delete from all parsing hints:
        // boolean, array, key, alias, etc.
        common_types_1.objectKeys(options).forEach((hintKey) => {
            // configObjects is not a parsing hint array
            if (((key) => key === 'configObjects')(hintKey))
                return;
            const hint = options[hintKey];
            if (Array.isArray(hint)) {
                if (~hint.indexOf(optionKey))
                    hint.splice(hint.indexOf(optionKey), 1);
            }
            else if (typeof hint === 'object') {
                delete hint[optionKey];
            }
        });
        // now delete the description from usage.js.
        delete usage.getDescriptions()[optionKey];
    }
    self.config = function config(key = 'config', msg, parseFn) {
        argsert_1.argsert('[object|string] [string|function] [function]', [key, msg, parseFn], arguments.length);
        // allow a config object to be provided directly.
        if ((typeof key === 'object') && !Array.isArray(key)) {
            key = apply_extends_1.applyExtends(key, cwd, self.getParserConfiguration()['deep-merge-config']);
            options.configObjects = (options.configObjects || []).concat(key);
            return self;
        }
        // allow for a custom parsing function.
        if (typeof msg === 'function') {
            parseFn = msg;
            msg = undefined;
        }
        self.describe(key, msg || usage.deferY18nLookup('Path to JSON config file'));
        (Array.isArray(key) ? key : [key]).forEach((k) => {
            options.config[k] = parseFn || true;
        });
        return self;
    };
    self.example = function (cmd, description) {
        argsert_1.argsert('<string|array> [string]', [cmd, description], arguments.length);
        if (Array.isArray(cmd)) {
            cmd.forEach((exampleParams) => self.example(...exampleParams));
        }
        else {
            usage.example(cmd, description);
        }
        return self;
    };
    self.command = function (cmd, description, builder, handler, middlewares, deprecated) {
        argsert_1.argsert('<string|array|object> [string|boolean] [function|object] [function] [array] [boolean|string]', [cmd, description, builder, handler, middlewares, deprecated], arguments.length);
        command.addHandler(cmd, description, builder, handler, middlewares, deprecated);
        return self;
    };
    self.commandDir = function (dir, opts) {
        argsert_1.argsert('<string> [object]', [dir, opts], arguments.length);
        const req = parentRequire || require;
        command.addDirectory(dir, self.getContext(), req, require('get-caller-file')(), opts);
        return self;
    };
    // TODO: deprecate self.demand in favor of
    // .demandCommand() .demandOption().
    self.demand = self.required = self.require = function demand(keys, max, msg) {
        // you can optionally provide a 'max' key,
        // which will raise an exception if too many '_'
        // options are provided.
        if (Array.isArray(max)) {
            max.forEach((key) => {
                common_types_1.assertNotStrictEqual(msg, true);
                demandOption(key, msg);
            });
            max = Infinity;
        }
        else if (typeof max !== 'number') {
            msg = max;
            max = Infinity;
        }
        if (typeof keys === 'number') {
            common_types_1.assertNotStrictEqual(msg, true);
            self.demandCommand(keys, max, msg, msg);
        }
        else if (Array.isArray(keys)) {
            keys.forEach((key) => {
                common_types_1.assertNotStrictEqual(msg, true);
                demandOption(key, msg);
            });
        }
        else {
            if (typeof msg === 'string') {
                demandOption(keys, msg);
            }
            else if (msg === true || typeof msg === 'undefined') {
                demandOption(keys);
            }
        }
        return self;
    };
    self.demandCommand = function demandCommand(min = 1, max, minMsg, maxMsg) {
        argsert_1.argsert('[number] [number|string] [string|null|undefined] [string|null|undefined]', [min, max, minMsg, maxMsg], arguments.length);
        if (typeof max !== 'number') {
            minMsg = max;
            max = Infinity;
        }
        self.global('_', false);
        options.demandedCommands._ = {
            min,
            max,
            minMsg,
            maxMsg
        };
        return self;
    };
    self.getDemandedOptions = () => {
        argsert_1.argsert([], 0);
        return options.demandedOptions;
    };
    self.getDemandedCommands = () => {
        argsert_1.argsert([], 0);
        return options.demandedCommands;
    };
    self.deprecateOption = function deprecateOption(option, message) {
        argsert_1.argsert('<string> [string|boolean]', [option, message], arguments.length);
        options.deprecatedOptions[option] = message;
        return self;
    };
    self.getDeprecatedOptions = () => {
        argsert_1.argsert([], 0);
        return options.deprecatedOptions;
    };
    self.implies = function (key, value) {
        argsert_1.argsert('<string|object> [number|string|array]', [key, value], arguments.length);
        validation.implies(key, value);
        return self;
    };
    self.conflicts = function (key1, key2) {
        argsert_1.argsert('<string|object> [string|array]', [key1, key2], arguments.length);
        validation.conflicts(key1, key2);
        return self;
    };
    self.usage = function (msg, description, builder, handler) {
        argsert_1.argsert('<string|null|undefined> [string|boolean] [function|object] [function]', [msg, description, builder, handler], arguments.length);
        if (description !== undefined) {
            common_types_1.assertNotStrictEqual(msg, null);
            // .usage() can be used as an alias for defining
            // a default command.
            if ((msg || '').match(/^\$0( |$)/)) {
                return self.command(msg, description, builder, handler);
            }
            else {
                throw new yerror_1.YError('.usage() description must start with $0 if being used as alias for .command()');
            }
        }
        else {
            usage.usage(msg);
            return self;
        }
    };
    self.epilogue = self.epilog = function (msg) {
        argsert_1.argsert('<string>', [msg], arguments.length);
        usage.epilog(msg);
        return self;
    };
    self.fail = function (f) {
        argsert_1.argsert('<function>', [f], arguments.length);
        usage.failFn(f);
        return self;
    };
    self.onFinishCommand = function (f) {
        argsert_1.argsert('<function>', [f], arguments.length);
        handlerFinishCommand = f;
        return self;
    };
    self.getHandlerFinishCommand = () => handlerFinishCommand;
    self.check = function (f, _global) {
        argsert_1.argsert('<function> [boolean]', [f, _global], arguments.length);
        validation.check(f, _global !== false);
        return self;
    };
    self.global = function global(globals, global) {
        argsert_1.argsert('<string|array> [boolean]', [globals, global], arguments.length);
        globals = [].concat(globals);
        if (global !== false) {
            options.local = options.local.filter(l => globals.indexOf(l) === -1);
        }
        else {
            globals.forEach((g) => {
                if (options.local.indexOf(g) === -1)
                    options.local.push(g);
            });
        }
        return self;
    };
    self.pkgConf = function pkgConf(key, rootPath) {
        argsert_1.argsert('<string> [string]', [key, rootPath], arguments.length);
        let conf = null;
        // prefer cwd to require-main-filename in this method
        // since we're looking for e.g. "nyc" config in nyc consumer
        // rather than "yargs" config in nyc (where nyc is the main filename)
        const obj = pkgUp(rootPath || cwd);
        // If an object exists in the key, add it to options.configObjects
        if (obj[key] && typeof obj[key] === 'object') {
            conf = apply_extends_1.applyExtends(obj[key], rootPath || cwd, self.getParserConfiguration()['deep-merge-config']);
            options.configObjects = (options.configObjects || []).concat(conf);
        }
        return self;
    };
    const pkgs = {};
    function pkgUp(rootPath) {
        const npath = rootPath || '*';
        if (pkgs[npath])
            return pkgs[npath];
        let obj = {};
        try {
            let startDir = rootPath || requireMainFilename(parentRequire);
            // When called in an environment that lacks require.main.filename, such as a jest test runner,
            // startDir is already process.cwd(), and should not be shortened.
            // Whether or not it is _actually_ a directory (e.g., extensionless bin) is irrelevant, find-up handles it.
            if (!rootPath && path.extname(startDir)) {
                startDir = path.dirname(startDir);
            }
            const pkgJsonPath = findUp.sync('package.json', {
                cwd: startDir
            });
            common_types_1.assertNotStrictEqual(pkgJsonPath, undefined);
            obj = JSON.parse(fs.readFileSync(pkgJsonPath).toString());
        }
        catch (noop) { }
        pkgs[npath] = obj || {};
        return pkgs[npath];
    }
    let parseFn = null;
    let parseContext = null;
    self.parse = function parse(args, shortCircuit, _parseFn) {
        argsert_1.argsert('[string|array] [function|boolean|object] [function]', [args, shortCircuit, _parseFn], arguments.length);
        freeze();
        if (typeof args === 'undefined') {
            const argv = self._parseArgs(processArgs);
            const tmpParsed = self.parsed;
            unfreeze();
            // TODO: remove this compatibility hack when we release yargs@15.x:
            self.parsed = tmpParsed;
            return argv;
        }
        // a context object can optionally be provided, this allows
        // additional information to be passed to a command handler.
        if (typeof shortCircuit === 'object') {
            parseContext = shortCircuit;
            shortCircuit = _parseFn;
        }
        // by providing a function as a second argument to
        // parse you can capture output that would otherwise
        // default to printing to stdout/stderr.
        if (typeof shortCircuit === 'function') {
            parseFn = shortCircuit;
            shortCircuit = false;
        }
        // completion short-circuits the parsing process,
        // skipping validation, etc.
        if (!shortCircuit)
            processArgs = args;
        if (parseFn)
            exitProcess = false;
        const parsed = self._parseArgs(args, !!shortCircuit);
        completion.setParsed(self.parsed);
        if (parseFn)
            parseFn(exitError, parsed, output);
        unfreeze();
        return parsed;
    };
    self._getParseContext = () => parseContext || {};
    self._hasParseCallback = () => !!parseFn;
    self.option = self.options = function option(key, opt) {
        argsert_1.argsert('<string|object> [object]', [key, opt], arguments.length);
        if (typeof key === 'object') {
            Object.keys(key).forEach((k) => {
                self.options(k, key[k]);
            });
        }
        else {
            if (typeof opt !== 'object') {
                opt = {};
            }
            options.key[key] = true; // track manually set keys.
            if (opt.alias)
                self.alias(key, opt.alias);
            const deprecate = opt.deprecate || opt.deprecated;
            if (deprecate) {
                self.deprecateOption(key, deprecate);
            }
            const demand = opt.demand || opt.required || opt.require;
            // A required option can be specified via "demand: true".
            if (demand) {
                self.demand(key, demand);
            }
            if (opt.demandOption) {
                self.demandOption(key, typeof opt.demandOption === 'string' ? opt.demandOption : undefined);
            }
            if (opt.conflicts) {
                self.conflicts(key, opt.conflicts);
            }
            if ('default' in opt) {
                self.default(key, opt.default);
            }
            if (opt.implies !== undefined) {
                self.implies(key, opt.implies);
            }
            if (opt.nargs !== undefined) {
                self.nargs(key, opt.nargs);
            }
            if (opt.config) {
                self.config(key, opt.configParser);
            }
            if (opt.normalize) {
                self.normalize(key);
            }
            if (opt.choices) {
                self.choices(key, opt.choices);
            }
            if (opt.coerce) {
                self.coerce(key, opt.coerce);
            }
            if (opt.group) {
                self.group(key, opt.group);
            }
            if (opt.boolean || opt.type === 'boolean') {
                self.boolean(key);
                if (opt.alias)
                    self.boolean(opt.alias);
            }
            if (opt.array || opt.type === 'array') {
                self.array(key);
                if (opt.alias)
                    self.array(opt.alias);
            }
            if (opt.number || opt.type === 'number') {
                self.number(key);
                if (opt.alias)
                    self.number(opt.alias);
            }
            if (opt.string || opt.type === 'string') {
                self.string(key);
                if (opt.alias)
                    self.string(opt.alias);
            }
            if (opt.count || opt.type === 'count') {
                self.count(key);
            }
            if (typeof opt.global === 'boolean') {
                self.global(key, opt.global);
            }
            if (opt.defaultDescription) {
                options.defaultDescription[key] = opt.defaultDescription;
            }
            if (opt.skipValidation) {
                self.skipValidation(key);
            }
            const desc = opt.describe || opt.description || opt.desc;
            self.describe(key, desc);
            if (opt.hidden) {
                self.hide(key);
            }
            if (opt.requiresArg) {
                self.requiresArg(key);
            }
        }
        return self;
    };
    self.getOptions = () => options;
    self.positional = function (key, opts) {
        argsert_1.argsert('<string> <object>', [key, opts], arguments.length);
        if (context.resets === 0) {
            throw new yerror_1.YError(".positional() can only be called in a command's builder function");
        }
        // .positional() only supports a subset of the configuration
        // options available to .option().
        const supportedOpts = ['default', 'defaultDescription', 'implies', 'normalize',
            'choices', 'conflicts', 'coerce', 'type', 'describe',
            'desc', 'description', 'alias'];
        opts = obj_filter_1.objFilter(opts, (k, v) => {
            let accept = supportedOpts.indexOf(k) !== -1;
            // type can be one of string|number|boolean.
            if (k === 'type' && ['string', 'number', 'boolean'].indexOf(v) === -1)
                accept = false;
            return accept;
        });
        // copy over any settings that can be inferred from the command string.
        const fullCommand = context.fullCommands[context.fullCommands.length - 1];
        const parseOptions = fullCommand ? command.cmdToParseOptions(fullCommand) : {
            array: [],
            alias: {},
            default: {},
            demand: {}
        };
        common_types_1.objectKeys(parseOptions).forEach((pk) => {
            const parseOption = parseOptions[pk];
            if (Array.isArray(parseOption)) {
                if (parseOption.indexOf(key) !== -1)
                    opts[pk] = true;
            }
            else {
                if (parseOption[key] && !(pk in opts))
                    opts[pk] = parseOption[key];
            }
        });
        self.group(key, usage.getPositionalGroupName());
        return self.option(key, opts);
    };
    self.group = function group(opts, groupName) {
        argsert_1.argsert('<string|array> <string>', [opts, groupName], arguments.length);
        const existing = preservedGroups[groupName] || groups[groupName];
        if (preservedGroups[groupName]) {
            // we now only need to track this group name in groups.
            delete preservedGroups[groupName];
        }
        const seen = {};
        groups[groupName] = (existing || []).concat(opts).filter((key) => {
            if (seen[key])
                return false;
            return (seen[key] = true);
        });
        return self;
    };
    // combine explicit and preserved groups. explicit groups should be first
    self.getGroups = () => Object.assign({}, groups, preservedGroups);
    // as long as options.envPrefix is not undefined,
    // parser will apply env vars matching prefix to argv
    self.env = function (prefix) {
        argsert_1.argsert('[string|boolean]', [prefix], arguments.length);
        if (prefix === false)
            delete options.envPrefix;
        else
            options.envPrefix = prefix || '';
        return self;
    };
    self.wrap = function (cols) {
        argsert_1.argsert('<number|null|undefined>', [cols], arguments.length);
        usage.wrap(cols);
        return self;
    };
    let strict = false;
    self.strict = function (enabled) {
        argsert_1.argsert('[boolean]', [enabled], arguments.length);
        strict = enabled !== false;
        return self;
    };
    self.getStrict = () => strict;
    let strictCommands = false;
    self.strictCommands = function (enabled) {
        argsert_1.argsert('[boolean]', [enabled], arguments.length);
        strictCommands = enabled !== false;
        return self;
    };
    self.getStrictCommands = () => strictCommands;
    let parserConfig = {};
    self.parserConfiguration = function parserConfiguration(config) {
        argsert_1.argsert('<object>', [config], arguments.length);
        parserConfig = config;
        return self;
    };
    self.getParserConfiguration = () => parserConfig;
    self.showHelp = function (level) {
        argsert_1.argsert('[string|function]', [level], arguments.length);
        if (!self.parsed)
            self._parseArgs(processArgs); // run parser, if it has not already been executed.
        if (command.hasDefaultCommand()) {
            context.resets++; // override the restriction on top-level positoinals.
            command.runDefaultBuilderOn(self);
        }
        usage.showHelp(level);
        return self;
    };
    let versionOpt = null;
    self.version = function version(opt, msg, ver) {
        const defaultVersionOpt = 'version';
        argsert_1.argsert('[boolean|string] [string] [string]', [opt, msg, ver], arguments.length);
        // nuke the key previously configured
        // to return version #.
        if (versionOpt) {
            deleteFromParserHintObject(versionOpt);
            usage.version(undefined);
            versionOpt = null;
        }
        if (arguments.length === 0) {
            ver = guessVersion();
            opt = defaultVersionOpt;
        }
        else if (arguments.length === 1) {
            if (opt === false) { // disable default 'version' key.
                return self;
            }
            ver = opt;
            opt = defaultVersionOpt;
        }
        else if (arguments.length === 2) {
            ver = msg;
            msg = undefined;
        }
        versionOpt = typeof opt === 'string' ? opt : defaultVersionOpt;
        msg = msg || usage.deferY18nLookup('Show version number');
        usage.version(ver || undefined);
        self.boolean(versionOpt);
        self.describe(versionOpt, msg);
        return self;
    };
    function guessVersion() {
        const obj = pkgUp();
        return obj.version || 'unknown';
    }
    let helpOpt = null;
    self.addHelpOpt = self.help = function addHelpOpt(opt, msg) {
        const defaultHelpOpt = 'help';
        argsert_1.argsert('[string|boolean] [string]', [opt, msg], arguments.length);
        // nuke the key previously configured
        // to return help.
        if (helpOpt) {
            deleteFromParserHintObject(helpOpt);
            helpOpt = null;
        }
        if (arguments.length === 1) {
            if (opt === false)
                return self;
        }
        // use arguments, fallback to defaults for opt and msg
        helpOpt = typeof opt === 'string' ? opt : defaultHelpOpt;
        self.boolean(helpOpt);
        self.describe(helpOpt, msg || usage.deferY18nLookup('Show help'));
        return self;
    };
    const defaultShowHiddenOpt = 'show-hidden';
    options.showHiddenOpt = defaultShowHiddenOpt;
    self.addShowHiddenOpt = self.showHidden = function addShowHiddenOpt(opt, msg) {
        argsert_1.argsert('[string|boolean] [string]', [opt, msg], arguments.length);
        if (arguments.length === 1) {
            if (opt === false)
                return self;
        }
        const showHiddenOpt = typeof opt === 'string' ? opt : defaultShowHiddenOpt;
        self.boolean(showHiddenOpt);
        self.describe(showHiddenOpt, msg || usage.deferY18nLookup('Show hidden options'));
        options.showHiddenOpt = showHiddenOpt;
        return self;
    };
    self.hide = function hide(key) {
        argsert_1.argsert('<string>', [key], arguments.length);
        options.hiddenOptions.push(key);
        return self;
    };
    self.showHelpOnFail = function showHelpOnFail(enabled, message) {
        argsert_1.argsert('[boolean|string] [string]', [enabled, message], arguments.length);
        usage.showHelpOnFail(enabled, message);
        return self;
    };
    var exitProcess = true;
    self.exitProcess = function (enabled = true) {
        argsert_1.argsert('[boolean]', [enabled], arguments.length);
        exitProcess = enabled;
        return self;
    };
    self.getExitProcess = () => exitProcess;
    var completionCommand = null;
    self.completion = function (cmd, desc, fn) {
        argsert_1.argsert('[string] [string|boolean|function] [function]', [cmd, desc, fn], arguments.length);
        // a function to execute when generating
        // completions can be provided as the second
        // or third argument to completion.
        if (typeof desc === 'function') {
            fn = desc;
            desc = undefined;
        }
        // register the completion command.
        completionCommand = cmd || completionCommand || 'completion';
        if (!desc && desc !== false) {
            desc = 'generate completion script';
        }
        self.command(completionCommand, desc);
        // a function can be provided
        if (fn)
            completion.registerFunction(fn);
        return self;
    };
    self.showCompletionScript = function ($0, cmd) {
        argsert_1.argsert('[string] [string]', [$0, cmd], arguments.length);
        $0 = $0 || self.$0;
        _logger.log(completion.generateCompletionScript($0, cmd || completionCommand || 'completion'));
        return self;
    };
    self.getCompletion = function (args, done) {
        argsert_1.argsert('<array> <function>', [args, done], arguments.length);
        completion.getCompletion(args, done);
    };
    self.locale = function (locale) {
        argsert_1.argsert('[string]', [locale], arguments.length);
        if (!locale) {
            guessLocale();
            return y18n.getLocale();
        }
        detectLocale = false;
        y18n.setLocale(locale);
        return self;
    };
    self.updateStrings = self.updateLocale = function (obj) {
        argsert_1.argsert('<object>', [obj], arguments.length);
        detectLocale = false;
        y18n.updateLocale(obj);
        return self;
    };
    let detectLocale = true;
    self.detectLocale = function (detect) {
        argsert_1.argsert('<boolean>', [detect], arguments.length);
        detectLocale = detect;
        return self;
    };
    self.getDetectLocale = () => detectLocale;
    var hasOutput = false;
    var exitError = null;
    // maybe exit, always capture
    // context about why we wanted to exit.
    self.exit = (code, err) => {
        hasOutput = true;
        exitError = err;
        if (exitProcess)
            process.exit(code);
    };
    // we use a custom logger that buffers output,
    // so that we can print to non-CLIs, e.g., chat-bots.
    const _logger = {
        log(...args) {
            if (!self._hasParseCallback())
                console.log(...args);
            hasOutput = true;
            if (output.length)
                output += '\n';
            output += args.join(' ');
        },
        error(...args) {
            if (!self._hasParseCallback())
                console.error(...args);
            hasOutput = true;
            if (output.length)
                output += '\n';
            output += args.join(' ');
        }
    };
    self._getLoggerInstance = () => _logger;
    // has yargs output an error our help
    // message in the current execution context.
    self._hasOutput = () => hasOutput;
    self._setHasOutput = () => {
        hasOutput = true;
    };
    let recommendCommands;
    self.recommendCommands = function (recommend = true) {
        argsert_1.argsert('[boolean]', [recommend], arguments.length);
        recommendCommands = recommend;
        return self;
    };
    self.getUsageInstance = () => usage;
    self.getValidationInstance = () => validation;
    self.getCommandInstance = () => command;
    self.terminalWidth = () => {
        argsert_1.argsert([], 0);
        return typeof process.stdout.columns !== 'undefined' ? process.stdout.columns : null;
    };
    Object.defineProperty(self, 'argv', {
        get: () => self._parseArgs(processArgs),
        enumerable: true
    });
    self._parseArgs = function parseArgs(args, shortCircuit, _calledFromCommand, commandIndex) {
        let skipValidation = !!_calledFromCommand;
        args = args || processArgs;
        options.__ = y18n.__;
        options.configuration = self.getParserConfiguration();
        const populateDoubleDash = !!options.configuration['populate--'];
        const config = Object.assign({}, options.configuration, {
            'populate--': true
        });
        const parsed = Parser.detailed(args, Object.assign({}, options, {
            configuration: config
        }));
        let argv = parsed.argv;
        if (parseContext)
            argv = Object.assign({}, argv, parseContext);
        const aliases = parsed.aliases;
        argv.$0 = self.$0;
        self.parsed = parsed;
        try {
            guessLocale(); // guess locale lazily, so that it can be turned off in chain.
            // while building up the argv object, there
            // are two passes through the parser. If completion
            // is being performed short-circuit on the first pass.
            if (shortCircuit) {
                return (populateDoubleDash || _calledFromCommand) ? argv : self._copyDoubleDash(argv);
            }
            // if there's a handler associated with a
            // command defer processing to it.
            if (helpOpt) {
                // consider any multi-char helpOpt alias as a valid help command
                // unless all helpOpt aliases are single-char
                // note that parsed.aliases is a normalized bidirectional map :)
                const helpCmds = [helpOpt]
                    .concat(aliases[helpOpt] || [])
                    .filter(k => k.length > 1);
                // check if help should trigger and strip it from _.
                if (~helpCmds.indexOf(argv._[argv._.length - 1])) {
                    argv._.pop();
                    argv[helpOpt] = true;
                }
            }
            const handlerKeys = command.getCommands();
            const requestCompletions = completion.completionKey in argv;
            const skipRecommendation = argv[helpOpt] || requestCompletions;
            const skipDefaultCommand = skipRecommendation && (handlerKeys.length > 1 || handlerKeys[0] !== '$0');
            if (argv._.length) {
                if (handlerKeys.length) {
                    let firstUnknownCommand;
                    for (let i = (commandIndex || 0), cmd; argv._[i] !== undefined; i++) {
                        cmd = String(argv._[i]);
                        if (~handlerKeys.indexOf(cmd) && cmd !== completionCommand) {
                            // commands are executed using a recursive algorithm that executes
                            // the deepest command first; we keep track of the position in the
                            // argv._ array that is currently being executed.
                            const innerArgv = command.runCommand(cmd, self, parsed, i + 1);
                            return populateDoubleDash ? innerArgv : self._copyDoubleDash(innerArgv);
                        }
                        else if (!firstUnknownCommand && cmd !== completionCommand) {
                            firstUnknownCommand = cmd;
                            break;
                        }
                    }
                    // run the default command, if defined
                    if (command.hasDefaultCommand() && !skipDefaultCommand) {
                        const innerArgv = command.runCommand(null, self, parsed);
                        return populateDoubleDash ? innerArgv : self._copyDoubleDash(innerArgv);
                    }
                    // recommend a command if recommendCommands() has
                    // been enabled, and no commands were found to execute
                    if (recommendCommands && firstUnknownCommand && !skipRecommendation) {
                        validation.recommendCommands(firstUnknownCommand, handlerKeys);
                    }
                }
                // generate a completion script for adding to ~/.bashrc.
                if (completionCommand && ~argv._.indexOf(completionCommand) && !requestCompletions) {
                    if (exitProcess)
                        setBlocking(true);
                    self.showCompletionScript();
                    self.exit(0);
                }
            }
            else if (command.hasDefaultCommand() && !skipDefaultCommand) {
                const innerArgv = command.runCommand(null, self, parsed);
                return populateDoubleDash ? innerArgv : self._copyDoubleDash(innerArgv);
            }
            // we must run completions first, a user might
            // want to complete the --help or --version option.
            if (requestCompletions) {
                if (exitProcess)
                    setBlocking(true);
                // we allow for asynchronous completions,
                // e.g., loading in a list of commands from an API.
                args = [].concat(args);
                const completionArgs = args.slice(args.indexOf(`--${completion.completionKey}`) + 1);
                completion.getCompletion(completionArgs, (completions) => {
                    ;
                    (completions || []).forEach((completion) => {
                        _logger.log(completion);
                    });
                    self.exit(0);
                });
                return (populateDoubleDash || _calledFromCommand) ? argv : self._copyDoubleDash(argv);
            }
            // Handle 'help' and 'version' options
            // if we haven't already output help!
            if (!hasOutput) {
                Object.keys(argv).forEach((key) => {
                    if (key === helpOpt && argv[key]) {
                        if (exitProcess)
                            setBlocking(true);
                        skipValidation = true;
                        self.showHelp('log');
                        self.exit(0);
                    }
                    else if (key === versionOpt && argv[key]) {
                        if (exitProcess)
                            setBlocking(true);
                        skipValidation = true;
                        usage.showVersion();
                        self.exit(0);
                    }
                });
            }
            // Check if any of the options to skip validation were provided
            if (!skipValidation && options.skipValidation.length > 0) {
                skipValidation = Object.keys(argv).some(key => options.skipValidation.indexOf(key) >= 0 && argv[key] === true);
            }
            // If the help or version options where used and exitProcess is false,
            // or if explicitly skipped, we won't run validations.
            if (!skipValidation) {
                if (parsed.error)
                    throw new yerror_1.YError(parsed.error.message);
                // if we're executed via bash completion, don't
                // bother with validation.
                if (!requestCompletions) {
                    self._runValidation(argv, aliases, {}, parsed.error);
                }
            }
        }
        catch (err) {
            if (err instanceof yerror_1.YError)
                usage.fail(err.message, err);
            else
                throw err;
        }
        return (populateDoubleDash || _calledFromCommand) ? argv : self._copyDoubleDash(argv);
    };
    // to simplify the parsing of positionals in commands,
    // we temporarily populate '--' rather than _, with arguments
    // after the '--' directive. After the parse, we copy these back.
    self._copyDoubleDash = function (argv) {
        if (is_promise_1.isPromise(argv) || !argv._ || !argv['--'])
            return argv;
        argv._.push.apply(argv._, argv['--']);
        // TODO(bcoe): refactor command parsing such that this delete is not
        // necessary: https://github.com/yargs/yargs/issues/1482
        try {
            delete argv['--'];
        }
        catch (_err) { }
        return argv;
    };
    self._runValidation = function runValidation(argv, aliases, positionalMap, parseErrors, isDefaultCommand = false) {
        if (parseErrors)
            throw new yerror_1.YError(parseErrors.message);
        validation.nonOptionCount(argv);
        validation.requiredArguments(argv);
        let failedStrictCommands = false;
        if (strictCommands) {
            failedStrictCommands = validation.unknownCommands(argv);
        }
        if (strict && !failedStrictCommands) {
            validation.unknownArguments(argv, aliases, positionalMap, isDefaultCommand);
        }
        validation.customChecks(argv, aliases);
        validation.limitedChoices(argv);
        validation.implications(argv);
        validation.conflicting(argv);
    };
    function guessLocale() {
        if (!detectLocale)
            return;
        const locale = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || process.env.LANGUAGE || 'en_US';
        self.locale(locale.replace(/[.:].*/, ''));
    }
    // an app should almost always have --version and --help,
    // if you *really* want to disable this use .help(false)/.version(false).
    self.help();
    self.version();
    return self;
}
exports.Yargs = Yargs;
// rebase an absolute path to a relative one with respect to a base directory
// exported for tests
function rebase(base, dir) {
    return path.relative(base, dir);
}
exports.rebase = rebase;
function isYargsInstance(y) {
    return !!y && (typeof y._parseArgs === 'function');
}
exports.isYargsInstance = isYargsInstance;

}, function(modId) { var map = {"./command":1695306835765,"./common-types":1695306835766,"./yerror":1695306835770,"./usage":1695306835772,"./argsert":1695306835769,"./completion":1695306835774,"./validation":1695306835776,"./obj-filter":1695306835773,"./apply-extends":1695306835778,"./middleware":1695306835768,"./process-argv":1695306835779,"./is-promise":1695306835767}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835765, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommandBuilderCallback = exports.isCommandBuilderDefinition = exports.isCommandHandlerDefinition = exports.command = void 0;
const common_types_1 = require("./common-types");
const is_promise_1 = require("./is-promise");
const middleware_1 = require("./middleware");
const parse_command_1 = require("./parse-command");
const path = require("path");
const util_1 = require("util");
const yargs_1 = require("./yargs");
const requireDirectory = require("require-directory");
const whichModule = require("which-module");
const Parser = require("yargs-parser");
const DEFAULT_MARKER = /(^\*)|(^\$0)/;
// handles parsing positional arguments,
// and populating argv with said positional
// arguments.
function command(yargs, usage, validation, globalMiddleware = []) {
    const self = {};
    let handlers = {};
    let aliasMap = {};
    let defaultCommand;
    self.addHandler = function addHandler(cmd, description, builder, handler, commandMiddleware, deprecated) {
        let aliases = [];
        const middlewares = middleware_1.commandMiddlewareFactory(commandMiddleware);
        handler = handler || (() => { });
        if (Array.isArray(cmd)) {
            aliases = cmd.slice(1);
            cmd = cmd[0];
        }
        else if (isCommandHandlerDefinition(cmd)) {
            let command = (Array.isArray(cmd.command) || typeof cmd.command === 'string') ? cmd.command : moduleName(cmd);
            if (cmd.aliases)
                command = [].concat(command).concat(cmd.aliases);
            self.addHandler(command, extractDesc(cmd), cmd.builder, cmd.handler, cmd.middlewares, cmd.deprecated);
            return;
        }
        // allow a module to be provided instead of separate builder and handler
        if (isCommandBuilderDefinition(builder)) {
            self.addHandler([cmd].concat(aliases), description, builder.builder, builder.handler, builder.middlewares, builder.deprecated);
            return;
        }
        // parse positionals out of cmd string
        const parsedCommand = parse_command_1.parseCommand(cmd);
        // remove positional args from aliases only
        aliases = aliases.map(alias => parse_command_1.parseCommand(alias).cmd);
        // check for default and filter out '*''
        let isDefault = false;
        const parsedAliases = [parsedCommand.cmd].concat(aliases).filter((c) => {
            if (DEFAULT_MARKER.test(c)) {
                isDefault = true;
                return false;
            }
            return true;
        });
        // standardize on $0 for default command.
        if (parsedAliases.length === 0 && isDefault)
            parsedAliases.push('$0');
        // shift cmd and aliases after filtering out '*'
        if (isDefault) {
            parsedCommand.cmd = parsedAliases[0];
            aliases = parsedAliases.slice(1);
            cmd = cmd.replace(DEFAULT_MARKER, parsedCommand.cmd);
        }
        // populate aliasMap
        aliases.forEach((alias) => {
            aliasMap[alias] = parsedCommand.cmd;
        });
        if (description !== false) {
            usage.command(cmd, description, isDefault, aliases, deprecated);
        }
        handlers[parsedCommand.cmd] = {
            original: cmd,
            description,
            handler,
            builder: builder || {},
            middlewares,
            deprecated,
            demanded: parsedCommand.demanded,
            optional: parsedCommand.optional
        };
        if (isDefault)
            defaultCommand = handlers[parsedCommand.cmd];
    };
    self.addDirectory = function addDirectory(dir, context, req, callerFile, opts) {
        opts = opts || {};
        // disable recursion to support nested directories of subcommands
        if (typeof opts.recurse !== 'boolean')
            opts.recurse = false;
        // exclude 'json', 'coffee' from require-directory defaults
        if (!Array.isArray(opts.extensions))
            opts.extensions = ['js'];
        // allow consumer to define their own visitor function
        const parentVisit = typeof opts.visit === 'function' ? opts.visit : (o) => o;
        // call addHandler via visitor function
        opts.visit = function visit(obj, joined, filename) {
            const visited = parentVisit(obj, joined, filename);
            // allow consumer to skip modules with their own visitor
            if (visited) {
                // check for cyclic reference
                // each command file path should only be seen once per execution
                if (~context.files.indexOf(joined))
                    return visited;
                // keep track of visited files in context.files
                context.files.push(joined);
                self.addHandler(visited);
            }
            return visited;
        };
        requireDirectory({ require: req, filename: callerFile }, dir, opts);
    };
    // lookup module object from require()d command and derive name
    // if module was not require()d and no name given, throw error
    function moduleName(obj) {
        const mod = whichModule(obj);
        if (!mod)
            throw new Error(`No command name given for module: ${util_1.inspect(obj)}`);
        return commandFromFilename(mod.filename);
    }
    // derive command name from filename
    function commandFromFilename(filename) {
        return path.basename(filename, path.extname(filename));
    }
    function extractDesc({ describe, description, desc }) {
        for (const test of [describe, description, desc]) {
            if (typeof test === 'string' || test === false)
                return test;
            common_types_1.assertNotStrictEqual(test, true);
        }
        return false;
    }
    self.getCommands = () => Object.keys(handlers).concat(Object.keys(aliasMap));
    self.getCommandHandlers = () => handlers;
    self.hasDefaultCommand = () => !!defaultCommand;
    self.runCommand = function runCommand(command, yargs, parsed, commandIndex) {
        let aliases = parsed.aliases;
        const commandHandler = handlers[command] || handlers[aliasMap[command]] || defaultCommand;
        const currentContext = yargs.getContext();
        let numFiles = currentContext.files.length;
        const parentCommands = currentContext.commands.slice();
        // what does yargs look like after the builder is run?
        let innerArgv = parsed.argv;
        let positionalMap = {};
        if (command) {
            currentContext.commands.push(command);
            currentContext.fullCommands.push(commandHandler.original);
        }
        const builder = commandHandler.builder;
        if (isCommandBuilderCallback(builder)) {
            // a function can be provided, which builds
            // up a yargs chain and possibly returns it.
            const builderOutput = builder(yargs.reset(parsed.aliases));
            const innerYargs = yargs_1.isYargsInstance(builderOutput) ? builderOutput : yargs;
            if (shouldUpdateUsage(innerYargs)) {
                innerYargs.getUsageInstance().usage(usageFromParentCommandsCommandHandler(parentCommands, commandHandler), commandHandler.description);
            }
            innerArgv = innerYargs._parseArgs(null, null, true, commandIndex);
            aliases = innerYargs.parsed.aliases;
        }
        else if (isCommandBuilderOptionDefinitions(builder)) {
            // as a short hand, an object can instead be provided, specifying
            // the options that a command takes.
            const innerYargs = yargs.reset(parsed.aliases);
            if (shouldUpdateUsage(innerYargs)) {
                innerYargs.getUsageInstance().usage(usageFromParentCommandsCommandHandler(parentCommands, commandHandler), commandHandler.description);
            }
            Object.keys(commandHandler.builder).forEach((key) => {
                innerYargs.option(key, builder[key]);
            });
            innerArgv = innerYargs._parseArgs(null, null, true, commandIndex);
            aliases = innerYargs.parsed.aliases;
        }
        if (!yargs._hasOutput()) {
            positionalMap = populatePositionals(commandHandler, innerArgv, currentContext);
        }
        const middlewares = globalMiddleware.slice(0).concat(commandHandler.middlewares);
        middleware_1.applyMiddleware(innerArgv, yargs, middlewares, true);
        // we apply validation post-hoc, so that custom
        // checks get passed populated positional arguments.
        if (!yargs._hasOutput()) {
            yargs._runValidation(innerArgv, aliases, positionalMap, yargs.parsed.error, !command);
        }
        if (commandHandler.handler && !yargs._hasOutput()) {
            yargs._setHasOutput();
            // to simplify the parsing of positionals in commands,
            // we temporarily populate '--' rather than _, with arguments
            const populateDoubleDash = !!yargs.getOptions().configuration['populate--'];
            if (!populateDoubleDash)
                yargs._copyDoubleDash(innerArgv);
            innerArgv = middleware_1.applyMiddleware(innerArgv, yargs, middlewares, false);
            let handlerResult;
            if (is_promise_1.isPromise(innerArgv)) {
                handlerResult = innerArgv.then(argv => commandHandler.handler(argv));
            }
            else {
                handlerResult = commandHandler.handler(innerArgv);
            }
            const handlerFinishCommand = yargs.getHandlerFinishCommand();
            if (is_promise_1.isPromise(handlerResult)) {
                yargs.getUsageInstance().cacheHelpMessage();
                handlerResult
                    .then(value => {
                    if (handlerFinishCommand) {
                        handlerFinishCommand(value);
                    }
                })
                    .catch(error => {
                    try {
                        yargs.getUsageInstance().fail(null, error);
                    }
                    catch (err) {
                        // fail's throwing would cause an unhandled rejection.
                    }
                })
                    .then(() => {
                    yargs.getUsageInstance().clearCachedHelpMessage();
                });
            }
            else {
                if (handlerFinishCommand) {
                    handlerFinishCommand(handlerResult);
                }
            }
        }
        if (command) {
            currentContext.commands.pop();
            currentContext.fullCommands.pop();
        }
        numFiles = currentContext.files.length - numFiles;
        if (numFiles > 0)
            currentContext.files.splice(numFiles * -1, numFiles);
        return innerArgv;
    };
    function shouldUpdateUsage(yargs) {
        return !yargs.getUsageInstance().getUsageDisabled() &&
            yargs.getUsageInstance().getUsage().length === 0;
    }
    function usageFromParentCommandsCommandHandler(parentCommands, commandHandler) {
        const c = DEFAULT_MARKER.test(commandHandler.original) ? commandHandler.original.replace(DEFAULT_MARKER, '').trim() : commandHandler.original;
        const pc = parentCommands.filter((c) => { return !DEFAULT_MARKER.test(c); });
        pc.push(c);
        return `$0 ${pc.join(' ')}`;
    }
    self.runDefaultBuilderOn = function (yargs) {
        common_types_1.assertNotStrictEqual(defaultCommand, undefined);
        if (shouldUpdateUsage(yargs)) {
            // build the root-level command string from the default string.
            const commandString = DEFAULT_MARKER.test(defaultCommand.original)
                ? defaultCommand.original : defaultCommand.original.replace(/^[^[\]<>]*/, '$0 ');
            yargs.getUsageInstance().usage(commandString, defaultCommand.description);
        }
        const builder = defaultCommand.builder;
        if (isCommandBuilderCallback(builder)) {
            builder(yargs);
        }
        else {
            Object.keys(builder).forEach((key) => {
                yargs.option(key, builder[key]);
            });
        }
    };
    // transcribe all positional arguments "command <foo> <bar> [apple]"
    // onto argv.
    function populatePositionals(commandHandler, argv, context) {
        argv._ = argv._.slice(context.commands.length); // nuke the current commands
        const demanded = commandHandler.demanded.slice(0);
        const optional = commandHandler.optional.slice(0);
        const positionalMap = {};
        validation.positionalCount(demanded.length, argv._.length);
        while (demanded.length) {
            const demand = demanded.shift();
            populatePositional(demand, argv, positionalMap);
        }
        while (optional.length) {
            const maybe = optional.shift();
            populatePositional(maybe, argv, positionalMap);
        }
        argv._ = context.commands.concat(argv._);
        postProcessPositionals(argv, positionalMap, self.cmdToParseOptions(commandHandler.original));
        return positionalMap;
    }
    function populatePositional(positional, argv, positionalMap) {
        const cmd = positional.cmd[0];
        if (positional.variadic) {
            positionalMap[cmd] = argv._.splice(0).map(String);
        }
        else {
            if (argv._.length)
                positionalMap[cmd] = [String(argv._.shift())];
        }
    }
    // we run yargs-parser against the positional arguments
    // applying the same parsing logic used for flags.
    function postProcessPositionals(argv, positionalMap, parseOptions) {
        // combine the parsing hints we've inferred from the command
        // string with explicitly configured parsing hints.
        const options = Object.assign({}, yargs.getOptions());
        options.default = Object.assign(parseOptions.default, options.default);
        for (const key of Object.keys(parseOptions.alias)) {
            options.alias[key] = (options.alias[key] || []).concat(parseOptions.alias[key]);
        }
        options.array = options.array.concat(parseOptions.array);
        delete options.config; //  don't load config when processing positionals.
        const unparsed = [];
        Object.keys(positionalMap).forEach((key) => {
            positionalMap[key].map((value) => {
                if (options.configuration['unknown-options-as-args'])
                    options.key[key] = true;
                unparsed.push(`--${key}`);
                unparsed.push(value);
            });
        });
        // short-circuit parse.
        if (!unparsed.length)
            return;
        const config = Object.assign({}, options.configuration, {
            'populate--': true
        });
        const parsed = Parser.detailed(unparsed, Object.assign({}, options, {
            configuration: config
        }));
        if (parsed.error) {
            yargs.getUsageInstance().fail(parsed.error.message, parsed.error);
        }
        else {
            // only copy over positional keys (don't overwrite
            // flag arguments that were already parsed).
            const positionalKeys = Object.keys(positionalMap);
            Object.keys(positionalMap).forEach((key) => {
                positionalKeys.push(...parsed.aliases[key]);
            });
            Object.keys(parsed.argv).forEach((key) => {
                if (positionalKeys.indexOf(key) !== -1) {
                    // any new aliases need to be placed in positionalMap, which
                    // is used for validation.
                    if (!positionalMap[key])
                        positionalMap[key] = parsed.argv[key];
                    argv[key] = parsed.argv[key];
                }
            });
        }
    }
    self.cmdToParseOptions = function (cmdString) {
        const parseOptions = {
            array: [],
            default: {},
            alias: {},
            demand: {}
        };
        const parsed = parse_command_1.parseCommand(cmdString);
        parsed.demanded.forEach((d) => {
            const [cmd, ...aliases] = d.cmd;
            if (d.variadic) {
                parseOptions.array.push(cmd);
                parseOptions.default[cmd] = [];
            }
            parseOptions.alias[cmd] = aliases;
            parseOptions.demand[cmd] = true;
        });
        parsed.optional.forEach((o) => {
            const [cmd, ...aliases] = o.cmd;
            if (o.variadic) {
                parseOptions.array.push(cmd);
                parseOptions.default[cmd] = [];
            }
            parseOptions.alias[cmd] = aliases;
        });
        return parseOptions;
    };
    self.reset = () => {
        handlers = {};
        aliasMap = {};
        defaultCommand = undefined;
        return self;
    };
    // used by yargs.parse() to freeze
    // the state of commands such that
    // we can apply .parse() multiple times
    // with the same yargs instance.
    const frozens = [];
    self.freeze = () => {
        frozens.push({
            handlers,
            aliasMap,
            defaultCommand
        });
    };
    self.unfreeze = () => {
        const frozen = frozens.pop();
        common_types_1.assertNotStrictEqual(frozen, undefined);
        ({
            handlers,
            aliasMap,
            defaultCommand
        } = frozen);
    };
    return self;
}
exports.command = command;
function isCommandHandlerDefinition(cmd) {
    return typeof cmd === 'object';
}
exports.isCommandHandlerDefinition = isCommandHandlerDefinition;
function isCommandBuilderDefinition(builder) {
    return typeof builder === 'object' &&
        !!builder.builder &&
        typeof builder.handler === 'function';
}
exports.isCommandBuilderDefinition = isCommandBuilderDefinition;
function isCommandBuilderCallback(builder) {
    return typeof builder === 'function';
}
exports.isCommandBuilderCallback = isCommandBuilderCallback;
function isCommandBuilderOptionDefinitions(builder) {
    return typeof builder === 'object';
}

}, function(modId) { var map = {"./common-types":1695306835766,"./is-promise":1695306835767,"./middleware":1695306835768,"./parse-command":1695306835771,"./yargs":1695306835764}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835766, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.objectKeys = exports.assertSingleKey = exports.assertNotStrictEqual = void 0;
const assert_1 = require("assert");
/**
 * Typing wrapper around assert.notStrictEqual()
 */
function assertNotStrictEqual(actual, expected, message) {
    assert_1.notStrictEqual(actual, expected, message);
}
exports.assertNotStrictEqual = assertNotStrictEqual;
/**
 * Asserts actual is a single key, not a key array or a key map.
 */
function assertSingleKey(actual) {
    assert_1.strictEqual(typeof actual, 'string');
}
exports.assertSingleKey = assertSingleKey;
/**
 * Typing wrapper around Object.keys()
 */
function objectKeys(object) {
    return Object.keys(object);
}
exports.objectKeys = objectKeys;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835767, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isPromise = void 0;
function isPromise(maybePromise) {
    return !!maybePromise &&
        !!maybePromise.then &&
        (typeof maybePromise.then === 'function');
}
exports.isPromise = isPromise;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835768, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMiddleware = exports.commandMiddlewareFactory = exports.globalMiddlewareFactory = void 0;
const argsert_1 = require("./argsert");
const is_promise_1 = require("./is-promise");
function globalMiddlewareFactory(globalMiddleware, context) {
    return function (callback, applyBeforeValidation = false) {
        argsert_1.argsert('<array|function> [boolean]', [callback, applyBeforeValidation], arguments.length);
        if (Array.isArray(callback)) {
            for (let i = 0; i < callback.length; i++) {
                if (typeof callback[i] !== 'function') {
                    throw Error('middleware must be a function');
                }
                callback[i].applyBeforeValidation = applyBeforeValidation;
            }
            Array.prototype.push.apply(globalMiddleware, callback);
        }
        else if (typeof callback === 'function') {
            callback.applyBeforeValidation = applyBeforeValidation;
            globalMiddleware.push(callback);
        }
        return context;
    };
}
exports.globalMiddlewareFactory = globalMiddlewareFactory;
function commandMiddlewareFactory(commandMiddleware) {
    if (!commandMiddleware)
        return [];
    return commandMiddleware.map(middleware => {
        middleware.applyBeforeValidation = false;
        return middleware;
    });
}
exports.commandMiddlewareFactory = commandMiddlewareFactory;
function applyMiddleware(argv, yargs, middlewares, beforeValidation) {
    const beforeValidationError = new Error('middleware cannot return a promise when applyBeforeValidation is true');
    return middlewares
        .reduce((acc, middleware) => {
        if (middleware.applyBeforeValidation !== beforeValidation) {
            return acc;
        }
        if (is_promise_1.isPromise(acc)) {
            return acc
                .then(initialObj => Promise.all([initialObj, middleware(initialObj, yargs)]))
                .then(([initialObj, middlewareObj]) => Object.assign(initialObj, middlewareObj));
        }
        else {
            const result = middleware(acc, yargs);
            if (beforeValidation && is_promise_1.isPromise(result))
                throw beforeValidationError;
            return is_promise_1.isPromise(result)
                ? result.then(middlewareObj => Object.assign(acc, middlewareObj))
                : Object.assign(acc, result);
        }
    }, argv);
}
exports.applyMiddleware = applyMiddleware;

}, function(modId) { var map = {"./argsert":1695306835769,"./is-promise":1695306835767}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835769, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.argsert = void 0;
const yerror_1 = require("./yerror");
const parse_command_1 = require("./parse-command");
const positionName = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
function argsert(arg1, arg2, arg3) {
    function parseArgs() {
        return typeof arg1 === 'object'
            ? [{ demanded: [], optional: [] }, arg1, arg2]
            : [parse_command_1.parseCommand(`cmd ${arg1}`), arg2, arg3];
    }
    // TODO: should this eventually raise an exception.
    try {
        // preface the argument description with "cmd", so
        // that we can run it through yargs' command parser.
        let position = 0;
        let [parsed, callerArguments, length] = parseArgs();
        const args = [].slice.call(callerArguments);
        while (args.length && args[args.length - 1] === undefined)
            args.pop();
        length = length || args.length;
        if (length < parsed.demanded.length) {
            throw new yerror_1.YError(`Not enough arguments provided. Expected ${parsed.demanded.length} but received ${args.length}.`);
        }
        const totalCommands = parsed.demanded.length + parsed.optional.length;
        if (length > totalCommands) {
            throw new yerror_1.YError(`Too many arguments provided. Expected max ${totalCommands} but received ${length}.`);
        }
        parsed.demanded.forEach((demanded) => {
            const arg = args.shift();
            const observedType = guessType(arg);
            const matchingTypes = demanded.cmd.filter(type => type === observedType || type === '*');
            if (matchingTypes.length === 0)
                argumentTypeError(observedType, demanded.cmd, position);
            position += 1;
        });
        parsed.optional.forEach((optional) => {
            if (args.length === 0)
                return;
            const arg = args.shift();
            const observedType = guessType(arg);
            const matchingTypes = optional.cmd.filter(type => type === observedType || type === '*');
            if (matchingTypes.length === 0)
                argumentTypeError(observedType, optional.cmd, position);
            position += 1;
        });
    }
    catch (err) {
        console.warn(err.stack);
    }
}
exports.argsert = argsert;
function guessType(arg) {
    if (Array.isArray(arg)) {
        return 'array';
    }
    else if (arg === null) {
        return 'null';
    }
    return typeof arg;
}
function argumentTypeError(observedType, allowedTypes, position) {
    throw new yerror_1.YError(`Invalid ${positionName[position] || 'manyith'} argument. Expected ${allowedTypes.join(' or ')} but received ${observedType}.`);
}

}, function(modId) { var map = {"./yerror":1695306835770,"./parse-command":1695306835771}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835770, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.YError = void 0;
class YError extends Error {
    constructor(msg) {
        super(msg || 'yargs error');
        this.name = 'YError';
        Error.captureStackTrace(this, YError);
    }
}
exports.YError = YError;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835771, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommand = void 0;
function parseCommand(cmd) {
    const extraSpacesStrippedCommand = cmd.replace(/\s{2,}/g, ' ');
    const splitCommand = extraSpacesStrippedCommand.split(/\s+(?![^[]*]|[^<]*>)/);
    const bregex = /\.*[\][<>]/g;
    const firstCommand = splitCommand.shift();
    if (!firstCommand)
        throw new Error(`No command found in: ${cmd}`);
    const parsedCommand = {
        cmd: firstCommand.replace(bregex, ''),
        demanded: [],
        optional: []
    };
    splitCommand.forEach((cmd, i) => {
        let variadic = false;
        cmd = cmd.replace(/\s/g, '');
        if (/\.+[\]>]/.test(cmd) && i === splitCommand.length - 1)
            variadic = true;
        if (/^\[/.test(cmd)) {
            parsedCommand.optional.push({
                cmd: cmd.replace(bregex, '').split('|'),
                variadic
            });
        }
        else {
            parsedCommand.demanded.push({
                cmd: cmd.replace(bregex, '').split('|'),
                variadic
            });
        }
    });
    return parsedCommand;
}
exports.parseCommand = parseCommand;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835772, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.usage = void 0;
// this file handles outputting usage instructions,
// failures, etc. keeps logging in one place.
const common_types_1 = require("./common-types");
const obj_filter_1 = require("./obj-filter");
const path = require("path");
const yerror_1 = require("./yerror");
const decamelize = require("decamelize");
const setBlocking = require("set-blocking");
const stringWidth = require("string-width");
function usage(yargs, y18n) {
    const __ = y18n.__;
    const self = {};
    // methods for ouputting/building failure message.
    const fails = [];
    self.failFn = function failFn(f) {
        fails.push(f);
    };
    let failMessage = null;
    let showHelpOnFail = true;
    self.showHelpOnFail = function showHelpOnFailFn(arg1 = true, arg2) {
        function parseFunctionArgs() {
            return typeof arg1 === 'string' ? [true, arg1] : [arg1, arg2];
        }
        const [enabled, message] = parseFunctionArgs();
        failMessage = message;
        showHelpOnFail = enabled;
        return self;
    };
    let failureOutput = false;
    self.fail = function fail(msg, err) {
        const logger = yargs._getLoggerInstance();
        if (fails.length) {
            for (let i = fails.length - 1; i >= 0; --i) {
                fails[i](msg, err, self);
            }
        }
        else {
            if (yargs.getExitProcess())
                setBlocking(true);
            // don't output failure message more than once
            if (!failureOutput) {
                failureOutput = true;
                if (showHelpOnFail) {
                    yargs.showHelp('error');
                    logger.error();
                }
                if (msg || err)
                    logger.error(msg || err);
                if (failMessage) {
                    if (msg || err)
                        logger.error('');
                    logger.error(failMessage);
                }
            }
            err = err || new yerror_1.YError(msg);
            if (yargs.getExitProcess()) {
                return yargs.exit(1);
            }
            else if (yargs._hasParseCallback()) {
                return yargs.exit(1, err);
            }
            else {
                throw err;
            }
        }
    };
    // methods for ouputting/building help (usage) message.
    let usages = [];
    let usageDisabled = false;
    self.usage = (msg, description) => {
        if (msg === null) {
            usageDisabled = true;
            usages = [];
            return self;
        }
        usageDisabled = false;
        usages.push([msg, description || '']);
        return self;
    };
    self.getUsage = () => {
        return usages;
    };
    self.getUsageDisabled = () => {
        return usageDisabled;
    };
    self.getPositionalGroupName = () => {
        return __('Positionals:');
    };
    let examples = [];
    self.example = (cmd, description) => {
        examples.push([cmd, description || '']);
    };
    let commands = [];
    self.command = function command(cmd, description, isDefault, aliases, deprecated = false) {
        // the last default wins, so cancel out any previously set default
        if (isDefault) {
            commands = commands.map((cmdArray) => {
                cmdArray[2] = false;
                return cmdArray;
            });
        }
        commands.push([cmd, description || '', isDefault, aliases, deprecated]);
    };
    self.getCommands = () => commands;
    let descriptions = {};
    self.describe = function describe(keyOrKeys, desc) {
        if (Array.isArray(keyOrKeys)) {
            keyOrKeys.forEach((k) => {
                self.describe(k, desc);
            });
        }
        else if (typeof keyOrKeys === 'object') {
            Object.keys(keyOrKeys).forEach((k) => {
                self.describe(k, keyOrKeys[k]);
            });
        }
        else {
            descriptions[keyOrKeys] = desc;
        }
    };
    self.getDescriptions = () => descriptions;
    let epilogs = [];
    self.epilog = (msg) => {
        epilogs.push(msg);
    };
    let wrapSet = false;
    let wrap;
    self.wrap = (cols) => {
        wrapSet = true;
        wrap = cols;
    };
    function getWrap() {
        if (!wrapSet) {
            wrap = windowWidth();
            wrapSet = true;
        }
        return wrap;
    }
    const deferY18nLookupPrefix = '__yargsString__:';
    self.deferY18nLookup = str => deferY18nLookupPrefix + str;
    self.help = function help() {
        if (cachedHelpMessage)
            return cachedHelpMessage;
        normalizeAliases();
        // handle old demanded API
        const base$0 = yargs.customScriptName ? yargs.$0 : path.basename(yargs.$0);
        const demandedOptions = yargs.getDemandedOptions();
        const demandedCommands = yargs.getDemandedCommands();
        const deprecatedOptions = yargs.getDeprecatedOptions();
        const groups = yargs.getGroups();
        const options = yargs.getOptions();
        let keys = [];
        keys = keys.concat(Object.keys(descriptions));
        keys = keys.concat(Object.keys(demandedOptions));
        keys = keys.concat(Object.keys(demandedCommands));
        keys = keys.concat(Object.keys(options.default));
        keys = keys.filter(filterHiddenOptions);
        keys = Object.keys(keys.reduce((acc, key) => {
            if (key !== '_')
                acc[key] = true;
            return acc;
        }, {}));
        const theWrap = getWrap();
        const ui = require('cliui')({
            width: theWrap,
            wrap: !!theWrap
        });
        // the usage string.
        if (!usageDisabled) {
            if (usages.length) {
                // user-defined usage.
                usages.forEach((usage) => {
                    ui.div(`${usage[0].replace(/\$0/g, base$0)}`);
                    if (usage[1]) {
                        ui.div({ text: `${usage[1]}`, padding: [1, 0, 0, 0] });
                    }
                });
                ui.div();
            }
            else if (commands.length) {
                let u = null;
                // demonstrate how commands are used.
                if (demandedCommands._) {
                    u = `${base$0} <${__('command')}>\n`;
                }
                else {
                    u = `${base$0} [${__('command')}]\n`;
                }
                ui.div(`${u}`);
            }
        }
        // your application's commands, i.e., non-option
        // arguments populated in '_'.
        if (commands.length) {
            ui.div(__('Commands:'));
            const context = yargs.getContext();
            const parentCommands = context.commands.length ? `${context.commands.join(' ')} ` : '';
            if (yargs.getParserConfiguration()['sort-commands'] === true) {
                commands = commands.sort((a, b) => a[0].localeCompare(b[0]));
            }
            commands.forEach((command) => {
                const commandString = `${base$0} ${parentCommands}${command[0].replace(/^\$0 ?/, '')}`; // drop $0 from default commands.
                ui.span({
                    text: commandString,
                    padding: [0, 2, 0, 2],
                    width: maxWidth(commands, theWrap, `${base$0}${parentCommands}`) + 4
                }, { text: command[1] });
                const hints = [];
                if (command[2])
                    hints.push(`[${__('default')}]`);
                if (command[3] && command[3].length) {
                    hints.push(`[${__('aliases:')} ${command[3].join(', ')}]`);
                }
                if (command[4]) {
                    if (typeof command[4] === 'string') {
                        hints.push(`[${__('deprecated: %s', command[4])}]`);
                    }
                    else {
                        hints.push(`[${__('deprecated')}]`);
                    }
                }
                if (hints.length) {
                    ui.div({ text: hints.join(' '), padding: [0, 0, 0, 2], align: 'right' });
                }
                else {
                    ui.div();
                }
            });
            ui.div();
        }
        // perform some cleanup on the keys array, making it
        // only include top-level keys not their aliases.
        const aliasKeys = (Object.keys(options.alias) || [])
            .concat(Object.keys(yargs.parsed.newAliases) || []);
        keys = keys.filter(key => !yargs.parsed.newAliases[key] && aliasKeys.every(alias => (options.alias[alias] || []).indexOf(key) === -1));
        // populate 'Options:' group with any keys that have not
        // explicitly had a group set.
        const defaultGroup = __('Options:');
        if (!groups[defaultGroup])
            groups[defaultGroup] = [];
        addUngroupedKeys(keys, options.alias, groups, defaultGroup);
        // display 'Options:' table along with any custom tables:
        Object.keys(groups).forEach((groupName) => {
            if (!groups[groupName].length)
                return;
            // if we've grouped the key 'f', but 'f' aliases 'foobar',
            // normalizedKeys should contain only 'foobar'.
            const normalizedKeys = groups[groupName].filter(filterHiddenOptions).map((key) => {
                if (~aliasKeys.indexOf(key))
                    return key;
                for (let i = 0, aliasKey; (aliasKey = aliasKeys[i]) !== undefined; i++) {
                    if (~(options.alias[aliasKey] || []).indexOf(key))
                        return aliasKey;
                }
                return key;
            });
            if (normalizedKeys.length < 1)
                return;
            ui.div(groupName);
            // actually generate the switches string --foo, -f, --bar.
            const switches = normalizedKeys.reduce((acc, key) => {
                acc[key] = [key].concat(options.alias[key] || [])
                    .map(sw => {
                    // for the special positional group don't
                    // add '--' or '-' prefix.
                    if (groupName === self.getPositionalGroupName())
                        return sw;
                    else {
                        return (
                        // matches yargs-parser logic in which single-digits
                        // aliases declared with a boolean type are now valid
                        /^[0-9]$/.test(sw)
                            ? ~options.boolean.indexOf(key) ? '-' : '--'
                            : sw.length > 1 ? '--' : '-') + sw;
                    }
                })
                    .join(', ');
                return acc;
            }, {});
            normalizedKeys.forEach((key) => {
                const kswitch = switches[key];
                let desc = descriptions[key] || '';
                let type = null;
                if (~desc.lastIndexOf(deferY18nLookupPrefix))
                    desc = __(desc.substring(deferY18nLookupPrefix.length));
                if (~options.boolean.indexOf(key))
                    type = `[${__('boolean')}]`;
                if (~options.count.indexOf(key))
                    type = `[${__('count')}]`;
                if (~options.string.indexOf(key))
                    type = `[${__('string')}]`;
                if (~options.normalize.indexOf(key))
                    type = `[${__('string')}]`;
                if (~options.array.indexOf(key))
                    type = `[${__('array')}]`;
                if (~options.number.indexOf(key))
                    type = `[${__('number')}]`;
                const deprecatedExtra = (deprecated) => typeof deprecated === 'string'
                    ? `[${__('deprecated: %s', deprecated)}]`
                    : `[${__('deprecated')}]`;
                const extra = [
                    (key in deprecatedOptions) ? deprecatedExtra(deprecatedOptions[key]) : null,
                    type,
                    (key in demandedOptions) ? `[${__('required')}]` : null,
                    options.choices && options.choices[key] ? `[${__('choices:')} ${self.stringifiedValues(options.choices[key])}]` : null,
                    defaultString(options.default[key], options.defaultDescription[key])
                ].filter(Boolean).join(' ');
                ui.span({ text: kswitch, padding: [0, 2, 0, 2], width: maxWidth(switches, theWrap) + 4 }, desc);
                if (extra)
                    ui.div({ text: extra, padding: [0, 0, 0, 2], align: 'right' });
                else
                    ui.div();
            });
            ui.div();
        });
        // describe some common use-cases for your application.
        if (examples.length) {
            ui.div(__('Examples:'));
            examples.forEach((example) => {
                example[0] = example[0].replace(/\$0/g, base$0);
            });
            examples.forEach((example) => {
                if (example[1] === '') {
                    ui.div({
                        text: example[0],
                        padding: [0, 2, 0, 2]
                    });
                }
                else {
                    ui.div({
                        text: example[0],
                        padding: [0, 2, 0, 2],
                        width: maxWidth(examples, theWrap) + 4
                    }, {
                        text: example[1]
                    });
                }
            });
            ui.div();
        }
        // the usage string.
        if (epilogs.length > 0) {
            const e = epilogs.map(epilog => epilog.replace(/\$0/g, base$0)).join('\n');
            ui.div(`${e}\n`);
        }
        // Remove the trailing white spaces
        return ui.toString().replace(/\s*$/, '');
    };
    // return the maximum width of a string
    // in the left-hand column of a table.
    function maxWidth(table, theWrap, modifier) {
        let width = 0;
        // table might be of the form [leftColumn],
        // or {key: leftColumn}
        if (!Array.isArray(table)) {
            table = Object.values(table).map(v => [v]);
        }
        table.forEach((v) => {
            width = Math.max(stringWidth(modifier ? `${modifier} ${v[0]}` : v[0]), width);
        });
        // if we've enabled 'wrap' we should limit
        // the max-width of the left-column.
        if (theWrap)
            width = Math.min(width, parseInt((theWrap * 0.5).toString(), 10));
        return width;
    }
    // make sure any options set for aliases,
    // are copied to the keys being aliased.
    function normalizeAliases() {
        // handle old demanded API
        const demandedOptions = yargs.getDemandedOptions();
        const options = yargs.getOptions();
        (Object.keys(options.alias) || []).forEach((key) => {
            options.alias[key].forEach((alias) => {
                // copy descriptions.
                if (descriptions[alias])
                    self.describe(key, descriptions[alias]);
                // copy demanded.
                if (alias in demandedOptions)
                    yargs.demandOption(key, demandedOptions[alias]);
                // type messages.
                if (~options.boolean.indexOf(alias))
                    yargs.boolean(key);
                if (~options.count.indexOf(alias))
                    yargs.count(key);
                if (~options.string.indexOf(alias))
                    yargs.string(key);
                if (~options.normalize.indexOf(alias))
                    yargs.normalize(key);
                if (~options.array.indexOf(alias))
                    yargs.array(key);
                if (~options.number.indexOf(alias))
                    yargs.number(key);
            });
        });
    }
    // if yargs is executing an async handler, we take a snapshot of the
    // help message to display on failure:
    let cachedHelpMessage;
    self.cacheHelpMessage = function () {
        cachedHelpMessage = this.help();
    };
    // however this snapshot must be cleared afterwards
    // not to be be used by next calls to parse
    self.clearCachedHelpMessage = function () {
        cachedHelpMessage = undefined;
    };
    // given a set of keys, place any keys that are
    // ungrouped under the 'Options:' grouping.
    function addUngroupedKeys(keys, aliases, groups, defaultGroup) {
        let groupedKeys = [];
        let toCheck = null;
        Object.keys(groups).forEach((group) => {
            groupedKeys = groupedKeys.concat(groups[group]);
        });
        keys.forEach((key) => {
            toCheck = [key].concat(aliases[key]);
            if (!toCheck.some(k => groupedKeys.indexOf(k) !== -1)) {
                groups[defaultGroup].push(key);
            }
        });
        return groupedKeys;
    }
    function filterHiddenOptions(key) {
        return yargs.getOptions().hiddenOptions.indexOf(key) < 0 || yargs.parsed.argv[yargs.getOptions().showHiddenOpt];
    }
    self.showHelp = (level) => {
        const logger = yargs._getLoggerInstance();
        if (!level)
            level = 'error';
        const emit = typeof level === 'function' ? level : logger[level];
        emit(self.help());
    };
    self.functionDescription = (fn) => {
        const description = fn.name ? decamelize(fn.name, '-') : __('generated-value');
        return ['(', description, ')'].join('');
    };
    self.stringifiedValues = function stringifiedValues(values, separator) {
        let string = '';
        const sep = separator || ', ';
        const array = [].concat(values);
        if (!values || !array.length)
            return string;
        array.forEach((value) => {
            if (string.length)
                string += sep;
            string += JSON.stringify(value);
        });
        return string;
    };
    // format the default-value-string displayed in
    // the right-hand column.
    function defaultString(value, defaultDescription) {
        let string = `[${__('default:')} `;
        if (value === undefined && !defaultDescription)
            return null;
        if (defaultDescription) {
            string += defaultDescription;
        }
        else {
            switch (typeof value) {
                case 'string':
                    string += `"${value}"`;
                    break;
                case 'object':
                    string += JSON.stringify(value);
                    break;
                default:
                    string += value;
            }
        }
        return `${string}]`;
    }
    // guess the width of the console window, max-width 80.
    function windowWidth() {
        const maxWidth = 80;
        // CI is not a TTY
        /* c8 ignore next 2 */
        if (typeof process === 'object' && process.stdout && process.stdout.columns) {
            return Math.min(maxWidth, process.stdout.columns);
        }
        else {
            return maxWidth;
        }
    }
    // logic for displaying application version.
    let version = null;
    self.version = (ver) => {
        version = ver;
    };
    self.showVersion = () => {
        const logger = yargs._getLoggerInstance();
        logger.log(version);
    };
    self.reset = function reset(localLookup) {
        // do not reset wrap here
        // do not reset fails here
        failMessage = null;
        failureOutput = false;
        usages = [];
        usageDisabled = false;
        epilogs = [];
        examples = [];
        commands = [];
        descriptions = obj_filter_1.objFilter(descriptions, k => !localLookup[k]);
        return self;
    };
    const frozens = [];
    self.freeze = function freeze() {
        frozens.push({
            failMessage,
            failureOutput,
            usages,
            usageDisabled,
            epilogs,
            examples,
            commands,
            descriptions
        });
    };
    self.unfreeze = function unfreeze() {
        const frozen = frozens.pop();
        common_types_1.assertNotStrictEqual(frozen, undefined);
        ({
            failMessage,
            failureOutput,
            usages,
            usageDisabled,
            epilogs,
            examples,
            commands,
            descriptions
        } = frozen);
    };
    return self;
}
exports.usage = usage;

}, function(modId) { var map = {"./common-types":1695306835766,"./obj-filter":1695306835773,"./yerror":1695306835770}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835773, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.objFilter = void 0;
const common_types_1 = require("./common-types");
function objFilter(original = {}, filter = () => true) {
    const obj = {};
    common_types_1.objectKeys(original).forEach((key) => {
        if (filter(key, original[key])) {
            obj[key] = original[key];
        }
    });
    return obj;
}
exports.objFilter = objFilter;

}, function(modId) { var map = {"./common-types":1695306835766}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835774, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.completion = void 0;
const command_1 = require("./command");
const templates = require("./completion-templates");
const is_promise_1 = require("./is-promise");
const parse_command_1 = require("./parse-command");
const path = require("path");
const common_types_1 = require("./common-types");
// add bash completions to your
//  yargs-powered applications.
function completion(yargs, usage, command) {
    const self = {
        completionKey: 'get-yargs-completions'
    };
    let aliases;
    self.setParsed = function setParsed(parsed) {
        aliases = parsed.aliases;
    };
    const zshShell = (process.env.SHELL && process.env.SHELL.indexOf('zsh') !== -1) ||
        (process.env.ZSH_NAME && process.env.ZSH_NAME.indexOf('zsh') !== -1);
    // get a list of completion commands.
    // 'args' is the array of strings from the line to be completed
    self.getCompletion = function getCompletion(args, done) {
        const completions = [];
        const current = args.length ? args[args.length - 1] : '';
        const argv = yargs.parse(args, true);
        const parentCommands = yargs.getContext().commands;
        // a custom completion function can be provided
        // to completion().
        function runCompletionFunction(argv) {
            common_types_1.assertNotStrictEqual(completionFunction, null);
            if (isSyncCompletionFunction(completionFunction)) {
                const result = completionFunction(current, argv);
                // promise based completion function.
                if (is_promise_1.isPromise(result)) {
                    return result.then((list) => {
                        process.nextTick(() => { done(list); });
                    }).catch((err) => {
                        process.nextTick(() => { throw err; });
                    });
                }
                // synchronous completion function.
                return done(result);
            }
            else {
                // asynchronous completion function
                return completionFunction(current, argv, (completions) => {
                    done(completions);
                });
            }
        }
        if (completionFunction) {
            return is_promise_1.isPromise(argv) ? argv.then(runCompletionFunction) : runCompletionFunction(argv);
        }
        const handlers = command.getCommandHandlers();
        for (let i = 0, ii = args.length; i < ii; ++i) {
            if (handlers[args[i]] && handlers[args[i]].builder) {
                const builder = handlers[args[i]].builder;
                if (command_1.isCommandBuilderCallback(builder)) {
                    const y = yargs.reset();
                    builder(y);
                    return y.argv;
                }
            }
        }
        if (!current.match(/^-/) && parentCommands[parentCommands.length - 1] !== current) {
            usage.getCommands().forEach((usageCommand) => {
                const commandName = parse_command_1.parseCommand(usageCommand[0]).cmd;
                if (args.indexOf(commandName) === -1) {
                    if (!zshShell) {
                        completions.push(commandName);
                    }
                    else {
                        const desc = usageCommand[1] || '';
                        completions.push(commandName.replace(/:/g, '\\:') + ':' + desc);
                    }
                }
            });
        }
        if (current.match(/^-/) || (current === '' && completions.length === 0)) {
            const descs = usage.getDescriptions();
            const options = yargs.getOptions();
            Object.keys(options.key).forEach((key) => {
                const negable = !!options.configuration['boolean-negation'] && options.boolean.includes(key);
                // If the key and its aliases aren't in 'args', add the key to 'completions'
                let keyAndAliases = [key].concat(aliases[key] || []);
                if (negable)
                    keyAndAliases = keyAndAliases.concat(keyAndAliases.map(key => `no-${key}`));
                function completeOptionKey(key) {
                    const notInArgs = keyAndAliases.every(val => args.indexOf(`--${val}`) === -1);
                    if (notInArgs) {
                        const startsByTwoDashes = (s) => /^--/.test(s);
                        const isShortOption = (s) => /^[^0-9]$/.test(s);
                        const dashes = !startsByTwoDashes(current) && isShortOption(key) ? '-' : '--';
                        if (!zshShell) {
                            completions.push(dashes + key);
                        }
                        else {
                            const desc = descs[key] || '';
                            completions.push(dashes + `${key.replace(/:/g, '\\:')}:${desc.replace('__yargsString__:', '')}`);
                        }
                    }
                }
                completeOptionKey(key);
                if (negable && !!options.default[key])
                    completeOptionKey(`no-${key}`);
            });
        }
        done(completions);
    };
    // generate the completion script to add to your .bashrc.
    self.generateCompletionScript = function generateCompletionScript($0, cmd) {
        let script = zshShell ? templates.completionZshTemplate : templates.completionShTemplate;
        const name = path.basename($0);
        // add ./to applications not yet installed as bin.
        if ($0.match(/\.js$/))
            $0 = `./${$0}`;
        script = script.replace(/{{app_name}}/g, name);
        script = script.replace(/{{completion_command}}/g, cmd);
        return script.replace(/{{app_path}}/g, $0);
    };
    // register a function to perform your own custom
    // completions., this function can be either
    // synchrnous or asynchronous.
    let completionFunction = null;
    self.registerFunction = (fn) => {
        completionFunction = fn;
    };
    return self;
}
exports.completion = completion;
function isSyncCompletionFunction(completionFunction) {
    return completionFunction.length < 3;
}

}, function(modId) { var map = {"./command":1695306835765,"./completion-templates":1695306835775,"./is-promise":1695306835767,"./parse-command":1695306835771,"./common-types":1695306835766}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835775, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.completionZshTemplate = exports.completionShTemplate = void 0;
exports.completionShTemplate = `###-begin-{{app_name}}-completions-###
#
# yargs command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.bashrc
#    or {{app_path}} {{completion_command}} >> ~/.bash_profile on OSX.
#
_yargs_completions()
{
    local cur_word args type_list

    cur_word="\${COMP_WORDS[COMP_CWORD]}"
    args=("\${COMP_WORDS[@]}")

    # ask yargs to generate completions.
    type_list=$({{app_path}} --get-yargs-completions "\${args[@]}")

    COMPREPLY=( $(compgen -W "\${type_list}" -- \${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ \${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o default -F _yargs_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;
exports.completionZshTemplate = `###-begin-{{app_name}}-completions-###
#
# yargs command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.zshrc
#    or {{app_path}} {{completion_command}} >> ~/.zsh_profile on OSX.
#
_{{app_name}}_yargs_completions()
{
  local reply
  local si=$IFS
  IFS=$'\n' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" {{app_path}} --get-yargs-completions "\${words[@]}"))
  IFS=$si
  _describe 'values' reply
}
compdef _{{app_name}}_yargs_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835776, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = void 0;
const argsert_1 = require("./argsert");
const common_types_1 = require("./common-types");
const levenshtein_1 = require("./levenshtein");
const obj_filter_1 = require("./obj-filter");
const specialKeys = ['$0', '--', '_'];
// validation-type-stuff, missing params,
// bad implications, custom checks.
function validation(yargs, usage, y18n) {
    const __ = y18n.__;
    const __n = y18n.__n;
    const self = {};
    // validate appropriate # of non-option
    // arguments were provided, i.e., '_'.
    self.nonOptionCount = function nonOptionCount(argv) {
        const demandedCommands = yargs.getDemandedCommands();
        // don't count currently executing commands
        const _s = argv._.length - yargs.getContext().commands.length;
        if (demandedCommands._ && (_s < demandedCommands._.min || _s > demandedCommands._.max)) {
            if (_s < demandedCommands._.min) {
                if (demandedCommands._.minMsg !== undefined) {
                    usage.fail(
                    // replace $0 with observed, $1 with expected.
                    demandedCommands._.minMsg
                        ? demandedCommands._.minMsg.replace(/\$0/g, _s.toString()).replace(/\$1/, demandedCommands._.min.toString())
                        : null);
                }
                else {
                    usage.fail(__n('Not enough non-option arguments: got %s, need at least %s', 'Not enough non-option arguments: got %s, need at least %s', _s, _s, demandedCommands._.min));
                }
            }
            else if (_s > demandedCommands._.max) {
                if (demandedCommands._.maxMsg !== undefined) {
                    usage.fail(
                    // replace $0 with observed, $1 with expected.
                    demandedCommands._.maxMsg
                        ? demandedCommands._.maxMsg.replace(/\$0/g, _s.toString()).replace(/\$1/, demandedCommands._.max.toString())
                        : null);
                }
                else {
                    usage.fail(__n('Too many non-option arguments: got %s, maximum of %s', 'Too many non-option arguments: got %s, maximum of %s', _s, _s, demandedCommands._.max));
                }
            }
        }
    };
    // validate the appropriate # of <required>
    // positional arguments were provided:
    self.positionalCount = function positionalCount(required, observed) {
        if (observed < required) {
            usage.fail(__n('Not enough non-option arguments: got %s, need at least %s', 'Not enough non-option arguments: got %s, need at least %s', observed, observed, required));
        }
    };
    // make sure all the required arguments are present.
    self.requiredArguments = function requiredArguments(argv) {
        const demandedOptions = yargs.getDemandedOptions();
        let missing = null;
        for (const key of Object.keys(demandedOptions)) {
            if (!Object.prototype.hasOwnProperty.call(argv, key) || typeof argv[key] === 'undefined') {
                missing = missing || {};
                missing[key] = demandedOptions[key];
            }
        }
        if (missing) {
            const customMsgs = [];
            for (const key of Object.keys(missing)) {
                const msg = missing[key];
                if (msg && customMsgs.indexOf(msg) < 0) {
                    customMsgs.push(msg);
                }
            }
            const customMsg = customMsgs.length ? `\n${customMsgs.join('\n')}` : '';
            usage.fail(__n('Missing required argument: %s', 'Missing required arguments: %s', Object.keys(missing).length, Object.keys(missing).join(', ') + customMsg));
        }
    };
    // check for unknown arguments (strict-mode).
    self.unknownArguments = function unknownArguments(argv, aliases, positionalMap, isDefaultCommand) {
        const commandKeys = yargs.getCommandInstance().getCommands();
        const unknown = [];
        const currentContext = yargs.getContext();
        Object.keys(argv).forEach((key) => {
            if (specialKeys.indexOf(key) === -1 &&
                !Object.prototype.hasOwnProperty.call(positionalMap, key) &&
                !Object.prototype.hasOwnProperty.call(yargs._getParseContext(), key) &&
                !self.isValidAndSomeAliasIsNotNew(key, aliases)) {
                unknown.push(key);
            }
        });
        if ((currentContext.commands.length > 0) || (commandKeys.length > 0) || isDefaultCommand) {
            argv._.slice(currentContext.commands.length).forEach((key) => {
                if (commandKeys.indexOf(key) === -1) {
                    unknown.push(key);
                }
            });
        }
        if (unknown.length > 0) {
            usage.fail(__n('Unknown argument: %s', 'Unknown arguments: %s', unknown.length, unknown.join(', ')));
        }
    };
    self.unknownCommands = function unknownCommands(argv) {
        const commandKeys = yargs.getCommandInstance().getCommands();
        const unknown = [];
        const currentContext = yargs.getContext();
        if ((currentContext.commands.length > 0) || (commandKeys.length > 0)) {
            argv._.slice(currentContext.commands.length).forEach((key) => {
                if (commandKeys.indexOf(key) === -1) {
                    unknown.push(key);
                }
            });
        }
        if (unknown.length > 0) {
            usage.fail(__n('Unknown command: %s', 'Unknown commands: %s', unknown.length, unknown.join(', ')));
            return true;
        }
        else {
            return false;
        }
    };
    // check for a key that is not an alias, or for which every alias is new,
    // implying that it was invented by the parser, e.g., during camelization
    self.isValidAndSomeAliasIsNotNew = function isValidAndSomeAliasIsNotNew(key, aliases) {
        if (!Object.prototype.hasOwnProperty.call(aliases, key)) {
            return false;
        }
        const newAliases = yargs.parsed.newAliases;
        for (const a of [key, ...aliases[key]]) {
            if (!Object.prototype.hasOwnProperty.call(newAliases, a) || !newAliases[key]) {
                return true;
            }
        }
        return false;
    };
    // validate arguments limited to enumerated choices
    self.limitedChoices = function limitedChoices(argv) {
        const options = yargs.getOptions();
        const invalid = {};
        if (!Object.keys(options.choices).length)
            return;
        Object.keys(argv).forEach((key) => {
            if (specialKeys.indexOf(key) === -1 &&
                Object.prototype.hasOwnProperty.call(options.choices, key)) {
                [].concat(argv[key]).forEach((value) => {
                    // TODO case-insensitive configurability
                    if (options.choices[key].indexOf(value) === -1 &&
                        value !== undefined) {
                        invalid[key] = (invalid[key] || []).concat(value);
                    }
                });
            }
        });
        const invalidKeys = Object.keys(invalid);
        if (!invalidKeys.length)
            return;
        let msg = __('Invalid values:');
        invalidKeys.forEach((key) => {
            msg += `\n  ${__('Argument: %s, Given: %s, Choices: %s', key, usage.stringifiedValues(invalid[key]), usage.stringifiedValues(options.choices[key]))}`;
        });
        usage.fail(msg);
    };
    // custom checks, added using the `check` option on yargs.
    let checks = [];
    self.check = function check(f, global) {
        checks.push({
            func: f,
            global
        });
    };
    self.customChecks = function customChecks(argv, aliases) {
        for (let i = 0, f; (f = checks[i]) !== undefined; i++) {
            const func = f.func;
            let result = null;
            try {
                result = func(argv, aliases);
            }
            catch (err) {
                usage.fail(err.message ? err.message : err, err);
                continue;
            }
            if (!result) {
                usage.fail(__('Argument check failed: %s', func.toString()));
            }
            else if (typeof result === 'string' || result instanceof Error) {
                usage.fail(result.toString(), result);
            }
        }
    };
    // check implications, argument foo implies => argument bar.
    let implied = {};
    self.implies = function implies(key, value) {
        argsert_1.argsert('<string|object> [array|number|string]', [key, value], arguments.length);
        if (typeof key === 'object') {
            Object.keys(key).forEach((k) => {
                self.implies(k, key[k]);
            });
        }
        else {
            yargs.global(key);
            if (!implied[key]) {
                implied[key] = [];
            }
            if (Array.isArray(value)) {
                value.forEach((i) => self.implies(key, i));
            }
            else {
                common_types_1.assertNotStrictEqual(value, undefined);
                implied[key].push(value);
            }
        }
    };
    self.getImplied = function getImplied() {
        return implied;
    };
    function keyExists(argv, val) {
        // convert string '1' to number 1
        const num = Number(val);
        val = isNaN(num) ? val : num;
        if (typeof val === 'number') {
            // check length of argv._
            val = argv._.length >= val;
        }
        else if (val.match(/^--no-.+/)) {
            // check if key/value doesn't exist
            val = val.match(/^--no-(.+)/)[1];
            val = !argv[val];
        }
        else {
            // check if key/value exists
            val = argv[val];
        }
        return val;
    }
    self.implications = function implications(argv) {
        const implyFail = [];
        Object.keys(implied).forEach((key) => {
            const origKey = key;
            (implied[key] || []).forEach((value) => {
                let key = origKey;
                const origValue = value;
                key = keyExists(argv, key);
                value = keyExists(argv, value);
                if (key && !value) {
                    implyFail.push(` ${origKey} -> ${origValue}`);
                }
            });
        });
        if (implyFail.length) {
            let msg = `${__('Implications failed:')}\n`;
            implyFail.forEach((value) => {
                msg += (value);
            });
            usage.fail(msg);
        }
    };
    let conflicting = {};
    self.conflicts = function conflicts(key, value) {
        argsert_1.argsert('<string|object> [array|string]', [key, value], arguments.length);
        if (typeof key === 'object') {
            Object.keys(key).forEach((k) => {
                self.conflicts(k, key[k]);
            });
        }
        else {
            yargs.global(key);
            if (!conflicting[key]) {
                conflicting[key] = [];
            }
            if (Array.isArray(value)) {
                value.forEach((i) => self.conflicts(key, i));
            }
            else {
                conflicting[key].push(value);
            }
        }
    };
    self.getConflicting = () => conflicting;
    self.conflicting = function conflictingFn(argv) {
        Object.keys(argv).forEach((key) => {
            if (conflicting[key]) {
                conflicting[key].forEach((value) => {
                    // we default keys to 'undefined' that have been configured, we should not
                    // apply conflicting check unless they are a value other than 'undefined'.
                    if (value && argv[key] !== undefined && argv[value] !== undefined) {
                        usage.fail(__('Arguments %s and %s are mutually exclusive', key, value));
                    }
                });
            }
        });
    };
    self.recommendCommands = function recommendCommands(cmd, potentialCommands) {
        const threshold = 3; // if it takes more than three edits, let's move on.
        potentialCommands = potentialCommands.sort((a, b) => b.length - a.length);
        let recommended = null;
        let bestDistance = Infinity;
        for (let i = 0, candidate; (candidate = potentialCommands[i]) !== undefined; i++) {
            const d = levenshtein_1.levenshtein(cmd, candidate);
            if (d <= threshold && d < bestDistance) {
                bestDistance = d;
                recommended = candidate;
            }
        }
        if (recommended)
            usage.fail(__('Did you mean %s?', recommended));
    };
    self.reset = function reset(localLookup) {
        implied = obj_filter_1.objFilter(implied, k => !localLookup[k]);
        conflicting = obj_filter_1.objFilter(conflicting, k => !localLookup[k]);
        checks = checks.filter(c => c.global);
        return self;
    };
    const frozens = [];
    self.freeze = function freeze() {
        frozens.push({
            implied,
            checks,
            conflicting
        });
    };
    self.unfreeze = function unfreeze() {
        const frozen = frozens.pop();
        common_types_1.assertNotStrictEqual(frozen, undefined);
        ({
            implied,
            checks,
            conflicting
        } = frozen);
    };
    return self;
}
exports.validation = validation;

}, function(modId) { var map = {"./argsert":1695306835769,"./common-types":1695306835766,"./levenshtein":1695306835777,"./obj-filter":1695306835773}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835777, function(require, module, exports) {

/*
Copyright (c) 2011 Andrei Mackenzie

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.levenshtein = void 0;
// levenshtein distance algorithm, pulled from Andrei Mackenzie's MIT licensed.
// gist, which can be found here: https://gist.github.com/andrei-m/982927
// Compute the edit distance between the two given strings
function levenshtein(a, b) {
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    const matrix = [];
    // increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    // increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                Math.min(matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1)); // deletion
            }
        }
    }
    return matrix[b.length][a.length];
}
exports.levenshtein = levenshtein;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835778, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.applyExtends = void 0;
const fs = require("fs");
const path = require("path");
const yerror_1 = require("./yerror");
let previouslyVisitedConfigs = [];
function checkForCircularExtends(cfgPath) {
    if (previouslyVisitedConfigs.indexOf(cfgPath) > -1) {
        throw new yerror_1.YError(`Circular extended configurations: '${cfgPath}'.`);
    }
}
function getPathToDefaultConfig(cwd, pathToExtend) {
    return path.resolve(cwd, pathToExtend);
}
function mergeDeep(config1, config2) {
    const target = {};
    function isObject(obj) {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    }
    Object.assign(target, config1);
    for (const key of Object.keys(config2)) {
        if (isObject(config2[key]) && isObject(target[key])) {
            target[key] = mergeDeep(config1[key], config2[key]);
        }
        else {
            target[key] = config2[key];
        }
    }
    return target;
}
function applyExtends(config, cwd, mergeExtends = false) {
    let defaultConfig = {};
    if (Object.prototype.hasOwnProperty.call(config, 'extends')) {
        if (typeof config.extends !== 'string')
            return defaultConfig;
        const isPath = /\.json|\..*rc$/.test(config.extends);
        let pathToDefault = null;
        if (!isPath) {
            try {
                pathToDefault = require.resolve(config.extends);
            }
            catch (err) {
                // most likely this simply isn't a module.
            }
        }
        else {
            pathToDefault = getPathToDefaultConfig(cwd, config.extends);
        }
        // maybe the module uses key for some other reason,
        // err on side of caution.
        if (!pathToDefault && !isPath)
            return config;
        if (!pathToDefault)
            throw new yerror_1.YError(`Unable to find extended config '${config.extends}' in '${cwd}'.`);
        checkForCircularExtends(pathToDefault);
        previouslyVisitedConfigs.push(pathToDefault);
        defaultConfig = isPath ? JSON.parse(fs.readFileSync(pathToDefault, 'utf8')) : require(config.extends);
        delete config.extends;
        defaultConfig = applyExtends(defaultConfig, path.dirname(pathToDefault), mergeExtends);
    }
    previouslyVisitedConfigs = [];
    return mergeExtends ? mergeDeep(defaultConfig, config) : Object.assign({}, defaultConfig, config);
}
exports.applyExtends = applyExtends;

}, function(modId) { var map = {"./yerror":1695306835770}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1695306835779, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessArgvBin = exports.getProcessArgvWithoutBin = void 0;
function getProcessArgvBinIndex() {
    // The binary name is the first command line argument for:
    // - bundled Electron apps: bin argv1 argv2 ... argvn
    if (isBundledElectronApp())
        return 0;
    // or the second one (default) for:
    // - standard node apps: node bin.js argv1 argv2 ... argvn
    // - unbundled Electron apps: electron bin.js argv1 arg2 ... argvn
    return 1;
}
function isBundledElectronApp() {
    // process.defaultApp is either set by electron in an electron unbundled app, or undefined
    // see https://github.com/electron/electron/blob/master/docs/api/process.md#processdefaultapp-readonly
    return isElectronApp() && !process.defaultApp;
}
function isElectronApp() {
    // process.versions.electron is either set by electron, or undefined
    // see https://github.com/electron/electron/blob/master/docs/api/process.md#processversionselectron-readonly
    return !!process.versions.electron;
}
function getProcessArgvWithoutBin() {
    return process.argv.slice(getProcessArgvBinIndex() + 1);
}
exports.getProcessArgvWithoutBin = getProcessArgvWithoutBin;
function getProcessArgvBin() {
    return process.argv[getProcessArgvBinIndex()];
}
exports.getProcessArgvBin = getProcessArgvBin;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1695306835762);
})()
//miniprogram-npm-outsideDeps=["yargs-parser","fs","path","y18n","set-blocking","find-up","require-main-filename","get-caller-file","util","require-directory","which-module","assert","decamelize","string-width","cliui"]
//# sourceMappingURL=index.js.map