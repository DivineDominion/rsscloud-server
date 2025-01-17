(function () {
    "use strict";

    var async = require('async'),
        DBMigrate = require('db-migrate'),
        moment = require('moment'),
        sqlite3 = require('sqlite3');

    function connectToDatabase(filename, callback) {
        var db = new sqlite3.Database(
            filename,
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            function completeConnect(err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, db);
            }
        );
    }

    function flushOldLogs(db) {
        var stmt = db.prepare(`
            DELETE FROM log_events
            WHERE time < ?
        `),
            time = moment().subtract(1, 'day');

        console.log('Flushing old logs: ' + time.toISOString());

        stmt.run(
            time.toISOString()
        );

        stmt.finalize();
    }

    function init(callback) {
        var dbmigrate;
        async.waterfall([
            function asyncDoMigration(callback) {
                dbmigrate = DBMigrate.getInstance(true);
                dbmigrate.up(() => {
                    callback();
                });
            },
            function asyncConnectToDatabase(callback) {
                if ('sqlite3' === dbmigrate.config.getCurrent().settings.driver) {
                    connectToDatabase(dbmigrate.config.getCurrent().settings.filename, callback);
                } else {
                    callback('This application currently requires sqlite3 as the driver');
                }
            },
            function asyncFlushOldLogs(db, callback) {
                flushOldLogs(db);

                setInterval(() => {
                    flushOldLogs(db);
                }, 3600000);

                callback(null, db);
            }
        ], callback);
    }

    module.exports = init;
}());
