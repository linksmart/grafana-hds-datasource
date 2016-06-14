'use strict';

System.register(['lodash'], function (_export, _context) {
		"use strict";

		var _, _createClass, GenericDatasource;

		function _classCallCheck(instance, Constructor) {
				if (!(instance instanceof Constructor)) {
						throw new TypeError("Cannot call a class as a function");
				}
		}

		return {
				setters: [function (_lodash) {
						_ = _lodash.default;
				}],
				execute: function () {
						_createClass = function () {
								function defineProperties(target, props) {
										for (var i = 0; i < props.length; i++) {
												var descriptor = props[i];
												descriptor.enumerable = descriptor.enumerable || false;
												descriptor.configurable = true;
												if ("value" in descriptor) descriptor.writable = true;
												Object.defineProperty(target, descriptor.key, descriptor);
										}
								}

								return function (Constructor, protoProps, staticProps) {
										if (protoProps) defineProperties(Constructor.prototype, protoProps);
										if (staticProps) defineProperties(Constructor, staticProps);
										return Constructor;
								};
						}();

						_export('GenericDatasource', GenericDatasource = function () {
								function GenericDatasource(instanceSettings, $q, backendSrv) {
										_classCallCheck(this, GenericDatasource);

										this.type = instanceSettings.type;
										this.url = instanceSettings.url;
										this.name = instanceSettings.name;
										this.q = $q;
										this.backendSrv = backendSrv;
								}

								// Called once per panel (graph)


								_createClass(GenericDatasource, [{
										key: 'query',
										value: function query(options) {
												var query = this.buildQueryParameters(options);

												if (query.targets.length <= 0) {
														return this.q.when([]);
												}

												// No metric selected
												if (!('target' in query.targets[0])) {
														return { data: [] };
												}
												//console.log("Query:", query);

												// Constructs the url to query from Data API
												function url(id, start, end, page) {
														return parent.url + '/data/' + id + '?start=' + start + '&end=' + end + '&page=' + page;
												}

												var entries = Array.apply(null, Array(query.targets.length)).map(function () {
														return { target: '', datapoints: [] };
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

																if (total > entries[idi].datapoints.length) {
																		// query the next page
																		page++;
																		return recursiveReq();
																} else if (idi < query.targets.length - 1) {
																		// one target done, query the next target
																		idi++;
																		page = 1;
																		return recursiveReq();
																} else {
																		// all done
																		d.data = entries;
																		return d;
																}
														});
												} // end func

												return recursiveReq();
										}
								}, {
										key: 'testDatasource',
										value: function testDatasource() {
												return this.backendSrv.datasourceRequest({
														url: this.url + '/',
														method: 'GET'
												}).then(function (response) {
														if (response.status === 200) {
																return { status: "success", message: "Data source is working", title: "Success" };
														}
												});
										}
								}, {
										key: 'metricFindQuery',
										value: function metricFindQuery(options) {
												return this.backendSrv.datasourceRequest({
														//url: this.url + '/search',
														url: this.url + '/registry',
														data: options,
														method: 'GET'
												}). //headers: { 'Content-Type': 'application/json' }
												then(this.convertRegistry);
										}
								}, {
										key: 'convertRegistry',
										value: function convertRegistry(res) {
												return _.map(res.data.entries, function (d, i) {
														return { text: d.id + ': ' + d.resource, value: i };
												});
										}
								}, {
										key: 'convertData',
										value: function convertData(data) {
												var datapoints = Array(data.data.e.length);
												for (var i = 0; i < data.data.e.length; i++) {
														datapoints[i] = [data.data.e[i].v, data.data.e[i].t * 1000];
												}

												return datapoints;
										}
								}, {
										key: 'buildQueryParameters',
										value: function buildQueryParameters(options) {
												//remove placeholder targets
												options.targets = _.filter(options.targets, function (target) {
														return target.target !== 'select metric';
												});

												return options;
										}
								}]);

								return GenericDatasource;
						}());

						_export('GenericDatasource', GenericDatasource);
				}
		};
});
//# sourceMappingURL=datasource.js.map
