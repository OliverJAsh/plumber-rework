/* global describe, beforeEach, it */

var chai = require('chai');
chai.should();

// var sinon = require('sinon');
require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var SourceMapConsumer = require('source-map').SourceMapConsumer;
var fs = require('fs');


var runOperation = require('plumber-util-test').runOperation;
var completeWithResources = require('plumber-util-test').completeWithResources;
var runAndCompleteWith = require('plumber-util-test').runAndCompleteWith;

var Resource = require('plumber').Resource;
var Report = require('plumber').Report;
var SourceMap = require('mercator').SourceMap;

var rework = require('..');

function createResource(params) {
    return new Resource(params);
}

function resourcesError() {
    chai.assert(false, 'error in resources observable');
}


describe('rework', function(){

    it('should be a function', function(){
        rework.should.be.a('function');
    });

    it('should return a function', function(){
        rework().should.be.a('function');
    });

    // TODO: test options

    describe('when passed a CSS file', function() {
        var transformedResources;
        var mainData = fs.readFileSync('test/fixtures/main.css').toString();

        beforeEach(function() {
            transformedResources = runOperation(rework(), [
                createResource({path: 'test/fixtures/main.css', type: 'css', data: mainData})
            ]).resources;
        });

        it('should return a single resource with a CSS filename', function(done){
            completeWithResources(transformedResources, function(resources) {
                resources.length.should.equal(1);
                resources[0].filename().should.equal('main.css');
            }, resourcesError, done);
        });

        it('should return a resource with CSS data', function(done){
            var outputMain = fs.readFileSync('test/fixtures/output-main.css').toString();
            completeWithResources(transformedResources, function(resources) {
                resources[0].data().should.equal(outputMain);
            }, resourcesError, done);
        });

        it('should return a resource with a source map with correct properties', function(done){
            completeWithResources(transformedResources, function(resources) {
                var sourceMap = resources[0].sourceMap();
                sourceMap.file.should.equal('main.css');
                // TODO:
                sourceMap.sources.should.deep.equal([
                    'test/fixtures/main.css'
                ]);
                sourceMap.sourcesContent.should.deep.equal([
                    'body {\n    margin: 0;\n}\n'
                ]);
            }, resourcesError, done);
        });

        it('should return a resource with a source map with correct mappings', function(done){
            completeWithResources(transformedResources, function(resources) {
                var map = new SourceMapConsumer(resources[0].sourceMap());

                /*
               1 body {
               2     margin: 0;
               3 }
                 */
                map.originalPositionFor({line: 1, column: 0}).should.deep.equal({
                    source: 'test/fixtures/main.css',
                    line: 1,
                    column: 0,
                    name: null
                });
                map.originalPositionFor({line: 2, column: 2}).should.deep.equal({
                    source: 'test/fixtures/main.css',
                    line: 2,
                    column: 4,
                    name: null
                });
            }, resourcesError, done);
        });
    });

    describe('when passed a CSS file and called with a plugin', function() {
        var transformedResources;
        var mainData = fs.readFileSync('test/fixtures/import.css').toString();

        beforeEach(function() {
            var reworkImport = require('rework-import');
            transformedResources = runOperation(rework({
                plugins: [
                    reworkImport({
                        path: [
                            // TODO: Needed?
                            'test/fixtures'
                        ]
                    })
                ]
            }), [
                createResource({path: 'test/fixtures/import.css', type: 'css', data: mainData})
            ]).resources;
        });

        it('should return a single resource with a CSS filename', function(done){
            completeWithResources(transformedResources, function(resources) {
                resources.length.should.equal(1);
                resources[0].filename().should.equal('import.css');
            }, resourcesError, done);
        });

        it('should return a resource with CSS data', function(done){
            var outputMain = fs.readFileSync('test/fixtures/output-import.css').toString();
            completeWithResources(transformedResources, function(resources) {
                resources[0].data().should.equal(outputMain);
            }, resourcesError, done);
        });

        it('should return a resource with a source map with correct properties', function(done){
            completeWithResources(transformedResources, function(resources) {
                var sourceMap = resources[0].sourceMap();
                sourceMap.file.should.equal('import.css');
                sourceMap.sources.should.deep.equal([
                    'test/fixtures/1.css',
                    'test/fixtures/2.css'
                ]);
                sourceMap.sourcesContent.should.deep.equal([
                    '.one {\n    border: 1;\n}\n',
                    '.two {\n    margin: 2px;\n}'
                ]);
            }, resourcesError, done);
        });

        it('should return a resource with a source map with correct mappings', function(done){
            completeWithResources(transformedResources, function(resources) {
                var map = new SourceMapConsumer(resources[0].sourceMap());

                /*
               1 .one p {
               2   border: 1;
               3 }
               5
               6 .two ul {
               7   margin: 2px;
               8 }
                 */
                map.originalPositionFor({line: 1, column: 0}).should.deep.equal({
                    source: 'test/fixtures/1.css',
                    line: 1,
                    column: 0,
                    name: null
                });
                map.originalPositionFor({line: 2, column: 2}).should.deep.equal({
                    source: 'test/fixtures/1.css',
                    line: 2,
                    column: 4,
                    name: null
                });
                map.originalPositionFor({line: 5, column: 0}).should.deep.equal({
                    source: 'test/fixtures/2.css',
                    line: 1,
                    column: 0,
                    name: null
                });
                map.originalPositionFor({line: 6, column: 2}).should.deep.equal({
                    source: 'test/fixtures/2.css',
                    line: 2,
                    column: 4,
                    name: null
                });
            }, resourcesError, done);
        });
    });

    describe('when passed a CSS file with a source map', function() {
        var transformedResources;
        var mainData = fs.readFileSync('test/fixtures/concatenated.css').toString();
        var mainMapData = SourceMap.fromMapData(fs.readFileSync('test/fixtures/concatenated.css.map').toString());

        beforeEach(function() {
            transformedResources = runOperation(rework(), [
                createResource({path: 'test/fixtures/concatenated.css', type: 'css',
                                data: mainData, sourceMap: mainMapData})
            ]).resources;
        });

        it('should return a resource with a source map with correct properties from the input source map', function(done){
            completeWithResources(transformedResources, function(resources) {
                var sourceMap = resources[0].sourceMap();

                // The input source map is rebased and includes a mapping to
                // the new CSS file
                // As per: https://github.com/reworkcss/css/issues/52#issuecomment-55350737
                sourceMap.file.should.equal('concatenated.css');
                // Sources are correctly(?) rebased from relative to absolute
                // As per: https://github.com/reworkcss/css/issues/52#issuecomment-55430126
                sourceMap.sources.should.deep.equal([
                    'test/fixtures/1.css',
                    'test/fixtures/2.css',
                    'test/fixtures/concatenated.css'
                ]);
                sourceMap.sourcesContent.should.deep.equal(mainMapData.sourcesContent.concat([
                    '.one {\n  border: 1;\n}\n\n.two {\n  margin: 2px;\n}\n/*# sourceMappingURL=concatenated.css.map */\n'
                ]));
            }, resourcesError, done);
        });

        it('should remap mappings based on the input source map', function(done) {
            completeWithResources(transformedResources, function(resources) {
                var map = new SourceMapConsumer(resources[0].sourceMap());

                /*
               1 .one p {
               2   border: 1;
               3 }
               5
               6 .two ul {
               7   margin: 2px;
               8 }
                 */
                map.originalPositionFor({line: 1, column: 0}).should.deep.equal({
                    source: 'test/fixtures/1.css',
                    line: 1,
                    column: 0,
                    name: null
                });
                map.originalPositionFor({line: 2, column: 2}).should.deep.equal({
                    source: 'test/fixtures/1.css',
                    line: 2,
                    column: 4,
                    name: null
                });
                map.originalPositionFor({line: 5, column: 0}).should.deep.equal({
                    source: 'test/fixtures/2.css',
                    line: 1,
                    column: 0,
                    name: null
                });
                map.originalPositionFor({line: 6, column: 2}).should.deep.equal({
                    source: 'test/fixtures/2.css',
                    line: 2,
                    column: 4,
                    name: null
                });
            }, resourcesError, done);
        });

    });


    describe('when passed a resource with invalid CSS syntax', function() {

        it('should return an error report if missing closing bracket', function(done){
            var missingClosingBracket = createResource({
                path: 'test/fixtures/concatenated.css',
                type: 'css',
                data: '.foo {'
            });

            runAndCompleteWith(rework(), [missingClosingBracket], function(reports) {
                reports.length.should.equal(1);
                reports[0].should.be.instanceof(Report);
                reports[0].writtenResource.should.equal(missingClosingBracket);
                reports[0].type.should.equal('error');
                reports[0].success.should.equal(false);
                reports[0].errors[0].line.should.equal(1);
                reports[0].errors[0].column.should.equal(7);
                reports[0].errors[0].message.should.equal('missing \'}\'');
            }, resourcesError, done);
        });
    });
});
