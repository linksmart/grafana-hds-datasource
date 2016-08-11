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
    this.target.sourceIDs = this.target.sourceIDs || {}; // aggregation ids
  }

  getOptions() {
    return this.datasource.queryMetrics(this.target)
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

  onChangeInternal() {
    //console.log("onChangeInternal:", this.target.source);
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

