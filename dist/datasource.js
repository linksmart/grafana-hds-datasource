'use strict';

System.register(['lodash'], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('GenericDatasource', GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
        }

        // Required
        // Used for testing datasource in datasource configuration page


        _createClass(GenericDatasource, [{
          key: 'testDatasource',
          value: function testDatasource() {
            return this.backendSrv.datasourceRequest({
              url: this.url + '/',
              method: 'GET'
            }).then(function (response) {
              if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
              }
            });
          }
        }, {
          key: 'query',
          value: function query(options) {
            var query = this.filterPlaceholders(options);
            //console.log("query QUERY:", JSON.stringify(query));

            // Filter targets that are set to hidden
            query.targets = _.filter(query.targets, function (target) {
              return target.hide != true;
            });

            // All targets filtered OR no metric selected
            if (query.targets.length == 0 || !('metric' in query.targets[0])) {
              return { data: [] }; // return this.q.when([]);
            }

            // Make a new array with zero-valued object fields
            var entries = Array.apply(null, Array(query.targets.length)).map(function () {
              return { target: '', datapoints: [] };
            });

            var parent = this;
            // Recursively query all pages of every target
            function recursiveReq(page, idi) {
              var target = query.targets[idi];
              var source = target.source;
              var apiEndpoint = "data/";
              var senmlValues = { float: "v", string: "sv", bool: "bv" };
              var senmlValue = senmlValues[target.Types[target.metric]];
              var senmlFields = { value: senmlValue, time: "t" };
              // Query for aggregation data
              if (!source.startsWith("value")) {
                apiEndpoint = "aggr/" + target.Aggrs[source].id + "/";
                senmlFields.value = target.Aggrs[source].aggregate;
                senmlFields.time = "ts";
              }

              var uuid = target.UUIDs[target.metric];
              return parent.backendSrv.datasourceRequest({
                url: parent.url + "/" + apiEndpoint + uuid + '?start=' + query.range.from.toISOString() + '&end=' + query.range.to.toISOString() + '&page=' + page,
                data: query,
                method: 'GET'
              }).then(function (d) {
                var total = d.data.total; // total from data api
                var datapoints = parent.convertData(d.data, senmlFields);
                // append aggregate name to metric title
                var aggregate = senmlFields.value == senmlValue ? '' : '.' + senmlFields.value;
                entries[idi].target = target.metric + aggregate;
                entries[idi].datapoints = entries[idi].datapoints.concat(datapoints);

                if (total > entries[idi].datapoints.length) {
                  // query the next page
                  return recursiveReq(++page, idi);
                } else if (idi < query.targets.length - 1) {
                  // one target done, query the next target
                  return recursiveReq(1, ++idi);
                } else {
                  // all done
                  d.data = entries;
                  return d;
                }
              });
            } // end func

            // Start from page 1, id 0
            return recursiveReq(1, 0);
          }
        }, {
          key: 'convertData',
          value: function convertData(data, senmlFields) {
            var datapoints = Array(data.data.e.length);
            for (var i = 0; i < data.data.e.length; i++) {
              datapoints[i] = [data.data.e[i][senmlFields.value], data.data.e[i][senmlFields.time] * 1000];
            }

            return datapoints;
          }
        }, {
          key: 'filterPlaceholders',
          value: function filterPlaceholders(options) {
            options.targets = _.filter(options.targets, function (target) {
              return target.metric !== 'select metric' && target.source !== 'select source';
            });

            return options;
          }
        }, {
          key: 'queryMetrics',
          value: function queryMetrics(options) {
            return this.backendSrv.datasourceRequest({
              //url: this.url + '/search',
              url: this.url + '/registry',
              data: options,
              method: 'GET'
            }).then(this.convertMetrics);
          }
        }, {
          key: 'convertMetrics',
          value: function convertMetrics(res) {
            return _.map(res.data.entries, function (d, i) {
              return {
                uuid: d.id,
                legend: '(' + d.id.split('-')[0] + ') ' + d.resource, // (first 4 bytes of uuid) resource name
                type: d.type,
                text: d.id + ' : ' + d.resource,
                value: i
              };
            });
          }
        }, {
          key: 'querySources',
          value: function querySources(options) {
            // Metric is not selected
            if (options.metric == 'select metric') {
              return new Promise(function (resolve, reject) {
                reject("metric not selected");
              });
            }

            var uuid = options.UUIDs[options.metric];
            return this.backendSrv.datasourceRequest({
              url: this.url + '/registry/' + uuid,
              method: 'GET'
            }).then(this.convertSources);
          }
        }, {
          key: 'convertSources',
          value: function convertSources(res) {
            function formatRetention(retention) {
              if (retention == "") {
                return ", retention ∞"; // infinite retention
              }
              return ', retention ' + retention;
            }

            var index = 0;
            // raw un-aggregated data
            var value = { id: 'value', text: 'value' + formatRetention(res.data.retention), value: index++ };
            // Flatten aggregations of a target (datasource)
            // start with 'value' as input and concatenate flattened aggregates
            var r = _.reduce(res.data.aggregation, function (input, a) {
              // Flatten and format aggregates
              var r2 = _.reduce(a.aggregates, function (array, aggregate) {
                array.push({
                  id: a.id,
                  aggregate: aggregate,
                  text: aggregate + ', every ' + a.interval + formatRetention(a.retention),
                  value: index++
                });
                return array;
              }, []);

              return input.concat(r2);
            }, [value]);

            // sort aggregates
            r = [r[0]].concat(_.sortBy(r.slice(1, r.length), 'text'));
            return r;
          }
        }]);

        return GenericDatasource;
      }());

      _export('GenericDatasource', GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
