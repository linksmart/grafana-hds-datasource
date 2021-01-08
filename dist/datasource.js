"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDatasource = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GenericDatasource = exports.GenericDatasource = function () {
  function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    _classCallCheck(this, GenericDatasource);

    this.apiEndpoint = "data/";
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = { 'Content-Type': 'application/json' };
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  // Required
  // Used for testing datasource in datasource configuration page


  _createClass(GenericDatasource, [{
    key: "testDatasource",
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

    // Query data from Data API
    // Called once per panel (graph)

  }, {
    key: "query",
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(options) {
        var _this = this;

        var allTargetResults, testPromises;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                options.targets = _lodash2.default.filter(options.targets, function (target) {
                  return target.hide !== true;
                });
                allTargetResults = { data: [] };
                testPromises = options.targets.map(function () {
                  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(target) {
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            if (!(!('metric' in target) || target.metric == 'select datastream')) {
                              _context.next = 2;
                              break;
                            }

                            return _context.abrupt("return", { 'target': '', 'datapoints': [] });

                          case 2:
                            _context.next = 4;
                            return _this.recursiveRequest("", target, options, []);

                          case 4:
                            return _context.abrupt("return", _context.sent);

                          case 5:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee, _this);
                  }));

                  return function (_x2) {
                    return _ref2.apply(this, arguments);
                  };
                }());
                return _context2.abrupt("return", Promise.all(testPromises).then(function (values) {
                  allTargetResults.data = values;
                  return allTargetResults;
                }));

              case 4:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function query(_x) {
        return _ref.apply(this, arguments);
      }

      return query;
    }()

    //recursively fetch the data

  }, {
    key: "recursiveRequest",
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(reqUrl, target, options, data) {
        var response, nextlink, datapoints;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (reqUrl == "") {
                  reqUrl = this.url + "/" + this.apiEndpoint + target.metric + '?from=' + options.range.from.toISOString() + '&to=' + options.range.to.toISOString();
                } else {
                  reqUrl = this.url + reqUrl;
                }

                _context3.next = 3;
                return this.doRequest({
                  url: reqUrl,
                  method: 'GET'
                });

              case 3:
                response = _context3.sent;
                nextlink = response.data.nextLink;
                datapoints = this.convertData(response.data);

                data.push.apply(data, _toConsumableArray(datapoints));

                if (!(typeof nextlink != 'undefined' && nextlink != "")) {
                  _context3.next = 11;
                  break;
                }

                return _context3.abrupt("return", this.recursiveRequest(nextlink, target, options, data));

              case 11:
                return _context3.abrupt("return", this.transformToTable(data, 0, {
                  columns: [{ text: "time", type: "time" }, { text: target.metric }],
                  values: [function (v) {
                    return v[1];
                  }, function (v) {
                    return v[0];
                  }]
                }, target));

              case 12:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function recursiveRequest(_x3, _x4, _x5, _x6) {
        return _ref3.apply(this, arguments);
      }

      return recursiveRequest;
    }()

    // make an request to the server

  }, {
    key: "doRequest",
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(options) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                options.withCredentials = this.withCredentials;
                options.headers = this.headers;
                return _context4.abrupt("return", this.backendSrv.datasourceRequest(options));

              case 3:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function doRequest(_x7) {
        return _ref4.apply(this, arguments);
      }

      return doRequest;
    }()

    // Convert historical SenML data from Data/Aggr API to Grafana datapoints

  }, {
    key: "convertData",
    value: function convertData(data) {

      var datapoints = _lodash2.default.map(data.data, function (entry) {
        switch (true) {
          case entry.hasOwnProperty("v"):
            return [entry["v"], entry["t"] * 1000];
          case entry.hasOwnProperty("vs"):
            return [entry["vs"], entry["t"] * 1000];
          case entry.hasOwnProperty("vb"):
            return [entry["vb"] == true ? 1 : 0, entry["t"] * 1000];
        }
        throw "No value in senml record!";
      });
      return datapoints;
    }

    // Remove targets that have unselected metric or source

  }, {
    key: "filterPlaceholders",
    value: function filterPlaceholders(options) {
      options.targets = _lodash2.default.filter(options.targets, function (target) {
        return target.metric !== 'select datastream';
      });

      return options;
    }

    // Query list of metrics from Registry API
    // Required for templating

  }, {
    key: "queryMetrics",
    value: function queryMetrics(options) {
      var metrics = [];
      var parent = this;
      function recursiveMetricReq(page) {
        return parent.backendSrv.datasourceRequest({
          //url: this.url + '/search',
          url: parent.url + '/registry?page=' + page,
          method: 'GET'
          //headers: { 'Content-Type': 'application/json' }
        }).then(function (res) {
          var total = res.data.total; // total from data api
          metrics.push.apply(metrics, _toConsumableArray(parent.convertMetrics(res)));
          if (total > metrics.length) {
            // query the next page
            return recursiveMetricReq(++page);
          } else {
            return metrics;
          }
        });
      }
      return recursiveMetricReq(1);
    }

    // Convert registration from Registry API to the format required by Grafana + some meta information

  }, {
    key: "convertMetrics",
    value: function convertMetrics(res) {
      return _lodash2.default.map(res.data.streams, function (d, i) {
        return {
          text: d.name,
          value: i
        };
      });
    }
  }, {
    key: "transformToTable",
    value: function transformToTable(data, limit, options, target) {
      if (!data) {
        console.error('Could not convert data to Tableformat, data is not valid.');
        return [];
      }

      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.log('Could not convert data to Tableformat, data is empty.');
          return [];
        }
      }

      if (limit == 0) {
        limit = data.length;
      }
      limit = Math.min(limit, data.length);

      var table = {
        columnMap: {},
        columns: [],
        meta: {},
        refId: target.refId,
        rows: [],
        type: "table"
      };

      if (options.hasOwnProperty("columns")) {
        for (var i = 0; i < options.columns.length; i++) {
          table.columns.push(options.columns[i]);
        }
      }

      if (options.hasOwnProperty("values")) {
        for (var _i = 0; _i < limit; _i++) {
          var row = [];
          for (var j = 0; j < options.values.length; j++) {
            row.push(options.values[j](data[_i]));
          }
          table.rows.push(row);
        }
      }
      return table;
    }
  }]);

  return GenericDatasource;
}();
//# sourceMappingURL=datasource.js.map
