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
		console.log("Query", query);

	  var IDs = [];
	  for(var i=0; i<query.targets.length; i++){
		  IDs.push(query.targets[i].target.split(':')[0])
	  }
	  console.log(IDs);

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

	  function recursiveReq() {
		  console.log(idi, page);
		  return parent.backendSrv.datasourceRequest({
			  url: url(IDs[idi], query.range.from.toISOString(), query.range.to.toISOString(), page),
			  data: query,
			  method: 'GET'
		  }).then(function (d) {
			  var total = d.data.total; // total from data api
			  var entry = parent.convertData(d.data);
			  entries[idi].target = entry.target;
			  entries[idi].datapoints = entries[idi].datapoints.concat(entry.datapoints);

			  console.log(d, entries);
			  console.log(total, entries[idi].datapoints.length);
			  if(total > entries[idi].datapoints.length) { // query the next page
				  page++;
				  return recursiveReq();
			  } else if (idi < IDs.length-1){ // one target done, query the next target
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
  convertRegistry(result) {
		//console.log(JSON.stringify(result));
		
		return _.map(result.data.entries, (d, i) => {
			//console.log(d,i);
      return { text: d.id + ': ' + d.resource, value: i};
    }); 
  }

	// Convert historical SenML data from Data API to the format required by Grafana
	convertData(data) {
		console.log("convert", data);

		if(data.data.e.length == 0){
			return data;
		}
		
		var id = data.url.replace(/^\/data\//, '');
		id = id.split('?')[0];
		
		var entry = { 
			target: id + ': ' + data.data.e[0].n,
			datapoints: []
		};
		
		for(var i=0; i<data.data.e.length; i++){
			entry.datapoints.push([data.data.e[i].v, data.data.e[i].t*1000]);
		}

		console.log("converted", entry);
		return entry;
	}

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    return options;
  }
}
