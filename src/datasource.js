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
		
		console.log(JSON.stringify(query));
		
		
		var all = {};
		var parent = this;
		_.each(query.targets, function(e) {
			var id = e.target.split(':')[0];
			console.log(id);
			if(_.isEmpty(all)){
				return parent.backendSrv.datasourceRequest({
					//url: this.url + '/query',
					url: 'http://farshidpi.duckdns.org:8090/data/' + id + '?start=' + query.range.from.toISOString() + '&end=' + query.range.to.toISOString(),
					data: query,
					method: 'GET',
					//headers: { 'Content-Type': 'application/json' }
				}).then(parent.convert);
		
			} else {
				var x = parent.backendSrv.datasourceRequest({
					//url: this.url + '/query',
					url: 'http://farshidpi.duckdns.org:8090/data/' + id + '?start=' + query.range.from.toISOString() + '&end=' + query.range.to.toISOString(),
					data: query,
					method: 'GET',
					//headers: { 'Content-Type': 'application/json' }
				}).then(parent.convert);
				console.log("after first");
				all.$$state.value.concat(x.$$state.value);
			}
		});

		console.log(Date.now(), "All:", JSON.stringify(all));
		return all;
		
		
		//console.log('http://farshidpi.duckdns.org:8090/data/' + IDs.join(',') + '?start=' + query.range.from.toISOString() + '&end=' + query.range.to.toISOString());
				/*
    var x = this.backendSrv.datasourceRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(d){console.log("Returning", JSON.stringify(d)); return d;});
		return x;*/
	
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

  annotationQuery(options) {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: options
    }).then(result => {
      return result.data;
    });
  }

  // Optional
  // Required for templating
  metricFindQuery(options) {
		 
		
     return this.backendSrv.datasourceRequest({
      //url: this.url + '/search',
			url: 'http://farshidpi.duckdns.org:8090/registry',
      data: options,
      method: 'GET',
      //headers: { 'Content-Type': 'application/json' }
    }).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
		//console.log(JSON.stringify(result));
		
		return _.map(result.data.entries, (d, i) => {
			//console.log(d,i);
      return { text: d.id + ': ' + d.resource, value: i};
    }); 
  }
	
	convert(result) {
		/*
		Expected format:
		[
			{
				"target":"upper_75",
				"datapoints":[
					[622,1450754160000],
					[365,1450754220000]
				]
			}
		]
		*/
		
		console.log(Date.now(), "convert", JSON.stringify(result));

		if(result.data.data.e.length == 0){
			return [];
		}
		
		var id = result.data.url.replace(/^\/data\//, '');
		id = id.split('?')[0];
		
		var entry = { 
			target: id + ': ' + result.data.data.e[0].n, 
			datapoints: []
		};
		
		for(var i=0; i<result.data.data.e.length; i++){
			entry.datapoints.push([result.data.data.e[i].v]);
		}
		
		console.log(Date.now(), "converted", JSON.stringify([entry]));
		
		return [entry];
	}

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    return options;
  }
}
