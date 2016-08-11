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

  // Query data from Data API
  // Called once per panel (graph)
  query(options) {
    var query = this.buildQueryParameters(options);
    //console.log("query QUERY:", JSON.stringify(query));


    if (query.targets.length <= 0) {
      return this.q.when([]);
    }

    // No metric selected
    if (!('metric' in query.targets[0])) {
      return {data: []};
    }
    //console.log("Query:", query);

    // Constructs the url to query from Data API
    function url(apiEndpoint, id, start, end, page) {
      return parent.url + "/" + apiEndpoint + id +
        '?start=' + start + '&end=' + end +
        '&page=' + page;
    }

    var entries = Array.apply(null, Array(query.targets.length)).map(function () {
      return {target: '', datapoints: []};
    });
    var parent = this;
    var page = 1;
    var idi = 0; // id index

    // Recursively query all pages of every target
    function recursiveReq() {
      var source = query.targets[idi].source;
      console.log("source:", source);
      var apiEndpoint = "data/";
      var senmlFields = {value: "v", time: "t"};
      // Query for aggregation data
      if (!source.startsWith("value")) {
        console.log("Aggr id:", query.targets[idi].sourceIDs[source]);
        var aggrID = query.targets[idi].sourceIDs[source]
        // retrieve the selected aggregate and interval
        var re = /^([a-z]*), every ([0-9]*[s|m|h|w]).*$/g;
        var m = re.exec(source);
        var aggregate = m[1];
        var interval = m[2];

        apiEndpoint = "aggr/" + aggrID + "/";
        senmlFields.value = aggregate;
        senmlFields.time = "ts";
      }

      var id = query.targets[idi].metric.split(':')[0];
      return parent.backendSrv.datasourceRequest({
        url: url(apiEndpoint, id, query.range.from.toISOString(), query.range.to.toISOString(), page),
        data: query,
        method: 'GET'
      }).then(function (d) {
        var total = d.data.total; // total from data api
        var datapoints = parent.convertData(d.data, senmlFields);
        // append aggregate name to metric title
        var aggregate = senmlFields.value == 'v' ? '' : '.' + senmlFields.value;
        entries[idi].target = query.targets[idi].metric + aggregate;
        entries[idi].datapoints = entries[idi].datapoints.concat(datapoints);

        if (total > entries[idi].datapoints.length) { // query the next page
          page++;
          return recursiveReq();
        } else if (idi < query.targets.length - 1) { // one target done, query the next target
          idi++;
          page = 1;
          return recursiveReq();
        } else { // all done
          d.data = entries;
          return d;
        }

      });
    } // end func

    return recursiveReq();
  }

  // Required
  // Used for testing datasource in datasource configuration pange
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

  // Query list of metrics from Registry API
  // Optional
  // Required for templating
  metricFindQuery(options) {
    return this.backendSrv.datasourceRequest({
      //url: this.url + '/search',
      url: this.url + '/registry',
      data: options,
      method: 'GET',
      //headers: { 'Content-Type': 'application/json' }
    }).then(this.convertRegistry);
  }

  // Convert registration from Registry API to the format required by Grafana
  convertRegistry(res) {
    return _.map(res.data.entries, (d, i) => {
      return {text: d.id + ': ' + d.resource, value: i};
    });
  }

  // Convert historical SenML data from Data/Aggr API to Grafana datapoints
  convertData(data, senmlFields) {
    var datapoints = Array(data.data.e.length);
    for (var i = 0; i < data.data.e.length; i++) {
      datapoints[i] = [data.data.e[i][senmlFields.value], data.data.e[i][senmlFields.time] * 1000];
    }

    return datapoints;
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.metric !== 'select metric';
    });

    return options;
  }

  // Query list of sources of data (value and aggregations) from Registry API
  sourceFindQuery(options) {
    console.log("sourceFindQuery metric:", options.metric);
    var id = options.metric.split(':')[0];
    return this.backendSrv.datasourceRequest({
      url: this.url + '/registry/' + id,
      method: 'GET',
      //headers: { 'Content-Type': 'application/json' }
    }).then(this.convertSources);
  }

  // Convert meta data about aggregates from Registry API to the format required by Grafana
  convertSources(res) {
    function formatRetention(retention) {
      if (retention == "") {
        return ", no retention"; // ∞
      }
      return ', retention ' + retention;
    }

    var index = 0;
    var value = {id: 'value', text: 'value' + formatRetention(res.data.retention), value: index++}; // raw un-aggregated data
    var m = _.reduce(res.data.aggregation, (vectorized, a) => {

      var r = _.reduce(a.aggregates, (merged, aggregate) => {
        merged.push({
          id: a.id,
          text: aggregate + ', every ' + a.interval + formatRetention(a.retention),
          value: index++
        });
        return merged;
      }, []);

      return vectorized.concat(r);

    }, [value]);

    // sort aggregates
    m = [m[0]].concat(_.sortBy(m.slice(1, m.length), 'text'));
    return m;

  }
}
