# LinkSmart HDS - Grafana Datasource Plugin
[Grafana](http://grafana.org/) datasource plugin for [LinkSmart® Historical Datastore (HDS)](https://docs.linksmart.eu/display/HDS).

## Deployment

### Install via grafana-cli
```
sudo grafana-cli plugins install linksmart-hds-datasource
```

### Install from source 

* Clone the repository into Grafana's [plugin directory](http://docs.grafana.org/plugins/installation/#grafana-plugin-directory):
```
git clone https://code.linksmart.eu/scm/hds/grafana-hds-datasource.git linksmart-hds
```
* Restart Grafana.

## Configuration

### Plugin Configuration
![](https://code.linksmart.eu/projects/HDS/repos/grafana-hds-datasource/raw/docs/datasource_config.png)


Name | Description
------------ | -------------
Name | The data source name.
Default | Set this as the default plugin for new panels.
Type | Choose LinkSmart HDS.
Url | The URL of the HDS instance. (Default port is 8085)
Access | Proxy: Let Grafana server proxy the requests to HDS. / Direct: Send requests directly from client browser.
Basic Auth | Authenticate to HDS (if required, provide User and Password)

### Query Configuration
![](https://code.linksmart.eu/projects/HDS/repos/grafana-hds-datasource/raw/docs/query_metrics.png)


Name | Description
------------ | -------------
Metric | The ID and name of the metric (HDS Datasource)
Source | The measurement, aggregates, and retention policy (Preconfigured at HDS)

## Development

### Build the source
```
npm install -g yarn
yarn install
npm run build
```
