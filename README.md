plumber-rework [![Build Status](https://travis-ci.org/oliverjash/plumber-rework.png?branch=master)](https://travis-ci.org/oliverjash/plumber-rework)
============

[Rework](https://github.com/reworkcss/rework) compilation operation for [Plumber](https://github.com/plumberjs/plumber) pipelines.

## Example

    var rework = require('plumber-rework');
    var reworkImport = require('rework-import');

    module.exports = function(pipelines) {

        pipelines['css'] = [
            glob('main.css'),
            rework(),
            // ... more pipeline operations
        ];

        pipelines['icons'] = [
            glob('icons.css'),
            rework({ plugins: [reworkImport()]}),
            // ... more pipeline operations
        ];

    };


## API

### `rework(options)`

Compile each input CSS resource to a single CSS resource.

Optionally, plugins can be passed to the Rework compiler via `options.plugins`.
