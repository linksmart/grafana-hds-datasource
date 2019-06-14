import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector,uiSegmentSrv)  {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;
    this.target.metric = this.target.metric || 'select metric';
    this.target.datatypes = this.target.datatype || {};
  }

  getOptions(query) {
     var that = this;
    return this.datasource.queryMetrics(this.target)
      .then(function (metrics) {
        metrics.forEach(function (m) {
          that.target.datatypes[m.text] = m.datatype;
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

