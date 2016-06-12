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

		console.log(JSON.stringify(query));

		if(query.targets.length>1){
			console.error("NOT IMPLEMENTED: Number of targets more than 1:". query.targets.length);
		}

	  var id = query.targets[0].target.split(':')[0];
		console.log(id);

	  function url(id, start, end, page){
		  return parent.url + '/data/' + id +
			  '?start=' + start + '&end=' + end +
			  '&page=' + page;
	  }

	  var all = {};
	  var parent = this;
	  var page = 1;
	  var total;

	  function recursiveReq() {
		  console.log(page);
		  return parent.backendSrv.datasourceRequest({
			  url: url(id, query.range.from.toISOString(), query.range.to.toISOString(), page),
			  data: query,
			  method: 'GET'
		  }).then(function (d) {
			  total = d.data.total; // total from data api
			  d = parent.convertData(d);
			  var head = all;
			  all = d;
			  if(!_.isEmpty(head)) {
				  all.data[0].datapoints = head.data[0].datapoints.concat(all.data[0].datapoints); // push head array to front
			  }

			  console.log(d);
			  console.log(total, all.data[0].datapoints.length);
			  if(total > all.data[0].datapoints.length) {
				  page++;
				  return recursiveReq();
			  } else {
				  return all;
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
	convertData(result) {
		console.log(Date.now(), "convert", JSON.stringify(result));

		if(result.data.data.e.length == 0){
			return result;
		}
		
		var id = result.data.url.replace(/^\/data\//, '');
		id = id.split('?')[0];
		
		var entry = { 
			target: id + ': ' + result.data.data.e[0].n, 
			datapoints: []
		};
		
		for(var i=0; i<result.data.data.e.length; i++){
			entry.datapoints.push([result.data.data.e[i].v, result.data.data.e[i].t*1000]);
		}

		result.data = [entry];
		console.log(Date.now(), "converted", JSON.stringify(result));
		
		return result;
	}

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    return options;
  }
}
