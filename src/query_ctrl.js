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
    this.target.UUIDs = this.target.UUIDs || {};
    this.target.sourceIDs = this.target.sourceIDs || {}; // aggregation ids
  }

  getOptions() {
    var that = this;
    return this.datasource.queryMetrics(this.target)
      .then(function (metrics) {
        // save a map of shortID->uuid
        // shortID is the first 4 bytes of the UUID
        metrics.forEach(function (m) {
          var uuidSplit = m.uuid.split('-');
          if (uuidSplit.length == 5) {
            that.target.UUIDs[uuidSplit[0]] = m.uuid;
          }
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
          that.target.sourceIDs[s.text] = s.id;
        });
        return sources;
      }, function (rejected) {
        return [];
      })
      .then(this.uiSegmentSrv.transformToSegments(false));
    // Options have to be transformed by uiSegmentSrv to be usable by metric-segment-model directive
  }

  onChangeMetric() {
    console.log("onChangeInternal:", this.target.metric);
    var uuid = this.target.metric.substring(0, this.target.metric.indexOf(':') + 1);
    var name = this.target.metric.substring(this.target.metric.indexOf(':') + 1, this.target.metric.length);
    console.log("onChangeInternal", uuid, name);

    // Change uuid to shortID i.e. the first 4 bytes of the uuid
    this.target.metric = uuid.split('-')[0] + ':' + name;
    console.log("onChangeInternal:", this.target.metric);

    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  onChangeSource() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

