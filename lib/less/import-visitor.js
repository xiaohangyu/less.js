(function (tree) {
    tree.importVisitor = function(root, importer, finish, evalEnv) {
        this._visitor = new tree.visitor(this);
        this._importer = importer;
        this._finish = finish;
        this.env = evalEnv || new tree.evalEnv();
        this.importCount = 0;

        // process the contents
        this._visitor.visit(root);

        this.isFinished = true;

        if (this.importCount === 0) {
            this._finish();
        }
    };

    tree.importVisitor.prototype = {
        visitImport: function (importNode, visitArgs) {
            var importVisitor = this,
                evaldImportNode;

            if (!importNode.css) {

                try {
                    evaldImportNode = importNode.evalForImport(this.env);
                } catch(e){
                    if (!e.filename) { e.index = importNode.index; e.filename = importNode.currentFileInfo.filename; }
                    // attempt to eval properly and treat as css
                    importNode.css = true;
                    // if that fails, this error will be thrown
                    importNode.error = e;
                }

                if (evaldImportNode && !evaldImportNode.css) {
                    importNode = evaldImportNode;
                    this.importCount++;
                    var env = new tree.evalEnv(this.env, this.env.frames.slice(0));
                    this._importer.push(importNode.getPath(), importNode.currentFileInfo, function (e, root, imported) {
                        if (e && !e.filename) { e.index = importNode.index; e.filename = importNode.currentFileInfo.filename; }
                        if (imported && importNode.once) { importNode.skip = imported; }

                        var subFinish = function() {
                            importVisitor.importCount--;

                            if (importVisitor.importCount === 0 && importVisitor.isFinished) {
                                importVisitor._finish();
                            }
                        };

                        if (root) {
                            importNode.root = root;
                            new(tree.importVisitor)(root, importVisitor._importer, subFinish, env);
                        } else {
                            subFinish();
                        }
                    });
                }
            }
            visitArgs.visitDeeper = false;
            return importNode;
        },
        visitRule: function (ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
            return ruleNode;
        },
        visitDirective: function (directiveNode, visitArgs) {
            this.env.frames.unshift(directiveNode);
            return directiveNode;
        },
        visitDirectiveOut: function (directiveNode) {
            this.env.frames.shift();
        },
        visitMixinDefinition: function (mixinDefinitionNode, visitArgs) {
            this.env.frames.unshift(mixinDefinitionNode);
            return mixinDefinitionNode;
        },
        visitMixinDefinitionOut: function (mixinDefinitionNode) {
            this.env.frames.shift();
        },
        visitRuleset: function (rulesetNode, visitArgs) {
            this.env.frames.unshift(rulesetNode);
            return rulesetNode;
        },
        visitRulesetOut: function (rulesetNode) {
            this.env.frames.shift();
        },
        visitMedia: function (mediaNode, visitArgs) {
            this.env.frames.unshift(mediaNode.ruleset);
            return mediaNode;
        },
        visitMediaOut: function (mediaNode) {
            this.env.frames.shift();
        }
    };

})(require('./tree'));