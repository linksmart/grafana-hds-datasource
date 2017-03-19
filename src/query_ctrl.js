// Copyright 2016 Fraunhofer Institute for Applied Information Technology FIT

import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector, uiSegmentSrv) {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;
    this.target.metric = this.target.metric || 'select metric';
    this.target.source = this.target.source || 'select source';
    // Stored for mapping
    this.target.UUIDs = this.target.UUIDs || {};
    this.target.Legends = this.target.Legends || {};
    this.target.Types = this.target.Types || {};
    this.target.Aggrs = this.target.Aggrs || {}; // Aggregations
  }

  getOptions() {
    var that = this;
    return this.datasource.queryMetrics(this.target)
      .then(function (metrics) {
        metrics.forEach(function (m) {
          // Save mappings of uuid, text, legend, and type
          that.target.UUIDs[m.legend] = m.uuid;
          that.target.Legends[m.text] = m.legend;
          that.target.Types[m.legend] = m.type;
        });
        return metrics;
      })
      .then(this.uiSegmentSrv.transformToSegments(false));
    // Options have to be transformed by uiSegmentSrv to be usable by metric-segment-model directive
  }

  getSources() {
    var that = this;
    return this.datasource.querySources(this.target)
      .then(function (sources) {
        // save a map of source->aggregation ids
        sources.forEach(function (s) {
          that.target.Aggrs[s.text] = {
            id: s.id,
            aggregate: s.aggregate
          };
        });
        return sources;
      }, function (rejected) {
        return [];
      })
      .then(this.uiSegmentSrv.transformToSegments(false));
    // Options have to be transformed by uiSegmentSrv to be usable by metric-segment-model directive
  }

  metricChanged() {
    // Change the metric name to legend text: '(shortID) resourceName'
    //  where shortID is the first 4 bytes of the uuid
    // This will be used as DOM's property and graph's legend
    this.target.metric = this.target.Legends[this.target.metric];

    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  sourceChanged() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

