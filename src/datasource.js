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
      url: this.url + '/health',
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

    const apiEndpoint = "data/";
    const senmlValues = {float: "v", string: "sv", bool: "bv"}
    // Recursively query all pages of every target
    function recursiveReq(idi,url) {

      var target = query.targets[idi];
      var senmlValue = senmlValues[target.Types[target.metric]];
      var senmlFields = {value: senmlValue, time: "t"};

      if (url == ""){
        url = parent.url + "/" + apiEndpoint + target.metric +
        '?from=' + query.range.from.toISOString() + '&to=' + query.range.to.toISOString()
      }else{
        url = parent.url + url
      }
      return parent.backendSrv.datasourceRequest({
        url: url ,
        data: query,
        method: 'GET'
      }).then(function (d) {
        var nextlink = d.data.nextLink; 
        var datapoints = parent.convertData(d.data, senmlFields);
        // append aggregate name to metric title
        entries[idi].target = target.metric 
        entries[idi].datapoints.push(...datapoints);

        if (nextlink != "") {
          // query the next page
          return recursiveReq( idi,nextlink);
        } else if (idi < query.targets.length - 1) {
          // one target done, query the next target
          return recursiveReq(++idi,"");
        } else {
          // all done
          d.data = entries;
          return d;
        }

      });
    } // end func
   
    return recursiveReq(0,"");
  }

  // Convert historical SenML data from Data/Aggr API to Grafana datapoints
  convertData(data, senmlFields) {
    /*var datapoints = Array(data.data.length);
    for (var i = 0; i < data.data.length; i++) {
      datapoints[i] = [data.data[i][senmlFields.value], data.data[i][senmlFields.time] * 1000];
    }*/
    var datapoints = _.map(data.data, entry => {
      return [entry[senmlFields.value], entry[senmlFields.time] * 1000];
    });
    return datapoints;
  }

  // Remove targets that have unselected metric or source
  filterPlaceholders(options) {
    options.targets = _.filter(options.targets, target => {
      return target.metric !== 'select metric';
    });

    return options;
  }

  // Query list of metrics from Registry API
  // Required for templating
  queryMetrics(options) {
    var metrics = []
    var parent = this;
    function recursiveMetricReq(page) {
      console.log( page);
      return parent.backendSrv.datasourceRequest({
        //url: this.url + '/search',
        url: parent.url + '/registry?page='+page,
        data: options,
        method: 'GET',
        //headers: { 'Content-Type': 'application/json' }
      }).then(function (res) {
        var total = res.data.total; // total from data api
        metrics.push(...parent.convertMetrics(res));
        if (total > metrics.length) {
          // query the next page
          return recursiveMetricReq(++page);
        } else {
          console.log( total);
          console.log( metrics.length);
          //metrics.forEach(function(entry) {
          //  console.log(entry.text);
          //});
          return metrics;
        }

      });
    }
    return recursiveMetricReq(1);
  }

  // Convert registration from Registry API to the format required by Grafana + some meta information
  convertMetrics(res) {
    return _.map(res.data.streams, (d, i) => {
      return {
        type: d.dataType,
        text: d.name,
        value: i
      };
    });
  }
 
}
