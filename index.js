var operation = require('plumber').operation;
var Rx = require('rx');
var createRework = require('rework');
var mercator = require('mercator');

exports = module.exports = rework;

function rework(config) {
    // TODO:
    config = config || {};

    var SourceMap = mercator.SourceMap;

    return operation(function(resources) {
        return resources.flatMap(function(resource) {
            // TODO: map extra options (filename, paths, etc)?
            var compiledCss = resource.withType('css');

            // return Rx.Observable.create(function(observer) {
            return Rx.Observable.defer(function(push, next) {
                var resourcePath = resource.path();
                try {
                    var rework = createRework(resource.data(), { source: resourcePath && resourcePath.absolute() });

                    (config.plugins || []).forEach(function (plugin) {
                        rework.use(plugin);
                    });


                    var result = rework
                        .toString({ sourcemap: true, sourcemapAsObject: true });
                    // FIXME:
                    // result.map.sources = result.map.sources[0];

                //     observer.onNext({
                //         data: result.code,
                //         sourceMapData: JSON.stringify(result.map)
                //     });
                //     observer.onCompleted();
                // } catch (error) {
                //     observer.onError(error);
                // }

                    return Rx.Observable.return({data: result.code, sourceMapData: JSON.stringify(result.map)});
                } catch(e) {
                    return Rx.Observable.throw(e);
                }
            }).map(function(out) {
                var data = out.data;
                var sourceMap = SourceMap.fromMapData(out.sourceMapData);

                // If the source had a sourcemap, rebase the Rework
                // sourcemap based on that original map
                var originalMapData = resource.sourceMap();
                if (originalMapData) {
                    sourceMap = originalMapData.apply(sourceMap);
                }

                return compiledCss.withData(data, sourceMap);
            }).catch(function(error) {
                // Catch and map LESS error
                var Report = require('plumber').Report;
                var errorReport = new Report({
                    resource: resource,
                    type: 'error', // FIXME: ?
                    success: false,
                    // TODO: Context (not provided by Rework)
                    // TODO: Type (not provided by Rework)
                    errors: [{
                        line:    error.line,
                        column:  error.column,
                        message: error.reason
                    }]
                });
                return Rx.Observable.return(errorReport);
            });
        });
    });
}
