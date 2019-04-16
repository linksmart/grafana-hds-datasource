'use strict';

System.register(['lodash'], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

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
              url: this.url + '/health',
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
            var apiEndpoint = "data/";
            var senmlValues = { float: "v", string: "sv", bool: "bv"

              // Recursively query all pages of every target
            };function recursiveReq(idi, url) {
              var target = query.targets[idi];
              var senmlValue = senmlValues[target.Types[target.metric]];
              var senmlFields = { value: senmlValue, time: "t" };

              if (url == "") {
                url = parent.url + "/" + apiEndpoint + target.metric + '?from=' + query.range.from.toISOString() + '&to=' + query.range.to.toISOString();
              } else {
                url = parent.url + url;
              }
              return parent.backendSrv.datasourceRequest({
                url: url,
                data: query,
                method: 'GET'
              }).then(function (d) {
                var _entries$idi$datapoin;

                var nextlink = d.data.nextLink;
                var datapoints = parent.convertData(d.data, senmlFields);
                // append aggregate name to metric title
                entries[idi].target = target.metric;
                (_entries$idi$datapoin = entries[idi].datapoints).push.apply(_entries$idi$datapoin, _toConsumableArray(datapoints));

                if (nextlink != "") {
                  // query the next page
                  return recursiveReq(idi, nextlink);
                } else if (idi < query.targets.length - 1) {
                  // one target done, query the next target
                  return recursiveReq(++idi, "");
                } else {
                  // all done
                  d.data = entries;
                  return d;
                }
              });
            } // end func

            return recursiveReq(0, "");
          }
        }, {
          key: 'convertData',
          value: function convertData(data, senmlFields) {
            /*var datapoints = Array(data.data.length);
            for (var i = 0; i < data.data.length; i++) {
              datapoints[i] = [data.data[i][senmlFields.value], data.data[i][senmlFields.time] * 1000];
            }*/
            var datapoints = _.map(data.data, function (entry) {
              return [entry[senmlFields.value], entry[senmlFields.time] * 1000];
            });
            return datapoints;
          }
        }, {
          key: 'filterPlaceholders',
          value: function filterPlaceholders(options) {
            options.targets = _.filter(options.targets, function (target) {
              return target.metric !== 'select metric';
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
              //headers: { 'Content-Type': 'application/json' }
            }).then(this.convertMetrics);
          }
        }, {
          key: 'convertMetrics',
          value: function convertMetrics(res) {
            return _.map(res.data.streams, function (d, i) {
              return {
                type: d.datatype,
                text: d.name,
                value: i
              };
            });
          }
        }]);

        return GenericDatasource;
      }());

      _export('GenericDatasource', GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
