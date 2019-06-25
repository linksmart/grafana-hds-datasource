# LinkSmart HDS - Grafana Datasource Plugin
[Grafana](http://grafana.org/) datasource plugin for [LinkSmart Historical Datastore (HDS)](https://docs.linksmart.eu/display/HDS).

## Sample Dashboard
![](https://raw.githubusercontent.com/linksmart/grafana-hds-datasource/master/docs/dashboard.png)
## Installation

### Install via grafana-cli
```
sudo grafana-cli plugins install linksmart-hds-datasource
```

### Install from source 

* Clone the repository into Grafana's [plugin directory](http://docs.grafana.org/plugins/installation/#grafana-plugin-directory):
```
git clone https://github.com/linksmart/grafana-hds-datasource.git linksmart-hds
```
* Restart Grafana.


## Configuration

### Plugin Configuration
1. Go to Grafana Configuration.
2. Select `Add data source`.
3. Select `LinkSmart HDS Datasource`
4. Provide the necessary details (see below figure) to connect with OGC SensorThings server.
![](https://raw.githubusercontent.com/linksmart/grafana-hds-datasource/master/docs/datasource_config.png)


Name | Description
------------ | -------------
Name | The data source name.
Default | Set this as the default plugin for new panels.
Url | The URL of the HDS instance. (Default port is 8085)
Access | Server (Default): Let Grafana server proxy the requests to HDS. <br> Browser: Send requests directly from client browser.
Whitelisted Cookies | Not applicable for this datasource
Basic Auth | Authenticate to HDS (if required, provide User and Password)
5. Save & Test, you should see this confirmation:

![](https://raw.githubusercontent.com/linksmart/grafana-hds-datasource/master/docs/datasource_working.png)

### Query Configuration
![](https://raw.githubusercontent.com/linksmart/grafana-hds-datasource/master/docs/query_metrics.png)


Name | Description
------------ | -------------
Metric | The ID and name of the metric (HDS Datasource)
Source | The measurement, aggregates, and retention policy (Preconfigured at HDS)

## Development

### Build the source
```
npm install 
grunt
```
## Sample HDS for Demonstration Purposes
To run Historical Datastore in demo mode (with continuously growing dummy senml data)
```
docker run -p 8085:8085  linksmart/hds -demo -conf /conf/docker.json
```
