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


  // Called once per panel (graph)
  query(options) {
    var query = this.buildQueryParameters(options);

    if (query.targets.length <= 0) {
      return this.q.when([]);
    }

	  // No metric selected
	  if (!('target' in query.targets[0])) {
		  return { data:[] };
	  }
		//console.log("Query:", query);

		// Constructs the url to query from Data API
	  function url(id, start, end, page){
		  return parent.url + '/data/' + id +
			  '?start=' + start + '&end=' + end +
			  '&page=' + page;
	  }

	  var entries = Array.apply(null, Array(query.targets.length)).map(function () {
		  return { target: '',	datapoints: [] };
	  });
	  var parent = this;
	  var page = 1;
	  var idi = 0; // id index

	  // Recursively query all pages of every target
	  function recursiveReq() {
		  var id = query.targets[idi].target.split(':')[0];
		  return parent.backendSrv.datasourceRequest({
			  url: url(id, query.range.from.toISOString(), query.range.to.toISOString(), page),
			  data: query,
			  method: 'GET'
		  }).then(function (d) {
			  var total = d.data.total; // total from data api
			  var datapoints = parent.convertData(d.data);
			  entries[idi].target = query.targets[idi].target;
			  entries[idi].datapoints = entries[idi].datapoints.concat(datapoints);

			  if(total > entries[idi].datapoints.length) { // query the next page
				  page++;
				  return recursiveReq();
			  } else if (idi < query.targets.length-1){ // one target done, query the next target
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
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

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
      return { text: d.id + ': ' + d.resource, value: i};
    });
  }

	// Convert historical SenML data from Data API to Grafana datapoints
	convertData(data) {
		var datapoints = Array(data.data.e.length);
		for(var i=0; i<data.data.e.length; i++){
			datapoints[i] = [data.data.e[i].v, data.data.e[i].t*1000];
		}

		return datapoints;
	}

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    return options;
  }

	metricFindSources(options) {
		console.log("TARGET:",options.target);
		var id = options.target.split(':')[0];
		return this.backendSrv.datasourceRequest({
			//url: this.url + '/search',
			url: this.url + '/registry/'+id,
			//data: options,
			method: 'GET',
			//headers: { 'Content-Type': 'application/json' }
		}).then(this.convertSources);
	}

	convertSources(res) {
		console.log(res.data);

		function formatRetention(retention){
			if(retention==""){
				return ", no retention"; // ∞
			}
			return ', retention '+retention;
		}

		var index = 0;
		var value = {text: 'value'+formatRetention(res.data.retention), value: index++}; // raw un-aggregated data
		var m = _.reduce(res.data.aggregation, (vectorized, a) => {

			var r = _.reduce(a.aggregates, (merged, aggregate) => {
				merged.push({text: aggregate+', every '+a.interval+ formatRetention(a.retention), value: index++})
				return merged;
			}, []);

			return vectorized.concat(r);

	}, [value]);

	m = [m[0]].concat(_.sortBy(m.slice(1,m.length), 'text')); // sort aggregates
	return m;

	}
}
