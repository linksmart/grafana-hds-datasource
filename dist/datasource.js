'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDatasource = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GenericDatasource = exports.GenericDatasource = function () {
  function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    _classCallCheck(this, GenericDatasource);

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

    // Query data from Data API
    // Called once per panel (graph)

  }, {
    key: 'query',
    value: function query(options) {
      var query = this.filterPlaceholders(options);
      //console.log("query QUERY:", JSON.stringify(query));

      // Filter targets that are set to hidden
      query.targets = _lodash2.default.filter(query.targets, function (target) {
        return target.hide != true;
      });

      // All targets filtered OR no metric selected
      if (query.targets.length <= 0 || !('metric' in query.targets[0])) {
        return this.q.when([]);
      }

      // Make a new array with zero-valued object fields
      var entries = Array.apply(null, Array(query.targets.length)).map(function () {
        return { target: '', datapoints: [] };
      });

      var parent = this;

      var apiEndpoint = "data/";

      function recursiveReq(idi, url) {

        var target = query.targets[idi];

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
          var datapoints = parent.convertData(d.data);

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

    // Convert historical SenML data from Data/Aggr API to Grafana datapoints

  }, {
    key: 'convertData',
    value: function convertData(data) {

      var datapoints = _lodash2.default.map(data.data, function (entry) {
        var value = entry["v"] || entry["vs"] || entry["vb"]; //take float or string or bool
        if (typeof value === "boolean") {
          value = value == true ? 1 : 0;
        }
        return [value, entry["t"] * 1000];
      });
      return datapoints;
    }

    // Remove targets that have unselected metric or source

  }, {
    key: 'filterPlaceholders',
    value: function filterPlaceholders(options) {
      options.targets = _lodash2.default.filter(options.targets, function (target) {
        return target.metric !== 'select datastream';
      });

      return options;
    }

    // Query list of metrics from Registry API
    // Required for templating

  }, {
    key: 'queryMetrics',
    value: function queryMetrics(options) {
      var metrics = [];
      var parent = this;
      function recursiveMetricReq(page) {
        return parent.backendSrv.datasourceRequest({
          //url: this.url + '/search',
          url: parent.url + '/registry?page=' + page,
          data: options,
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
    key: 'convertMetrics',
    value: function convertMetrics(res) {
      return _lodash2.default.map(res.data.streams, function (d, i) {
        return {
          text: d.name,
          value: i
        };
      });
    }
  }]);

  return GenericDatasource;
}();
//# sourceMappingURL=datasource.js.map
