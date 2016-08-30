// Copyright 2016 Fraunhofer Institute for Applied Information Technology FIT

import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
  }

  // Required
  // Used for testing datasource in datasource configuration page
  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/',
      method: 'GET'
    }).then(response => {
      if (response.status === 200) {
        return {status: "success", message: "Data source is working", title: "Success"};
      }
    });
  }

  // Query data from Data API
  // Called once per panel (graph)
  query(options) {
    var query = this.filterPlaceholders(options);
    //console.log("query QUERY:", JSON.stringify(query));

    // Filter targets that are set to hidden
    query.targets = _.filter(query.targets, target => {
      return target.hide != true;
    });

    // All targets filtered OR no metric selected
    if (query.targets.length == 0 || !('metric' in query.targets[0])) {
      return {data: []}; // return this.q.when([]);
    }

    // Make a new array with zero-valued object fields
    var entries = Array.apply(null, Array(query.targets.length)).map(function () {
      return {target: '', datapoints: []};
    });

    var parent = this;
    // Recursively query all pages of every target
    function recursiveReq(page, idi) {
      var target = query.targets[idi];
      var source = target.source;
      //console.log("source:", source, ":", query.targets[idi].Aggrs[source]);
      var apiEndpoint = "data/";
      var senmlFields = {value: "v", time: "t"};
      // Query for aggregation data
      if (!source.startsWith("value")) {
        apiEndpoint = "aggr/" + target.Aggrs[source].id + "/";
        senmlFields.value = target.Aggrs[source].aggregate;
        senmlFields.time = "ts";
      }

      var shortID = target.metric.substring(0, target.metric.indexOf(' : '));
      var uuid = target.UUIDs[shortID];
      return parent.backendSrv.datasourceRequest({
        url: parent.url + "/" + apiEndpoint + uuid +
        '?start=' + query.range.from.toISOString() + '&end=' + query.range.to.toISOString() + '&page=' + page,
        data: query,
        method: 'GET'
      }).then(function (d) {
        var total = d.data.total; // total from data api
        var datapoints = parent.convertData(d.data, senmlFields);
        // append aggregate name to metric title
        var aggregate = senmlFields.value == 'v' ? '' : '.' + senmlFields.value;
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

  // Convert historical SenML data from Data/Aggr API to Grafana datapoints
  convertData(data, senmlFields) {
    var datapoints = Array(data.data.e.length);
    for (var i = 0; i < data.data.e.length; i++) {
      datapoints[i] = [data.data.e[i][senmlFields.value], data.data.e[i][senmlFields.time] * 1000];
    }

    return datapoints;
  }

  // Remove targets that have unselected metric or source
  filterPlaceholders(options) {
    options.targets = _.filter(options.targets, target => {
      return target.metric !== 'select metric' && target.source !== 'select source';
    });

    return options;
  }

  // Query list of metrics from Registry API
  // Required for templating
  queryMetrics(options) {
    return this.backendSrv.datasourceRequest({
      //url: this.url + '/search',
      url: this.url + '/registry',
      data: options,
      method: 'GET',
      //headers: { 'Content-Type': 'application/json' }
    }).then(this.convertMetrics);
  }

  // Convert registration from Registry API to the format required by Grafana
  convertMetrics(res) {
    return _.map(res.data.entries, (d, i) => {
      return {uuid: d.id, text: d.id + ' : ' + d.resource, value: i};
    });
  }

  // Query list of sources of data (value and aggregations) from Registry API
  // Required for templating
  querySources(options) {
    // Metric is not selected
    if (options.metric == 'select metric') {
      return new Promise((resolve, reject) => {
        reject("metric not selected");
      });
    }

    var shortID = options.metric.substring(0, options.metric.indexOf(' : '));
    var uuid = options.UUIDs[shortID];
    return this.backendSrv.datasourceRequest({
      url: this.url + '/registry/' + uuid,
      method: 'GET',
      //headers: { 'Content-Type': 'application/json' }
    }).then(this.convertSources);
  }

  // Convert meta data about aggregates from Registry API to the format required by Grafana
  convertSources(res) {
    function formatRetention(retention) {
      if (retention == "") {
        return ", retention ∞"; // infinite retention
      }
      return ', retention ' + retention;
    }

    var index = 0;
    // raw un-aggregated data
    var value = {id: 'value', text: 'value' + formatRetention(res.data.retention), value: index++};
    // Flatten aggregations of a target (datasource)
    // start with 'value' as input and concatenate flattened aggregates
    var r = _.reduce(res.data.aggregation, (input, a) => {
      // Flatten and format aggregates
      var r2 = _.reduce(a.aggregates, (array, aggregate) => {
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
}
