// Copyright 2016 Fraunhofer Institute for Applied Information Technology FIT

import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector, uiSegmentSrv) {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;
    this.target.metric = this.target.metric || 'select metric';
    this.target.Types = this.target.Types || {};
  }

  getOptions() {
    var that = this;
    return this.datasource.queryMetrics(this.target)
      .then(function (metrics) {
        metrics.forEach(function (m) {
          that.target.Types[m.text] = m.type;
        });
        return metrics;
      })
      .then(this.uiSegmentSrv.transformToSegments(false));
    // Options have to be transformed by uiSegmentSrv to be usable by metric-segment-model directive
  }



  metricChanged() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }


}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

