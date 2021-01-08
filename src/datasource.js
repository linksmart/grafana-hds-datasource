import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.apiEndpoint = "data/";
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {'Content-Type': 'application/json'};
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
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
  async query(options) {
    options.targets = _.filter(options.targets, target => target.hide !== true);
    let allTargetResults = { data: [] };

    let testPromises = options.targets.map(async target => {
      if(!('metric' in target) || target.metric == 'select datastream') {
        return {'target': '', 'datapoints' : []};
      }
      return await this.recursiveRequest("", target, options, []);
    });
    return Promise.all(testPromises).then(function (values) {
      allTargetResults.data = values;
      return allTargetResults;
    });
  }

  //recursively fetch the data
  async recursiveRequest(reqUrl, target, options, data) {
    if (reqUrl == ""){
      reqUrl = this.url + "/" + this.apiEndpoint + target.metric +
      '?from=' + options.range.from.toISOString() + '&to=' + options.range.to.toISOString()
    } else {
      reqUrl = this.url + reqUrl
    }

    let response = await this.doRequest({
      url: reqUrl,
      method: 'GET'
    });

    var nextlink = response.data.nextLink; 
    var datapoints = this.convertData(response.data);
    data.push(...datapoints);

    if (typeof nextlink != 'undefined' && nextlink != "") {
      // query the next page
      return recursiveReq(nextlink, target, options, data);
    } else {
      return this.transformToTable(
        data,
        0,
        {
          columns: [
            {text: "time", type: "time"},
            {text: target.metric}
          ],
          values: [
            function(v) { return v[1]; }, 
            function(v) { return v[0]; }, 
          ] 
        },
        target
      );
          
    }
  }

  // make an request to the server
  async doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;
    return this.backendSrv.datasourceRequest(options);
  }

  // Convert historical SenML data from Data/Aggr API to Grafana datapoints
  convertData(data) {
    
    var datapoints = _.map(data.data, entry => {
      switch(true){
        case entry.hasOwnProperty("v"):
          return [entry["v"], entry["t"] * 1000]; 
        case entry.hasOwnProperty("vs"):
          return [entry["vs"], entry["t"] * 1000]; 
        case entry.hasOwnProperty("vb"):
          return [(entry["vb"]==true ? 1:0), entry["t"] * 1000]; 
      }
      throw "No value in senml record!"
    });
    return datapoints;
  }

  // Remove targets that have unselected metric or source
  filterPlaceholders(options) {
    options.targets = _.filter(options.targets, target => {
      return target.metric !== 'select datastream';
    });

    return options;
  }

  // Query list of metrics from Registry API
  // Required for templating
  queryMetrics(options) {
    var metrics = []
    var parent = this;
    function recursiveMetricReq(page) {
      return parent.backendSrv.datasourceRequest({
        //url: this.url + '/search',
        url: parent.url + '/registry?page='+page,
        method: 'GET',
        //headers: { 'Content-Type': 'application/json' }
      }).then(function (res) {
        var total = res.data.total; // total from data api
        metrics.push(...parent.convertMetrics(res));
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
  convertMetrics(res) {
    return _.map(res.data.streams, (d, i) => {
      return {
        text: d.name,
        value: i
      };
    });
  }

  transformToTable(data, limit, options, target) {
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

    if(limit == 0) {
      limit = data.length;
    }
    limit = Math.min(limit, data.length);

    let table = {
      columnMap: {},
      columns: [],
      meta: {},
      refId: target.refId,
      rows: [],
      type: "table"
    };

    if(options.hasOwnProperty("columns")) {
      for(let i = 0; i < options.columns.length; i++) {
        table.columns.push(options.columns[i]);
      }
    }
    
    if(options.hasOwnProperty("values")) {
      for(let i = 0; i < limit; i++) {
        let row = [];
        for(let j = 0; j < options.values.length; j++) {
          row.push(options.values[j](data[i]));
        }
        table.rows.push(row);
      }
    }
    return table;
  }


}
